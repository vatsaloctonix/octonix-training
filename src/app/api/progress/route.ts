/*
 * Progress API Route
 * Track and update learning progress
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/auth';

// GET - Get progress for current user or specific user
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const targetUserId = searchParams.get('user_id');
    const courseId = searchParams.get('course_id');

    const supabase = createServerClient();

    // Determine which user's progress to fetch
    let userId = user.id;
    if (targetUserId && ['trainer', 'crm', 'admin'].includes(user.role)) {
      // Trainers/CRM can view their candidates' progress
      if (user.role !== 'admin') {
        const { data: targetUser } = await supabase
          .from('users')
          .select('id, created_by')
          .eq('id', targetUserId)
          .single();

        if (!targetUser || targetUser.created_by !== user.id) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
      }
      userId = targetUserId;
    }

    if (courseId) {
      if (['candidate', 'other'].includes(user.role)) {
        const { data: course } = await supabase
          .from('courses')
          .select('id, index_id, is_active')
          .eq('id', courseId)
          .single();

        if (!course || !course.is_active) {
          return NextResponse.json(
            { success: false, error: 'Course not available' },
            { status: 404 }
          );
        }

        const { data: directAssignment } = await supabase
          .from('course_assignments')
          .select('id')
          .eq('user_id', user.id)
          .eq('course_id', courseId)
          .single();

        let hasAccess = !!directAssignment;

        if (!hasAccess) {
          const { data: indexAssignment } = await supabase
            .from('index_assignments')
            .select('id')
            .eq('user_id', user.id)
            .eq('index_id', course.index_id)
            .single();

          hasAccess = !!indexAssignment;
        }

        if (!hasAccess) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
      }

      const { data: sections, error: sectionsError } = await supabase
        .from('sections')
        .select('id')
        .eq('course_id', courseId);

      if (sectionsError) throw sectionsError;

      const sectionIds = sections?.map((s) => s.id) || [];

      if (sectionIds.length === 0) {
        return NextResponse.json({
          success: true,
          progress: [],
          summary: {
            total_lectures: 0,
            completed_lectures: 0,
            total_time_spent_seconds: 0,
          },
        });
      }

      const { data: lectures, error: lecturesError } = await supabase
        .from('lectures')
        .select('id')
        .in('section_id', sectionIds);

      if (lecturesError) throw lecturesError;

      const lectureIds = lectures?.map((l) => l.id) || [];

      if (lectureIds.length === 0) {
        return NextResponse.json({
          success: true,
          progress: [],
          summary: {
            total_lectures: 0,
            completed_lectures: 0,
            total_time_spent_seconds: 0,
          },
        });
      }

      const { data: progress, error } = await supabase
        .from('lecture_progress')
        .select('*')
        .eq('user_id', userId)
        .in('lecture_id', lectureIds);

      if (error) throw error;

      const completed = progress?.filter((p) => p.is_completed).length || 0;
      const totalTimeSpent = progress?.reduce((sum, p) => sum + (p.time_spent_seconds || 0), 0) || 0;

      return NextResponse.json({
        success: true,
        progress: progress || [],
        summary: {
          total_lectures: lectureIds.length,
          completed_lectures: completed,
          total_time_spent_seconds: totalTimeSpent,
        },
      });
    }

    const { data: progress, error } = await supabase
      .from('lecture_progress')
      .select(`
        *,
        lecture:lectures(
          id,
          title,
          section:sections(
            id,
            title,
            course:courses(id, title)
          )
        )
      `)
      .eq('user_id', userId);

    if (error) throw error;

    // Calculate summary stats
    const completed = progress?.filter((p) => p.is_completed).length || 0;
    const totalTimeSpent = progress?.reduce((sum, p) => sum + (p.time_spent_seconds || 0), 0) || 0;

    return NextResponse.json({
      success: true,
      progress: progress || [],
      summary: {
        total_lectures: progress?.length || 0,
        completed_lectures: completed,
        total_time_spent_seconds: totalTimeSpent,
      },
    });
  } catch (error) {
    console.error('Get progress error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch progress' },
      { status: 500 }
    );
  }
}

// POST - Update progress for a lecture
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only candidates/others can update their own progress
    if (!['candidate', 'other'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { lecture_id, time_spent_seconds, is_completed } = body;

    if (!lecture_id) {
      return NextResponse.json(
        { success: false, error: 'Lecture ID is required' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    const { data: lecture, error: lectureError } = await supabase
      .from('lectures')
      .select(`
        id,
        section:sections(
          course:courses(id, index_id)
        )
      `)
      .eq('id', lecture_id)
      .single();

    if (lectureError || !lecture) {
      return NextResponse.json(
        { success: false, error: 'Lecture not found' },
        { status: 404 }
      );
    }

    const course = (lecture.section as { course: { id: string; index_id: string } })?.course;
    if (!course) {
      return NextResponse.json(
        { success: false, error: 'Lecture not linked to a course' },
        { status: 400 }
      );
    }

    const { data: directAssignment } = await supabase
      .from('course_assignments')
      .select('id')
      .eq('user_id', user.id)
      .eq('course_id', course.id)
      .single();

    let hasAccess = !!directAssignment;

    if (!hasAccess) {
      const { data: indexAssignment } = await supabase
        .from('index_assignments')
        .select('id')
        .eq('user_id', user.id)
        .eq('index_id', course.index_id)
        .single();

      hasAccess = !!indexAssignment;
    }

    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check if progress record exists
    const { data: existing } = await supabase
      .from('lecture_progress')
      .select('*')
      .eq('user_id', user.id)
      .eq('lecture_id', lecture_id)
      .single();

    const now = new Date().toISOString();

    if (existing) {
      // Update existing progress
      const updates: Record<string, unknown> = {
        last_watched_at: now,
      };

      if (typeof time_spent_seconds === 'number') {
        updates.time_spent_seconds = existing.time_spent_seconds + time_spent_seconds;
      }

      if (is_completed && !existing.is_completed) {
        updates.is_completed = true;
        updates.completed_at = now;
      }

      const { data: updated, error } = await supabase
        .from('lecture_progress')
        .update(updates)
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw error;

      return NextResponse.json({ success: true, progress: updated });
    } else {
      // Create new progress record
      const { data: created, error } = await supabase
        .from('lecture_progress')
        .insert({
          user_id: user.id,
          lecture_id,
          time_spent_seconds: time_spent_seconds || 0,
          is_completed: is_completed || false,
          last_watched_at: now,
          completed_at: is_completed ? now : null,
        })
        .select()
        .single();

      if (error) throw error;

      return NextResponse.json({ success: true, progress: created });
    }
  } catch (error) {
    console.error('Update progress error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update progress' },
      { status: 500 }
    );
  }
}
