/*
 * Admin Dashboard API Route
 * Get admin dashboard metrics
 */

import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServerClient();

    // Get counts
    const [
      { count: trainerCount },
      { count: crmCount },
      { count: candidateCount },
      { count: otherCount },
      { count: courseCount },
    ] = await Promise.all([
      supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'trainer'),
      supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'crm'),
      supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'candidate'),
      supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'other'),
      supabase.from('courses').select('*', { count: 'exact', head: true }),
    ]);

    // Get trainer stats
    const { data: trainers } = await supabase
      .from('users')
      .select(`
        id,
        username,
        full_name,
        is_active,
        created_at
      `)
      .eq('role', 'trainer')
      .order('created_at', { ascending: false });

    // Enrich trainer data with counts
    const trainerStats = await Promise.all(
      (trainers || []).map(async (trainer) => {
        const [
          { count: candidateCount },
          { count: indexCount },
          { count: courseCount },
        ] = await Promise.all([
          supabase.from('users').select('*', { count: 'exact', head: true }).eq('created_by', trainer.id),
          supabase.from('indexes').select('*', { count: 'exact', head: true }).eq('created_by', trainer.id),
          supabase.from('courses').select('*', { count: 'exact', head: true }).eq('created_by', trainer.id),
        ]);

        const { data: lastSession } = await supabase
          .from('user_sessions')
          .select('login_at')
          .eq('user_id', trainer.id)
          .order('login_at', { ascending: false })
          .limit(1)
          .single();

        return {
          ...trainer,
          total_candidates: candidateCount || 0,
          total_indexes: indexCount || 0,
          total_courses: courseCount || 0,
          last_active: lastSession?.login_at || null,
        };
      })
    );

    // Get CRM stats
    const { data: crms } = await supabase
      .from('users')
      .select(`
        id,
        username,
        full_name,
        is_active,
        created_at
      `)
      .eq('role', 'crm')
      .order('created_at', { ascending: false });

    const crmStats = await Promise.all(
      (crms || []).map(async (crm) => {
        const [
          { count: otherCount },
          { count: indexCount },
          { count: courseCount },
        ] = await Promise.all([
          supabase.from('users').select('*', { count: 'exact', head: true }).eq('created_by', crm.id),
          supabase.from('indexes').select('*', { count: 'exact', head: true }).eq('created_by', crm.id),
          supabase.from('courses').select('*', { count: 'exact', head: true }).eq('created_by', crm.id),
        ]);

        const { data: lastSession } = await supabase
          .from('user_sessions')
          .select('login_at')
          .eq('user_id', crm.id)
          .order('login_at', { ascending: false })
          .limit(1)
          .single();

        return {
          ...crm,
          total_others: otherCount || 0,
          total_indexes: indexCount || 0,
          total_courses: courseCount || 0,
          last_active: lastSession?.login_at || null,
        };
      })
    );

    // Get recent activity
    const { data: recentActivities } = await supabase
      .from('activity_logs')
      .select(`
        *,
        user:users(username, full_name)
      `)
      .order('created_at', { ascending: false })
      .limit(20);

    return NextResponse.json({
      success: true,
      metrics: {
        total_trainers: trainerCount || 0,
        total_crm: crmCount || 0,
        total_candidates: candidateCount || 0,
        total_others: otherCount || 0,
        total_courses: courseCount || 0,
        trainers: trainerStats,
        crms: crmStats,
        recent_activities: recentActivities || [],
      },
    });
  } catch (error) {
    console.error('Admin dashboard error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}
