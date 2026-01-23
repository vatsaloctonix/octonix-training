/*
 * Invite Accept API Route
 * Set password for invited users
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { hashPassword } from '@/lib/auth';
import { validatePassword } from '@/lib/utils';

export async function POST(request: NextRequest) {
  try {
    const { token, password } = await request.json();

    if (!token || !password) {
      return NextResponse.json(
        { success: false, error: 'Token and password are required' },
        { status: 400 }
      );
    }

    if (!validatePassword(password)) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    const { data: invite, error } = await supabase
      .from('user_invites')
      .select('id, user_id, used_at')
      .eq('token', token)
      .single();

    if (error || !invite || invite.used_at) {
      return NextResponse.json(
        { success: false, error: 'Invite not found or already used' },
        { status: 404 }
      );
    }

    const password_hash = await hashPassword(password);

    await supabase
      .from('users')
      .update({ password_hash, password_set: true })
      .eq('id', invite.user_id);

    await supabase
      .from('user_invites')
      .update({ used_at: new Date().toISOString() })
      .eq('id', invite.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Invite accept error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to set password' },
      { status: 500 }
    );
  }
}
