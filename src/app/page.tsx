/*
 * Root Page
 * Redirects to login or appropriate dashboard
 */

import { redirect } from 'next/navigation';
import { getCurrentUser, getDashboardPath } from '@/lib/auth';

export default async function RootPage() {
  const user = await getCurrentUser();

  if (user) {
    redirect(getDashboardPath(user.role));
  }

  redirect('/login');
}
