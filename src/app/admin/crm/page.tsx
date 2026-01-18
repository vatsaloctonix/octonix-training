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
import { Modal } from '@/components/ui/modal';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { SearchInput } from '@/components/ui/search-input';
import { EmptyState } from '@/components/ui/empty-state';
import { Plus, UserCog, ToggleLeft, ToggleRight } from 'lucide-react';
import { formatDate, generatePassword } from '@/lib/utils';

interface CRMUser {
  id: string;
  username: string;
  full_name: string;
  is_active: boolean;
  created_at: string;
}

export default function CRMPage() {
  const [crms, setCrms] = useState<CRMUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [creating, setCreating] = useState(false);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
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
          password,
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
      setShowModal(false);
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

  const resetForm = () => {
    setUsername('');
    setPassword('');
    setFullName('');
    setError('');
  };

  const openModal = () => {
    resetForm();
    setPassword(generatePassword(8));
    setShowModal(true);
  };

  const filteredCRMs = crms.filter((c) =>
    c.username.toLowerCase().includes(search.toLowerCase()) ||
    c.full_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <Header title="CRM Users" />

      <div className="p-6">
        <Card>
          <CardHeader
            title="CRM Accounts"
            description="Manage CRM user accounts and their access"
            action={
              <Button onClick={openModal}>
                <Plus className="w-4 h-4 mr-2" />
                Add CRM User
              </Button>
            }
          />
          <CardContent>
            <div className="mb-4">
              <SearchInput
                placeholder="Search CRM users..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onClear={() => setSearch('')}
              />
            </div>

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
                action={!search ? { label: 'Add CRM User', onClick: openModal } : undefined}
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>CRM User</TableHead>
                    <TableHead>Username</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-20">Actions</TableHead>
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
                      <TableCell className="text-slate-400">{formatDate(crm.created_at)}</TableCell>
                      <TableCell>
                        <Badge variant={crm.is_active ? 'success' : 'danger'}>
                          {crm.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
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
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Create CRM User"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <Input
            id="fullName"
            label="Full Name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Jane Smith"
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

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="ghost" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={creating}>
              Create CRM User
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
