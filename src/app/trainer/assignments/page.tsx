/*
 * Assignments Page
 * Assign courses or indexes to candidates
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

interface Candidate {
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

export default function AssignmentsPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [indexes, setIndexes] = useState<Index[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  const [assignType, setAssignType] = useState<'course' | 'index'>('course');
  const [selectedItem, setSelectedItem] = useState('');
  const [selectedCandidates, setSelectedCandidates] = useState<string[]>([]);
  const [assigning, setAssigning] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'danger'; text: string } | null>(null);
  const [candidateSearch, setCandidateSearch] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [candidatesRes, indexesRes, coursesRes] = await Promise.all([
        fetch('/api/users?role=candidate'),
        fetch('/api/indexes'),
        fetch('/api/courses'),
      ]);

      const candidatesJson = await candidatesRes.json();
      const indexesJson = await indexesRes.json();
      const coursesJson = await coursesRes.json();

      if (candidatesJson.success) setCandidates(candidatesJson.users.filter((u: Candidate) => u.is_active));
      if (indexesJson.success) setIndexes(indexesJson.indexes);
      if (coursesJson.success) setCourses(coursesJson.courses);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedItem || selectedCandidates.length === 0) return;

    setAssigning(true);
    setMessage(null);

    try {
      const body: Record<string, unknown> = {
        user_ids: selectedCandidates,
      };

      if (assignType === 'course') {
        body.course_id = selectedItem;
      } else {
        body.index_id = selectedItem;
      }

      const res = await fetch('/api/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const json = await res.json();

      if (json.success) {
        setMessage({
          type: 'success',
          text: json.message || `Assigned to ${selectedCandidates.length} candidate(s).`,
        });
        setSelectedCandidates([]);
        setSelectedItem('');
      } else {
        setMessage({ type: 'danger', text: json.error || 'Assignment failed.' });
      }
    } catch (err) {
      console.error('Failed to create assignments:', err);
      setMessage({ type: 'danger', text: 'Failed to create assignments.' });
    } finally {
      setAssigning(false);
    }
  };

  const toggleCandidate = (id: string) => {
    setSelectedCandidates((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const visibleCandidates = candidates.filter((candidate) => {
    if (!candidateSearch.trim()) return true;
    const term = candidateSearch.toLowerCase();
    return (
      candidate.username.toLowerCase().includes(term) ||
      candidate.full_name.toLowerCase().includes(term)
    );
  });

  const allVisibleSelected = visibleCandidates.length > 0 &&
    visibleCandidates.every((c) => selectedCandidates.includes(c.id));

  const toggleAll = () => {
    if (allVisibleSelected) {
      setSelectedCandidates((prev) =>
        prev.filter((id) => !visibleCandidates.some((c) => c.id === id))
      );
    } else {
      const toAdd = visibleCandidates
        .map((c) => c.id)
        .filter((id) => !selectedCandidates.includes(id));
      setSelectedCandidates((prev) => [...prev, ...toAdd]);
    }
  };

  const itemOptions = assignType === 'course'
    ? courses.map((c) => ({ value: c.id, label: `${c.title} (${c.index_name})` }))
    : indexes.map((i) => ({ value: i.id, label: `${i.name} (${i.course_count} courses)` }));

  if (loading) {
    return (
      <div className="p-6">
        <div className="h-8 w-48 bg-white/70 rounded skeleton mb-6" />
        <div className="h-64 bg-white/70 rounded-xl skeleton" />
      </div>
    );
  }

  const selectedLabel = itemOptions.find((item) => item.value === selectedItem)?.label || 'Not selected';

  return (
    <div>
      <Header
        title="Assignment Orchestrator"
        subtitle="Assign courses or indexes in a single pass."
        meta={[{ label: 'Active candidates', value: String(candidates.length) }]}
        actions={(
          <ActionDock>
            <Link href="/trainer/candidates">
              <Button size="sm" variant="outline">Roster Command</Button>
            </Link>
            <Link href="/trainer/content">
              <Button size="sm" variant="ghost">Content Studio</Button>
            </Link>
          </ActionDock>
        )}
      />

      <div className="p-6 space-y-6">
        {/* Assignment Form */}
        <Card>
          <CardHeader
            title="Create Assignment"
            description="Assign courses or indexes to your candidates"
          />
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Select
                id="assignType"
                label="Assignment Type"
                value={assignType}
                onChange={(e) => {
                  setAssignType(e.target.value as 'course' | 'index');
                  setSelectedItem('');
                }}
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
                  options={[
                    { value: '', label: `Select ${assignType}...` },
                    ...itemOptions,
                  ]}
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
              <Button
                onClick={handleAssign}
                disabled={!selectedItem || selectedCandidates.length === 0}
                loading={assigning}
              >
                Assign {selectedCandidates.length} Candidate{selectedCandidates.length !== 1 && 's'}
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
                <p className="text-slate-900 font-medium mt-1">{selectedCandidates.length} candidate(s)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Candidates Selection */}
        <Card>
          <CardHeader
            title="Select Candidates"
            description={`${selectedCandidates.length} of ${candidates.length} selected`}
          />
          <CardContent className="p-0">
            {candidates.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  icon={Users}
                  title="No candidates"
                  description="Create candidates first before making assignments"
                />
              </div>
            ) : (
              <div className="p-6 space-y-4">
                <SearchInput
                  placeholder="Search candidates..."
                  value={candidateSearch}
                  onChange={(e) => setCandidateSearch(e.target.value)}
                  onClear={() => setCandidateSearch('')}
                />
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={allVisibleSelected}
                          onChange={toggleAll}
                        />
                      </TableHead>
                      <TableHead>Candidate</TableHead>
                      <TableHead>Username</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visibleCandidates.map((candidate) => (
                      <TableRow key={candidate.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedCandidates.includes(candidate.id)}
                            onChange={() => toggleCandidate(candidate.id)}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar name={candidate.full_name} size="sm" />
                            <span className="font-medium text-slate-900">{candidate.full_name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-slate-400">@{candidate.username}</TableCell>
                        <TableCell>
                          <Badge variant="success">Active</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                    {visibleCandidates.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-slate-500 py-8">
                          No matching candidates
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
