/*
 * CRM Assignments Page
 * Assign content to staff users
 */

'use client';

import { useEffect, useState } from 'react';
import { Header } from '@/components/layout/header';
import { ActionDock } from '@/components/layout/action-dock';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar } from '@/components/ui/avatar';
import { EmptyState } from '@/components/ui/empty-state';
import { Badge } from '@/components/ui/badge';
import { Users } from 'lucide-react';
import { InlineNotice } from '@/components/ui/inline-notice';
import { SearchInput } from '@/components/ui/search-input';
import Link from 'next/link';

interface OtherUser {
  id: string;
  username: string;
  full_name: string;
  is_active: boolean;
}

interface Index {
  id: string;
  name: string;
  course_count: number;
}

interface Course {
  id: string;
  title: string;
  index_name: string;
}

export default function CRMAssignmentsPage() {
  const [others, setOthers] = useState<OtherUser[]>([]);
  const [indexes, setIndexes] = useState<Index[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  const [assignType, setAssignType] = useState<'course' | 'index'>('course');
  const [selectedItem, setSelectedItem] = useState('');
  const [selectedOthers, setSelectedOthers] = useState<string[]>([]);
  const [assigning, setAssigning] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'danger'; text: string } | null>(null);
  const [staffSearch, setStaffSearch] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [othersRes, indexesRes, coursesRes] = await Promise.all([
        fetch('/api/users?role=other'),
        fetch('/api/indexes'),
        fetch('/api/courses'),
      ]);

      const othersJson = await othersRes.json();
      const indexesJson = await indexesRes.json();
      const coursesJson = await coursesRes.json();

      if (othersJson.success) setOthers(othersJson.users.filter((u: OtherUser) => u.is_active));
      if (indexesJson.success) setIndexes(indexesJson.indexes);
      if (coursesJson.success) setCourses(coursesJson.courses);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedItem || selectedOthers.length === 0) return;

    setAssigning(true);
    setMessage(null);

    try {
      const body: Record<string, unknown> = { user_ids: selectedOthers };
      if (assignType === 'course') body.course_id = selectedItem;
      else body.index_id = selectedItem;

      const res = await fetch('/api/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const json = await res.json();

      if (json.success) {
        setMessage({
          type: 'success',
          text: json.message || `Assigned to ${selectedOthers.length} staff members.`,
        });
        setSelectedOthers([]);
        setSelectedItem('');
      } else {
        setMessage({ type: 'danger', text: json.error || 'Assignment failed.' });
      }
    } catch {
      setMessage({ type: 'danger', text: 'Failed to create assignments.' });
    } finally {
      setAssigning(false);
    }
  };

  const toggleOther = (id: string) => {
    setSelectedOthers((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const visibleOthers = others.filter((other) => {
    if (!staffSearch.trim()) return true;
    const term = staffSearch.toLowerCase();
    return (
      other.username.toLowerCase().includes(term) ||
      other.full_name.toLowerCase().includes(term)
    );
  });

  const allVisibleSelected = visibleOthers.length > 0 &&
    visibleOthers.every((o) => selectedOthers.includes(o.id));

  const toggleAll = () => {
    if (allVisibleSelected) {
      setSelectedOthers((prev) =>
        prev.filter((id) => !visibleOthers.some((o) => o.id === id))
      );
    } else {
      const toAdd = visibleOthers
        .map((o) => o.id)
        .filter((id) => !selectedOthers.includes(id));
      setSelectedOthers((prev) => [...prev, ...toAdd]);
    }
  };

  const itemOptions = assignType === 'course'
    ? courses.map((c) => ({ value: c.id, label: `${c.title} (${c.index_name})` }))
    : indexes.map((i) => ({ value: i.id, label: `${i.name} (${i.course_count} courses)` }));

  if (loading) {
    return <div className="p-6"><div className="h-64 bg-white/70 rounded-xl skeleton" /></div>;
  }

  const selectedLabel = itemOptions.find((item) => item.value === selectedItem)?.label || 'Not selected';

  return (
    <div>
      <Header
        title="Assignment Orchestrator"
        subtitle="Assign courses or indexes in a single pass."
        meta={[{ label: 'Active staff', value: String(others.length) }]}
        actions={(
          <ActionDock>
            <Link href="/crm/others">
              <Button size="sm" variant="outline">Roster Command</Button>
            </Link>
            <Link href="/crm/content">
              <Button size="sm" variant="ghost">Content Studio</Button>
            </Link>
          </ActionDock>
        )}
      />

      <div className="p-6 space-y-6">
        <Card>
          <CardHeader title="Create Assignment" description="Assign content to staff users" />
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Select
                id="assignType"
                label="Assignment Type"
                value={assignType}
                onChange={(e) => { setAssignType(e.target.value as 'course' | 'index'); setSelectedItem(''); }}
                options={[
                  { value: 'course', label: 'Single Course' },
                  { value: 'index', label: 'Entire Index' },
                ]}
              />
              <div className="md:col-span-2">
                <Select
                  id="selectedItem"
                  label={assignType === 'course' ? 'Select Course' : 'Select Index'}
                  value={selectedItem}
                  onChange={(e) => setSelectedItem(e.target.value)}
                  options={[{ value: '', label: `Select ${assignType}...` }, ...itemOptions]}
                />
              </div>
            </div>

            {message && (
              <InlineNotice
                variant={message.type}
                title={message.type === 'success' ? 'Assignment confirmed' : 'Assignment blocked'}
                message={message.text}
                className="mb-4"
              />
            )}

            <div className="text-xs text-slate-500">
              Assignments are applied immediately and keep existing learner progress intact.
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader
            title="Assignment Preview"
            description="Confirm scope before applying."
            action={(
              <Button onClick={handleAssign} disabled={!selectedItem || selectedOthers.length === 0} loading={assigning}>
                Assign {selectedOthers.length} Staff
              </Button>
            )}
          />
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-slate-600">
              <div className="rounded-lg border border-slate-200/70 bg-white/70 px-4 py-3">
                <p className="text-xs uppercase tracking-wide text-slate-400">Type</p>
                <p className="text-slate-900 font-medium mt-1">{assignType === 'course' ? 'Course' : 'Index'}</p>
              </div>
              <div className="rounded-lg border border-slate-200/70 bg-white/70 px-4 py-3">
                <p className="text-xs uppercase tracking-wide text-slate-400">Selected Item</p>
                <p className="text-slate-900 font-medium mt-1">{selectedLabel}</p>
              </div>
              <div className="rounded-lg border border-slate-200/70 bg-white/70 px-4 py-3">
                <p className="text-xs uppercase tracking-wide text-slate-400">Recipients</p>
                <p className="text-slate-900 font-medium mt-1">{selectedOthers.length} staff member(s)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader title="Select Staff Users" description={`${selectedOthers.length} of ${others.length} selected`} />
          <CardContent className="p-0">
            {others.length === 0 ? (
              <div className="p-6">
                <EmptyState icon={Users} title="No staff users" description="Create staff users first" />
              </div>
            ) : (
              <div className="p-6 space-y-4">
                <SearchInput
                  placeholder="Search staff users..."
                  value={staffSearch}
                  onChange={(e) => setStaffSearch(e.target.value)}
                  onClear={() => setStaffSearch('')}
                />
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox checked={allVisibleSelected} onChange={toggleAll} />
                      </TableHead>
                      <TableHead>Staff User</TableHead>
                      <TableHead>Username</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visibleOthers.map((other) => (
                      <TableRow key={other.id}>
                        <TableCell>
                          <Checkbox checked={selectedOthers.includes(other.id)} onChange={() => toggleOther(other.id)} />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar name={other.full_name} size="sm" />
                            <span className="font-medium text-slate-900">{other.full_name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-slate-400">@{other.username}</TableCell>
                        <TableCell><Badge variant="success">Active</Badge></TableCell>
                      </TableRow>
                    ))}
                    {visibleOthers.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-slate-500 py-8">
                          No matching staff users
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
