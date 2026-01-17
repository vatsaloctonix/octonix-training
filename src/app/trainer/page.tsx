/*
 * Trainer Dashboard Page
 * Overview of candidates and content
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

interface CandidateProgress {
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
  total_candidates: number;
  total_indexes: number;
  total_courses: number;
  total_lectures: number;
  total_assignments: number;
  avg_completion_rate: number;
  candidates: CandidateProgress[];
}

export default function TrainerDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const res = await fetch('/api/dashboard/trainer');
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
      <Header title="Trainer Dashboard" />

      <div className="p-6 space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <StatsCard
            title="Candidates"
            value={data?.total_candidates || 0}
            icon={Users}
          />
          <StatsCard
            title="Indexes"
            value={data?.total_indexes || 0}
            icon={FolderOpen}
          />
          <StatsCard
            title="Courses"
            value={data?.total_courses || 0}
            icon={BookOpen}
          />
          <StatsCard
            title="Lectures"
            value={data?.total_lectures || 0}
            icon={PlayCircle}
          />
          <StatsCard
            title="Assignments"
            value={data?.total_assignments || 0}
            icon={ClipboardList}
          />
        </div>

        {/* Candidates Progress */}
        <Card>
          <CardHeader
            title="Candidate Progress"
            description="Track your candidates' learning progress"
          />
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Candidate</TableHead>
                  <TableHead>Courses</TableHead>
                  <TableHead>Lectures Completed</TableHead>
                  <TableHead>Time Spent</TableHead>
                  <TableHead>Last Active</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.candidates?.map((candidate) => (
                  <TableRow key={candidate.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar name={candidate.full_name} size="sm" />
                        <div>
                          <p className="font-medium text-white">{candidate.full_name}</p>
                          <p className="text-xs text-slate-500">@{candidate.username}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{candidate.total_courses_assigned}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span>{candidate.lectures_completed}</span>
                      </div>
                    </TableCell>
                    <TableCell>{formatDuration(candidate.total_time_spent)}</TableCell>
                    <TableCell className="text-slate-400">
                      {candidate.last_active ? getRelativeTime(candidate.last_active) : 'Never'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={candidate.is_active ? 'success' : 'danger'}>
                        {candidate.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {(!data?.candidates || data.candidates.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-slate-500 py-8">
                      No candidates yet. Create candidates to get started.
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
