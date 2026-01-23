/*
 * Reset Password API Route
 * Verifies code and sets a new password
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { hashPassword } from '@/lib/auth';
import { validatePassword, validateEmail } from '@/lib/utils';

export async function POST(request: NextRequest) {
  try {
    const { email, code, password } = await request.json();

    if (!email || !code || !password) {
      return NextResponse.json(
        { success: false, error: 'Email, code, and password are required' },
        { status: 400 }
      );
    }

    if (!validateEmail(email)) {
      return NextResponse.json(
        { success: false, error: 'Valid email is required' },
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

    const { data: reset } = await supabase
      .from('password_resets')
      .select('id, user_id, used_at')
      .eq('email', email.toLowerCase().trim())
      .eq('code', code)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!reset || reset.used_at) {
      return NextResponse.json(
        { success: false, error: 'Invalid or used code' },
        { status: 400 }
      );
    }

    const password_hash = await hashPassword(password);

    await supabase
      .from('users')
      .update({ password_hash, password_set: true })
      .eq('id', reset.user_id);

    await supabase
      .from('password_resets')
      .update({ used_at: new Date().toISOString() })
      .eq('id', reset.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to reset password' },
      { status: 500 }
    );
  }
}
