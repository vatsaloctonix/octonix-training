/*
 * Learner Dashboard Page
 * Shows assigned courses and progress
 */

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Header } from '@/components/layout/header';
import { StatsCard } from '@/components/ui/stats-card';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { EmptyState } from '@/components/ui/empty-state';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  BookOpen,
  PlayCircle,
  Clock,
  Trophy,
  Flame,
  CheckCircle,
} from 'lucide-react';
import { formatDuration } from '@/lib/utils';
import Image from 'next/image';

interface CourseWithProgress {
  id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  index_name: string;
  index_id?: string;
  section_count: number;
  lecture_count: number;
  completed_lectures: number;
  total_duration: number;
  completion_percentage: number;
}

interface AssignedIndex {
  id: string;
  name: string;
  course_count: number;
  completed_courses: number;
  total_lectures: number;
  completed_lectures: number;
}

interface DashboardData {
  total_courses: number;
  completed_courses: number;
  total_lectures: number;
  completed_lectures: number;
  total_time_spent: number;
  current_streak: number;
  assigned_indexes?: AssignedIndex[];
  assigned_courses: CourseWithProgress[];
}

export default function LearnDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState<string>('all');

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const res = await fetch('/api/dashboard/learner');
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
        <div className="h-8 w-48 bg-white/70 rounded skeleton mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-white/70 rounded-xl skeleton" />
          ))}
        </div>
      </div>
    );
  }

  const nextCourse = data?.assigned_courses.find((course) => course.completion_percentage < 100) || null;
  const indexOptions = data?.assigned_indexes || [];

  return (
    <div>
      <Header
        title="Learning Hub"
        subtitle="Pick up where you left off and keep your streak alive."
        meta={[
          { label: 'Streak', value: `${data?.current_streak || 0} days` },
          { label: 'Time spent', value: formatDuration(data?.total_time_spent || 0) },
        ]}
        showSearch
        onSearch={setSearch}
        searchPlaceholder="Search courses..."
      />

      <div className="p-6 space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatsCard
            title="Courses Assigned"
            value={data?.total_courses || 0}
            description={`${data?.completed_courses || 0} completed`}
            icon={BookOpen}
          />
          <StatsCard
            title="Lectures Completed"
            value={data?.completed_lectures || 0}
            description={`of ${data?.total_lectures || 0} total`}
            icon={CheckCircle}
          />
          <StatsCard
            title="Time Spent"
            value={formatDuration(data?.total_time_spent || 0)}
            icon={Clock}
          />
          <StatsCard
            title="Current Streak"
            value={`${data?.current_streak || 0} days`}
            icon={Flame}
          />
        </div>

        {/* Courses */}
        <Card>
          <CardHeader
            title="My Courses"
            description="Continue learning where you left off"
          />
          <CardContent>
            {nextCourse && (
              <div className="mb-6 rounded-2xl border border-blue-200/60 bg-blue-50/60 p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-wide text-blue-600">Continue learning</p>
                  <h3 className="text-lg font-semibold text-slate-900 mt-1">{nextCourse.title}</h3>
                  <p className="text-sm text-slate-600 mt-1">
                    {nextCourse.completed_lectures} of {nextCourse.lecture_count} lectures completed
                  </p>
                </div>
                <Link href={`/learn/course/${nextCourse.id}`}>
                  <Button size="sm">
                    Resume Course
                  </Button>
                </Link>
              </div>
            )}
            {(() => {
              const term = search.trim().toLowerCase();
              const courses = data?.assigned_courses || [];
              const indexFiltered = selectedIndex === 'all'
                ? courses
                : courses.filter((course) => course.index_id === selectedIndex);
              const filteredCourses = term
                ? indexFiltered.filter((course) =>
                    course.title.toLowerCase().includes(term) ||
                    course.index_name.toLowerCase().includes(term)
                  )
                : indexFiltered;

              if (filteredCourses.length === 0) {
                return (
                  <EmptyState
                    icon={BookOpen}
                    title={term ? 'No matching courses' : 'No courses assigned yet'}
                    description={term ? 'Try a different search term' : 'Your trainer will assign courses for you to learn'}
                  />
                );
              }

              return (
                <div className="space-y-4">
                  {indexOptions.length > 1 && (
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setSelectedIndex('all')}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border ${
                          selectedIndex === 'all'
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white/70 text-slate-600 border-slate-200 hover:border-blue-200'
                        }`}
                      >
                        All indexes
                      </button>
                      {indexOptions.map((index) => (
                        <button
                          key={index.id}
                          onClick={() => setSelectedIndex(index.id)}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium border ${
                            selectedIndex === index.id
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-white/70 text-slate-600 border-slate-200 hover:border-blue-200'
                          }`}
                        >
                          {index.name} ({index.completed_courses}/{index.course_count})
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredCourses.map((course) => (
                    <Link
                      key={course.id}
                      href={`/learn/course/${course.id}`}
                      className="block"
                    >
                      <div className="bg-white/70 border border-white/60 rounded-2xl overflow-hidden hover:border-blue-200 transition-colors backdrop-blur-xl shadow-sm group">
                        {/* Thumbnail */}
                        <div className="relative aspect-video bg-slate-100 flex items-center justify-center">
                          {course.thumbnail_url ? (
                            <Image
                              src={course.thumbnail_url}
                              alt={course.title}
                              fill
                              sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                              className="object-contain"
                              unoptimized
                            />
                          ) : (
                            <BookOpen className="w-12 h-12 text-slate-400 group-hover:text-blue-600 transition-colors" />
                          )}

                          {/* Completion badge */}
                          {course.completion_percentage === 100 && (
                            <div className="absolute top-2 right-2">
                              <div className="bg-green-600 rounded-full p-1">
                                <Trophy className="w-4 h-4 text-white" />
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Content */}
                        <div className="p-4">
                          <Badge variant="info" size="sm" className="mb-2">
                            {course.index_name}
                          </Badge>

                          <h3 className="font-semibold text-slate-900 mb-2 line-clamp-1 group-hover:text-blue-600 transition-colors">
                            {course.title}
                          </h3>

                          {/* Progress */}
                          <div className="mb-3">
                            <div className="flex items-center justify-between text-sm mb-1">
                              <span className="text-slate-600">
                                {course.completed_lectures} / {course.lecture_count} lectures
                              </span>
                              <span className="text-blue-600">
                                {course.completion_percentage}%
                              </span>
                            </div>
                            <Progress value={course.completion_percentage} size="sm" />
                          </div>

                          {/* Meta */}
                          <div className="flex items-center gap-4 text-sm text-slate-500">
                            <span className="flex items-center gap-1">
                              <PlayCircle className="w-4 h-4" />
                              {course.lecture_count}
                            </span>
                            {course.total_duration > 0 && (
                              <span className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                {formatDuration(course.total_duration)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                  </div>
                </div>
              );
            })()}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
