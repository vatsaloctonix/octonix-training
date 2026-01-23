/*
 * Forgot Password Page
 * Email verification code flow
 */

'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'request' | 'reset'>('request');
  const [message, setMessage] = useState<{ type: 'success' | 'danger'; text: string } | null>(null);

  const requestCode = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage(null);
    setLoading(true);
    try {
      const res = await fetch('/api/auth/forgot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const json = await res.json();
      if (!json.success) {
        setMessage({ type: 'danger', text: json.error || 'Failed to send code.' });
        return;
      }
      setMessage({ type: 'success', text: 'Verification code sent to your email.' });
      setStep('reset');
    } catch {
      setMessage({ type: 'danger', text: 'Failed to send code.' });
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage(null);
    if (password !== confirmPassword) {
      setMessage({ type: 'danger', text: 'Passwords do not match.' });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code, password }),
      });
      const json = await res.json();
      if (!json.success) {
        setMessage({ type: 'danger', text: json.error || 'Failed to reset password.' });
        return;
      }
      setMessage({ type: 'success', text: 'Password updated. You can now sign in.' });
    } catch {
      setMessage({ type: 'danger', text: 'Failed to reset password.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-white via-slate-50 to-blue-50 px-6 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Image
            src="/logo.png"
            alt="Octonix Consulting"
            width={240}
            height={60}
            className="h-10 w-auto mx-auto"
            priority
          />
          <p className="text-slate-600 mt-3">Reset your password</p>
        </div>

        <div className="bg-white/80 backdrop-blur-xl border border-white/60 rounded-2xl p-8 shadow-[0_20px_60px_rgba(15,23,42,0.12)]">
          {message && (
            <div className={`mb-4 rounded-lg px-4 py-3 text-sm ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-600 border border-red-200'}`}>
              {message.text}
            </div>
          )}

          {step === 'request' ? (
            <form onSubmit={requestCode} className="space-y-4">
              <Input
                id="email"
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
              <Button type="submit" className="w-full" loading={loading}>
                Send Verification Code
              </Button>
            </form>
          ) : (
            <form onSubmit={resetPassword} className="space-y-4">
              <Input
                id="code"
                label="Verification Code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="123456"
                required
              />
              <Input
                id="password"
                label="New Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <Input
                id="confirmPassword"
                label="Confirm Password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
              <Button type="submit" className="w-full" loading={loading}>
                Reset Password
              </Button>
            </form>
          )}
        </div>

        <div className="text-center mt-6">
          <Link href="/login" className="text-blue-600 hover:text-blue-500 text-sm">
            Back to login
          </Link>
        </div>
      </div>
    </div>
  );
}
