/*
 * Learner Indexes Page
 * Browse assigned indexes and courses
 */

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Header } from '@/components/layout/header';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { EmptyState } from '@/components/ui/empty-state';
import { Badge } from '@/components/ui/badge';
import { BookOpen } from 'lucide-react';
import { formatDuration } from '@/lib/utils';

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
  assigned_indexes?: AssignedIndex[];
  assigned_courses: CourseWithProgress[];
  total_time_spent: number;
}

export default function LearnerIndexesPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await fetch('/api/dashboard/learner');
        const json = await res.json();
        if (json.success) {
          setData(json.metrics);
          const firstIndex = json.metrics.assigned_indexes?.[0]?.id || null;
          setSelectedIndex(firstIndex);
        }
      } catch (error) {
        console.error('Failed to fetch dashboard:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="p-6">
        <div className="h-8 w-48 bg-white/70 rounded skeleton mb-6" />
        <div className="h-64 bg-white/70 rounded-xl skeleton" />
      </div>
    );
  }

  const indexes = data?.assigned_indexes || [];
  const courses = data?.assigned_courses || [];
  const visibleCourses = selectedIndex
    ? courses.filter((course) => course.index_id === selectedIndex)
    : courses;

  return (
    <div>
      <Header
        title="Indexes"
        subtitle="Browse your learning tracks by index."
        meta={[{ label: 'Total indexes', value: String(indexes.length) }]}
      />

      <div className="p-6 space-y-6">
        <Card>
          <CardHeader title="Your Indexes" description="Jump into any assigned learning track." />
          <CardContent>
            {indexes.length === 0 ? (
              <EmptyState
                icon={BookOpen}
                title="No indexes yet"
                description="Your trainer will assign indexes when ready."
              />
            ) : (
              <div className="flex flex-wrap gap-2">
                {indexes.map((index) => (
                  <button
                    key={index.id}
                    onClick={() => setSelectedIndex(index.id)}
                    className={`px-3 py-2 rounded-full text-xs font-medium border ${
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader
            title="Courses in this Index"
            description="Pick a course to continue learning."
          />
          <CardContent>
            {visibleCourses.length === 0 ? (
              <EmptyState
                icon={BookOpen}
                title="No courses assigned"
                description="This index does not have any courses yet."
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {visibleCourses.map((course) => (
                  <Link key={course.id} href={`/learn/course/${course.id}`} className="block">
                    <div className="bg-white/70 border border-white/60 rounded-2xl overflow-hidden hover:border-blue-200 transition-colors backdrop-blur-xl shadow-sm group">
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
                      </div>
                      <div className="p-4">
                        <Badge variant="info" size="sm" className="mb-2">
                          {course.index_name}
                        </Badge>
                        <h3 className="font-semibold text-slate-900 mb-2 line-clamp-1 group-hover:text-blue-600 transition-colors">
                          {course.title}
                        </h3>
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
                        <div className="flex items-center gap-4 text-sm text-slate-500">
                          <span>{course.lecture_count} lectures</span>
                          {course.total_duration > 0 && (
                            <span>{formatDuration(course.total_duration)}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
