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
import { Plus, Users, ToggleLeft, ToggleRight, Upload, Trash2, KeyRound } from 'lucide-react';
import { formatDate, parseCSV } from '@/lib/utils';
import { FocusPanel } from '@/components/layout/focus-panel';
import Link from 'next/link';

interface Candidate {
  id: string;
  username: string;
  email: string | null;
  full_name: string;
  is_active: boolean;
  password_set?: boolean;
  created_at: string;
}

export default function CandidatesPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreatePanel, setShowCreatePanel] = useState(false);
  const [showBulkPanel, setShowBulkPanel] = useState(false);
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'danger'; text: string } | null>(null);

  // Single create form
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
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
          email,
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
      setMessage({
        type: json.invite_error ? 'danger' : 'success',
        text: json.invite_error || 'Candidate created and invite sent.',
      });
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

  const handleDelete = async (candidate: Candidate) => {
    if (!confirm(`Delete ${candidate.full_name}? This will remove the account permanently.`)) return;
    try {
      const res = await fetch(`/api/users/${candidate.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        setCandidates(candidates.filter((c) => c.id !== candidate.id));
        setMessage({ type: 'success', text: 'Candidate deleted.' });
      } else {
        setMessage({ type: 'danger', text: json.error || 'Failed to delete candidate.' });
      }
    } catch {
      setMessage({ type: 'danger', text: 'Failed to delete candidate.' });
    }
  };

  const handleAccessHelp = async (candidate: Candidate) => {
    setMessage(null);
    try {
      if (!candidate.email) {
        setMessage({ type: 'danger', text: 'No email on file for this candidate.' });
        return;
      }

      if (candidate.password_set === false) {
        const res = await fetch('/api/auth/invite', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: candidate.id }),
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.error);
        setMessage({ type: 'success', text: 'Invite resent.' });
        return;
      }

      const res = await fetch('/api/auth/forgot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: candidate.email }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setMessage({ type: 'success', text: 'Password reset code sent.' });
    } catch {
      setMessage({ type: 'danger', text: 'Failed to send access help.' });
    }
  };

  const resetForm = () => {
    setUsername('');
    setEmail('');
    setFullName('');
    setError('');
  };

  const openCreatePanel = () => {
    resetForm();
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
            {message && (
              <div className={`mb-4 rounded-lg px-4 py-3 text-sm ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-600 border border-red-200'}`}>
                {message.text}
              </div>
            )}
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
                    <TableHead>Email</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-32">Actions</TableHead>
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
                      <TableCell className="text-slate-500">{candidate.email || '-'}</TableCell>
                      <TableCell className="text-slate-400">{formatDate(candidate.created_at)}</TableCell>
                      <TableCell>
                        <Badge variant={candidate.is_active ? 'success' : 'danger'}>
                          {candidate.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                        {candidate.password_set === false && (
                          <span className="ml-2 text-xs text-amber-600">Invite pending</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
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
                          <button
                            onClick={() => handleAccessHelp(candidate)}
                            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                            title={candidate.password_set === false ? 'Resend invite' : 'Send reset code'}
                          >
                            <KeyRound className="w-4 h-4 text-blue-600" />
                          </button>
                          <button
                            onClick={() => handleDelete(candidate)}
                            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </button>
                        </div>
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
        subtitle="Send an invite so the learner can set their password."
        footer={(
          <div className="flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setShowCreatePanel(false)}>
              Cancel
            </Button>
            <Button type="submit" form="create-candidate-form" loading={creating}>
              Send Invite
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
            placeholder="Arjuna"
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
          <Input
            id="email"
            label="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="arjuna@example.com"
            type="email"
            required
          />

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
            Paste CSV data with format: <code className="text-blue-600">username,email,full_name</code>
          </p>
          <Textarea
            id="csvData"
            label="CSV Data"
            value={csvData}
            onChange={(e) => setCsvData(e.target.value)}
            placeholder="arjuna,arjuna@example.com,Arjuna Singh"
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
