/*
 * CRM Management Page
 * Create, view, and manage CRM accounts
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
import { Plus, UserCog, ToggleLeft, ToggleRight, Trash2, KeyRound } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { FocusPanel } from '@/components/layout/focus-panel';
import { ActionDock } from '@/components/layout/action-dock';

interface CRMUser {
  id: string;
  username: string;
  email: string | null;
  full_name: string;
  is_active: boolean;
  password_set?: boolean;
  created_at: string;
}

export default function CRMPage() {
  const [crms, setCrms] = useState<CRMUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showPanel, setShowPanel] = useState(false);
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'danger'; text: string } | null>(null);

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchCRMs();
  }, []);

  const fetchCRMs = async () => {
    try {
      const res = await fetch('/api/users?role=crm');
      const json = await res.json();
      if (json.success) {
        setCrms(json.users);
      }
    } catch (error) {
      console.error('Failed to fetch CRMs:', error);
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
          role: 'crm',
        }),
      });

      const json = await res.json();

      if (!json.success) {
        setError(json.error);
        setCreating(false);
        return;
      }

      setCrms([json.user, ...crms]);
      setShowPanel(false);
      setMessage({
        type: json.invite_error ? 'danger' : 'success',
        text: json.invite_error || 'CRM user created and invite sent.',
      });
      resetForm();
    } catch (err) {
      console.error('Failed to create CRM user:', err);
      setError('Failed to create CRM user');
    } finally {
      setCreating(false);
    }
  };

  const toggleActive = async (crm: CRMUser) => {
    try {
      const res = await fetch(`/api/users/${crm.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !crm.is_active }),
      });

      const json = await res.json();
      if (json.success) {
        setCrms(crms.map((c) =>
          c.id === crm.id ? { ...c, is_active: !c.is_active } : c
        ));
      }
    } catch (error) {
      console.error('Failed to toggle CRM status:', error);
    }
  };

  const handleDelete = async (crm: CRMUser) => {
    if (!confirm(`Delete ${crm.full_name}? This will remove the account permanently.`)) return;
    try {
      const res = await fetch(`/api/users/${crm.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        setCrms(crms.filter((c) => c.id !== crm.id));
        setMessage({ type: 'success', text: 'CRM user deleted.' });
      } else {
        setMessage({ type: 'danger', text: json.error || 'Failed to delete CRM user.' });
      }
    } catch {
      setMessage({ type: 'danger', text: 'Failed to delete CRM user.' });
    }
  };

  const handleAccessHelp = async (crm: CRMUser) => {
    setMessage(null);
    try {
      if (!crm.email) {
        setMessage({ type: 'danger', text: 'No email on file for this user.' });
        return;
      }

      if (crm.password_set === false) {
        const res = await fetch('/api/auth/invite', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: crm.id }),
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.error);
        setMessage({ type: 'success', text: 'Invite resent.' });
        return;
      }

      const res = await fetch('/api/auth/forgot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: crm.email }),
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

  const openPanel = () => {
    resetForm();
    setShowPanel(true);
  };

  const filteredCRMs = crms.filter((c) =>
    c.username.toLowerCase().includes(search.toLowerCase()) ||
    c.full_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <Header
        title="CRM Stewardship"
        subtitle="Manage CRM accounts and protect access."
        meta={[
          { label: 'Total CRM users', value: String(crms.length) },
          { label: 'Active', value: String(crms.filter((c) => c.is_active).length) },
        ]}
        showSearch
        onSearch={setSearch}
        searchPlaceholder="Search CRM users..."
        actions={(
          <ActionDock>
            <Button onClick={openPanel} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add CRM User
            </Button>
          </ActionDock>
        )}
      />

      <div className="p-6">
        <Card>
          <CardHeader
            title="CRM Accounts"
            description="Manage CRM user accounts and their access"
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
            ) : filteredCRMs.length === 0 ? (
              <EmptyState
                icon={UserCog}
                title="No CRM users found"
                description={search ? 'Try a different search term' : 'Create your first CRM user to get started'}
                action={!search ? { label: 'Add CRM User', onClick: openPanel } : undefined}
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>CRM User</TableHead>
                    <TableHead>Username</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-32">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCRMs.map((crm) => (
                    <TableRow key={crm.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar name={crm.full_name} size="sm" />
                          <span className="font-medium text-slate-900">{crm.full_name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-400">@{crm.username}</TableCell>
                      <TableCell className="text-slate-500">{crm.email || '-'}</TableCell>
                      <TableCell className="text-slate-400">{formatDate(crm.created_at)}</TableCell>
                      <TableCell>
                        <Badge variant={crm.is_active ? 'success' : 'danger'}>
                          {crm.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                        {crm.password_set === false && (
                          <span className="ml-2 text-xs text-amber-600">Invite pending</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => toggleActive(crm)}
                            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                            title={crm.is_active ? 'Deactivate' : 'Activate'}
                          >
                            {crm.is_active ? (
                              <ToggleRight className="w-5 h-5 text-green-400" />
                            ) : (
                              <ToggleLeft className="w-5 h-5 text-slate-400" />
                            )}
                          </button>
                          <button
                            onClick={() => handleAccessHelp(crm)}
                            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                            title={crm.password_set === false ? 'Resend invite' : 'Send reset code'}
                          >
                            <KeyRound className="w-4 h-4 text-blue-600" />
                          </button>
                          <button
                            onClick={() => handleDelete(crm)}
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

      <FocusPanel
        isOpen={showPanel}
        onClose={() => setShowPanel(false)}
        title="Create CRM User"
        subtitle="Send an invite so they can set their password."
        footer={(
          <div className="flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setShowPanel(false)}>
              Cancel
            </Button>
            <Button type="submit" form="create-crm-form" loading={creating}>
              Send Invite
            </Button>
          </div>
        )}
      >
        <form id="create-crm-form" onSubmit={handleCreate} className="space-y-4">
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
            placeholder="jane_smith"
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
    </div>
  );
}
