/*
 * Learner Dashboard API Route
 * Get dashboard metrics for candidates and others
 */

import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || !['candidate', 'other'].includes(user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServerClient();

    // Get assigned courses (direct and through index)
    const { data: courseAssignments } = await supabase
      .from('course_assignments')
      .select('course_id')
      .eq('user_id', user.id);

    const { data: indexAssignments } = await supabase
      .from('index_assignments')
      .select('index_id')
      .eq('user_id', user.id);

    // Get courses from index assignments
    let indexCourseIds: string[] = [];
    if (indexAssignments && indexAssignments.length > 0) {
      const { data: indexCourses } = await supabase
        .from('courses')
        .select('id')
        .in('index_id', indexAssignments.map((ia) => ia.index_id));
      indexCourseIds = indexCourses?.map((c) => c.id) || [];
    }

    // Combine unique course IDs
    const directCourseIds = courseAssignments?.map((ca) => ca.course_id) || [];
    const allCourseIds = [...new Set([...directCourseIds, ...indexCourseIds])];

    if (allCourseIds.length === 0) {
      return NextResponse.json({
        success: true,
        metrics: {
          total_courses: 0,
          completed_courses: 0,
          total_lectures: 0,
          completed_lectures: 0,
          total_time_spent: 0,
          current_streak: 0,
          assigned_courses: [],
        },
      });
    }

    // Get full course data
    const { data: courses } = await supabase
      .from('courses')
      .select(`
        *,
        index:indexes(id, name),
        sections(
          id,
          lectures(id, duration_seconds)
        )
      `)
      .in('id', allCourseIds)
      .eq('is_active', true);

    // Get user's progress
    const { data: progress } = await supabase
      .from('lecture_progress')
      .select('*')
      .eq('user_id', user.id);

    const progressMap = new Map(progress?.map((p) => [p.lecture_id, p]) || []);

    // Calculate course-level stats
    const coursesWithProgress = (courses || []).map((course) => {
      const sections = course.sections as { id: string; lectures: { id: string; duration_seconds: number }[] }[];
      const allLectures = sections.flatMap((s) => s.lectures);
      const totalLectures = allLectures.length;
      const completedLectures = allLectures.filter((l) => progressMap.get(l.id)?.is_completed).length;
      const totalDuration = allLectures.reduce((sum, l) => sum + (l.duration_seconds || 0), 0);

      return {
        id: course.id,
        title: course.title,
        description: course.description,
        thumbnail_url: course.thumbnail_url,
        index_name: (course.index as { name: string })?.name,
        index_id: (course.index as { id: string })?.id,
        section_count: sections.length,
        lecture_count: totalLectures,
        completed_lectures: completedLectures,
        total_duration: totalDuration,
        completion_percentage: totalLectures > 0 ? Math.round((completedLectures / totalLectures) * 100) : 0,
      };
    });

    const indexMap = new Map<string, {
      id: string;
      name: string;
      course_count: number;
      completed_courses: number;
      total_lectures: number;
      completed_lectures: number;
    }>();

    coursesWithProgress.forEach((course) => {
      if (!course.index_id) return;
      const existing = indexMap.get(course.index_id);
      if (!existing) {
        indexMap.set(course.index_id, {
          id: course.index_id,
          name: course.index_name || 'Untitled',
          course_count: 1,
          completed_courses: course.completion_percentage === 100 ? 1 : 0,
          total_lectures: course.lecture_count,
          completed_lectures: course.completed_lectures,
        });
      } else {
        existing.course_count += 1;
        existing.completed_courses += course.completion_percentage === 100 ? 1 : 0;
        existing.total_lectures += course.lecture_count;
        existing.completed_lectures += course.completed_lectures;
      }
    });

    // Overall stats
    const totalLectures = coursesWithProgress.reduce((sum, c) => sum + c.lecture_count, 0);
    const completedLectures = coursesWithProgress.reduce((sum, c) => sum + c.completed_lectures, 0);
    const completedCourses = coursesWithProgress.filter((c) => c.completion_percentage === 100).length;
    const totalTimeSpent = progress?.reduce((sum, p) => sum + (p.time_spent_seconds || 0), 0) || 0;

    // Calculate streak (consecutive days with activity)
    const { data: sessions } = await supabase
      .from('user_sessions')
      .select('login_at')
      .eq('user_id', user.id)
      .order('login_at', { ascending: false })
      .limit(30);

    let streak = 0;
    if (sessions && sessions.length > 0) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const uniqueDays = new Set(
        sessions.map((s) => {
          const d = new Date(s.login_at);
          d.setHours(0, 0, 0, 0);
          return d.getTime();
        })
      );

      const sortedDays = Array.from(uniqueDays).sort((a, b) => b - a);
      const oneDay = 24 * 60 * 60 * 1000;

      for (let i = 0; i < sortedDays.length; i++) {
        const expectedDay = today.getTime() - i * oneDay;
        if (sortedDays[i] === expectedDay || (i === 0 && sortedDays[i] === expectedDay - oneDay)) {
          streak++;
        } else if (i === 0 && sortedDays[i] < expectedDay - oneDay) {
          break;
        } else {
          break;
        }
      }
    }

    return NextResponse.json({
      success: true,
      metrics: {
        total_courses: coursesWithProgress.length,
        completed_courses: completedCourses,
        total_lectures: totalLectures,
        completed_lectures: completedLectures,
        total_time_spent: totalTimeSpent,
        current_streak: streak,
        assigned_indexes: Array.from(indexMap.values()),
        assigned_courses: coursesWithProgress,
      },
    });
  } catch (error) {
    console.error('Learner dashboard error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}
