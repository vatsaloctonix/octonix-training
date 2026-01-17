/*
 * Assignments Page
 * Assign courses or indexes to candidates
 */

'use client';

import { useEffect, useState } from 'react';
import { Header } from '@/components/layout/header';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar } from '@/components/ui/avatar';
import { EmptyState } from '@/components/ui/empty-state';
import { Badge } from '@/components/ui/badge';
import { ClipboardList, Users } from 'lucide-react';

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
  const [message, setMessage] = useState('');

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
    setMessage('');

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
        setMessage(json.message || `Successfully assigned to ${selectedCandidates.length} candidate(s)`);
        setSelectedCandidates([]);
        setSelectedItem('');
      } else {
        setMessage(json.error || 'Assignment failed');
      }
    } catch (err) {
      console.error('Failed to create assignments:', err);
      setMessage('Failed to create assignments');
    } finally {
      setAssigning(false);
    }
  };

  const toggleCandidate = (id: string) => {
    setSelectedCandidates((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    if (selectedCandidates.length === candidates.length) {
      setSelectedCandidates([]);
    } else {
      setSelectedCandidates(candidates.map((c) => c.id));
    }
  };

  const itemOptions = assignType === 'course'
    ? courses.map((c) => ({ value: c.id, label: `${c.title} (${c.index_name})` }))
    : indexes.map((i) => ({ value: i.id, label: `${i.name} (${i.course_count} courses)` }));

  if (loading) {
    return (
      <div className="p-6">
        <div className="h-8 w-48 bg-slate-800 rounded skeleton mb-6" />
        <div className="h-64 bg-slate-800 rounded-xl skeleton" />
      </div>
    );
  }

  return (
    <div>
      <Header title="Assignments" />

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
              <div className={`mb-4 px-4 py-3 rounded-lg text-sm ${
                message.includes('Assigned') || message.includes('Success')
                  ? 'bg-green-900/30 border border-green-800 text-green-400'
                  : 'bg-red-900/30 border border-red-800 text-red-400'
              }`}>
                {message}
              </div>
            )}

            <div className="flex justify-end">
              <Button
                onClick={handleAssign}
                disabled={!selectedItem || selectedCandidates.length === 0}
                loading={assigning}
              >
                <ClipboardList className="w-4 h-4 mr-2" />
                Assign to {selectedCandidates.length} Candidate{selectedCandidates.length !== 1 && 's'}
              </Button>
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
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedCandidates.length === candidates.length}
                        onChange={toggleAll}
                      />
                    </TableHead>
                    <TableHead>Candidate</TableHead>
                    <TableHead>Username</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {candidates.map((candidate) => (
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
                          <span className="font-medium text-white">{candidate.full_name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-400">@{candidate.username}</TableCell>
                      <TableCell>
                        <Badge variant="success">Active</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
