/*
 * CRM Indexes Page
 * Same as trainer indexes - manages content categories
 */

'use client';

import { useEffect, useState } from 'react';
import { Header } from '@/components/layout/header';
import { ActionDock } from '@/components/layout/action-dock';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { EmptyState } from '@/components/ui/empty-state';
import { Badge } from '@/components/ui/badge';
import { Plus, FolderOpen, BookOpen, Edit, Trash2 } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { FocusPanel } from '@/components/layout/focus-panel';
import Link from 'next/link';

interface Index {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  course_count: number;
}

export default function CRMIndexesPage() {
  const [indexes, setIndexes] = useState<Index[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showPanel, setShowPanel] = useState(false);
  const [editingIndex, setEditingIndex] = useState<Index | null>(null);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchIndexes();
  }, []);

  const fetchIndexes = async () => {
    try {
      const res = await fetch('/api/indexes');
      const json = await res.json();
      if (json.success) setIndexes(json.indexes);
    } catch (error) {
      console.error('Failed to fetch indexes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      const url = editingIndex ? `/api/indexes/${editingIndex.id}` : '/api/indexes';
      const method = editingIndex ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description }),
      });

      const json = await res.json();

      if (!json.success) {
        setError(json.error);
        setSaving(false);
        return;
      }

      if (editingIndex) {
        setIndexes(indexes.map((i) => (i.id === editingIndex.id ? { ...i, ...json.index } : i)));
      } else {
        setIndexes([{ ...json.index, course_count: 0 }, ...indexes]);
      }

      closeModal();
    } catch (err) {
      console.error('Failed to save index:', err);
      setError('Failed to save index');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (index: Index) => {
    if (!confirm(`Delete "${index.name}"? All courses under it will be deleted.`)) return;

    try {
      const res = await fetch(`/api/indexes/${index.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) setIndexes(indexes.filter((i) => i.id !== index.id));
    } catch (error) {
      console.error('Failed to delete index:', error);
    }
  };

  const openCreateModal = () => {
    setEditingIndex(null);
    setName('');
    setDescription('');
    setError('');
    setShowPanel(true);
  };

  const openEditModal = (index: Index) => {
    setEditingIndex(index);
    setName(index.name);
    setDescription(index.description || '');
    setError('');
    setShowPanel(true);
  };

  const closeModal = () => {
    setShowPanel(false);
    setEditingIndex(null);
  };

  const filteredIndexes = indexes.filter((i) =>
    i.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <Header
        title="Index Catalog"
        subtitle="Organize courses into clear learning tracks."
        meta={[
          { label: 'Indexes', value: String(indexes.length) },
          { label: 'Active', value: String(indexes.filter((i) => i.is_active).length) },
        ]}
        showSearch
        onSearch={setSearch}
        searchPlaceholder="Search indexes..."
        actions={(
          <ActionDock>
            <Button onClick={openCreateModal} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Create Index
            </Button>
            <Link href="/crm/content">
              <Button variant="ghost" size="sm">Content Studio</Button>
            </Link>
          </ActionDock>
        )}
      />

      <div className="p-6">
        <Card>
          <CardHeader
            title="Content Indexes"
            description="Organize your courses into categories"
          />
          <CardContent>
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-40 bg-white/70 rounded-xl skeleton" />
                ))}
              </div>
            ) : filteredIndexes.length === 0 ? (
              <EmptyState
                icon={FolderOpen}
                title="No indexes found"
                description="Create your first index to organize courses"
                action={!search ? { label: 'Create Index', onClick: openCreateModal } : undefined}
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredIndexes.map((index) => (
                  <div
                    key={index.id}
                    className="bg-white/70 border border-white/60 rounded-2xl p-5 hover:border-blue-200 transition-colors backdrop-blur-xl shadow-sm"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-900/30 rounded-lg">
                          <FolderOpen className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-slate-900">{index.name}</h3>
                          <p className="text-xs text-slate-500">{formatDate(index.created_at)}</p>
                        </div>
                      </div>
                      <Badge variant={index.is_active ? 'success' : 'danger'} size="sm">
                        {index.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>

                    {index.description && (
                      <p className="text-sm text-slate-400 mb-4 line-clamp-2">{index.description}</p>
                    )}

                    <div className="flex items-center justify-between pt-3 border-t border-slate-200/70">
                      <div className="flex items-center gap-1 text-sm text-slate-400">
                        <BookOpen className="w-4 h-4" />
                        <span>{index.course_count} courses</span>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => openEditModal(index)}
                          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                          <Edit className="w-4 h-4 text-slate-400" />
                        </button>
                        <button
                          onClick={() => handleDelete(index)}
                          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                        >
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
        title={editingIndex ? 'Edit Index' : 'Create Index'}
        subtitle="Indexes help teams locate the right content quickly."
        footer={(
          <div className="flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={closeModal}>Cancel</Button>
            <Button type="submit" form="crm-index-form" loading={saving}>
              {editingIndex ? 'Save Changes' : 'Create Index'}
            </Button>
          </div>
        )}
      >
        <form id="crm-index-form" onSubmit={handleSave} className="space-y-4">
          <Input
            id="name"
            label="Index Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <Textarea
            id="description"
            label="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
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
