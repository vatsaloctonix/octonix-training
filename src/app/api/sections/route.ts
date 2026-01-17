/*
 * Sections API Route
 * CRUD for course sections
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getCurrentUser, logActivity } from '@/lib/auth';

// POST - Create new section
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { course_id, title, order_index } = body;

    if (!course_id || !title?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Course and title are required' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Verify course ownership
    const { data: course } = await supabase
      .from('courses')
      .select('id, created_by')
      .eq('id', course_id)
      .single();

    if (!course || course.created_by !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get max order if not provided
    let orderIdx = order_index;
    if (typeof orderIdx !== 'number') {
      const { data: maxSection } = await supabase
        .from('sections')
        .select('order_index')
        .eq('course_id', course_id)
        .order('order_index', { ascending: false })
        .limit(1)
        .single();

      orderIdx = maxSection ? maxSection.order_index + 1 : 0;
    }

    const { data: newSection, error } = await supabase
      .from('sections')
      .insert({
        course_id,
        title: title.trim(),
        order_index: orderIdx,
      })
      .select()
      .single();

    if (error) throw error;

    await logActivity(user.id, 'created_section', 'section', newSection.id, {
      title: newSection.title,
    });

    return NextResponse.json({ success: true, section: newSection });
  } catch (error) {
    console.error('Create section error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create section' },
      { status: 500 }
    );
  }
}

// PATCH - Update section
export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, title, order_index } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Section ID is required' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Verify ownership through course
    const { data: section } = await supabase
      .from('sections')
      .select('id, course:courses(created_by)')
      .eq('id', id)
      .single();

    // # changed [from if (!section || (section.course as { created_by: string })?.created_by !== user.id) { to const courseData = Array.isArray(section?.course) ? section.course[0] : section?.course;]
    const courseData = Array.isArray(section?.course) ? section.course[0] : section?.course;
    // # changed [from if (!section || ...) { to const createdBy = courseData?.created_by;]
    const createdBy = courseData?.created_by;
    // # changed [from if (!section || (section.course as { created_by: string })?.created_by !== user.id) { to if (!section || createdBy !== user.id) {]
    if (!section || createdBy !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const updates: Record<string, unknown> = {};
    if (title) updates.title = title.trim();
    if (typeof order_index === 'number') updates.order_index = order_index;

    const { data: updatedSection, error } = await supabase
      .from('sections')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, section: updatedSection });
  } catch (error) {
    console.error('Update section error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update section' },
      { status: 500 }
    );
  }
}

// DELETE - Delete section
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
        { success: false, error: 'Section ID is required' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Verify ownership
    const { data: section } = await supabase
      .from('sections')
      .select('id, title, course:courses(created_by)')
      .eq('id', id)
      .single();

    // # changed [from if (!section || (section.course as { created_by: string })?.created_by !== user.id) { to const courseData = Array.isArray(section?.course) ? section.course[0] : section?.course;]
    const courseData = Array.isArray(section?.course) ? section.course[0] : section?.course;
    // # changed [from if (!section || ...) { to const createdBy = courseData?.created_by;]
    const createdBy = courseData?.created_by;
    // # changed [from if (!section || (section.course as { created_by: string })?.created_by !== user.id) { to if (!section || createdBy !== user.id) {]
    if (!section || createdBy !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { error } = await supabase
      .from('sections')
      .delete()
      .eq('id', id);

    if (error) throw error;

    await logActivity(user.id, 'deleted_section', 'section', id, {
      title: section.title,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete section error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete section' },
      { status: 500 }
    );
  }
}
