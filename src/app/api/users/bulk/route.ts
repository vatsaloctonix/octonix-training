/*
 * Bulk Users API Route
 * Create multiple users at once (CSV import)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getCurrentUser, hashPassword, logActivity, canManageRole } from '@/lib/auth';
import { validateUsername, validateEmail, generatePassword } from '@/lib/utils';
import { sendEmail } from '@/lib/email';
import crypto from 'crypto';
import type { UserRole } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { users, role } = body as {
      users: { username: string; email: string; full_name: string }[];
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
      const { username, email, full_name } = userData;

      // Validate
      if (!validateUsername(username)) {
        results.push({
          success: false,
          username,
          error: 'Invalid username format',
        });
        continue;
      }

      if (!validateEmail(email)) {
        results.push({
          success: false,
          username,
          error: 'Invalid email address',
        });
        continue;
      }

      // Check if exists
      const { data: existing } = await supabase
        .from('users')
        .select('id')
        .or(`username.eq.${username.toLowerCase().trim()},email.eq.${email.toLowerCase().trim()}`)
        .single();

      if (existing) {
        results.push({
          success: false,
          username,
          error: 'Username or email already exists',
        });
        continue;
      }

      // Create user
      const tempPassword = generatePassword(12);
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
          password_set: false,
        })
        .select('id, email, full_name')
        .single();

      if (error) {
        results.push({
          success: false,
          username,
          error: 'Database error',
        });
      } else {
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
            `,
            text: `Set your password here: ${inviteLink}`,
          });
        } catch (emailError) {
          console.error('Invite email failed:', emailError);
        }

        results.push({ success: true, username });
        created.push(newUser.id);
      }
    }

    // Log activity
    if (created.length > 0) {
      // # changed [from await logActivity(user.id, 'bulk_created_users', 'user', null, { to await logActivity(user.id, 'bulk_created_users', 'user', undefined, {]
      await logActivity(user.id, 'bulk_created_users', 'user', undefined, {
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
