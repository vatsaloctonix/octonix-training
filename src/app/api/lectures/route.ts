/*
 * Lectures API Route
 * CRUD for section lectures
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getCurrentUser, logActivity } from '@/lib/auth';

// POST - Create new lecture
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { section_id, title, description, youtube_url, video_storage_path, video_mime_type, order_index, duration_seconds } = body;

    if (!section_id || !title?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Section and title are required' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Verify ownership through section -> course
    const { data: section } = await supabase
      .from('sections')
      .select('id, course:courses(created_by)')
      .eq('id', section_id)
      .single();

    // # changed [from if (!section || (section.course as { created_by: string })?.created_by !== user.id) { to const courseData = Array.isArray(section?.course) ? section.course[0] : section?.course;]
    const courseData = Array.isArray(section?.course) ? section.course[0] : section?.course;
    // # changed [from if (!section || ...) { to const createdBy = courseData?.created_by;]
    const createdBy = courseData?.created_by;
    // # changed [from if (!section || (section.course as { created_by: string })?.created_by !== user.id) { to if (!section || createdBy !== user.id) {]
    if (!section || createdBy !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get max order if not provided
    let orderIdx = order_index;
    if (typeof orderIdx !== 'number') {
      const { data: maxLecture } = await supabase
        .from('lectures')
        .select('order_index')
        .eq('section_id', section_id)
        .order('order_index', { ascending: false })
        .limit(1)
        .single();

      orderIdx = maxLecture ? maxLecture.order_index + 1 : 0;
    }

    const { data: newLecture, error } = await supabase
      .from('lectures')
      .insert({
        section_id,
        title: title.trim(),
        description: description?.trim() || null,
        youtube_url: youtube_url?.trim() || null,
        video_storage_path: video_storage_path || null,
        video_mime_type: video_mime_type || null,
        order_index: orderIdx,
        duration_seconds: duration_seconds || 0,
      })
      .select()
      .single();

    if (error) throw error;

    await logActivity(user.id, 'created_lecture', 'lecture', newLecture.id, {
      title: newLecture.title,
    });

    return NextResponse.json({ success: true, lecture: newLecture });
  } catch (error) {
    console.error('Create lecture error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create lecture' },
      { status: 500 }
    );
  }
}

// PATCH - Update lecture
export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, title, description, youtube_url, video_storage_path, video_mime_type, order_index, duration_seconds } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Lecture ID is required' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Verify ownership
    const { data: lecture } = await supabase
      .from('lectures')
      .select('id, video_storage_path, section:sections(course:courses(created_by))')
      .eq('id', id)
      .single();

    // # changed [from const createdBy = (lecture?.section as { course: { created_by: string } })?.course?.created_by; to const lectureSection = Array.isArray(lecture?.section) ? lecture.section[0] : lecture?.section;]
    const lectureSection = Array.isArray(lecture?.section) ? lecture.section[0] : lecture?.section;
    // # changed [from const createdBy = ... to const lectureCourse = Array.isArray(lectureSection?.course) ? lectureSection.course[0] : lectureSection?.course;]
    const lectureCourse = Array.isArray(lectureSection?.course) ? lectureSection.course[0] : lectureSection?.course;
    // # changed [from const createdBy = ... to const createdBy = lectureCourse?.created_by;]
    const createdBy = lectureCourse?.created_by;
    // # changed [from if (!lecture || createdBy !== user.id) { to if (!lecture || createdBy !== user.id) {]
    if (!lecture || createdBy !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const updates: Record<string, unknown> = {};
    if (title) updates.title = title.trim();
    if (description !== undefined) updates.description = description?.trim() || null;
    if (youtube_url !== undefined) updates.youtube_url = youtube_url?.trim() || null;
    if (video_storage_path !== undefined) updates.video_storage_path = video_storage_path || null;
    if (video_mime_type !== undefined) updates.video_mime_type = video_mime_type || null;
    if (typeof order_index === 'number') updates.order_index = order_index;
    if (typeof duration_seconds === 'number') updates.duration_seconds = duration_seconds;

    const { data: updatedLecture, error } = await supabase
      .from('lectures')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    if (
      lecture?.video_storage_path &&
      typeof video_storage_path === 'string' &&
      lecture.video_storage_path !== video_storage_path
    ) {
      await supabase.storage.from('lecture-videos').remove([lecture.video_storage_path]);
    }

    return NextResponse.json({ success: true, lecture: updatedLecture });
  } catch (error) {
    console.error('Update lecture error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update lecture' },
      { status: 500 }
    );
  }
}

// DELETE - Delete lecture
export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Lecture ID is required' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Verify ownership
    const { data: lecture } = await supabase
      .from('lectures')
      .select('id, title, video_storage_path, section:sections(course:courses(created_by))')
      .eq('id', id)
      .single();

    // # changed [from const createdBy = (lecture?.section as { course: { created_by: string } })?.course?.created_by; to const lectureSection = Array.isArray(lecture?.section) ? lecture.section[0] : lecture?.section;]
    const lectureSection = Array.isArray(lecture?.section) ? lecture.section[0] : lecture?.section;
    // # changed [from const createdBy = ... to const lectureCourse = Array.isArray(lectureSection?.course) ? lectureSection.course[0] : lectureSection?.course;]
    const lectureCourse = Array.isArray(lectureSection?.course) ? lectureSection.course[0] : lectureSection?.course;
    // # changed [from const createdBy = ... to const createdBy = lectureCourse?.created_by;]
    const createdBy = lectureCourse?.created_by;
    // # changed [from if (!lecture || createdBy !== user.id) { to if (!lecture || createdBy !== user.id) {]
    if (!lecture || createdBy !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { error } = await supabase
      .from('lectures')
      .delete()
      .eq('id', id);

    if (error) throw error;

    if (lecture?.video_storage_path) {
      await supabase.storage.from('lecture-videos').remove([lecture.video_storage_path]);
    }

    await logActivity(user.id, 'deleted_lecture', 'lecture', id, {
      title: lecture.title,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete lecture error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete lecture' },
      { status: 500 }
    );
  }
}
