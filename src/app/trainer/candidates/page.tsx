/*
 * Candidates Management Page
 * Create, view, and manage candidate accounts
 */

'use client';

import { useEffect, useState } from 'react';
import { Header } from '@/components/layout/header';
import { ActionDock } from '@/components/layout/action-dock';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { EmptyState } from '@/components/ui/empty-state';
import { Plus, Users, ToggleLeft, ToggleRight, Upload } from 'lucide-react';
import { formatDate, generatePassword, parseCSV } from '@/lib/utils';
import { FocusPanel } from '@/components/layout/focus-panel';
import Link from 'next/link';

interface Candidate {
  id: string;
  username: string;
  full_name: string;
  is_active: boolean;
  created_at: string;
}

export default function CandidatesPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreatePanel, setShowCreatePanel] = useState(false);
  const [showBulkPanel, setShowBulkPanel] = useState(false);
  const [creating, setCreating] = useState(false);

  // Single create form
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');

  // Bulk create form
  const [csvData, setCsvData] = useState('');
  const [bulkResults, setBulkResults] = useState<{ username: string; success: boolean; error?: string }[]>([]);

  useEffect(() => {
    fetchCandidates();
  }, []);

  const fetchCandidates = async () => {
    try {
      const res = await fetch('/api/users?role=candidate');
      const json = await res.json();
      if (json.success) {
        setCandidates(json.users);
      }
    } catch (error) {
      console.error('Failed to fetch candidates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setCreating(true);

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          password,
          full_name: fullName,
          role: 'candidate',
        }),
      });

      const json = await res.json();

      if (!json.success) {
        setError(json.error);
        setCreating(false);
        return;
      }

      setCandidates([json.user, ...candidates]);
      setShowCreatePanel(false);
      resetForm();
    } catch (err) {
      console.error('Failed to create candidate:', err);
      setError('Failed to create candidate');
    } finally {
      setCreating(false);
    }
  };

  const handleBulkCreate = async () => {
    const users = parseCSV(csvData);
    if (users.length === 0) {
      setError('No valid users found in CSV');
      return;
    }

    setCreating(true);
    setBulkResults([]);

    try {
      const res = await fetch('/api/users/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ users, role: 'candidate' }),
      });

      const json = await res.json();

      if (json.results) {
        setBulkResults(json.results);
        // Refresh candidates list
        fetchCandidates();
      }
    } catch (err) {
      console.error('Bulk creation failed:', err);
      setError('Bulk creation failed');
    } finally {
      setCreating(false);
    }
  };

  const toggleActive = async (candidate: Candidate) => {
    try {
      const res = await fetch(`/api/users/${candidate.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !candidate.is_active }),
      });

      const json = await res.json();
      if (json.success) {
        setCandidates(candidates.map((c) =>
          c.id === candidate.id ? { ...c, is_active: !c.is_active } : c
        ));
      }
    } catch (error) {
      console.error('Failed to toggle candidate status:', error);
    }
  };

  const resetForm = () => {
    setUsername('');
    setPassword('');
    setFullName('');
    setError('');
  };

  const openCreatePanel = () => {
    resetForm();
    setPassword(generatePassword(8));
    setShowCreatePanel(true);
  };

  const openBulkPanel = () => {
    setCsvData('');
    setBulkResults([]);
    setError('');
    setShowBulkPanel(true);
  };

  const filteredCandidates = candidates.filter((c) =>
    c.username.toLowerCase().includes(search.toLowerCase()) ||
    c.full_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <Header
        title="Roster Command"
        subtitle="Create candidates quickly and keep access tidy."
        meta={[
          { label: 'Total candidates', value: String(candidates.length) },
          { label: 'Active', value: String(candidates.filter((c) => c.is_active).length) },
        ]}
        showSearch
        onSearch={setSearch}
        searchPlaceholder="Search candidates..."
        actions={(
          <ActionDock>
            <Button variant="outline" onClick={openBulkPanel} size="sm">
              <Upload className="w-4 h-4 mr-2" />
              Bulk Import
            </Button>
            <Button onClick={openCreatePanel} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Candidate
            </Button>
            <Link href="/trainer/assignments">
              <Button variant="ghost" size="sm">Assign Content</Button>
            </Link>
          </ActionDock>
        )}
      />

      <div className="p-6">
        <Card>
          <CardHeader
            title="Candidate Accounts"
            description="Manage your candidate accounts"
          />
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-16 bg-white/70 rounded skeleton" />
                ))}
              </div>
            ) : filteredCandidates.length === 0 ? (
              <EmptyState
                icon={Users}
                title="No candidates found"
                description={search ? 'Try a different search term' : 'Create your first candidate to get started'}
                action={!search ? { label: 'Add Candidate', onClick: openCreatePanel } : undefined}
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Candidate</TableHead>
                    <TableHead>Username</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-20">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCandidates.map((candidate) => (
                    <TableRow key={candidate.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar name={candidate.full_name} size="sm" />
                          <span className="font-medium text-slate-900">{candidate.full_name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-400">@{candidate.username}</TableCell>
                      <TableCell className="text-slate-400">{formatDate(candidate.created_at)}</TableCell>
                      <TableCell>
                        <Badge variant={candidate.is_active ? 'success' : 'danger'}>
                          {candidate.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <button
                          onClick={() => toggleActive(candidate)}
                          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                          title={candidate.is_active ? 'Deactivate' : 'Activate'}
                        >
                          {candidate.is_active ? (
                            <ToggleRight className="w-5 h-5 text-green-400" />
                          ) : (
                            <ToggleLeft className="w-5 h-5 text-slate-400" />
                          )}
                        </button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create Candidate Modal */}
      <FocusPanel
        isOpen={showCreatePanel}
        onClose={() => setShowCreatePanel(false)}
        title="Create Candidate"
        subtitle="Add a learner and share credentials instantly."
        footer={(
          <div className="flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setShowCreatePanel(false)}>
              Cancel
            </Button>
            <Button type="submit" form="create-candidate-form" loading={creating}>
              Create Candidate
            </Button>
          </div>
        )}
      >
        <form id="create-candidate-form" onSubmit={handleCreate} className="space-y-4">
          <Input
            id="fullName"
            label="Full Name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="John Doe"
            required
          />
          <Input
            id="username"
            label="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
            placeholder="john_doe"
            required
          />
          <div>
            <Input
              id="password"
              label="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              onClick={() => setPassword(generatePassword(8))}
              className="text-sm text-blue-600 hover:text-blue-500 mt-1"
            >
              Generate new password
            </button>
          </div>

          {error && (
            <div className="bg-red-900/30 border border-red-800 text-red-400 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}
        </form>
      </FocusPanel>

      {/* Bulk Import Modal */}
      <FocusPanel
        isOpen={showBulkPanel}
        onClose={() => setShowBulkPanel(false)}
        title="Bulk Import Candidates"
        subtitle="Paste a CSV to create multiple candidates at once."
        size="lg"
        footer={(
          <div className="flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setShowBulkPanel(false)}>
              Close
            </Button>
            <Button onClick={handleBulkCreate} loading={creating} disabled={!csvData.trim()}>
              Import Candidates
            </Button>
          </div>
        )}
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-400">
            Paste CSV data with format: <code className="text-blue-600">username,password,full_name</code>
          </p>
          <Textarea
            id="csvData"
            label="CSV Data"
            value={csvData}
            onChange={(e) => setCsvData(e.target.value)}
            placeholder="john_doe,pass123,John Doe&#10;jane_doe,pass456,Jane Doe"
            rows={8}
          />

          {bulkResults.length > 0 && (
            <div className="max-h-40 overflow-y-auto space-y-1">
              {bulkResults.map((result, i) => (
                <div
                  key={i}
                  className={`text-sm px-3 py-2 rounded ${
                    result.success
                      ? 'bg-green-900/30 text-green-400'
                      : 'bg-red-900/30 text-red-400'
                  }`}
                >
                  {result.username}: {result.success ? 'Created' : result.error}
                </div>
              ))}
            </div>
          )}

          {error && (
            <div className="bg-red-900/30 border border-red-800 text-red-400 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}
        </div>
      </FocusPanel>
    </div>
  );
}
