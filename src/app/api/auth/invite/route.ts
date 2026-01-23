/*
 * Invite API Route
 * Verify and resend invites
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/auth';
import { sendEmail } from '@/lib/email';
import crypto from 'crypto';

// GET - Verify invite token (public)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Token is required' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    const { data: invite, error } = await supabase
      .from('user_invites')
      .select('id, user_id, email, used_at')
      .eq('token', token)
      .single();

    if (error || !invite || invite.used_at) {
      return NextResponse.json(
        { success: false, error: 'Invite not found or already used' },
        { status: 404 }
      );
    }

    const { data: user } = await supabase
      .from('users')
      .select('id, username, full_name, email, is_active')
      .eq('id', invite.user_id)
      .single();

    if (!user || !user.is_active) {
      return NextResponse.json(
        { success: false, error: 'User not available' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        email: user.email || invite.email,
      },
    });
  } catch (error) {
    console.error('Invite verify error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to verify invite' },
      { status: 500 }
    );
  }
}

// POST - Resend invite (admin/trainer/crm)
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { user_id } = await request.json();
    if (!user_id) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    const { data: targetUser } = await supabase
      .from('users')
      .select('id, username, full_name, email, created_by, role, is_active')
      .eq('id', user_id)
      .single();

    if (!targetUser || !targetUser.is_active) {
      return NextResponse.json(
        { success: false, error: 'User not found or inactive' },
        { status: 404 }
      );
    }

    if (user.role !== 'admin' && targetUser.created_by !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Permission denied' },
        { status: 403 }
      );
    }

    if (!targetUser.email) {
      return NextResponse.json(
        { success: false, error: 'User does not have an email address' },
        { status: 400 }
      );
    }

    const inviteToken = crypto.randomUUID();
    await supabase.from('user_invites').insert({
      user_id: targetUser.id,
      email: targetUser.email,
      token: inviteToken,
      created_by: user.id,
    });

    const appUrl = process.env.APP_URL || new URL(request.url).origin;
    const inviteLink = `${appUrl}/invite/${inviteToken}`;

    await sendEmail({
      to: targetUser.email,
      subject: 'Set up your LearnFlow account',
      html: `
        <p>Hi ${targetUser.full_name},</p>
        <p>Click the link below to create your password:</p>
        <p><a href="${inviteLink}">${inviteLink}</a></p>
      `,
      text: `Create your password here: ${inviteLink}`,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Invite resend error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to resend invite' },
      { status: 500 }
    );
  }
}
