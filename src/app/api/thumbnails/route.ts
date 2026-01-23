/*
 * Thumbnail Upload API Route
 * Upload course thumbnails to Supabase Storage
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

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'Thumbnail file is required' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    const ext = file.name.includes('.') ? file.name.split('.').pop() : 'png';
    const fileName = `thumbnails/${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    const { error: uploadError } = await supabase.storage
      .from('course-thumbnails')
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) throw uploadError;

    const { data: publicUrl } = supabase.storage
      .from('course-thumbnails')
      .getPublicUrl(fileName);

    return NextResponse.json({
      success: true,
      url: publicUrl?.publicUrl || null,
      storage_path: fileName,
      file_name: file.name,
      file_size: file.size,
      mime_type: file.type,
    });
  } catch (error) {
    console.error('Thumbnail upload error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to upload thumbnail' },
      { status: 500 }
    );
  }
}
