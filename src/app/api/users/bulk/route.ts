/*
 * Bulk Users API Route
 * Create multiple users at once (CSV import)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getCurrentUser, hashPassword, logActivity, canManageRole } from '@/lib/auth';
import { validateUsername, validatePassword } from '@/lib/utils';
import type { UserRole } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { users, role } = body as {
      users: { username: string; password: string; full_name: string }[];
      role: UserRole;
    };

    // Validate role permission
    if (!canManageRole(user.role, role)) {
      return NextResponse.json(
        { success: false, error: 'Permission denied for this role' },
        { status: 403 }
      );
    }

    if (!users || !Array.isArray(users) || users.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No users provided' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();
    const results: { success: boolean; username: string; error?: string }[] = [];
    const created: string[] = [];

    // Process each user
    for (const userData of users) {
      const { username, password, full_name } = userData;

      // Validate
      if (!validateUsername(username)) {
        results.push({
          success: false,
          username,
          error: 'Invalid username format',
        });
        continue;
      }

      if (!validatePassword(password)) {
        results.push({
          success: false,
          username,
          error: 'Password too short (min 6 characters)',
        });
        continue;
      }

      // Check if exists
      const { data: existing } = await supabase
        .from('users')
        .select('id')
        .eq('username', username.toLowerCase().trim())
        .single();

      if (existing) {
        results.push({
          success: false,
          username,
          error: 'Username already exists',
        });
        continue;
      }

      // Create user
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
        .select('id')
        .single();

      if (error) {
        results.push({
          success: false,
          username,
          error: 'Database error',
        });
      } else {
        results.push({ success: true, username });
        created.push(newUser.id);
      }
    }

    // Log activity
    if (created.length > 0) {
      await logActivity(user.id, 'bulk_created_users', 'user', null, {
        count: created.length,
        role,
      });
    }

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    return NextResponse.json({
      success: true,
      message: `Created ${successCount} users, ${failCount} failed`,
      results,
    });
  } catch (error) {
    console.error('Bulk create error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create users' },
      { status: 500 }
    );
  }
}
