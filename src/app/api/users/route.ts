/*
 * Users API Route
 * CRUD operations for users
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getCurrentUser, hashPassword, logActivity, canManageRole } from '@/lib/auth';
import { validateUsername, validatePassword, validateEmail, generatePassword } from '@/lib/utils';
import { sendEmail } from '@/lib/email';
import crypto from 'crypto';
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
      .select('id, username, email, role, full_name, created_by, is_active, password_set, created_at, updated_at')
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
    const { username, password, email, full_name, role } = body;

    // Validate inputs
    if (!username || !full_name || !role || !email) {
      return NextResponse.json(
        { success: false, error: 'Username, email, full name, and role are required' },
        { status: 400 }
      );
    }

    if (!validateUsername(username)) {
      return NextResponse.json(
        { success: false, error: 'Username must be 3-30 characters, alphanumeric and underscores only' },
        { status: 400 }
      );
    }

    if (!validateEmail(email)) {
      return NextResponse.json(
        { success: false, error: 'Please provide a valid email address' },
        { status: 400 }
      );
    }

    if (password && !validatePassword(password)) {
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
      .or(`username.eq.${username.toLowerCase().trim()},email.eq.${email.toLowerCase().trim()}`)
      .single();

    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Username already exists' },
        { status: 400 }
      );
    }

    // Hash password and create user
    const hasPassword = typeof password === 'string' && password.length > 0;
    const tempPassword = hasPassword ? password : generatePassword(12);
    const password_hash = await hashPassword(tempPassword);

    const { data: newUser, error } = await supabase
      .from('users')
      .insert({
        username: username.toLowerCase().trim(),
        password_hash,
        full_name: full_name.trim(),
        email: email.toLowerCase().trim(),
        role,
        created_by: user.id,
        password_set: hasPassword ? true : false,
      })
      .select('id, username, email, role, full_name, created_by, is_active, password_set, created_at')
      .single();

    if (error) throw error;

    // Log activity
    await logActivity(user.id, 'created_user', 'user', newUser.id, {
      username: newUser.username,
      role: newUser.role,
    });

    // Create invite token + send email
    let inviteError: string | null = null;

    if (!hasPassword) {
      const inviteToken = crypto.randomUUID();
      await supabase.from('user_invites').insert({
        user_id: newUser.id,
        email: newUser.email,
        token: inviteToken,
        created_by: user.id,
      });

      const appUrl = process.env.APP_URL || new URL(request.url).origin;
      const inviteLink = `${appUrl}/invite/${inviteToken}`;

      try {
        await sendEmail({
          to: newUser.email,
          subject: 'Set up your LearnFlow account',
          html: `
            <p>Hi ${newUser.full_name},</p>
            <p>You have been invited to LearnFlow. Click the link below to create your password:</p>
            <p><a href="${inviteLink}">${inviteLink}</a></p>
            <p>If you did not expect this invite, you can ignore this email.</p>
          `,
          text: `You have been invited to LearnFlow. Set your password here: ${inviteLink}`,
        });
      } catch (emailError) {
        console.error('Invite email failed:', emailError);
        inviteError = 'Invite email failed to send.';
      }
    }

    return NextResponse.json({ success: true, user: newUser, invite_error: inviteError });
  } catch (error) {
    console.error('Create user error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create user' },
      { status: 500 }
    );
  }
}
