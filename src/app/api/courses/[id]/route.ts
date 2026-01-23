/*
 * Single Course API Route
 * Get, update, delete course
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getCurrentUser, logActivity } from '@/lib/auth';

// GET - Get single course with full content
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const supabase = createServerClient();

    const { data: course, error } = await supabase
      .from('courses')
      .select(`
        *,
        index:indexes(id, name),
        sections(
          *,
          lectures(
            *,
            files:lecture_files(*)
          )
        )
      `)
      .eq('id', id)
      .single();

    if (error || !course) {
      return NextResponse.json(
        { success: false, error: 'Course not found' },
        { status: 404 }
      );
    }

    // Access control
    if (user.role === 'trainer' || user.role === 'crm') {
      if (course.created_by !== user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    if (user.role === 'candidate' || user.role === 'other') {
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
        .eq('course_id', id)
        .single();

      let hasAccess = !!directAssignment;

      if (!hasAccess) {
        const { data: indexAssignment } = await supabase
          .from('index_assignments')
          .select('id')
          .eq('user_id', user.id)
          .eq('index_id', course.index_id)
          .single();

        hasAccess = !!indexAssignment;
      }

      if (!hasAccess) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    // Sort sections and lectures by order_index
    if (course.sections) {
      course.sections.sort((a: { order_index: number }, b: { order_index: number }) => a.order_index - b.order_index);
      course.sections.forEach((section: { lectures: { order_index: number }[] }) => {
        if (section.lectures) {
          section.lectures.sort((a, b) => a.order_index - b.order_index);
        }
      });
    }

    // Attach signed URLs for uploaded videos
    if (course.sections) {
      await Promise.all(
        course.sections.flatMap((section: { lectures: { video_storage_path?: string }[] }) =>
          (section.lectures || []).map(async (lecture) => {
            if (!lecture.video_storage_path) return;
            const { data: signed, error: signedError } = await supabase.storage
              .from('lecture-videos')
              .createSignedUrl(lecture.video_storage_path, 60 * 60);
            if (!signedError) {
              (lecture as { video_url?: string | null }).video_url = signed?.signedUrl || null;
            }
          })
        )
      );
    }

    return NextResponse.json({
      success: true,
      course: {
        ...course,
        index_name: (course.index as { name: string })?.name,
      },
    });
  } catch (error) {
    console.error('Get course error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch course' },
      { status: 500 }
    );
  }
}

// PATCH - Update course
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { title, description, thumbnail_url, is_active } = body;

    const supabase = createServerClient();

    // Verify ownership
    const { data: existing } = await supabase
      .from('courses')
      .select('created_by')
      .eq('id', id)
      .single();

    if (!existing || existing.created_by !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const updates: Record<string, unknown> = {};
    if (title) updates.title = title.trim();
    if (description !== undefined) updates.description = description?.trim() || null;
    if (thumbnail_url !== undefined) updates.thumbnail_url = thumbnail_url?.trim() || null;
    if (typeof is_active === 'boolean') updates.is_active = is_active;

    const { data: updatedCourse, error } = await supabase
      .from('courses')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    await logActivity(user.id, 'updated_course', 'course', id, updates);

    return NextResponse.json({ success: true, course: updatedCourse });
  } catch (error) {
    console.error('Update course error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update course' },
      { status: 500 }
    );
  }
}

// DELETE - Delete course
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const supabase = createServerClient();

    // Verify ownership
    const { data: existing } = await supabase
      .from('courses')
      .select('title, created_by')
      .eq('id', id)
      .single();

    if (!existing || existing.created_by !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { error } = await supabase
      .from('courses')
      .delete()
      .eq('id', id);

    if (error) throw error;

    await logActivity(user.id, 'deleted_course', 'course', id, {
      title: existing.title,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete course error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete course' },
      { status: 500 }
    );
  }
}
