/*
 * Content Studio
 * Unified workspace for indexes and courses
 */

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Header } from '@/components/layout/header';
import { ActionDock } from '@/components/layout/action-dock';
import { FocusPanel } from '@/components/layout/focus-panel';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { SearchInput } from '@/components/ui/search-input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Plus, FolderOpen, BookOpen, Trash2, Edit } from 'lucide-react';
import Link from 'next/link';

interface Index {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  course_count: number;
  created_at: string;
}

interface Course {
  id: string;
  index_id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  is_active: boolean;
  index_name: string;
  section_count: number;
  lecture_count: number;
}

export default function ContentStudioPage() {
  const [indexes, setIndexes] = useState<Index[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedIndexId, setSelectedIndexId] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingCourses, setLoadingCourses] = useState(false);

  const [indexSearch, setIndexSearch] = useState('');
  const [courseSearch, setCourseSearch] = useState('');

  const [showIndexPanel, setShowIndexPanel] = useState(false);
  const [editingIndex, setEditingIndex] = useState<Index | null>(null);
  const [indexName, setIndexName] = useState('');
  const [indexDescription, setIndexDescription] = useState('');

  const [showCoursePanel, setShowCoursePanel] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [courseTitle, setCourseTitle] = useState('');
  const [courseDescription, setCourseDescription] = useState('');
  const [courseThumbnailUrl, setCourseThumbnailUrl] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchIndexes = useCallback(async () => {
    try {
      const res = await fetch('/api/indexes');
      const json = await res.json();
      if (json.success) {
        setIndexes(json.indexes);
        setSelectedIndexId((prev) => prev || json.indexes[0]?.id || '');
      }
    } catch (err) {
      console.error('Failed to fetch indexes:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCourses = async (indexId: string) => {
    if (!indexId) {
      setCourses([]);
      return;
    }
    setLoadingCourses(true);
    try {
      const res = await fetch(`/api/courses?index_id=${indexId}`);
      const json = await res.json();
      if (json.success) setCourses(json.courses);
    } catch (err) {
      console.error('Failed to fetch courses:', err);
    } finally {
      setLoadingCourses(false);
    }
  };

  useEffect(() => {
    fetchIndexes();
  }, [fetchIndexes]);

  useEffect(() => {
    if (selectedIndexId) {
      fetchCourses(selectedIndexId);
    }
  }, [selectedIndexId]);

  const openIndexPanel = (index?: Index) => {
    setEditingIndex(index || null);
    setIndexName(index?.name || '');
    setIndexDescription(index?.description || '');
    setError('');
    setShowIndexPanel(true);
  };

  const openCoursePanel = (course?: Course) => {
    setEditingCourse(course || null);
    setCourseTitle(course?.title || '');
    setCourseDescription(course?.description || '');
    setCourseThumbnailUrl(course?.thumbnail_url || '');
    setError('');
    setShowCoursePanel(true);
  };

  const handleSaveIndex = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');

    try {
      const url = editingIndex ? `/api/indexes/${editingIndex.id}` : '/api/indexes';
      const method = editingIndex ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: indexName, description: indexDescription }),
      });

      const json = await res.json();
      if (!json.success) {
        setError(json.error || 'Failed to save index');
        return;
      }

      await fetchIndexes();
      setShowIndexPanel(false);
    } catch (err) {
      console.error('Failed to save index:', err);
      setError('Failed to save index');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveCourse = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedIndexId && !editingCourse) {
      setError('Select an index before creating a course.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const url = editingCourse ? `/api/courses/${editingCourse.id}` : '/api/courses';
      const method = editingCourse ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: courseTitle,
          description: courseDescription,
          index_id: editingCourse?.index_id || selectedIndexId,
          thumbnail_url: courseThumbnailUrl,
        }),
      });

      const json = await res.json();
      if (!json.success) {
        setError(json.error || 'Failed to save course');
        return;
      }

      await fetchCourses(editingCourse?.index_id || selectedIndexId);
      setShowCoursePanel(false);
    } catch (err) {
      console.error('Failed to save course:', err);
      setError('Failed to save course');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteIndex = async (index: Index) => {
    if (!confirm(`Delete "${index.name}"? This removes all courses inside it.`)) return;
    try {
      const res = await fetch(`/api/indexes/${index.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        const nextIndexes = indexes.filter((i) => i.id !== index.id);
        setIndexes(nextIndexes);
        if (selectedIndexId === index.id) {
          setSelectedIndexId(nextIndexes[0]?.id || '');
        }
      }
    } catch (err) {
      console.error('Failed to delete index:', err);
    }
  };

  const handleDeleteCourse = async (course: Course) => {
    if (!confirm(`Delete "${course.title}"?`)) return;
    try {
      const res = await fetch(`/api/courses/${course.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        setCourses(courses.filter((c) => c.id !== course.id));
      }
    } catch (err) {
      console.error('Failed to delete course:', err);
    }
  };

  const filteredIndexes = useMemo(() => {
    const term = indexSearch.trim().toLowerCase();
    return term
      ? indexes.filter((index) => index.name.toLowerCase().includes(term))
      : indexes;
  }, [indexes, indexSearch]);

  const filteredCourses = useMemo(() => {
    const term = courseSearch.trim().toLowerCase();
    return term
      ? courses.filter((course) =>
          course.title.toLowerCase().includes(term)
        )
      : courses;
  }, [courses, courseSearch]);

  const selectedIndex = indexes.find((index) => index.id === selectedIndexId);

  return (
    <div>
      <Header
        title="Content Studio"
        subtitle="Build indexes and courses without leaving the workspace."
        meta={[{ label: 'Indexes', value: String(indexes.length) }]}
        actions={(
          <ActionDock>
            <Button size="sm" onClick={() => openIndexPanel()}>
              <Plus className="w-4 h-4 mr-2" />
              New Index
            </Button>
            <Button size="sm" variant="outline" onClick={() => openCoursePanel()} disabled={!selectedIndexId}>
              <Plus className="w-4 h-4 mr-2" />
              New Course
            </Button>
            <Link href="/trainer/content/indexes">
              <Button size="sm" variant="ghost">Full Indexes</Button>
            </Link>
          </ActionDock>
        )}
      />

      <div className="p-6 grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card className="xl:col-span-1">
          <CardHeader
            title="Index Catalog"
            description="Select an index to focus the course list."
          />
          <CardContent className="space-y-4">
            <SearchInput
              placeholder="Search indexes..."
              value={indexSearch}
              onChange={(event) => setIndexSearch(event.target.value)}
              onClear={() => setIndexSearch('')}
            />

            {loading ? (
              <div className="space-y-2">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-14 rounded-xl bg-white/70 skeleton" />
                ))}
              </div>
            ) : filteredIndexes.length === 0 ? (
              <EmptyState
                icon={FolderOpen}
                title="No indexes yet"
                description="Create an index to start organizing courses."
                action={{ label: 'Create Index', onClick: () => openIndexPanel() }}
              />
            ) : (
              <div className="space-y-2">
                {filteredIndexes.map((index) => (
                  <button
                    key={index.id}
                    onClick={() => setSelectedIndexId(index.id)}
                    className={`w-full text-left rounded-xl border px-4 py-3 transition-colors ${
                      selectedIndexId === index.id
                        ? 'border-blue-200 bg-blue-50/80'
                        : 'border-white/60 bg-white/70 hover:border-blue-100'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{index.name}</p>
                        {index.description && (
                          <p className="text-xs text-slate-500 mt-1 line-clamp-2">{index.description}</p>
                        )}
                      </div>
                      <Badge variant={index.is_active ? 'success' : 'danger'} size="sm">
                        {index.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between mt-3 text-xs text-slate-500">
                      <span>{index.course_count} courses</span>
                      <span className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            openIndexPanel(index);
                          }}
                          className="text-slate-500 hover:text-slate-900"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleDeleteIndex(index);
                          }}
                          className="text-red-500 hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader
            title={selectedIndex ? `Courses in ${selectedIndex.name}` : 'Course Library'}
            description={selectedIndex ? 'Manage courses inside the selected index.' : 'Pick an index to begin.'}
            action={(
              <Link href="/trainer/content/courses">
                <Button size="sm" variant="outline">Full Course Library</Button>
              </Link>
            )}
          />
          <CardContent className="space-y-4">
            <SearchInput
              placeholder="Search courses..."
              value={courseSearch}
              onChange={(event) => setCourseSearch(event.target.value)}
              onClear={() => setCourseSearch('')}
            />

            {loadingCourses ? (
              <div className="space-y-2">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-16 rounded-xl bg-white/70 skeleton" />
                ))}
              </div>
            ) : !selectedIndex ? (
              <EmptyState
                icon={BookOpen}
                title="Select an index"
                description="Choose an index to view its courses."
              />
            ) : filteredCourses.length === 0 ? (
              <EmptyState
                icon={BookOpen}
                title="No courses yet"
                description="Create the first course for this index."
                action={{ label: 'Create Course', onClick: () => openCoursePanel() }}
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Course</TableHead>
                    <TableHead>Sections</TableHead>
                    <TableHead>Lectures</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCourses.map((course) => (
                    <TableRow key={course.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-slate-900">{course.title}</p>
                          {course.description && (
                            <p className="text-xs text-slate-500 line-clamp-1">{course.description}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{course.section_count}</TableCell>
                      <TableCell>{course.lecture_count}</TableCell>
                      <TableCell>
                        <Badge variant={course.is_active ? 'success' : 'danger'}>
                          {course.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link href={`/trainer/content/courses/${course.id}`}>
                            <Button size="sm" variant="outline">Manage</Button>
                          </Link>
                          <button
                            onClick={() => openCoursePanel(course)}
                            className="p-2 rounded-lg hover:bg-slate-100"
                          >
                            <Edit className="w-4 h-4 text-slate-500" />
                          </button>
                          <button
                            onClick={() => handleDeleteCourse(course)}
                            className="p-2 rounded-lg hover:bg-slate-100"
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <FocusPanel
        isOpen={showIndexPanel}
        onClose={() => setShowIndexPanel(false)}
        title={editingIndex ? 'Edit Index' : 'Create Index'}
        subtitle="Indexes help organize courses by theme or stage."
        footer={(
          <div className="flex justify-end gap-3">
            <Button variant="ghost" type="button" onClick={() => setShowIndexPanel(false)}>
              Cancel
            </Button>
            <Button type="submit" form="index-form" loading={saving}>
              {editingIndex ? 'Save Changes' : 'Create Index'}
            </Button>
          </div>
        )}
      >
        <form id="index-form" onSubmit={handleSaveIndex} className="space-y-4">
          <Input
            id="indexName"
            label="Index Name"
            value={indexName}
            onChange={(event) => setIndexName(event.target.value)}
            placeholder="e.g., Onboarding, Product Mastery"
            required
          />
          <Textarea
            id="indexDescription"
            label="Description"
            value={indexDescription}
            onChange={(event) => setIndexDescription(event.target.value)}
            placeholder="Short summary to guide course intent."
            rows={3}
          />

          {error && (
            <div className="bg-red-900/30 border border-red-800 text-red-400 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}
        </form>
      </FocusPanel>

      <FocusPanel
        isOpen={showCoursePanel}
        onClose={() => setShowCoursePanel(false)}
        title={editingCourse ? 'Edit Course' : 'Create Course'}
        subtitle={selectedIndex ? `Index: ${selectedIndex.name}` : 'Select an index to begin.'}
        footer={(
          <div className="flex justify-end gap-3">
            <Button variant="ghost" type="button" onClick={() => setShowCoursePanel(false)}>
              Cancel
            </Button>
            <Button type="submit" form="course-form" loading={saving}>
              {editingCourse ? 'Save Changes' : 'Create Course'}
            </Button>
          </div>
        )}
      >
        <form id="course-form" onSubmit={handleSaveCourse} className="space-y-4">
          <Input
            id="courseTitle"
            label="Course Title"
            value={courseTitle}
            onChange={(event) => setCourseTitle(event.target.value)}
            placeholder="e.g., Customer Success Foundations"
            required
          />
          <Textarea
            id="courseDescription"
            label="Description"
            value={courseDescription}
            onChange={(event) => setCourseDescription(event.target.value)}
            placeholder="Explain what learners will achieve."
            rows={3}
          />
          <Input
            id="courseThumbnail"
            label="Thumbnail URL (optional)"
            value={courseThumbnailUrl}
            onChange={(event) => setCourseThumbnailUrl(event.target.value)}
            placeholder="https://..."
          />

          {error && (
            <div className="bg-red-900/30 border border-red-800 text-red-400 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}
        </form>
      </FocusPanel>
    </div>
  );
}
