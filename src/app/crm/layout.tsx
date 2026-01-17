/*
 * CRM Layout
 * Layout wrapper for CRM pages
 */

import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { DashboardLayout } from '@/components/layout/dashboard-layout';

export default async function CRMLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  if (user.role !== 'crm') {
    redirect('/');
  }

  return (
    <DashboardLayout role={user.role} userName={user.full_name}>
      {children}
    </DashboardLayout>
  );
}
