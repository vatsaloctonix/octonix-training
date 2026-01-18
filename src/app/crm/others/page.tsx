/*
 * Staff (Others) Management Page
 * CRM version of candidates page
 */

'use client';

import { useEffect, useState } from 'react';
import { Header } from '@/components/layout/header';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Modal } from '@/components/ui/modal';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { SearchInput } from '@/components/ui/search-input';
import { EmptyState } from '@/components/ui/empty-state';
import { Plus, Users, ToggleLeft, ToggleRight, Upload } from 'lucide-react';
import { formatDate, generatePassword, parseCSV } from '@/lib/utils';

interface OtherUser {
  id: string;
  username: string;
  full_name: string;
  is_active: boolean;
  created_at: string;
}

export default function OthersPage() {
  const [others, setOthers] = useState<OtherUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [creating, setCreating] = useState(false);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');

  const [csvData, setCsvData] = useState('');
  const [bulkResults, setBulkResults] = useState<{ username: string; success: boolean; error?: string }[]>([]);

  useEffect(() => {
    fetchOthers();
  }, []);

  const fetchOthers = async () => {
    try {
      const res = await fetch('/api/users?role=other');
      const json = await res.json();
      if (json.success) {
        setOthers(json.users);
      }
    } catch (error) {
      console.error('Failed to fetch staff users:', error);
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
          role: 'other',
        }),
      });

      const json = await res.json();

      if (!json.success) {
        setError(json.error);
        setCreating(false);
        return;
      }

      setOthers([json.user, ...others]);
      setShowModal(false);
      resetForm();
    } catch (err) {
      console.error('Failed to create staff user:', err);
      setError('Failed to create staff user');
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
        body: JSON.stringify({ users, role: 'other' }),
      });

      const json = await res.json();

      if (json.results) {
        setBulkResults(json.results);
        fetchOthers();
      }
    } catch (err) {
      console.error('Bulk creation failed:', err);
      setError('Bulk creation failed');
    } finally {
      setCreating(false);
    }
  };

  const toggleActive = async (other: OtherUser) => {
    try {
      const res = await fetch(`/api/users/${other.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !other.is_active }),
      });

      const json = await res.json();
      if (json.success) {
        setOthers(others.map((o) =>
          o.id === other.id ? { ...o, is_active: !o.is_active } : o
        ));
      }
    } catch (error) {
      console.error('Failed to toggle staff status:', error);
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

  const openBulkModal = () => {
    setCsvData('');
    setBulkResults([]);
    setError('');
    setShowBulkModal(true);
  };

  const filteredOthers = others.filter((o) =>
    o.username.toLowerCase().includes(search.toLowerCase()) ||
    o.full_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <Header title="Staff Users" />

      <div className="p-6">
        <Card>
          <CardHeader
            title="Staff Accounts"
            description="Manage staff user accounts"
            action={
              <div className="flex gap-2">
                <Button variant="outline" onClick={openBulkModal}>
                  <Upload className="w-4 h-4 mr-2" />
                  Bulk Import
                </Button>
                <Button onClick={openModal}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Staff User
                </Button>
              </div>
            }
          />
          <CardContent>
            <div className="mb-4">
              <SearchInput
                placeholder="Search staff users..."
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
            ) : filteredOthers.length === 0 ? (
              <EmptyState
                icon={Users}
                title="No staff users found"
                description={search ? 'Try a different search term' : 'Create your first staff user'}
                action={!search ? { label: 'Add Staff User', onClick: openModal } : undefined}
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Staff User</TableHead>
                    <TableHead>Username</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-20">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOthers.map((other) => (
                    <TableRow key={other.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar name={other.full_name} size="sm" />
                          <span className="font-medium text-slate-900">{other.full_name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-400">@{other.username}</TableCell>
                      <TableCell className="text-slate-400">{formatDate(other.created_at)}</TableCell>
                      <TableCell>
                        <Badge variant={other.is_active ? 'success' : 'danger'}>
                          {other.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <button
                          onClick={() => toggleActive(other)}
                          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                          title={other.is_active ? 'Deactivate' : 'Activate'}
                        >
                          {other.is_active ? (
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

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Create Staff User">
        <form onSubmit={handleCreate} className="space-y-4">
          <Input
            id="fullName"
            label="Full Name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />
          <Input
            id="username"
            label="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
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
              Create Staff User
            </Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={showBulkModal} onClose={() => setShowBulkModal(false)} title="Bulk Import Staff" size="lg">
        <div className="space-y-4">
          <p className="text-sm text-slate-400">
            Paste CSV data: <code className="text-blue-600">username,password,full_name</code>
          </p>
          <Textarea
            id="csvData"
            value={csvData}
            onChange={(e) => setCsvData(e.target.value)}
            placeholder="john_doe,pass123,John Doe"
            rows={8}
          />

          {bulkResults.length > 0 && (
            <div className="max-h-40 overflow-y-auto space-y-1">
              {bulkResults.map((result, i) => (
                <div
                  key={i}
                  className={`text-sm px-3 py-2 rounded ${
                    result.success ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'
                  }`}
                >
                  {result.username}: {result.success ? 'Created' : result.error}
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={() => setShowBulkModal(false)}>Close</Button>
            <Button onClick={handleBulkCreate} loading={creating} disabled={!csvData.trim()}>
              Import Staff
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
