/*
 * Reassign Page
 * Admin can reassign candidates from one trainer to another
 */

'use client';

import { useEffect, useState } from 'react';
import { Header } from '@/components/layout/header';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { EmptyState } from '@/components/ui/empty-state';
import { InlineNotice } from '@/components/ui/inline-notice';
import { SearchInput } from '@/components/ui/search-input';
import { Users, ArrowRight } from 'lucide-react';

interface User {
  id: string;
  username: string;
  full_name: string;
  is_active: boolean;
  created_by: string;
}

export default function ReassignPage() {
  const [trainers, setTrainers] = useState<User[]>([]);
  const [candidates, setCandidates] = useState<User[]>([]);
  const [selectedTrainer, setSelectedTrainer] = useState('');
  const [targetTrainer, setTargetTrainer] = useState('');
  const [selectedCandidates, setSelectedCandidates] = useState<string[]>([]);
  const [reassigning, setReassigning] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'danger'; text: string } | null>(null);
  const [candidateSearch, setCandidateSearch] = useState('');

  useEffect(() => {
    fetchTrainers();
  }, []);

  useEffect(() => {
    if (selectedTrainer) {
      fetchCandidates(selectedTrainer);
    } else {
      setCandidates([]);
    }
    setSelectedCandidates([]);
    setCandidateSearch('');
  }, [selectedTrainer]);

  const fetchTrainers = async () => {
    try {
      const res = await fetch('/api/users?role=trainer');
      const json = await res.json();
      if (json.success) {
        setTrainers(json.users.filter((u: User) => u.is_active));
      }
    } catch (error) {
      console.error('Failed to fetch trainers:', error);
    }
  };

  const fetchCandidates = async (trainerId: string) => {
    try {
      const res = await fetch(`/api/users?role=candidate`);
      const json = await res.json();
      if (json.success) {
        // Filter candidates created by selected trainer
        setCandidates(json.users.filter((u: User) => u.created_by === trainerId));
      }
    } catch (error) {
      console.error('Failed to fetch candidates:', error);
    }
  };

  const handleReassign = async () => {
    if (!targetTrainer || selectedCandidates.length === 0) return;

    setReassigning(true);
    setMessage(null);

    try {
      // Reassign each candidate
      const results = await Promise.all(
        selectedCandidates.map((candidateId) =>
          fetch(`/api/users/${candidateId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ created_by: targetTrainer }),
          })
        )
      );

      const success = results.every((r) => r.ok);
      if (success) {
        setMessage({
          type: 'success',
          text: `Reassigned ${selectedCandidates.length} candidate(s) successfully.`,
        });
        setCandidates(candidates.filter((c) => !selectedCandidates.includes(c.id)));
        setSelectedCandidates([]);
      } else {
        setMessage({ type: 'danger', text: 'Some reassignments failed. Review and retry.' });
      }
    } catch (err) {
      console.error('Failed to reassign candidates:', err);
      setMessage({ type: 'danger', text: 'Failed to reassign candidates. Please try again.' });
    } finally {
      setReassigning(false);
    }
  };

  const toggleSelect = (id: string) => {
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

  const trainerOptions = trainers.map((t) => ({
    value: t.id,
    label: t.full_name,
  }));

  const sourceTrainerName = trainers.find((t) => t.id === selectedTrainer)?.full_name || 'Not selected';
  const targetTrainerName = trainers.find((t) => t.id === targetTrainer)?.full_name || 'Not selected';

  return (
    <div>
      <Header
        title="Candidate Transfer Desk"
        subtitle="Move candidates safely while preserving their assignments."
        meta={[{ label: 'Time zone', value: 'ET' }]}
      />

      <div className="p-6 space-y-6">
        {/* Selection Controls */}
        <Card>
          <CardHeader
            title="Step 1: Choose Trainers"
            description="Select the current trainer and the new destination."
          />
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <Select
                id="sourceTrainer"
                label="From Trainer"
                value={selectedTrainer}
                onChange={(e) => setSelectedTrainer(e.target.value)}
                options={[{ value: '', label: 'Select trainer...' }, ...trainerOptions]}
              />

              <div className="flex items-center justify-center">
                <ArrowRight className="w-6 h-6 text-slate-500" />
              </div>

              <Select
                id="targetTrainer"
                label="To Trainer"
                value={targetTrainer}
                onChange={(e) => setTargetTrainer(e.target.value)}
                options={[
                  { value: '', label: 'Select trainer...' },
                  ...trainerOptions.filter((t) => t.value !== selectedTrainer),
                ]}
                disabled={!selectedTrainer}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader
            title="Transfer Preview"
            description="Confirm the impact before applying changes."
            action={(
              <Button
                onClick={handleReassign}
                disabled={!targetTrainer || selectedCandidates.length === 0}
                loading={reassigning}
              >
                Reassign {selectedCandidates.length || 0} Candidate{selectedCandidates.length !== 1 && 's'}
              </Button>
            )}
          />
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-slate-600">
              <div className="rounded-lg border border-slate-200/70 bg-white/70 px-4 py-3">
                <p className="text-xs uppercase tracking-wide text-slate-400">From</p>
                <p className="text-slate-900 font-medium mt-1">{sourceTrainerName}</p>
              </div>
              <div className="rounded-lg border border-slate-200/70 bg-white/70 px-4 py-3">
                <p className="text-xs uppercase tracking-wide text-slate-400">To</p>
                <p className="text-slate-900 font-medium mt-1">{targetTrainerName}</p>
              </div>
              <div className="rounded-lg border border-slate-200/70 bg-white/70 px-4 py-3">
                <p className="text-xs uppercase tracking-wide text-slate-400">Selected</p>
                <p className="text-slate-900 font-medium mt-1">{selectedCandidates.length} candidate(s)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Candidates Table */}
        <Card>
          <CardHeader
            title="Step 2: Select Candidates"
            description={selectedCandidates.length > 0 ? `${selectedCandidates.length} selected` : 'Pick the candidates to move'}
          />
          <CardContent>
            {message && (
              <InlineNotice
                variant={message.type}
                title={message.type === 'success' ? 'Transfer complete' : 'Transfer blocked'}
                message={message.text}
                className="mb-4"
              />
            )}

            {!selectedTrainer ? (
              <EmptyState
                icon={Users}
                title="Select a trainer"
                description="Choose a trainer to see their candidates"
              />
            ) : candidates.length === 0 ? (
              <EmptyState
                icon={Users}
                title="No candidates found"
                description="This trainer has no candidates"
              />
            ) : (
              <div className="space-y-4">
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
                            onChange={() => toggleSelect(candidate.id)}
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
                          <Badge variant={candidate.is_active ? 'success' : 'danger'}>
                            {candidate.is_active ? 'Active' : 'Inactive'}
                          </Badge>
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
