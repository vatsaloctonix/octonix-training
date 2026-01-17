/*
 * File Download Tracking API Route
 * Track when users download files
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/auth';

// POST - Track file download
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { file_id } = body;

    if (!file_id) {
      return NextResponse.json(
        { success: false, error: 'File ID is required' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    const { data: file, error: fileError } = await supabase
      .from('lecture_files')
      .select(`
        id,
        file_name,
        file_url,
        storage_path,
        lecture:lectures(
          section:sections(
            course:courses(id, index_id, created_by, is_active)
          )
        )
      `)
      .eq('id', file_id)
      .single();

    if (fileError || !file) {
      return NextResponse.json(
        { success: false, error: 'File not found' },
        { status: 404 }
      );
    }

    // # changed [from const course = (file.lecture as { section: { course: { id: string; index_id: string; created_by: string; is_active: boolean } } })?.section?.course; to const lecture = Array.isArray(file.lecture) ? file.lecture[0] : file.lecture;]
    const lecture = Array.isArray(file.lecture) ? file.lecture[0] : file.lecture;
    // # changed [from const course = ... to const section = Array.isArray(lecture?.section) ? lecture.section[0] : lecture?.section;]
    const section = Array.isArray(lecture?.section) ? lecture.section[0] : lecture?.section;
    // # changed [from const course = ... to const courseData = Array.isArray(section?.course) ? section.course[0] : section?.course;]
    const courseData = Array.isArray(section?.course) ? section.course[0] : section?.course;
    // # changed [from const course = ... to const course = courseData as { id: string; index_id: string; created_by: string; is_active: boolean } | null;]
    const course = courseData as { id: string; index_id: string; created_by: string; is_active: boolean } | null;
    if (!course) {
      return NextResponse.json(
        { success: false, error: 'File not linked to a course' },
        { status: 400 }
      );
    }

    let hasAccess = false;

    if (user.role === 'admin') {
      hasAccess = true;
    } else if (user.role === 'trainer' || user.role === 'crm') {
      hasAccess = course.created_by === user.id;
    } else {
      if (!course.is_active) {
        return NextResponse.json(
          { success: false, error: 'Course not available' },
          { status: 404 }
        );
      }

      const { data: directAssignment } = await supabase
        .from('course_assignments')
        .select('id')
        .eq('user_id', user.id)
        .eq('course_id', course.id)
        .single();

      hasAccess = !!directAssignment;

      if (!hasAccess) {
        const { data: indexAssignment } = await supabase
          .from('index_assignments')
          .select('id')
          .eq('user_id', user.id)
          .eq('index_id', course.index_id)
          .single();

        hasAccess = !!indexAssignment;
      }
    }

    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    let downloadUrl: string | null = null;
    const storagePath = file.storage_path || (file.file_url ? file.file_url.split('/lecture-files/')[1] : null);

    if (storagePath) {
      const { data: signed, error: signedError } = await supabase.storage
        .from('lecture-files')
        .createSignedUrl(storagePath, 60 * 10, { download: file.file_name });

      if (signedError) throw signedError;
      downloadUrl = signed?.signedUrl || null;
    } else if (file.file_url) {
      downloadUrl = file.file_url;
    }

    if (!downloadUrl) {
      return NextResponse.json(
        { success: false, error: 'File URL unavailable' },
        { status: 500 }
      );
    }

    await supabase.from('file_downloads').insert({
      user_id: user.id,
      file_id,
    });

    return NextResponse.json({ success: true, url: downloadUrl });
  } catch (error) {
    console.error('Track download error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to track download' },
      { status: 500 }
    );
  }
}
