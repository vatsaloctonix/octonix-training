/*
 * Users API Route
 * CRUD operations for users
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getCurrentUser, hashPassword, logActivity, canManageRole } from '@/lib/auth';
import { validateUsername, validatePassword } from '@/lib/utils';
import type { UserRole } from '@/types';

// GET - List users (filtered by role and creator)
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role') as UserRole | null;
    const search = searchParams.get('search');

    const supabase = createServerClient();
    let query = supabase
      .from('users')
      .select('id, username, role, full_name, created_by, is_active, created_at, updated_at')
      .order('created_at', { ascending: false });

    // Filter based on current user's role
    if (user.role === 'trainer') {
      query = query.eq('created_by', user.id).eq('role', 'candidate');
    } else if (user.role === 'crm') {
      query = query.eq('created_by', user.id).eq('role', 'other');
    } else if (user.role === 'admin') {
      if (role) {
        query = query.eq('role', role);
      } else {
        query = query.in('role', ['trainer', 'crm']);
      }
    }

    // Search filter
    if (search) {
      query = query.or(`username.ilike.%${search}%,full_name.ilike.%${search}%`);
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({ success: true, users: data });
  } catch (error) {
    console.error('Get users error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

// POST - Create new user
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { username, password, full_name, role } = body;

    // Validate inputs
    if (!username || !password || !full_name || !role) {
      return NextResponse.json(
        { success: false, error: 'All fields are required' },
        { status: 400 }
      );
    }

    if (!validateUsername(username)) {
      return NextResponse.json(
        { success: false, error: 'Username must be 3-30 characters, alphanumeric and underscores only' },
        { status: 400 }
      );
    }

    if (!validatePassword(password)) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    // Check permission to create this role
    if (!canManageRole(user.role, role)) {
      return NextResponse.json(
        { success: false, error: 'You do not have permission to create this user type' },
        { status: 403 }
      );
    }

    const supabase = createServerClient();

    // Check if username exists
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('username', username.toLowerCase().trim())
      .single();

    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Username already exists' },
        { status: 400 }
      );
    }

    // Hash password and create user
    const password_hash = await hashPassword(password);

    const { data: newUser, error } = await supabase
      .from('users')
      .insert({
        username: username.toLowerCase().trim(),
        password_hash,
        full_name: full_name.trim(),
        role,
        created_by: user.id,
      })
      .select('id, username, role, full_name, created_by, is_active, created_at')
      .single();

    if (error) throw error;

    // Log activity
    await logActivity(user.id, 'created_user', 'user', newUser.id, {
      username: newUser.username,
      role: newUser.role,
    });

    return NextResponse.json({ success: true, user: newUser });
  } catch (error) {
    console.error('Create user error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create user' },
      { status: 500 }
    );
  }
}
