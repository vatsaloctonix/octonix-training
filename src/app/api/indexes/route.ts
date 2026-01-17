/*
 * Indexes API Route
 * CRUD for content indexes (Setup, Training, etc.)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getCurrentUser, logActivity } from '@/lib/auth';

// GET - List indexes for current user
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only trainers and CRM can manage indexes
    if (!['trainer', 'crm'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const supabase = createServerClient();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');

    let query = supabase
      .from('indexes')
      .select(`
        *,
        courses:courses(count)
      `)
      .eq('created_by', user.id)
      .order('created_at', { ascending: false });

    if (search) {
      query = query.ilike('name', `%${search}%`);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Format response with course count
    const indexes = data.map((idx: Record<string, unknown>) => ({
      ...idx,
      course_count: (idx.courses as { count: number }[])?.[0]?.count || 0,
    }));

    return NextResponse.json({ success: true, indexes });
  } catch (error) {
    console.error('Get indexes error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch indexes' },
      { status: 500 }
    );
  }
}

// POST - Create new index
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!['trainer', 'crm'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { name, description } = body;

    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Index name is required' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    const { data: newIndex, error } = await supabase
      .from('indexes')
      .insert({
        name: name.trim(),
        description: description?.trim() || null,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) throw error;

    await logActivity(user.id, 'created_index', 'index', newIndex.id, {
      name: newIndex.name,
    });

    return NextResponse.json({ success: true, index: newIndex });
  } catch (error) {
    console.error('Create index error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create index' },
      { status: 500 }
    );
  }
}
