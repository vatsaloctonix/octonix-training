/*
 * Single Index API Route
 * Get, update, delete index
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getCurrentUser, logActivity } from '@/lib/auth';

// GET - Get single index with courses
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

    const { data: index, error } = await supabase
      .from('indexes')
      .select(`
        *,
        courses(*)
      `)
      .eq('id', id)
      .single();

    if (error || !index) {
      return NextResponse.json(
        { success: false, error: 'Index not found' },
        { status: 404 }
      );
    }

    // Check ownership for trainers/CRM
    if (['trainer', 'crm'].includes(user.role) && index.created_by !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({ success: true, index });
  } catch (error) {
    console.error('Get index error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch index' },
      { status: 500 }
    );
  }
}

// PATCH - Update index
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
    const { name, description, is_active } = body;

    const supabase = createServerClient();

    // Verify ownership
    const { data: existing } = await supabase
      .from('indexes')
      .select('created_by')
      .eq('id', id)
      .single();

    if (!existing || existing.created_by !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const updates: Record<string, unknown> = {};
    if (name) updates.name = name.trim();
    if (description !== undefined) updates.description = description?.trim() || null;
    if (typeof is_active === 'boolean') updates.is_active = is_active;

    const { data: updatedIndex, error } = await supabase
      .from('indexes')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    await logActivity(user.id, 'updated_index', 'index', id, updates);

    return NextResponse.json({ success: true, index: updatedIndex });
  } catch (error) {
    console.error('Update index error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update index' },
      { status: 500 }
    );
  }
}

// DELETE - Delete index (cascades to courses, sections, lectures)
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
      .from('indexes')
      .select('name, created_by')
      .eq('id', id)
      .single();

    if (!existing || existing.created_by !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Delete (cascades handled by DB)
    const { error } = await supabase
      .from('indexes')
      .delete()
      .eq('id', id);

    if (error) throw error;

    await logActivity(user.id, 'deleted_index', 'index', id, {
      name: existing.name,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete index error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete index' },
      { status: 500 }
    );
  }
}
