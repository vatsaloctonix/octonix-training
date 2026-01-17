/*
 * Admin Layout
 * Layout wrapper for admin pages
 */

import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { DashboardLayout } from '@/components/layout/dashboard-layout';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  if (user.role !== 'admin') {
    redirect('/');
  }

  return (
    <DashboardLayout role={user.role} userName={user.full_name}>
      {children}
    </DashboardLayout>
  );
}
