/*
 * Login Page
 * Authentication entry point for all users
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Image from 'next/image';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [capsLock, setCapsLock] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.error || 'Login failed');
        setLoading(false);
        return;
      }

      // Redirect to appropriate dashboard
      router.push(data.redirect);
    } catch (err) {
      console.error('Login failed:', err);
      setError('An error occurred. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] bg-gradient-to-br from-white via-slate-50 to-blue-50">
      {/* Left panel */}
      <div className="relative hidden lg:flex flex-col justify-between px-12 py-16 overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-200/40 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-20 w-96 h-96 bg-blue-300/30 rounded-full blur-3xl" />
        </div>

        <div className="relative">
          <Image
            src="/logo.png"
            alt="Octonix Consulting"
            width={240}
            height={60}
            className="h-10 w-auto"
            priority
          />
          <p className="text-slate-600 mt-4 max-w-md">
            Beyond a job offer letter
          </p>
        </div>

        <div className="relative space-y-4 text-sm text-slate-600 max-w-md">
          <div className="bg-white/70 border border-white/60 rounded-2xl p-5 backdrop-blur-xl">
            <p className="font-medium text-slate-900 mb-2">What you can do here</p>
            <ul className="space-y-2">
              <li>- Learn how to crack interviews</li>
              <li>- Change your behaviour for interviews</li>
              <li>- Watch excellent interview replays</li>
            </ul>
          </div>
          <p className="text-xs text-slate-500">
            Please login using the credentials provided by your recruiter or trainer
          </p>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex items-center justify-center px-6 py-12">
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
            <p className="text-slate-600 mt-3">Sign in to continue</p>
          </div>

          <div className="bg-white/80 backdrop-blur-xl border border-white/60 rounded-2xl p-8 shadow-[0_20px_60px_rgba(15,23,42,0.12)]">
            <form onSubmit={handleSubmit} className="space-y-5">
              <Input
                id="username"
                label="Username"
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
                autoFocus
              />

              <div className="relative">
                <Input
                  id="password"
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyUp={(e) => setCapsLock(e.getModifierState('CapsLock'))}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-[34px] text-slate-500 hover:text-slate-900 transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>

              {capsLock && (
                <div className="bg-amber-50 border border-amber-200 text-amber-700 px-3 py-2 rounded-lg text-xs">
                  Caps Lock is on.
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm" role="status">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                className="w-full"
                size="lg"
                loading={loading}
              >
                Sign In
              </Button>
            </form>
          </div>

          <div className="text-center text-sm mt-6">
            <a href="/forgot-password" className="text-blue-600 hover:text-blue-500">
              Forgot your password?
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
