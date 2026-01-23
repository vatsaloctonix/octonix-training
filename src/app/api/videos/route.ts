/*
 * Video Upload API Route
 * Upload lecture videos to Supabase Storage
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !['trainer', 'crm'].includes(user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const lectureId = (formData.get('lecture_id') as string) || '';

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'Video file is required' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    const ext = file.name.includes('.') ? file.name.split('.').pop() : 'mp4';
    const baseFolder = lectureId ? `lectures/${lectureId}` : `uploads/${user.id}`;
    const fileName = `${baseFolder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    const { error: uploadError } = await supabase.storage
      .from('lecture-videos')
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) throw uploadError;

    return NextResponse.json({
      success: true,
      storage_path: fileName,
      mime_type: file.type,
      file_name: file.name,
      file_size: file.size,
    });
  } catch (error) {
    console.error('Video upload error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to upload video' },
      { status: 500 }
    );
  }
}
