/*
 * Invite Accept Page
 * Set password for invited users
 */

'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import Image from 'next/image';

export default function InviteAcceptPage() {
  const params = useParams();
  const router = useRouter();
  const token = Array.isArray(params.token) ? params.token[0] : params.token;

  const [loading, setLoading] = useState(true);
  const [userInfo, setUserInfo] = useState<{ username: string; full_name: string; email: string } | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'danger'; text: string } | null>(null);

  useEffect(() => {
    const verify = async () => {
      if (!token) return;
      setLoading(true);
      try {
        const res = await fetch(`/api/auth/invite?token=${token}`);
        const json = await res.json();
        if (!json.success) {
          setMessage({ type: 'danger', text: json.error || 'Invite not valid.' });
          return;
        }
        setUserInfo(json.user);
      } catch {
        setMessage({ type: 'danger', text: 'Invite not valid.' });
      } finally {
        setLoading(false);
      }
    };

    verify();
  }, [token]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage(null);

    if (password !== confirmPassword) {
      setMessage({ type: 'danger', text: 'Passwords do not match.' });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/auth/invite/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const json = await res.json();
      if (!json.success) {
        setMessage({ type: 'danger', text: json.error || 'Failed to set password.' });
        return;
      }
      setMessage({ type: 'success', text: 'Password set! Redirecting to login...' });
      setTimeout(() => router.push('/login'), 1200);
    } catch {
      setMessage({ type: 'danger', text: 'Failed to set password.' });
    } finally {
      setSaving(false);
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
          <p className="text-slate-600 mt-3">Create your password</p>
        </div>

        <div className="bg-white/80 backdrop-blur-xl border border-white/60 rounded-2xl p-8 shadow-[0_20px_60px_rgba(15,23,42,0.12)]">
          {message && (
            <div className={`mb-4 rounded-lg px-4 py-3 text-sm ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-600 border border-red-200'}`}>
              {message.text}
            </div>
          )}

          {loading ? (
            <div className="text-sm text-slate-500">Verifying invite...</div>
          ) : !userInfo ? (
            <div className="text-sm text-slate-500">Invite not available.</div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                id="username"
                label="Username"
                value={userInfo.username}
                disabled
              />
              <Input
                id="email"
                label="Email"
                value={userInfo.email}
                disabled
              />
              <Input
                id="password"
                label="Password"
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
              <Button type="submit" className="w-full" loading={saving}>
                Set Password
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
