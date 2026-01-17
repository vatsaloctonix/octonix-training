/*
 * Admin Dashboard Page
 * Overview of platform metrics and user activity
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
  GraduationCap,
  UserCog,
  BookOpen,
  Activity,
} from 'lucide-react';
import { getRelativeTime } from '@/lib/utils';

interface DashboardData {
  total_trainers: number;
  total_crm: number;
  total_candidates: number;
  total_others: number;
  total_courses: number;
  trainers: TrainerStats[];
  crms: CRMStats[];
  recent_activities: ActivityLog[];
}

interface TrainerStats {
  id: string;
  username: string;
  full_name: string;
  is_active: boolean;
  total_candidates: number;
  total_indexes: number;
  total_courses: number;
  last_active: string | null;
}

interface CRMStats {
  id: string;
  username: string;
  full_name: string;
  is_active: boolean;
  total_others: number;
  total_indexes: number;
  total_courses: number;
  last_active: string | null;
}

interface ActivityLog {
  id: string;
  action: string;
  created_at: string;
  user: { username: string; full_name: string } | null;
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const res = await fetch('/api/dashboard/admin');
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

  const formatAction = (action: string) => {
    return action
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="h-8 w-48 bg-slate-800 rounded skeleton mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-slate-800 rounded-xl skeleton" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header title="Admin Dashboard" />

      <div className="p-6 space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <StatsCard
            title="Trainers"
            value={data?.total_trainers || 0}
            icon={GraduationCap}
          />
          <StatsCard
            title="CRM Users"
            value={data?.total_crm || 0}
            icon={UserCog}
          />
          <StatsCard
            title="Candidates"
            value={data?.total_candidates || 0}
            icon={Users}
          />
          <StatsCard
            title="Staff (Others)"
            value={data?.total_others || 0}
            icon={Users}
          />
          <StatsCard
            title="Total Courses"
            value={data?.total_courses || 0}
            icon={BookOpen}
          />
        </div>

        {/* Tables Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Trainers Table */}
          <Card>
            <CardHeader title="Trainers" description="All trainer accounts" />
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Trainer</TableHead>
                    <TableHead>Candidates</TableHead>
                    <TableHead>Courses</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.trainers?.slice(0, 5).map((trainer) => (
                    <TableRow key={trainer.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar name={trainer.full_name} size="sm" />
                          <div>
                            <p className="font-medium text-white">{trainer.full_name}</p>
                            <p className="text-xs text-slate-500">@{trainer.username}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{trainer.total_candidates}</TableCell>
                      <TableCell>{trainer.total_courses}</TableCell>
                      <TableCell>
                        <Badge variant={trainer.is_active ? 'success' : 'danger'}>
                          {trainer.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!data?.trainers || data.trainers.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-slate-500 py-8">
                        No trainers yet
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* CRM Table */}
          <Card>
            <CardHeader title="CRM Users" description="All CRM accounts" />
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>CRM User</TableHead>
                    <TableHead>Staff</TableHead>
                    <TableHead>Courses</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.crms?.slice(0, 5).map((crm) => (
                    <TableRow key={crm.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar name={crm.full_name} size="sm" />
                          <div>
                            <p className="font-medium text-white">{crm.full_name}</p>
                            <p className="text-xs text-slate-500">@{crm.username}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{crm.total_others}</TableCell>
                      <TableCell>{crm.total_courses}</TableCell>
                      <TableCell>
                        <Badge variant={crm.is_active ? 'success' : 'danger'}>
                          {crm.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!data?.crms || data.crms.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-slate-500 py-8">
                        No CRM users yet
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card>
          <CardHeader
            title="Recent Activity"
            description="Latest actions across the platform"
            action={<Activity className="w-5 h-5 text-slate-400" />}
          />
          <CardContent>
            <div className="space-y-4">
              {data?.recent_activities?.slice(0, 10).map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-center gap-4 py-2 border-b border-slate-700/50 last:border-0"
                >
                  <div className="w-2 h-2 bg-blue-500 rounded-full" />
                  <div className="flex-1">
                    <p className="text-sm text-white">
                      <span className="font-medium">
                        {activity.user?.full_name || 'Unknown'}
                      </span>
                      {' '}
                      {formatAction(activity.action).toLowerCase()}
                    </p>
                    <p className="text-xs text-slate-500">
                      {getRelativeTime(activity.created_at)}
                    </p>
                  </div>
                </div>
              ))}
              {(!data?.recent_activities || data.recent_activities.length === 0) && (
                <p className="text-center text-slate-500 py-4">No recent activity</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
