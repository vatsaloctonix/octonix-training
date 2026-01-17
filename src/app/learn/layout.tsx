/*
 * Learner Layout
 * Layout wrapper for candidate/other learning pages
 */

import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { DashboardLayout } from '@/components/layout/dashboard-layout';

export default async function LearnLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  if (!['candidate', 'other'].includes(user.role)) {
    redirect('/');
  }

  return (
    <DashboardLayout role={user.role} userName={user.full_name}>
      {children}
    </DashboardLayout>
  );
}
