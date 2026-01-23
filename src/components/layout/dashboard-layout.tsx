/*
 * Dashboard Layout Component
 * Wrapper for authenticated dashboard pages
 */

'use client';

import { ReactNode, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from './sidebar';
import type { UserRole } from '@/types';

interface DashboardLayoutProps {
  children: ReactNode;
  role: UserRole;
  userName: string;
}

export function DashboardLayout({ children, role, userName }: DashboardLayoutProps) {
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <div className="min-h-screen bg-transparent">
      <Sidebar
        role={role}
        userName={userName}
        collapsed={collapsed}
        onToggle={() => setCollapsed((prev) => !prev)}
        onLogout={handleLogout}
      />
      <main className={`min-h-screen bg-transparent animate-fadeIn ${collapsed ? 'ml-20' : 'ml-64'}`}>
        {children}
      </main>
    </div>
  );
}
