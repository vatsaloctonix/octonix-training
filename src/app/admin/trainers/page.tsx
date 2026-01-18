/*
 * Trainers Management Page
 * Create, view, and manage trainer accounts
 */

'use client';

import { useEffect, useState } from 'react';
import { Header } from '@/components/layout/header';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { EmptyState } from '@/components/ui/empty-state';
import { Plus, GraduationCap, ToggleLeft, ToggleRight } from 'lucide-react';
import { formatDate, generatePassword } from '@/lib/utils';
import { FocusPanel } from '@/components/layout/focus-panel';
import { ActionDock } from '@/components/layout/action-dock';

interface Trainer {
  id: string;
  username: string;
  full_name: string;
  is_active: boolean;
  created_at: string;
}

export default function TrainersPage() {
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showPanel, setShowPanel] = useState(false);
  const [creating, setCreating] = useState(false);

  // Form state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchTrainers();
  }, []);

  const fetchTrainers = async () => {
    try {
      const res = await fetch('/api/users?role=trainer');
      const json = await res.json();
      if (json.success) {
        setTrainers(json.users);
      }
    } catch (error) {
      console.error('Failed to fetch trainers:', error);
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
          role: 'trainer',
        }),
      });

      const json = await res.json();

      if (!json.success) {
        setError(json.error);
        setCreating(false);
        return;
      }

      setTrainers([json.user, ...trainers]);
      setShowPanel(false);
      resetForm();
    } catch (err) {
      console.error('Failed to create trainer:', err);
      setError('Failed to create trainer');
    } finally {
      setCreating(false);
    }
  };

  const toggleActive = async (trainer: Trainer) => {
    try {
      const res = await fetch(`/api/users/${trainer.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !trainer.is_active }),
      });

      const json = await res.json();
      if (json.success) {
        setTrainers(trainers.map((t) =>
          t.id === trainer.id ? { ...t, is_active: !t.is_active } : t
        ));
      }
    } catch (error) {
      console.error('Failed to toggle trainer status:', error);
    }
  };

  const resetForm = () => {
    setUsername('');
    setPassword('');
    setFullName('');
    setError('');
  };

  const openPanel = () => {
    resetForm();
    setPassword(generatePassword(8));
    setShowPanel(true);
  };

  const filteredTrainers = trainers.filter((t) =>
    t.username.toLowerCase().includes(search.toLowerCase()) ||
    t.full_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <Header
        title="Trainer Stewardship"
        subtitle="Create, activate, and monitor trainer access."
        meta={[
          { label: 'Total trainers', value: String(trainers.length) },
          { label: 'Active', value: String(trainers.filter((t) => t.is_active).length) },
        ]}
        showSearch
        onSearch={setSearch}
        searchPlaceholder="Search trainers..."
        actions={(
          <ActionDock>
            <Button onClick={openPanel} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Trainer
            </Button>
          </ActionDock>
        )}
      />

      <div className="p-6">
        <Card>
          <CardHeader
            title="Trainer Accounts"
            description="Manage trainer accounts and their access"
          />
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-16 bg-white/70 rounded skeleton" />
                ))}
              </div>
            ) : filteredTrainers.length === 0 ? (
              <EmptyState
                icon={GraduationCap}
                title="No trainers found"
                description={search ? 'Try a different search term' : 'Create your first trainer to get started'}
                action={!search ? { label: 'Add Trainer', onClick: openPanel } : undefined}
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Trainer</TableHead>
                    <TableHead>Username</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-20">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTrainers.map((trainer) => (
                    <TableRow key={trainer.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar name={trainer.full_name} size="sm" />
                          <span className="font-medium text-slate-900">{trainer.full_name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-400">@{trainer.username}</TableCell>
                      <TableCell className="text-slate-400">{formatDate(trainer.created_at)}</TableCell>
                      <TableCell>
                        <Badge variant={trainer.is_active ? 'success' : 'danger'}>
                          {trainer.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <button
                          onClick={() => toggleActive(trainer)}
                          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                          title={trainer.is_active ? 'Deactivate' : 'Activate'}
                        >
                          {trainer.is_active ? (
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

      {/* Create Trainer Modal */}
      <FocusPanel
        isOpen={showPanel}
        onClose={() => setShowPanel(false)}
        title="Create Trainer"
        subtitle="Issue credentials and set the trainer up for success."
        footer={(
          <div className="flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setShowPanel(false)}>
              Cancel
            </Button>
            <Button type="submit" form="create-trainer-form" loading={creating}>
              Create Trainer
            </Button>
          </div>
        )}
      >
        <form id="create-trainer-form" onSubmit={handleCreate} className="space-y-4">
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
    </div>
  );
}
