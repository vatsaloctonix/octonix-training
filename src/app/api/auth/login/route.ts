/*
 * Login API Route
 * Authenticates user and creates session
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { verifyPassword, createSession, setSessionCookie, logActivity, getDashboardPath } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    // Validate input
    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: 'Username and password are required' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Find user by username
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username.toLowerCase().trim())
      .single();

    if (error || !user) {
      return NextResponse.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Check if user is active
    if (!user.is_active) {
      return NextResponse.json(
        { success: false, error: 'Account is deactivated' },
        { status: 403 }
      );
    }

    // Verify password
    const isValid = await verifyPassword(password, user.password_hash);
    if (!isValid) {
      return NextResponse.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Get IP address
    const ip = request.headers.get('x-forwarded-for') ||
               request.headers.get('x-real-ip') ||
               'unknown';

    // Create session
    const sessionId = await createSession(user.id, ip);
    await setSessionCookie(sessionId, user.id);

    // Log activity
    await logActivity(user.id, 'login', 'user', user.id);

    // Return user data (without password)
    const safeUser = {
      id: user.id,
      username: user.username,
      role: user.role,
      full_name: user.full_name,
      created_by: user.created_by,
      is_active: user.is_active,
      created_at: user.created_at,
    };

    return NextResponse.json({
      success: true,
      user: safeUser,
      redirect: getDashboardPath(user.role),
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, error: 'An error occurred during login' },
      { status: 500 }
    );
  }
}
