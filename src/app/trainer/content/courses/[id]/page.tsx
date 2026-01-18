/*
 * Course Detail Page
 * Manage sections and lectures for a course
 */

'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Header } from '@/components/layout/header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Modal } from '@/components/ui/modal';
import { EmptyState } from '@/components/ui/empty-state';
import { LectureFilesModal } from '@/components/content/lecture-files-modal';
import {
  Plus,
  ChevronDown,
  ChevronRight,
  Layers,
  PlayCircle,
  Edit,
  Trash2,
  GripVertical,
  FileText,
  Upload,
  ArrowLeft,
} from 'lucide-react';
import { formatDuration } from '@/lib/utils';
import Link from 'next/link';

interface LectureFile {
  id: string;
  file_name: string;
  file_url: string | null;
  file_size: number;
  file_type: string | null;
}

interface Lecture {
  id: string;
  title: string;
  description: string | null;
  youtube_url: string | null;
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

export default function CourseDetailPage() {
  const routeParams = useParams();
  const courseIdParam = Array.isArray(routeParams.id) ? routeParams.id[0] : routeParams.id;
  const id = courseIdParam as string;
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState<string[]>([]);

  // Section modal
  const [showSectionModal, setShowSectionModal] = useState(false);
  const [editingSection, setEditingSection] = useState<Section | null>(null);
  const [sectionTitle, setSectionTitle] = useState('');

  // Lecture modal
  const [showLectureModal, setShowLectureModal] = useState(false);
  const [editingLecture, setEditingLecture] = useState<Lecture | null>(null);
  const [currentSectionId, setCurrentSectionId] = useState('');
  const [lectureTitle, setLectureTitle] = useState('');
  const [lectureDescription, setLectureDescription] = useState('');
  const [lectureYoutubeUrl, setLectureYoutubeUrl] = useState('');
  const [lectureDuration, setLectureDuration] = useState(0);

  const [showFilesModal, setShowFilesModal] = useState(false);
  const [activeLecture, setActiveLecture] = useState<Lecture | null>(null);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchCourse = useCallback(async () => {
    try {
      const res = await fetch(`/api/courses/${id}`);
      const json = await res.json();
      if (json.success) {
        setCourse(json.course);
        // Expand first section by default
        if (json.course.sections?.length > 0) {
          setExpandedSections([json.course.sections[0].id]);
        }
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
    if (!course || !activeLecture) return;
    const updatedLecture = course.sections
      .flatMap((section) => section.lectures)
      .find((lecture) => lecture.id === activeLecture.id);

    if (updatedLecture && updatedLecture !== activeLecture) {
      setActiveLecture(updatedLecture);
    }
  }, [course, activeLecture]);

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) =>
      prev.includes(sectionId)
        ? prev.filter((id) => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  // Section handlers
  const openSectionModal = (section?: Section) => {
    setEditingSection(section || null);
    setSectionTitle(section?.title || '');
    setError('');
    setShowSectionModal(true);
  };

  const handleSaveSection = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const method = editingSection ? 'PATCH' : 'POST';
      const body = editingSection
        ? { id: editingSection.id, title: sectionTitle }
        : { course_id: id, title: sectionTitle };

      const res = await fetch('/api/sections', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const json = await res.json();
      if (!json.success) {
        setError(json.error);
        return;
      }

      fetchCourse();
      setShowSectionModal(false);
    } catch (err) {
      console.error('Failed to save section:', err);
      setError('Failed to save section');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSection = async (section: Section) => {
    if (!confirm(`Delete "${section.title}"? All lectures will be deleted.`)) return;

    try {
      await fetch(`/api/sections?id=${section.id}`, { method: 'DELETE' });
      fetchCourse();
    } catch (error) {
      console.error('Failed to delete section:', error);
    }
  };

  // Lecture handlers
  const openLectureModal = (sectionId: string, lecture?: Lecture) => {
    setCurrentSectionId(sectionId);
    setEditingLecture(lecture || null);
    setLectureTitle(lecture?.title || '');
    setLectureDescription(lecture?.description || '');
    setLectureYoutubeUrl(lecture?.youtube_url || '');
    setLectureDuration(lecture?.duration_seconds || 0);
    setError('');
    setShowLectureModal(true);
  };

  const handleSaveLecture = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const method = editingLecture ? 'PATCH' : 'POST';
      const body = editingLecture
        ? {
            id: editingLecture.id,
            title: lectureTitle,
            description: lectureDescription,
            youtube_url: lectureYoutubeUrl,
            duration_seconds: lectureDuration,
          }
        : {
            section_id: currentSectionId,
            title: lectureTitle,
            description: lectureDescription,
            youtube_url: lectureYoutubeUrl,
            duration_seconds: lectureDuration,
          };

      const res = await fetch('/api/lectures', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const json = await res.json();
      if (!json.success) {
        setError(json.error);
        return;
      }

      fetchCourse();
      setShowLectureModal(false);
    } catch (err) {
      console.error('Failed to save lecture:', err);
      setError('Failed to save lecture');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteLecture = async (lecture: Lecture) => {
    if (!confirm(`Delete "${lecture.title}"?`)) return;

    try {
      await fetch(`/api/lectures?id=${lecture.id}`, { method: 'DELETE' });
      fetchCourse();
    } catch (error) {
      console.error('Failed to delete lecture:', error);
    }
  };

  const openFilesModal = (lecture: Lecture) => {
    setActiveLecture(lecture);
    setShowFilesModal(true);
  };

  const closeFilesModal = () => {
    setShowFilesModal(false);
    setActiveLecture(null);
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="h-8 w-64 bg-white/70 rounded skeleton mb-6" />
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 bg-white/70 rounded-xl skeleton" />
          ))}
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="p-6">
        <EmptyState
          icon={Layers}
          title="Course not found"
          description="This course may have been deleted"
        />
      </div>
    );
  }

  return (
    <div>
      <Header title={course.title} />

      <div className="p-6">
        {/* Back link */}
        <Link
          href="/trainer/content/courses"
          className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Courses
        </Link>

        {/* Course info */}
        <Card className="mb-6">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 mb-1">{course.index_name}</p>
                <h2 className="text-xl font-semibold text-slate-900">{course.title}</h2>
                {course.description && (
                  <p className="text-slate-400 mt-1">{course.description}</p>
                )}
              </div>
              <Button onClick={() => openSectionModal()}>
                <Plus className="w-4 h-4 mr-2" />
                Add Section
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Sections */}
        {course.sections.length === 0 ? (
          <EmptyState
            icon={Layers}
            title="No sections yet"
            description="Create your first section to add lectures"
            action={{ label: 'Add Section', onClick: () => openSectionModal() }}
          />
        ) : (
          <div className="space-y-4">
            {course.sections.map((section, sectionIndex) => (
              <Card key={section.id}>
                {/* Section Header */}
                <div
                  className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors"
                  onClick={() => toggleSection(section.id)}
                >
                  <GripVertical className="w-4 h-4 text-slate-600" />
                  {expandedSections.includes(section.id) ? (
                    <ChevronDown className="w-5 h-5 text-slate-400" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-slate-400" />
                  )}
                  <div className="flex-1">
                    <h3 className="font-medium text-slate-900">
                      Section {sectionIndex + 1}: {section.title}
                    </h3>
                    <p className="text-sm text-slate-500">
                      {section.lectures.length} lecture{section.lectures.length !== 1 && 's'}
                    </p>
                  </div>
                  <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => openLectureModal(section.id)}
                      className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                      title="Add Lecture"
                    >
                      <Plus className="w-4 h-4 text-blue-600" />
                    </button>
                    <button
                      onClick={() => openSectionModal(section)}
                      className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                      title="Edit Section"
                    >
                      <Edit className="w-4 h-4 text-slate-400" />
                    </button>
                    <button
                      onClick={() => handleDeleteSection(section)}
                      className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                      title="Delete Section"
                    >
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
                  </div>
                </div>

                {/* Lectures */}
                {expandedSections.includes(section.id) && (
                  <div className="border-t border-slate-200/70">
                    {section.lectures.length === 0 ? (
                      <div className="px-4 py-6 text-center text-slate-500">
                        <p>No lectures in this section</p>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="mt-2"
                          onClick={() => openLectureModal(section.id)}
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Add Lecture
                        </Button>
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-700/50">
                        {section.lectures.map((lecture, lectureIndex) => (
                          <div
                            key={lecture.id}
                            className="flex items-center gap-3 px-4 py-3 pl-12 hover:bg-slate-50"
                          >
                            <PlayCircle className="w-5 h-5 text-slate-500" />
                            <div className="flex-1">
                              <p className="text-slate-900">
                                {sectionIndex + 1}.{lectureIndex + 1} {lecture.title}
                              </p>
                              <div className="flex items-center gap-3 text-sm text-slate-500">
                                {lecture.duration_seconds > 0 && (
                                  <span>{formatDuration(lecture.duration_seconds)}</span>
                                )}
                                {lecture.files.length > 0 && (
                                  <span className="flex items-center gap-1">
                                    <FileText className="w-3 h-3" />
                                    {lecture.files.length} file{lecture.files.length !== 1 && 's'}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-1">
                              <button
                                onClick={() => openFilesModal(lecture)}
                                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                                title="Manage Files"
                              >
                                <Upload className="w-4 h-4 text-blue-600" />
                              </button>
                              <button
                                onClick={() => openLectureModal(section.id, lecture)}
                                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                                title="Edit"
                              >
                                <Edit className="w-4 h-4 text-slate-400" />
                              </button>
                              <button
                                onClick={() => handleDeleteLecture(lecture)}
                                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4 text-red-400" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Section Modal */}
      <Modal
        isOpen={showSectionModal}
        onClose={() => setShowSectionModal(false)}
        title={editingSection ? 'Edit Section' : 'Add Section'}
      >
        <form onSubmit={handleSaveSection} className="space-y-4">
          <Input
            id="sectionTitle"
            label="Section Title"
            value={sectionTitle}
            onChange={(e) => setSectionTitle(e.target.value)}
            placeholder="e.g., Getting Started"
            required
          />

          {error && (
            <div className="bg-red-900/30 border border-red-800 text-red-400 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="ghost" onClick={() => setShowSectionModal(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              {editingSection ? 'Save Changes' : 'Add Section'}
            </Button>
          </div>
        </form>
      </Modal>

      <LectureFilesModal
        isOpen={showFilesModal}
        onClose={closeFilesModal}
        lecture={activeLecture}
        onUpdated={fetchCourse}
      />

      {/* Lecture Modal */}
      <Modal
        isOpen={showLectureModal}
        onClose={() => setShowLectureModal(false)}
        title={editingLecture ? 'Edit Lecture' : 'Add Lecture'}
        size="lg"
      >
        <form onSubmit={handleSaveLecture} className="space-y-4">
          <Input
            id="lectureTitle"
            label="Lecture Title"
            value={lectureTitle}
            onChange={(e) => setLectureTitle(e.target.value)}
            placeholder="e.g., Introduction to Components"
            required
          />
          <Textarea
            id="lectureDescription"
            label="Description (optional)"
            value={lectureDescription}
            onChange={(e) => setLectureDescription(e.target.value)}
            placeholder="Brief description of this lecture..."
            rows={3}
          />
          <Input
            id="lectureYoutubeUrl"
            label="YouTube URL"
            value={lectureYoutubeUrl}
            onChange={(e) => setLectureYoutubeUrl(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
          />
          <Input
            id="lectureDuration"
            label="Duration (minutes)"
            type="number"
            value={Math.floor(lectureDuration / 60)}
            onChange={(e) => setLectureDuration(parseInt(e.target.value || '0') * 60)}
            min={0}
          />

          {error && (
            <div className="bg-red-900/30 border border-red-800 text-red-400 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="ghost" onClick={() => setShowLectureModal(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              {editingLecture ? 'Save Changes' : 'Add Lecture'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
