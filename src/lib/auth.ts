/*
 * Authentication Utilities
 * Session management and auth helpers
 */

import { cookies } from 'next/headers';
import { createServerClient } from './supabase';
import bcrypt from 'bcryptjs';
import type { SafeUser, UserRole } from '@/types';

const SESSION_COOKIE_NAME = 'learnflow_session';
const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

// Hash password
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

// Verify password
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Create session for user
export async function createSession(userId: string, ipAddress?: string): Promise<string> {
  const supabase = createServerClient();

  // Create session record
  const { data: session, error } = await supabase
    .from('user_sessions')
    .insert({
      user_id: userId,
      ip_address: ipAddress || null,
    })
    .select('id')
    .single();

  if (error) throw error;
  return session.id;
}

// Set session cookie
export async function setSessionCookie(sessionId: string, userId: string): Promise<void> {
  const cookieStore = await cookies();
  const sessionData = JSON.stringify({ sessionId, userId });

  cookieStore.set(SESSION_COOKIE_NAME, sessionData, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_DURATION / 1000,
    path: '/',
  });
}

// Get current session from cookie
export async function getSession(): Promise<{ sessionId: string; userId: string } | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);

    if (!sessionCookie?.value) return null;

    return JSON.parse(sessionCookie.value);
  } catch {
    return null;
  }
}

// Get current user from session
export async function getCurrentUser(): Promise<SafeUser | null> {
  const session = await getSession();
  if (!session) return null;

  const supabase = createServerClient();

  const { data: sessionRecord } = await supabase
    .from('user_sessions')
    .select('id, user_id, login_at, logout_at')
    .eq('id', session.sessionId)
    .single();

  if (!sessionRecord || sessionRecord.logout_at) {
    await clearSession();
    return null;
  }

  const sessionAge = Date.now() - new Date(sessionRecord.login_at).getTime();
  if (sessionAge > SESSION_DURATION) {
    await clearSession();
    return null;
  }

  const { data: user, error } = await supabase
    .from('users')
    .select('id, username, email, role, full_name, created_by, is_active, password_set, created_at')
    .eq('id', sessionRecord.user_id)
    .eq('is_active', true)
    .single();

  if (error || !user) return null;

  return user as SafeUser;
}

// Clear session
export async function clearSession(): Promise<void> {
  const session = await getSession();

  if (session) {
    const supabase = createServerClient();

    // Update session logout time
    await supabase
      .from('user_sessions')
      .update({ logout_at: new Date().toISOString() })
      .eq('id', session.sessionId);
  }

  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

// Check if user has required role
export function hasRole(userRole: UserRole, allowedRoles: UserRole[]): boolean {
  return allowedRoles.includes(userRole);
}

// Role hierarchy check
export function canManageRole(managerRole: UserRole, targetRole: UserRole): boolean {
  const hierarchy: Record<UserRole, UserRole[]> = {
    admin: ['trainer', 'crm'],
    trainer: ['candidate'],
    crm: ['other'],
    candidate: [],
    other: [],
  };

  return hierarchy[managerRole]?.includes(targetRole) || false;
}

// Get redirect path based on role
export function getDashboardPath(role: UserRole): string {
  switch (role) {
    case 'admin':
      return '/admin';
    case 'trainer':
      return '/trainer';
    case 'crm':
      return '/crm';
    case 'candidate':
    case 'other':
      return '/learn';
    default:
      return '/';
  }
}

// Log activity
export async function logActivity(
  userId: string,
  action: string,
  targetType?: string,
  targetId?: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  const supabase = createServerClient();

  await supabase.from('activity_logs').insert({
    user_id: userId,
    action,
    target_type: targetType || null,
    target_id: targetId || null,
    metadata: metadata || null,
  });
}
