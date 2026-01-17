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
  const [message, setMessage] = useState('');

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
    setMessage('');

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
        setMessage(`Successfully reassigned ${selectedCandidates.length} candidate(s)`);
        setCandidates(candidates.filter((c) => !selectedCandidates.includes(c.id)));
        setSelectedCandidates([]);
      } else {
        setMessage('Some reassignments failed');
      }
    } catch (err) {
      console.error('Failed to reassign candidates:', err);
      setMessage('Failed to reassign candidates');
    } finally {
      setReassigning(false);
    }
  };

  const toggleSelect = (id: string) => {
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

  const trainerOptions = trainers.map((t) => ({
    value: t.id,
    label: t.full_name,
  }));

  return (
    <div>
      <Header title="Reassign Candidates" />

      <div className="p-6 space-y-6">
        {/* Selection Controls */}
        <Card>
          <CardHeader
            title="Reassign Candidates"
            description="Move candidates from one trainer to another"
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

        {/* Candidates Table */}
        <Card>
          <CardHeader
            title="Select Candidates"
            description={selectedCandidates.length > 0 ? `${selectedCandidates.length} selected` : 'Select candidates to reassign'}
            action={
              <Button
                onClick={handleReassign}
                disabled={!targetTrainer || selectedCandidates.length === 0}
                loading={reassigning}
              >
                Reassign Selected
              </Button>
            }
          />
          <CardContent>
            {message && (
              <div className={`mb-4 px-4 py-3 rounded-lg text-sm ${
                message.includes('Success')
                  ? 'bg-green-900/30 border border-green-800 text-green-400'
                  : 'bg-red-900/30 border border-red-800 text-red-400'
              }`}>
                {message}
              </div>
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
                          onChange={() => toggleSelect(candidate.id)}
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
                        <Badge variant={candidate.is_active ? 'success' : 'danger'}>
                          {candidate.is_active ? 'Active' : 'Inactive'}
                        </Badge>
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
