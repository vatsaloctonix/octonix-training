/*
 * Course Viewer Page
 * View course content and track progress
 */

'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Header } from '@/components/layout/header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { EmptyState } from '@/components/ui/empty-state';
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  PlayCircle,
  CheckCircle,
  FileText,
  Download,
  Clock,
} from 'lucide-react';
import Link from 'next/link';
import { formatDuration, getYouTubeEmbedUrl } from '@/lib/utils';

interface LectureFile {
  id: string;
  file_name: string;
  file_url: string | null;
  file_size: number;
}

interface Lecture {
  id: string;
  title: string;
  description: string | null;
  youtube_url: string | null;
  video_url?: string | null;
  order_index: number;
  duration_seconds: number;
  files: LectureFile[];
}

interface Section {
  id: string;
  title: string;
  order_index: number;
  lectures: Lecture[];
}

interface Course {
  id: string;
  title: string;
  description: string | null;
  index_name: string;
  sections: Section[];
}

interface LectureProgress {
  lecture_id: string;
  is_completed: boolean;
  time_spent_seconds: number;
}

export default function CourseViewerPage() {
  const routeParams = useParams();
  const courseIdParam = Array.isArray(routeParams.id) ? routeParams.id[0] : routeParams.id;
  const id = courseIdParam as string;
  const [course, setCourse] = useState<Course | null>(null);
  const [progress, setProgress] = useState<Map<string, LectureProgress>>(new Map());
  const [loading, setLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState<string[]>([]);
  const [currentLecture, setCurrentLecture] = useState<Lecture | null>(null);
  const [watchTime, setWatchTime] = useState(0);

  const fetchCourse = useCallback(async () => {
    try {
      const [courseRes, progressRes] = await Promise.all([
        fetch(`/api/courses/${id}`),
        fetch(`/api/progress?course_id=${id}`),
      ]);

      const courseJson = await courseRes.json();
      const progressJson = await progressRes.json();

      if (courseJson.success) {
        setCourse(courseJson.course);
        // Expand all sections by default
        setExpandedSections(courseJson.course.sections.map((s: Section) => s.id));
        // Set first incomplete lecture as current
        const firstIncomplete = findFirstIncompleteLecture(
          courseJson.course.sections,
          progressJson.progress || []
        );
        if (firstIncomplete) setCurrentLecture(firstIncomplete);
      }

      if (progressJson.success) {
        const progressMap = new Map<string, LectureProgress>();
        progressJson.progress?.forEach((p: LectureProgress) => {
          progressMap.set(p.lecture_id, p);
        });
        setProgress(progressMap);
      }
    } catch (error) {
      console.error('Failed to fetch course:', error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      fetchCourse();
    }
  }, [id, fetchCourse]);

  useEffect(() => {
    // Track time spent on current lecture
    if (!currentLecture) return;

    const interval = setInterval(() => {
      setWatchTime((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [currentLecture]);

  // Save progress when leaving lecture
  useEffect(() => {
    return () => {
      if (currentLecture && watchTime > 0) {
        saveProgress(currentLecture.id, watchTime, false);
      }
    };
  }, [currentLecture, watchTime]);

  useEffect(() => {
    if (!currentLecture || currentLecture.duration_seconds <= 0) return;
    if (progress.get(currentLecture.id)?.is_completed) return;

    const threshold = Math.floor(currentLecture.duration_seconds * 0.9);
    if (watchTime >= threshold) {
      saveProgress(currentLecture.id, watchTime, true);
      setWatchTime(0);
    }
  }, [currentLecture, watchTime, progress]);


  const findFirstIncompleteLecture = (
    sections: Section[],
    progressArr: LectureProgress[]
  ): Lecture | null => {
    const completedSet = new Set(
      progressArr.filter((p) => p.is_completed).map((p) => p.lecture_id)
    );

    for (const section of sections) {
      for (const lecture of section.lectures) {
        if (!completedSet.has(lecture.id)) {
          return lecture;
        }
      }
    }

    // All completed, return first lecture
    return sections[0]?.lectures[0] || null;
  };

  const saveProgress = async (lectureId: string, timeSpent: number, completed: boolean) => {
    try {
      await fetch('/api/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lecture_id: lectureId,
          time_spent_seconds: timeSpent,
          is_completed: completed,
        }),
      });

      if (completed) {
        setProgress((prev) => {
          const newMap = new Map(prev);
          newMap.set(lectureId, {
            lecture_id: lectureId,
            is_completed: true,
            time_spent_seconds: (prev.get(lectureId)?.time_spent_seconds || 0) + timeSpent,
          });
          return newMap;
        });
      }
    } catch (error) {
      console.error('Failed to save progress:', error);
    }
  };

  const handleMarkComplete = async () => {
    if (!currentLecture) return;
    await saveProgress(currentLecture.id, watchTime, true);
    setWatchTime(0);

    // Move to next lecture
    const nextLecture = findNextLecture(currentLecture);
    if (nextLecture) {
      setCurrentLecture(nextLecture);
    }
  };

  const findNextLecture = (current: Lecture): Lecture | null => {
    if (!course) return null;

    let found = false;
    for (const section of course.sections) {
      for (const lecture of section.lectures) {
        if (found) return lecture;
        if (lecture.id === current.id) found = true;
      }
    }
    return null;
  };

  const handleDownload = async (file: LectureFile) => {
    try {
      const res = await fetch('/api/files/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file_id: file.id }),
      });

      const json = await res.json();
      if (json.success && json.url) {
        window.open(json.url, '_blank');
      }
    } catch (error) {
      console.error('Failed to download file:', error);
    }
  };

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) =>
      prev.includes(sectionId)
        ? prev.filter((id) => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const selectLecture = (lecture: Lecture) => {
    // Save progress for current lecture before switching
    if (currentLecture && watchTime > 0) {
      saveProgress(currentLecture.id, watchTime, false);
    }
    setCurrentLecture(lecture);
    setWatchTime(0);
  };

  // Calculate overall progress
  const totalLectures = course?.sections.reduce((acc, s) => acc + s.lectures.length, 0) || 0;
  const completedLectures = Array.from(progress.values()).filter((p) => p.is_completed).length;
  const completionPercentage = totalLectures > 0 ? Math.round((completedLectures / totalLectures) * 100) : 0;
  const currentLectureCompleted = currentLecture ? progress.get(currentLecture.id)?.is_completed : false;
  const nextLecture = currentLecture ? findNextLecture(currentLecture) : null;

  if (loading) {
    return (
      <div className="p-6">
        <div className="h-8 w-64 bg-white/70 rounded skeleton mb-6" />
        <div className="h-96 bg-white/70 rounded-xl skeleton" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="p-6">
        <EmptyState
          icon={PlayCircle}
          title="Course not found"
          description="This course may have been removed or you don't have access"
        />
      </div>
    );
  }

  return (
    <div>
      <Header
        title={course.title}
        subtitle={course.index_name}
        meta={[
          { label: 'Progress', value: `${completionPercentage}%` },
          { label: 'Lectures', value: `${completedLectures}/${totalLectures}` },
        ]}
      />

      <div className="p-6">
        {/* Back link */}
        <Link
          href="/learn"
          className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Learning Hub
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Video Player */}
          <div className="lg:col-span-2 space-y-4">
            {currentLecture ? (
              <>
                {/* Video */}
                <Card>
                  <CardContent className="p-0">
                    {currentLecture.youtube_url ? (
                      <div className="video-wrapper">
                        <iframe
                          src={getYouTubeEmbedUrl(currentLecture.youtube_url) || ''}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      </div>
                    ) : currentLecture.video_url ? (
                      <div className="aspect-video bg-black">
                        <video
                          src={currentLecture.video_url}
                          controls
                          className="w-full h-full"
                        />
                      </div>
                    ) : (
                      <div className="aspect-video bg-slate-100 flex items-center justify-center">
                        <p className="text-slate-500">No video available</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Lecture Info */}
                <Card>
                  <CardContent className="py-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between mb-4">
                      <div>
                        <h2 className="text-xl font-semibold text-slate-900 mb-1">
                          {currentLecture.title}
                        </h2>
                        {currentLecture.duration_seconds > 0 && (
                          <p className="text-sm text-slate-600 flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {formatDuration(currentLecture.duration_seconds)}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          onClick={handleMarkComplete}
                          disabled={currentLectureCompleted}
                        >
                          {currentLectureCompleted ? (
                            <>
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Completed
                            </>
                          ) : (
                            <>
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Mark Complete
                            </>
                          )}
                        </Button>
                        {currentLectureCompleted && nextLecture && (
                          <Button
                            variant="outline"
                            onClick={() => selectLecture(nextLecture)}
                          >
                            Next Lecture
                          </Button>
                        )}
                      </div>
                    </div>

                    {currentLecture.description && (
                      <p className="text-slate-600 mb-4">{currentLecture.description}</p>
                    )}

                    {/* Files */}
                    {currentLecture.files.length > 0 && (
                      <div>
                        <h3 className="text-sm font-medium text-slate-600 mb-2">
                          Downloadable Files
                        </h3>
                        <div className="space-y-2">
                          {currentLecture.files.map((file) => (
                            <button
                              key={file.id}
                              onClick={() => handleDownload(file)}
                              className="w-full flex items-center gap-3 p-3 bg-white/70 border border-slate-200/70 rounded-lg hover:bg-slate-100 transition-colors backdrop-blur-sm text-left"
                            >
                              <FileText className="w-5 h-5 text-blue-600" />
                              <span className="flex-1 text-slate-900">{file.file_name}</span>
                              <Download className="w-4 h-4 text-slate-500" />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card>
                <CardContent className="py-12">
                  <EmptyState
                    icon={PlayCircle}
                    title="Select a lecture"
                    description="Choose a lecture from the sidebar to start learning"
                  />
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar - Course Content */}
          <div>
            <Card>
              <CardContent className="p-4">
                {/* Progress */}
                <div className="mb-4">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-slate-600">Your Progress</span>
                    <span className="text-slate-900 font-medium">{completionPercentage}%</span>
                  </div>
                  <Progress value={completionPercentage} size="md" />
                  <p className="text-xs text-slate-500 mt-1">
                    {completedLectures} of {totalLectures} lectures completed
                  </p>
                </div>

                {/* Sections */}
                <div className="space-y-2">
                  {course.sections.map((section, sectionIndex) => (
                    <div key={section.id} className="border border-slate-200/70 rounded-lg overflow-hidden">
                      <button
                        onClick={() => toggleSection(section.id)}
                        className="w-full flex items-center gap-2 p-3 hover:bg-slate-50 transition-colors text-left"
                      >
                        {expandedSections.includes(section.id) ? (
                          <ChevronDown className="w-4 h-4 text-slate-500 flex-shrink-0" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-slate-500 flex-shrink-0" />
                        )}
                        <span className="flex-1 text-sm font-medium text-slate-900">
                          {sectionIndex + 1}. {section.title}
                        </span>
                        <span className="text-xs text-slate-500">
                          {section.lectures.filter((l) => progress.get(l.id)?.is_completed).length}/
                          {section.lectures.length}
                        </span>
                      </button>

                      {expandedSections.includes(section.id) && (
                        <div className="border-t border-slate-200/70">
                          {section.lectures.map((lecture, lectureIndex) => {
                            const isCompleted = progress.get(lecture.id)?.is_completed;
                            const isCurrent = currentLecture?.id === lecture.id;

                            return (
                              <button
                                key={lecture.id}
                                onClick={() => selectLecture(lecture)}
                                className={`w-full flex items-center gap-2 p-2 pl-8 text-left transition-colors ${
                                  isCurrent
                                    ? 'bg-blue-50 text-blue-700'
                                    : 'hover:bg-slate-50 text-slate-700'
                                }`}
                              >
                                {isCompleted ? (
                                  <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                                ) : (
                                  <PlayCircle className="w-4 h-4 text-slate-500 flex-shrink-0" />
                                )}
                                <span className="flex-1 text-sm truncate">
                                  {sectionIndex + 1}.{lectureIndex + 1} {lecture.title}
                                </span>
                                {lecture.duration_seconds > 0 && (
                                  <span className="text-xs text-slate-500">
                                    {formatDuration(lecture.duration_seconds)}
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
