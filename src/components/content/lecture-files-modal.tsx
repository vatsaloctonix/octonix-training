/*
 * Lecture Files Modal
 * Manage attachments for a lecture
 */

'use client';

import { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { formatFileSize } from '@/lib/utils';
import { FileText, Trash2, Upload } from 'lucide-react';

interface LectureFile {
  id: string;
  file_name: string;
  file_size: number;
  file_type: string | null;
}

interface LectureSummary {
  id: string;
  title: string;
  files: LectureFile[];
}

interface LectureFilesModalProps {
  isOpen: boolean;
  onClose: () => void;
  lecture: LectureSummary | null;
  onUpdated: () => void;
}

export function LectureFilesModal({ isOpen, onClose, lecture, onUpdated }: LectureFilesModalProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setSelectedFiles([]);
      setError('');
    }
  }, [isOpen, lecture?.id]);

  const handleUpload = async () => {
    if (!lecture || selectedFiles.length === 0) return;

    setUploading(true);
    setError('');

    try {
      for (const file of selectedFiles) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('lecture_id', lecture.id);

        const res = await fetch('/api/files', {
          method: 'POST',
          body: formData,
        });

        const json = await res.json();
        if (!json.success) {
          setError(json.error || 'Failed to upload file');
          break;
        }
      }

      setSelectedFiles([]);
      onUpdated();
    } catch {
      setError('Failed to upload files');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (fileId: string) => {
    setDeletingId(fileId);
    setError('');

    try {
      const res = await fetch(`/api/files?id=${fileId}`, { method: 'DELETE' });
      const json = await res.json();

      if (!json.success) {
        setError(json.error || 'Failed to delete file');
        return;
      }

      onUpdated();
    } catch {
      setError('Failed to delete file');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={lecture ? `Files for ${lecture.title}` : 'Lecture Files'}
      size="lg"
    >
      {!lecture ? (
        <p className="text-sm text-slate-400">Select a lecture to manage files.</p>
      ) : (
        <div className="space-y-6">
          <div className="space-y-3">
            <label className="text-sm font-medium text-slate-300">
              Upload Files
            </label>
            <input
              type="file"
              multiple
              onChange={(e) => setSelectedFiles(Array.from(e.target.files || []))}
              className="block w-full text-sm text-slate-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-slate-700 file:text-slate-200 hover:file:bg-slate-600"
            />
            {selectedFiles.length > 0 && (
              <div className="text-xs text-slate-400">
                {selectedFiles.length} file{selectedFiles.length !== 1 && 's'} selected
              </div>
            )}
            <Button
              onClick={handleUpload}
              loading={uploading}
              disabled={selectedFiles.length === 0 || uploading}
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload Files
            </Button>
          </div>

          <div>
            <h3 className="text-sm font-medium text-slate-300 mb-3">Attached Files</h3>
            {lecture.files.length === 0 ? (
              <p className="text-sm text-slate-500">No files attached yet.</p>
            ) : (
              <div className="space-y-2">
                {lecture.files.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center gap-3 p-3 bg-slate-800/50 border border-slate-700 rounded-lg"
                  >
                    <FileText className="w-5 h-5 text-blue-400" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">{file.file_name}</p>
                      <p className="text-xs text-slate-500">
                        {formatFileSize(file.file_size)}{file.file_type ? ` • ${file.file_type}` : ''}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDelete(file.id)}
                      disabled={deletingId === file.id}
                      className="p-2 hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50"
                      title="Delete file"
                    >
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {error && (
            <div className="bg-red-900/30 border border-red-800 text-red-400 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
