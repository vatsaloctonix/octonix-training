/*
 * CRM Dashboard API Route
 * Get CRM dashboard metrics
 */

import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'crm') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServerClient();

    // Get counts
    const [
      { count: otherCount },
      { count: indexCount },
      { count: courseCount },
      { count: assignmentCount },
    ] = await Promise.all([
      supabase.from('users').select('*', { count: 'exact', head: true }).eq('created_by', user.id).eq('role', 'other'),
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

    // Get "Other" users with progress
    const { data: others } = await supabase
      .from('users')
      .select('id, username, full_name, is_active, created_at')
      .eq('created_by', user.id)
      .eq('role', 'other')
      .order('created_at', { ascending: false });

    const othersWithProgress = await Promise.all(
      (others || []).map(async (other) => {
        const { count: assignedCourses } = await supabase
          .from('course_assignments')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', other.id);

        const { data: progress } = await supabase
          .from('lecture_progress')
          .select('is_completed, time_spent_seconds')
          .eq('user_id', other.id);

        const completedLectures = progress?.filter((p) => p.is_completed).length || 0;
        const totalTimeSpent = progress?.reduce((sum, p) => sum + (p.time_spent_seconds || 0), 0) || 0;

        const { data: lastSession } = await supabase
          .from('user_sessions')
          .select('login_at')
          .eq('user_id', other.id)
          .order('login_at', { ascending: false })
          .limit(1)
          .single();

        return {
          ...other,
          total_courses_assigned: assignedCourses || 0,
          lectures_completed: completedLectures,
          total_time_spent: totalTimeSpent,
          last_active: lastSession?.login_at || null,
        };
      })
    );

    const totalProgress = othersWithProgress.reduce((sum, c) => sum + c.lectures_completed, 0);
    const avgCompletion = othersWithProgress.length > 0
      ? Math.round(totalProgress / othersWithProgress.length)
      : 0;

    const { data: recentActivities } = await supabase
      .from('activity_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);

    return NextResponse.json({
      success: true,
      metrics: {
        total_others: otherCount || 0,
        total_indexes: indexCount || 0,
        total_courses: courseCount || 0,
        total_lectures: lectureCount,
        total_assignments: assignmentCount || 0,
        avg_completion_rate: avgCompletion,
        others: othersWithProgress,
        recent_activities: recentActivities || [],
      },
    });
  } catch (error) {
    console.error('CRM dashboard error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}
