/*
 * Files API Route
 * Handle file uploads to Supabase Storage
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getCurrentUser, logActivity } from '@/lib/auth';

// POST - Upload file and attach to lecture
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !['trainer', 'crm'].includes(user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const lectureId = formData.get('lecture_id') as string;

    if (!file || !lectureId) {
      return NextResponse.json(
        { success: false, error: 'File and lecture ID are required' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Verify lecture ownership
    const { data: lecture } = await supabase
      .from('lectures')
      .select('id, section:sections(course:courses(created_by))')
      .eq('id', lectureId)
      .single();

    // # changed [from const createdBy = (lecture?.section as { course: { created_by: string } })?.course?.created_by; to const lectureSection = Array.isArray(lecture?.section) ? lecture.section[0] : lecture?.section;]
    const lectureSection = Array.isArray(lecture?.section) ? lecture.section[0] : lecture?.section;
    // # changed [from const createdBy = ... to const lectureCourse = Array.isArray(lectureSection?.course) ? lectureSection.course[0] : lectureSection?.course;]
    const lectureCourse = Array.isArray(lectureSection?.course) ? lectureSection.course[0] : lectureSection?.course;
    // # changed [from const createdBy = ... to const createdBy = lectureCourse?.created_by;]
    const createdBy = lectureCourse?.created_by;
    if (!lecture || createdBy !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Generate unique filename
    const ext = file.name.includes('.') ? file.name.split('.').pop() : 'bin';
    const fileName = `${lectureId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    // Upload to Supabase Storage
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    const { error: uploadError } = await supabase.storage
      .from('lecture-files')
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) throw uploadError;

    // Create file record
    const { data: fileRecord, error: dbError } = await supabase
      .from('lecture_files')
      .insert({
        lecture_id: lectureId,
        file_name: file.name,
        file_url: null,
        storage_path: fileName,
        file_size: file.size,
        file_type: file.type,
      })
      .select()
      .single();

    if (dbError) throw dbError;

    await logActivity(user.id, 'uploaded_file', 'file', fileRecord.id, {
      file_name: file.name,
    });

    return NextResponse.json({ success: true, file: fileRecord });
  } catch (error) {
    console.error('File upload error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to upload file' },
      { status: 500 }
    );
  }
}

// DELETE - Remove file
export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get('id');

    if (!fileId) {
      return NextResponse.json(
        { success: false, error: 'File ID is required' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Get file and verify ownership
    const { data: file } = await supabase
      .from('lecture_files')
      .select(`
        *,
        lecture:lectures(
          section:sections(
            course:courses(created_by)
          )
        )
      `)
      .eq('id', fileId)
      .single();

    // # changed [from const createdBy = (file?.lecture as { section: { course: { created_by: string } } })?.section?.course?.created_by; to const fileLecture = Array.isArray(file?.lecture) ? file.lecture[0] : file?.lecture;]
    const fileLecture = Array.isArray(file?.lecture) ? file.lecture[0] : file?.lecture;
    // # changed [from const createdBy = ... to const fileSection = Array.isArray(fileLecture?.section) ? fileLecture.section[0] : fileLecture?.section;]
    const fileSection = Array.isArray(fileLecture?.section) ? fileLecture.section[0] : fileLecture?.section;
    // # changed [from const createdBy = ... to const fileCourse = Array.isArray(fileSection?.course) ? fileSection.course[0] : fileSection?.course;]
    const fileCourse = Array.isArray(fileSection?.course) ? fileSection.course[0] : fileSection?.course;
    // # changed [from const createdBy = ... to const createdBy = fileCourse?.created_by;]
    const createdBy = fileCourse?.created_by;
    if (!file || createdBy !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const storagePath = file.storage_path || (file.file_url ? file.file_url.split('/lecture-files/')[1] : null);
    if (storagePath) {
      await supabase.storage.from('lecture-files').remove([storagePath]);
    }

    // Delete record
    const { error } = await supabase
      .from('lecture_files')
      .delete()
      .eq('id', fileId);

    if (error) throw error;

    await logActivity(user.id, 'deleted_file', 'file', fileId, {
      file_name: file.file_name,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('File delete error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete file' },
      { status: 500 }
    );
  }
}
