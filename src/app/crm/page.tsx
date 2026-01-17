/*
 * CRM Dashboard Page
 * Overview of staff users and content (mirrors trainer dashboard)
 */

'use client';

import { useEffect, useState } from 'react';
import { Header } from '@/components/layout/header';
import { StatsCard } from '@/components/ui/stats-card';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import {
  Users,
  FolderOpen,
  BookOpen,
  PlayCircle,
  ClipboardList,
} from 'lucide-react';
import { formatDuration, getRelativeTime } from '@/lib/utils';

interface OtherProgress {
  id: string;
  username: string;
  full_name: string;
  is_active: boolean;
  total_courses_assigned: number;
  lectures_completed: number;
  total_time_spent: number;
  last_active: string | null;
}

interface DashboardData {
  total_others: number;
  total_indexes: number;
  total_courses: number;
  total_lectures: number;
  total_assignments: number;
  avg_completion_rate: number;
  others: OtherProgress[];
}

export default function CRMDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const res = await fetch('/api/dashboard/crm');
      const json = await res.json();
      if (json.success) {
        setData(json.metrics);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="h-8 w-48 bg-slate-800 rounded skeleton mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-32 bg-slate-800 rounded-xl skeleton" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header title="CRM Dashboard" />

      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <StatsCard title="Staff Users" value={data?.total_others || 0} icon={Users} />
          <StatsCard title="Indexes" value={data?.total_indexes || 0} icon={FolderOpen} />
          <StatsCard title="Courses" value={data?.total_courses || 0} icon={BookOpen} />
          <StatsCard title="Lectures" value={data?.total_lectures || 0} icon={PlayCircle} />
          <StatsCard title="Assignments" value={data?.total_assignments || 0} icon={ClipboardList} />
        </div>

        <Card>
          <CardHeader title="Staff Progress" description="Track your staff's learning progress" />
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Staff Member</TableHead>
                  <TableHead>Courses</TableHead>
                  <TableHead>Lectures Completed</TableHead>
                  <TableHead>Time Spent</TableHead>
                  <TableHead>Last Active</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.others?.map((other) => (
                  <TableRow key={other.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar name={other.full_name} size="sm" />
                        <div>
                          <p className="font-medium text-white">{other.full_name}</p>
                          <p className="text-xs text-slate-500">@{other.username}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{other.total_courses_assigned}</TableCell>
                    <TableCell>{other.lectures_completed}</TableCell>
                    <TableCell>{formatDuration(other.total_time_spent)}</TableCell>
                    <TableCell className="text-slate-400">
                      {other.last_active ? getRelativeTime(other.last_active) : 'Never'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={other.is_active ? 'success' : 'danger'}>
                        {other.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {(!data?.others || data.others.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-slate-500 py-8">
                      No staff users yet. Create staff users to get started.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
