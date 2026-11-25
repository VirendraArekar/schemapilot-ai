import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Key, ShieldCheck, CreditCard, UserPlus, Trash2 } from 'lucide-react';
import { api, extractData } from '../services/api';
import { useAppDispatch, useAppSelector } from '../store';
import { logoutState, setCredentials } from '../store/authSlice';
import { addToast } from '../store/uiSlice';
import { Badge, Button, Card, Input } from '../components/ui/primitives';

export function WorkspaceSettingsPage() {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const activeWorkspaceId = useAppSelector((s) => s.auth.activeWorkspaceId);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('EDITOR');
  const [apiKeyName, setApiKeyName] = useState('');
  const [createdKey, setCreatedKey] = useState('');

  const { data: ws } = useQuery({
    queryKey: ['workspace', activeWorkspaceId],
    enabled: Boolean(activeWorkspaceId),
    queryFn: async () => extractData<any>(await api.get(`/workspaces/${activeWorkspaceId}`)),
  });

  const inviteMutation = useMutation({
    mutationFn: async () =>
      api.post(`/workspaces/${activeWorkspaceId}/members`, {
        email: inviteEmail,
        role: inviteRole,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace', activeWorkspaceId] });
      setInviteEmail('');
      dispatch(addToast({ title: 'Member invited', variant: 'success' }));
    },
    onError: (err: any) => {
      dispatch(
        addToast({
          title: 'Invite failed',
          description: err.response?.data?.error?.message,
          variant: 'error',
        }),
      );
    },
  });

  const createKeyMutation = useMutation({
    mutationFn: async () =>
      extractData<{ plainKey: string }>(
        await api.post(`/workspaces/${activeWorkspaceId}/api-keys`, { name: apiKeyName || 'CLI Key' }),
      ),
    onSuccess: (res) => {
      setCreatedKey(res.plainKey);
      setApiKeyName('');
      queryClient.invalidateQueries({ queryKey: ['workspace', activeWorkspaceId] });
    },
  });

  return (
    <div className="space-y-6 max-w-4xl">
      <h1 className="text-2xl font-bold">Workspace Settings</h1>
      <Card className="p-5 space-y-4">
        <h2 className="text-sm font-semibold">Team Members ({ws?.members?.length || 0})</h2>
        <div className="flex flex-wrap gap-2">
          <Input
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="teammate@company.com"
            className="flex-1 min-w-[200px]"
          />
          <select
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value)}
            className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
          >
            <option value="ADMIN">Admin</option>
            <option value="EDITOR">Editor</option>
            <option value="VIEWER">Viewer</option>
          </select>
          <Button onClick={() => inviteMutation.mutate()} disabled={!inviteEmail.trim()}>
            <UserPlus className="h-4 w-4" /> Invite
          </Button>
        </div>
        <div className="divide-y divide-slate-200 dark:divide-slate-800">
          {(ws?.members || []).map((m: any) => (
            <div key={m.id} className="flex items-center justify-between py-2.5 text-sm">
              <div>
                <p className="font-medium">{m.user?.name}</p>
                <p className="text-xs text-slate-400">{m.user?.email}</p>
              </div>
              <Badge variant="indigo">{m.role}</Badge>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-5 space-y-4">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <Key className="h-4 w-4 text-indigo-400" /> Workspace API Keys
        </h2>
        <div className="flex gap-2">
          <Input
            value={apiKeyName}
            onChange={(e) => setApiKeyName(e.target.value)}
            placeholder="CI/CD Migration Key"
          />
          <Button onClick={() => createKeyMutation.mutate()}>Generate Key</Button>
        </div>
        {createdKey && (
          <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-3 text-xs font-mono text-emerald-300">
            Save this key now (shown once): {createdKey}
          </div>
        )}
        <div className="space-y-1.5 text-xs">
          {(ws?.apiKeys || []).map((k: any) => (
            <div key={k.id} className="flex justify-between py-1.5 border-b border-slate-800">
              <span>{k.name}</span>
              <span className="font-mono text-slate-400">{k.prefix}...</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

export function ProfileSettingsPage() {
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const [name, setName] = useState(user?.name || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const { data: sessions = [], refetch: refetchSessions } = useQuery({
    queryKey: ['sessions'],
    queryFn: async () => extractData<any[]>(await api.get('/auth/sessions')),
  });

  const saveProfile = async () => {
    const updated = extractData<any>(await api.patch('/users/profile', { name }));
    dispatch(setCredentials({ user: updated }));
    dispatch(addToast({ title: 'Profile updated', variant: 'success' }));
  };

  const changePass = async () => {
    await api.post('/auth/change-password', { currentPassword, newPassword });
    setCurrentPassword('');
    setNewPassword('');
    dispatch(addToast({ title: 'Password updated', variant: 'success' }));
  };

  const deleteAccount = async () => {
    await api.delete('/users/account');
    dispatch(logoutState());
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-2xl font-bold">User Profile & Security</h1>
      <Card className="p-5 space-y-4">
        <h2 className="text-sm font-semibold">Profile Information</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full Name" />
          <Input value={user?.email || ''} disabled />
        </div>
        <Button onClick={saveProfile}>Save Profile</Button>
      </Card>

      <Card className="p-5 space-y-4">
        <h2 className="text-sm font-semibold">Change Password</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="Current Password"
          />
          <Input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="New Password"
          />
        </div>
        <Button variant="outline" onClick={changePass}>
          Update Password
        </Button>
      </Card>

      <Card className="p-5 space-y-3">
        <h2 className="text-sm font-semibold">Active Sessions</h2>
        {sessions.map((s: any) => (
          <div key={s.id} className="flex items-center justify-between text-xs border-b border-slate-800 pb-2">
            <span>{s.userAgent || 'Browser Session'} ({s.ipAddress || 'local'})</span>
            <Button
              size="sm"
              variant="ghost"
              onClick={async () => {
                await api.delete(`/auth/sessions/${s.id}`);
                refetchSessions();
              }}
            >
              Revoke
            </Button>
          </div>
        ))}
      </Card>

      <Card className="p-5 border-rose-500/30 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-rose-400">Delete Account</h2>
          <p className="text-xs text-slate-400">Soft-delete your account and revoke all active sessions.</p>
        </div>
        <Button variant="danger" size="sm" onClick={deleteAccount}>
          <Trash2 className="h-3.5 w-3.5" /> Delete Account
        </Button>
      </Card>
    </div>
  );
}

export function BillingPage() {
  return (
    <div className="space-y-6 max-w-4xl">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <CreditCard className="h-6 w-6 text-indigo-400" /> Billing & AI Usage
      </h1>
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { plan: 'FREE', price: '$0/mo', quota: '100 AI generations/mo', current: false },
          { plan: 'PRO', price: '$29/mo', quota: '2,000 AI generations/mo', current: true },
          { plan: 'TEAM', price: '$99/mo', quota: '10,000 AI generations/mo', current: false },
        ].map((tier) => (
          <Card key={tier.plan} className={`p-5 space-y-3 ${tier.current ? 'border-indigo-500' : ''}`}>
            <div className="flex justify-between items-center">
              <h3 className="font-bold">{tier.plan}</h3>
              {tier.current && <Badge variant="indigo">Active</Badge>}
            </div>
            <p className="text-2xl font-bold">{tier.price}</p>
            <p className="text-xs text-slate-400">{tier.quota}</p>
            <Button className="w-full" variant={tier.current ? 'outline' : 'primary'}>
              {tier.current ? 'Current Plan' : 'Upgrade'}
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function AdminDashboardPage() {
  const { data, error } = useQuery({
    queryKey: ['admin-overview'],
    queryFn: async () => extractData<any>(await api.get('/analytics/admin/overview')),
    retry: false,
  });

  if (error) {
    return (
      <Card className="p-6 text-sm text-amber-400">
        Super Admin access required to view platform-wide metrics.
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <ShieldCheck className="h-6 w-6 text-indigo-400" /> Super Admin Dashboard
      </h1>
      <div className="grid gap-4 sm:grid-cols-4">
        <Card className="p-4"><p className="text-xs text-slate-400">Total Users</p><p className="text-2xl font-bold mt-1">{data?.totalUsers ?? 0}</p></Card>
        <Card className="p-4"><p className="text-xs text-slate-400">Workspaces</p><p className="text-2xl font-bold mt-1">{data?.totalWorkspaces ?? 0}</p></Card>
        <Card className="p-4"><p className="text-xs text-slate-400">Projects</p><p className="text-2xl font-bold mt-1">{data?.totalProjects ?? 0}</p></Card>
        <Card className="p-4"><p className="text-xs text-slate-400">AI Calls</p><p className="text-2xl font-bold mt-1">{data?.totalAiCalls ?? 0}</p></Card>
      </div>
      <Card className="p-5">
        <h2 className="text-sm font-semibold mb-3">Registered Users</h2>
        <div className="space-y-2 text-xs">
          {(data?.recentUsers || []).map((u: any) => (
            <div key={u.id} className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span>{u.name} ({u.email})</span>
              <Badge variant="indigo">{u.globalRole}</Badge>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
