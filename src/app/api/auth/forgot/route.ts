/*
 * Forgot Password API Route
 * Sends a verification code to the user's email
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { sendEmail } from '@/lib/email';
import { validateEmail } from '@/lib/utils';

function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email || !validateEmail(email)) {
      return NextResponse.json(
        { success: false, error: 'Valid email is required' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    const { data: user } = await supabase
      .from('users')
      .select('id, full_name, email')
      .eq('email', email.toLowerCase().trim())
      .single();

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Email not found' },
        { status: 404 }
      );
    }

    const code = generateCode();
    await supabase.from('password_resets').insert({
      user_id: user.id,
      email: user.email,
      code,
    });

    await sendEmail({
      to: user.email,
      subject: 'Reset your LearnFlow password',
      html: `
        <p>Hi ${user.full_name},</p>
        <p>Your verification code is:</p>
        <h2>${code}</h2>
        <p>Enter this code to reset your password.</p>
      `,
      text: `Your verification code is ${code}`,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to send reset code' },
      { status: 500 }
    );
  }
}
