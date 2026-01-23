/*
 * CRM Course Detail Page
 * Mirrors trainer course detail - manage sections and lectures
 */

'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Header } from '@/components/layout/header';
import { ActionDock } from '@/components/layout/action-dock';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { EmptyState } from '@/components/ui/empty-state';
import { LectureFilesModal } from '@/components/content/lecture-files-modal';
import {
  Plus, ChevronDown, ChevronRight, Layers, PlayCircle, Edit, Trash2, GripVertical, FileText, ArrowLeft, Upload,
} from 'lucide-react';
import { formatDuration } from '@/lib/utils';
import Link from 'next/link';
import { FocusPanel } from '@/components/layout/focus-panel';

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
  video_storage_path?: string | null;
  video_mime_type?: string | null;
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

export default function CRMCourseDetailPage() {
  const routeParams = useParams();
  const courseIdParam = Array.isArray(routeParams.id) ? routeParams.id[0] : routeParams.id;
  const id = courseIdParam as string;
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState<string[]>([]);

  const [showSectionModal, setShowSectionModal] = useState(false);
  const [editingSection, setEditingSection] = useState<Section | null>(null);
  const [sectionTitle, setSectionTitle] = useState('');

  const [showLectureModal, setShowLectureModal] = useState(false);
  const [editingLecture, setEditingLecture] = useState<Lecture | null>(null);
  const [currentSectionId, setCurrentSectionId] = useState('');
  const [lectureTitle, setLectureTitle] = useState('');
  const [lectureDescription, setLectureDescription] = useState('');
  const [lectureYoutubeUrl, setLectureYoutubeUrl] = useState('');
  const [videoSource, setVideoSource] = useState<'youtube' | 'upload'>('youtube');
  const [videoStoragePath, setVideoStoragePath] = useState('');
  const [videoMimeType, setVideoMimeType] = useState('');
  const [videoUploading, setVideoUploading] = useState(false);
  const [videoUploadProgress, setVideoUploadProgress] = useState(0);
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
      prev.includes(sectionId) ? prev.filter((id) => id !== sectionId) : [...prev, sectionId]
    );
  };

  const openSectionModal = (section?: Section) => {
    setEditingSection(section || null);
    setSectionTitle(section?.title || '');
    setError('');
    setShowSectionModal(true);
  };

  const handleSaveSection = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

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
    if (!confirm(`Delete "${section.title}"?`)) return;
    await fetch(`/api/sections?id=${section.id}`, { method: 'DELETE' });
    fetchCourse();
  };

  const openLectureModal = (sectionId: string, lecture?: Lecture) => {
    setCurrentSectionId(sectionId);
    setEditingLecture(lecture || null);
    setLectureTitle(lecture?.title || '');
    setLectureDescription(lecture?.description || '');
    setLectureYoutubeUrl(lecture?.youtube_url || '');
    const existingVideoPath = lecture?.video_storage_path || '';
    setVideoStoragePath(existingVideoPath);
    setVideoMimeType(lecture?.video_mime_type || '');
    setVideoSource(existingVideoPath ? 'upload' : 'youtube');
    setVideoUploading(false);
    setVideoUploadProgress(0);
    setLectureDuration(lecture?.duration_seconds || 0);
    setError('');
    setShowLectureModal(true);
  };

  const handleVideoUpload = async (file: File) => {
    setVideoUploading(true);
    setVideoUploadProgress(0);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      if (editingLecture?.id) {
        formData.append('lecture_id', editingLecture.id);
      }

      const uploadResult = await new Promise<{ storage_path: string; mime_type: string }>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/api/videos');
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            setVideoUploadProgress(percent);
          }
        };
        xhr.onload = () => {
          try {
            const json = JSON.parse(xhr.responseText);
            if (json.success) {
              resolve({ storage_path: json.storage_path, mime_type: json.mime_type });
            } else {
              reject(new Error(json.error || 'Upload failed'));
            }
          } catch (err) {
            reject(err);
          }
        };
        xhr.onerror = () => reject(new Error('Upload failed'));
        xhr.send(formData);
      });

      setVideoStoragePath(uploadResult.storage_path);
      setVideoMimeType(uploadResult.mime_type);
      setVideoSource('upload');
    } catch {
      setError('Failed to upload video');
    } finally {
      setVideoUploading(false);
    }
  };

  const handleSaveLecture = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (videoUploading) {
        setError('Please wait for the video upload to finish.');
        setSaving(false);
        return;
      }
      if (videoSource === 'upload' && !videoStoragePath) {
        setError('Upload a video file or switch to YouTube URL.');
        setSaving(false);
        return;
      }

      const videoPayload = videoSource === 'upload'
        ? {
            youtube_url: null,
            video_storage_path: videoStoragePath || null,
            video_mime_type: videoMimeType || null,
          }
        : {
            youtube_url: lectureYoutubeUrl || null,
            video_storage_path: null,
            video_mime_type: null,
          };

      const method = editingLecture ? 'PATCH' : 'POST';
      const body = editingLecture
        ? { id: editingLecture.id, title: lectureTitle, description: lectureDescription, ...videoPayload, duration_seconds: lectureDuration }
        : { section_id: currentSectionId, title: lectureTitle, description: lectureDescription, ...videoPayload, duration_seconds: lectureDuration };

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
    await fetch(`/api/lectures?id=${lecture.id}`, { method: 'DELETE' });
    fetchCourse();
  };

  const openFilesModal = (lecture: Lecture) => {
    setActiveLecture(lecture);
    setShowFilesModal(true);
  };

  const closeFilesModal = () => {
    setShowFilesModal(false);
    setActiveLecture(null);
  };

  const totalSections = course?.sections.length || 0;
  const totalLectures = course?.sections.reduce((sum, section) => sum + section.lectures.length, 0) || 0;
  const totalDuration = course?.sections
    .flatMap((section) => section.lectures)
    .reduce((sum, lecture) => sum + (lecture.duration_seconds || 0), 0) || 0;

  if (loading) {
    return (
      <div className="p-6">
        <div className="h-8 w-64 bg-white/70 rounded skeleton mb-6" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="p-6">
        <EmptyState icon={Layers} title="Course not found" description="This course may have been deleted" />
      </div>
    );
  }

  return (
    <div>
      <Header
        title={course.title}
        subtitle={course.index_name}
        meta={[
          { label: 'Sections', value: String(totalSections) },
          { label: 'Lectures', value: String(totalLectures) },
          { label: 'Duration', value: totalDuration ? formatDuration(totalDuration) : '0m' },
        ]}
        actions={(
          <ActionDock>
            <Button onClick={() => openSectionModal()} size="sm">
              <Plus className="w-4 h-4 mr-2" />Add Section
            </Button>
            <Link href="/crm/content/courses">
              <Button size="sm" variant="ghost">Course Library</Button>
            </Link>
          </ActionDock>
        )}
      />

      <div className="p-6">
        <Link href="/crm/content/courses" className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-6">
          <ArrowLeft className="w-4 h-4" />Back to Courses
        </Link>

        <Card className="mb-6">
          <CardContent className="py-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm text-blue-600 mb-1">{course.index_name}</p>
                <h2 className="text-xl font-semibold text-slate-900">{course.title}</h2>
                {course.description && <p className="text-slate-400 mt-1">{course.description}</p>}
              </div>
              <div className="flex flex-wrap gap-4 text-sm text-slate-500">
                <span>{totalSections} sections</span>
                <span>{totalLectures} lectures</span>
                {totalDuration > 0 && <span>{formatDuration(totalDuration)} total</span>}
              </div>
            </div>
          </CardContent>
        </Card>

        {course.sections.length === 0 ? (
          <EmptyState
            icon={Layers}
            title="No sections yet"
            description="Create your first section"
            action={{ label: 'Add Section', onClick: () => openSectionModal() }}
          />
        ) : (
          <div className="space-y-4">
            {course.sections.map((section, sectionIndex) => (
              <Card key={section.id}>
                <div
                  className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50"
                  onClick={() => toggleSection(section.id)}
                >
                  <GripVertical className="w-4 h-4 text-slate-600" />
                  {expandedSections.includes(section.id) ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronRight className="w-5 h-5 text-slate-400" />}
                  <div className="flex-1">
                    <h3 className="font-medium text-slate-900">Section {sectionIndex + 1}: {section.title}</h3>
                    <p className="text-sm text-slate-500">{section.lectures.length} lectures</p>
                  </div>
                  <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => openLectureModal(section.id)} className="p-2 hover:bg-slate-100 rounded-lg"><Plus className="w-4 h-4 text-blue-600" /></button>
                    <button onClick={() => openSectionModal(section)} className="p-2 hover:bg-slate-100 rounded-lg"><Edit className="w-4 h-4 text-slate-400" /></button>
                    <button onClick={() => handleDeleteSection(section)} className="p-2 hover:bg-slate-100 rounded-lg"><Trash2 className="w-4 h-4 text-red-400" /></button>
                  </div>
                </div>

                {expandedSections.includes(section.id) && (
                  <div className="border-t border-slate-200/70">
                    {section.lectures.length === 0 ? (
                      <div className="px-4 py-6 text-center text-slate-500">
                        <p>No lectures</p>
                        <Button variant="ghost" size="sm" className="mt-2" onClick={() => openLectureModal(section.id)}>
                          <Plus className="w-4 h-4 mr-1" />Add Lecture
                        </Button>
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-700/50">
                        {section.lectures.map((lecture, lectureIndex) => (
                          <div key={lecture.id} className="flex items-center gap-3 px-4 py-3 pl-12 hover:bg-slate-50">
                            <PlayCircle className="w-5 h-5 text-slate-500" />
                            <div className="flex-1">
                              <p className="text-slate-900">{sectionIndex + 1}.{lectureIndex + 1} {lecture.title}</p>
                              <div className="flex items-center gap-3 text-sm text-slate-500">
                                {lecture.duration_seconds > 0 && <span>{formatDuration(lecture.duration_seconds)}</span>}
                                {lecture.files.length > 0 && <span className="flex items-center gap-1"><FileText className="w-3 h-3" />{lecture.files.length} files</span>}
                              </div>
                            </div>
                            <button onClick={() => openFilesModal(lecture)} className="p-2 hover:bg-slate-100 rounded-lg" title="Manage Files">
                              <Upload className="w-4 h-4 text-blue-600" />
                            </button>
                            <button onClick={() => openLectureModal(section.id, lecture)} className="p-2 hover:bg-slate-100 rounded-lg"><Edit className="w-4 h-4 text-slate-400" /></button>
                            <button onClick={() => handleDeleteLecture(lecture)} className="p-2 hover:bg-slate-100 rounded-lg"><Trash2 className="w-4 h-4 text-red-400" /></button>
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

      <FocusPanel
        isOpen={showSectionModal}
        onClose={() => setShowSectionModal(false)}
        title={editingSection ? 'Edit Section' : 'Add Section'}
        subtitle="Sections keep lecture sequences predictable."
        footer={(
          <div className="flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setShowSectionModal(false)}>Cancel</Button>
            <Button type="submit" form="crm-section-form" loading={saving}>{editingSection ? 'Save Changes' : 'Add Section'}</Button>
          </div>
        )}
      >
        <form id="crm-section-form" onSubmit={handleSaveSection} className="space-y-4">
          <Input id="sectionTitle" label="Section Title" value={sectionTitle} onChange={(e) => setSectionTitle(e.target.value)} required />
          {error && <div className="bg-red-900/30 border border-red-800 text-red-400 px-4 py-3 rounded-lg text-sm">{error}</div>}
        </form>
      </FocusPanel>

      <FocusPanel
        isOpen={showLectureModal}
        onClose={() => setShowLectureModal(false)}
        title={editingLecture ? 'Edit Lecture' : 'Add Lecture'}
        subtitle="Lectures are the moments learners remember."
        size="lg"
        footer={(
          <div className="flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setShowLectureModal(false)}>Cancel</Button>
            <Button type="submit" form="crm-lecture-form" loading={saving}>{editingLecture ? 'Save Changes' : 'Add Lecture'}</Button>
          </div>
        )}
      >
        <form id="crm-lecture-form" onSubmit={handleSaveLecture} className="space-y-4">
          <Input id="lectureTitle" label="Lecture Title" value={lectureTitle} onChange={(e) => setLectureTitle(e.target.value)} required />
          <Textarea id="lectureDescription" label="Description" value={lectureDescription} onChange={(e) => setLectureDescription(e.target.value)} rows={3} />
          <Select
            id="videoSource"
            label="Video Source"
            value={videoSource}
            onChange={(e) => setVideoSource(e.target.value as 'youtube' | 'upload')}
            options={[
              { value: 'youtube', label: 'YouTube URL' },
              { value: 'upload', label: 'Upload Video' },
            ]}
          />
          {videoSource === 'youtube' ? (
            <Input id="lectureYoutubeUrl" label="YouTube URL" value={lectureYoutubeUrl} onChange={(e) => setLectureYoutubeUrl(e.target.value)} />
          ) : (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">Upload Video</label>
              <input
                type="file"
                accept="video/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleVideoUpload(file);
                }}
                className="block w-full text-sm text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
              />
              {videoUploading && (
                <div className="space-y-1">
                  <Progress value={videoUploadProgress} size="sm" />
                  <p className="text-xs text-slate-500">{videoUploadProgress}% uploaded</p>
                </div>
              )}
              {!videoUploading && videoStoragePath && (
                <p className="text-xs text-emerald-600">Video uploaded.</p>
              )}
            </div>
          )}
          <Input id="lectureDuration" label="Duration (minutes)" type="number" value={Math.floor(lectureDuration / 60)} onChange={(e) => setLectureDuration(parseInt(e.target.value || '0') * 60)} min={0} />
          {error && <div className="bg-red-900/30 border border-red-800 text-red-400 px-4 py-3 rounded-lg text-sm">{error}</div>}
        </form>
      </FocusPanel>

      <LectureFilesModal
        isOpen={showFilesModal}
        onClose={closeFilesModal}
        lecture={activeLecture}
        onUpdated={fetchCourse}
      />
    </div>
  );
}
