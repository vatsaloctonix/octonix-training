/*
 * Profile Layout
 * Shared layout for profile page across roles
 */

import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { DashboardLayout } from '@/components/layout/dashboard-layout';

export default async function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <DashboardLayout role={user.role} userName={user.full_name}>
      {children}
    </DashboardLayout>
  );
}
