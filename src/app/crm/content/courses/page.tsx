/*
 * CRM Courses Page
 * Same as trainer courses page
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/header';
import { ActionDock } from '@/components/layout/action-dock';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { EmptyState } from '@/components/ui/empty-state';
import { Badge } from '@/components/ui/badge';
import { Plus, BookOpen, Layers, PlayCircle, Edit, Trash2, Eye } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { FocusPanel } from '@/components/layout/focus-panel';

interface Index {
  id: string;
  name: string;
}

interface Course {
  id: string;
  index_id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  is_active: boolean;
  created_at: string;
  index_name: string;
  section_count: number;
  lecture_count: number;
}

export default function CRMCoursesPage() {
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [indexes, setIndexes] = useState<Index[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterIndex, setFilterIndex] = useState('');
  const [showPanel, setShowPanel] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [indexId, setIndexId] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [coursesRes, indexesRes] = await Promise.all([
        fetch('/api/courses'),
        fetch('/api/indexes'),
      ]);

      const coursesJson = await coursesRes.json();
      const indexesJson = await indexesRes.json();

      if (coursesJson.success) setCourses(coursesJson.courses);
      if (indexesJson.success) setIndexes(indexesJson.indexes);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      const url = editingCourse ? `/api/courses/${editingCourse.id}` : '/api/courses';
      const method = editingCourse ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, index_id: indexId, thumbnail_url: thumbnailUrl }),
      });

      const json = await res.json();

      if (!json.success) {
        setError(json.error);
        setSaving(false);
        return;
      }

      fetchData();
      closeModal();
    } catch (err) {
      console.error('Failed to save course:', err);
      setError('Failed to save course');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (course: Course) => {
    if (!confirm(`Delete "${course.title}"?`)) return;

    try {
      const res = await fetch(`/api/courses/${course.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) setCourses(courses.filter((c) => c.id !== course.id));
    } catch (error) {
      console.error('Failed to delete course:', error);
    }
  };

  const openCreateModal = () => {
    setEditingCourse(null);
    setTitle('');
    setDescription('');
    setIndexId(indexes[0]?.id || '');
    setThumbnailUrl('');
    setError('');
    setShowPanel(true);
  };

  const openEditModal = (course: Course) => {
    setEditingCourse(course);
    setTitle(course.title);
    setDescription(course.description || '');
    setIndexId(course.index_id);
    setThumbnailUrl(course.thumbnail_url || '');
    setError('');
    setShowPanel(true);
  };

  const closeModal = () => {
    setShowPanel(false);
    setEditingCourse(null);
  };

  const filteredCourses = courses.filter((c) => {
    const matchesSearch = c.title.toLowerCase().includes(search.toLowerCase());
    const matchesIndex = !filterIndex || c.index_id === filterIndex;
    return matchesSearch && matchesIndex;
  });

  return (
    <div>
      <Header
        title="Course Library"
        subtitle="Create, edit, and ship courses faster."
        meta={[{ label: 'Courses', value: String(courses.length) }]}
        showSearch
        onSearch={setSearch}
        searchPlaceholder="Search courses..."
        actions={(
          <ActionDock>
            <Button onClick={openCreateModal} disabled={indexes.length === 0} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Create Course
            </Button>
            <Link href="/crm/content">
              <Button size="sm" variant="ghost">Content Studio</Button>
            </Link>
          </ActionDock>
        )}
      />

      <div className="p-6">
        <Card>
          <CardHeader
            title="Course Library"
            description="Manage your courses and their content"
          />
          <CardContent>
            <div className="flex gap-4 mb-6">
              <div className="w-48">
                <Select
                  value={filterIndex}
                  onChange={(e) => setFilterIndex(e.target.value)}
                  options={[
                    { value: '', label: 'All Indexes' },
                    ...indexes.map((i) => ({ value: i.id, label: i.name })),
                  ]}
                />
              </div>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-64 bg-white/70 rounded-xl skeleton" />
                ))}
              </div>
            ) : indexes.length === 0 ? (
              <EmptyState
                icon={BookOpen}
                title="Create an index first"
                description="Create at least one index before creating courses"
                action={{
                  label: 'Create Index',
                  onClick: () => router.push('/crm/content/indexes'),
                }}
              />
            ) : filteredCourses.length === 0 ? (
              <EmptyState
                icon={BookOpen}
                title="No courses found"
                description="Create your first course"
                action={!search ? { label: 'Create Course', onClick: openCreateModal } : undefined}
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredCourses.map((course) => (
                  <div
                    key={course.id}
                    className="bg-white/70 border border-white/60 rounded-2xl overflow-hidden hover:border-blue-200 transition-colors backdrop-blur-xl shadow-sm"
                  >
                    <div className="relative h-32 bg-gradient-to-br from-blue-900/50 to-slate-800 flex items-center justify-center">
                      {course.thumbnail_url ? (
                        <Image
                          src={course.thumbnail_url}
                          alt={course.title}
                          fill
                          sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                          className="object-cover"
                          unoptimized
                        />
                      ) : (
                        <BookOpen className="w-12 h-12 text-slate-600" />
                      )}
                    </div>

                    <div className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <Badge variant="info" size="sm">{course.index_name}</Badge>
                        <Badge variant={course.is_active ? 'success' : 'danger'} size="sm">
                          {course.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>

                      <h3 className="font-semibold text-slate-900 mb-1 line-clamp-1">{course.title}</h3>

                      <div className="flex items-center gap-4 text-sm text-slate-500 mb-4">
                        <span className="flex items-center gap-1">
                          <Layers className="w-4 h-4" />
                          {course.section_count} sections
                        </span>
                        <span className="flex items-center gap-1">
                          <PlayCircle className="w-4 h-4" />
                          {course.lecture_count} lectures
                        </span>
                      </div>

                      <div className="flex gap-2 pt-3 border-t border-slate-200/70">
                        <Link href={`/crm/content/courses/${course.id}`} className="flex-1">
                          <Button variant="outline" className="w-full" size="sm">
                            <Eye className="w-4 h-4 mr-1" />
                            Manage
                          </Button>
                        </Link>
                        <button onClick={() => openEditModal(course)} className="p-2 hover:bg-slate-100 rounded-lg">
                          <Edit className="w-4 h-4 text-slate-400" />
                        </button>
                        <button onClick={() => handleDelete(course)} className="p-2 hover:bg-slate-100 rounded-lg">
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <FocusPanel
        isOpen={showPanel}
        onClose={closeModal}
        title={editingCourse ? 'Edit Course' : 'Create Course'}
        subtitle="Courses bundle sections and lectures into a learner journey."
        footer={(
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="ghost" onClick={closeModal}>Cancel</Button>
            <Button type="submit" form="crm-course-form" loading={saving}>{editingCourse ? 'Save Changes' : 'Create Course'}</Button>
          </div>
        )}
      >
        <form id="crm-course-form" onSubmit={handleSave} className="space-y-4">
          <Select
            id="indexId"
            label="Index"
            value={indexId}
            onChange={(e) => setIndexId(e.target.value)}
            options={indexes.map((i) => ({ value: i.id, label: i.name }))}
            required
          />
          <Input id="title" label="Course Title" value={title} onChange={(e) => setTitle(e.target.value)} required />
          <Textarea id="description" label="Description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          <Input id="thumbnailUrl" label="Thumbnail URL" value={thumbnailUrl} onChange={(e) => setThumbnailUrl(e.target.value)} />

          {error && <div className="bg-red-900/30 border border-red-800 text-red-400 px-4 py-3 rounded-lg text-sm">{error}</div>}
        </form>
      </FocusPanel>
    </div>
  );
}
