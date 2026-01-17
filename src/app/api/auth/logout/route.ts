/*
 * Logout API Route
 * Clears user session
 */

import { NextResponse } from 'next/server';
import { clearSession, getSession, logActivity } from '@/lib/auth';

export async function POST() {
  try {
    const session = await getSession();

    if (session) {
      await logActivity(session.userId, 'logout', 'user', session.userId);
    }

    await clearSession();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { success: false, error: 'An error occurred during logout' },
      { status: 500 }
    );
  }
}
