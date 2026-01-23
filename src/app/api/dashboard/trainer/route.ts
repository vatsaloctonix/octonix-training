/*
 * Trainer Dashboard API Route
 * Get trainer dashboard metrics
 */

import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'trainer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServerClient();

    // Get counts
    const [
      { count: candidateCount },
      { count: indexCount },
      { count: courseCount },
      { count: assignmentCount },
    ] = await Promise.all([
      supabase.from('users').select('*', { count: 'exact', head: true }).eq('created_by', user.id).eq('role', 'candidate'),
      supabase.from('indexes').select('*', { count: 'exact', head: true }).eq('created_by', user.id),
      supabase.from('courses').select('*', { count: 'exact', head: true }).eq('created_by', user.id),
      supabase.from('course_assignments').select('*', { count: 'exact', head: true }).eq('assigned_by', user.id),
    ]);

    // Get lecture count
    const { data: courses } = await supabase
      .from('courses')
      .select('id')
      .eq('created_by', user.id);

    let lectureCount = 0;
    if (courses && courses.length > 0) {
      const { count } = await supabase
        .from('lectures')
        .select('*, section:sections!inner(course_id)', { count: 'exact', head: true })
        .in('section.course_id', courses.map((c) => c.id));
      lectureCount = count || 0;
    }

    // Get candidates with progress
    const { data: candidates } = await supabase
      .from('users')
      .select('id, username, full_name, is_active, created_at')
      .eq('created_by', user.id)
      .eq('role', 'candidate')
      .order('created_at', { ascending: false });

    const candidatesWithProgress = await Promise.all(
      (candidates || []).map(async (candidate) => {
        // Get assignment count
        const { count: assignedCourses } = await supabase
          .from('course_assignments')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', candidate.id);

        // Get progress
        const { data: progress } = await supabase
          .from('lecture_progress')
          .select('is_completed, time_spent_seconds')
          .eq('user_id', candidate.id);

        const completedLectures = progress?.filter((p) => p.is_completed).length || 0;
        const totalTimeSpent = progress?.reduce((sum, p) => sum + (p.time_spent_seconds || 0), 0) || 0;

        // Get last session
        const { data: lastSession } = await supabase
          .from('user_sessions')
          .select('login_at')
          .eq('user_id', candidate.id)
          .order('login_at', { ascending: false })
          .limit(1)
          .single();

        return {
          ...candidate,
          total_courses_assigned: assignedCourses || 0,
          lectures_completed: completedLectures,
          total_time_spent: totalTimeSpent,
          last_active: lastSession?.login_at || null,
        };
      })
    );

    const now = Date.now();
    const activeLast7Days = candidatesWithProgress.filter((c) =>
      c.last_active ? now - new Date(c.last_active).getTime() <= 7 * 24 * 60 * 60 * 1000 : false
    ).length;

    const stalledCandidates = candidatesWithProgress.filter((c) =>
      !c.last_active || now - new Date(c.last_active).getTime() > 14 * 24 * 60 * 60 * 1000
    ).length;

    const totalTimeSpent = candidatesWithProgress.reduce((sum, c) => sum + c.total_time_spent, 0);

    // Calculate avg completion rate
    const totalProgress = candidatesWithProgress.reduce((sum, c) => sum + c.lectures_completed, 0);
    const avgCompletion = candidatesWithProgress.length > 0
      ? Math.round(totalProgress / candidatesWithProgress.length)
      : 0;

    // Recent activity
    const { data: recentActivities } = await supabase
      .from('activity_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);

    return NextResponse.json({
      success: true,
      metrics: {
        total_candidates: candidateCount || 0,
        total_indexes: indexCount || 0,
        total_courses: courseCount || 0,
        total_lectures: lectureCount,
        total_assignments: assignmentCount || 0,
        avg_completion_rate: avgCompletion,
        active_last_7_days: activeLast7Days,
        stalled_candidates: stalledCandidates,
        total_time_spent: totalTimeSpent,
        candidates: candidatesWithProgress,
        recent_activities: recentActivities || [],
      },
    });
  } catch (error) {
    console.error('Trainer dashboard error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}
