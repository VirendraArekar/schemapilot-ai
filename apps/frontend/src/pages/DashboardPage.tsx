import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FolderKanban,
  Database,
  Table2,
  Sparkles,
  Plus,
  ArrowUpRight,
  Activity,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { api, extractData } from '../services/api';
import { useAppDispatch, useAppSelector } from '../store';
import { addToast } from '../store/uiSlice';
import { Badge, Button, Card, Input, Modal } from '../components/ui/primitives';

const COLORS = ['#2563eb', '#0ea5e9', '#10b981', '#64748b', '#4f46e5'];

export function DashboardPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const activeWorkspaceId = useAppSelector((s) => s.auth.activeWorkspaceId);
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEngine, setNewEngine] = useState('POSTGRESQL');

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => extractData<any>(await api.get('/analytics/dashboard')),
  });

  const createMutation = useMutation({
    mutationFn: async () =>
      extractData<any>(
        await api.post('/projects', {
          workspaceId: activeWorkspaceId || undefined,
          name: newName,
          engine: newEngine,
        }),
      ),
    onSuccess: (proj) => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      dispatch(addToast({ title: `Project "${proj.name}" created`, variant: 'success' }));
      setCreateOpen(false);
      setNewName('');
      navigate(`/projects/${proj.id}`);
    },
  });

  const summary = data?.summary || {
    totalProjects: 0,
    totalSchemas: 0,
    totalTables: 0,
    aiGenerations: 0,
  };

  const engineData =
    data?.engineDistribution?.length > 0
      ? data.engineDistribution
      : [{ engine: 'POSTGRESQL', count: 1 }];

  const aiChartData = (data?.aiUsageHistory || []).slice(0, 10).map((u: any, idx: number) => ({
    name: `#${idx + 1}`,
    tokens: u.totalTokens || 0,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Workspace Dashboard</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Overview of your database schemas, AI usage, and recent activity.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/ai-generator">
            <Button variant="outline">
              <Sparkles className="h-4 w-4 text-indigo-400" /> AI Schema Generator
            </Button>
          </Link>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> Quick Create Project
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Total Projects', value: summary.totalProjects, icon: FolderKanban, color: 'text-indigo-400' },
          { label: 'Database Schemas', value: summary.totalSchemas, icon: Database, color: 'text-emerald-400' },
          { label: 'Total Tables', value: summary.totalTables, icon: Table2, color: 'text-amber-400' },
          { label: 'AI Generations', value: summary.aiGenerations, icon: Sparkles, color: 'text-pink-400' },
        ].map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card key={kpi.label} className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-400">{kpi.label}</span>
                <Icon className={`h-4 w-4 ${kpi.color}`} />
              </div>
              <p className="mt-2 text-3xl font-bold">{isLoading ? '—' : kpi.value}</p>
            </Card>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="text-sm font-semibold mb-4">Database Engine Distribution</h2>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={engineData} dataKey="count" nameKey="engine" innerRadius={50} outerRadius={80} paddingAngle={4}>
                  {engineData.map((_: any, i: number) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="text-sm font-semibold mb-4">Recent AI Token Usage</h2>
          <div className="h-56">
            {aiChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={aiChartData}>
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                  <YAxis stroke="#94a3b8" fontSize={12} />
                  <Tooltip />
                  <Bar dataKey="tokens" fill="#2563eb" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-zinc-500">
                Run an AI Schema Generation to see token telemetry here.
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Recent Projects & Activity (50 entries) */}
      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold">
              Recent Projects ({data?.recentProjects?.length || 0})
            </h2>
            <Link to="/projects" className="text-xs text-emerald-400 hover:underline">
              View all
            </Link>
          </div>
          <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
            {(data?.recentProjects || []).map((p: any) => (
              <Link
                key={p.id}
                to={`/projects/${p.id}`}
                className="flex items-center justify-between rounded-lg border border-zinc-200 dark:border-zinc-800 p-2.5 hover:border-emerald-500/40 transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-xs font-medium truncate">{p.name}</p>
                  <p className="text-[11px] text-zinc-400 truncate">
                    {p.schemas?.[0]?.name || 'Default Schema'} • v{p.schemas?.[0]?.currentVersion || 1}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="emerald">{p.engine}</Badge>
                  <ArrowUpRight className="h-3.5 w-3.5 text-zinc-400" />
                </div>
              </Link>
            ))}
            {(!data?.recentProjects || data.recentProjects.length === 0) && (
              <p className="text-xs text-zinc-500 py-4 text-center">
                No projects yet. Click "Quick Create Project" to begin.
              </p>
            )}
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Activity className="h-4 w-4 text-emerald-400" />
            <h2 className="text-sm font-semibold">
              Recent Activity ({data?.recentActivity?.length || 0})
            </h2>
          </div>
          <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
            {(data?.recentActivity || []).map((a: any) => (
              <div key={a.id} className="flex items-center justify-between text-xs border-b border-zinc-200 dark:border-zinc-800 pb-1.5">
                <span className="truncate">
                  <strong className="text-zinc-200">{a.user?.name || 'System'}</strong> — {a.action}
                </span>
                <span className="text-zinc-500 shrink-0 ml-2">
                  {new Date(a.createdAt).toLocaleDateString()}
                </span>
              </div>
            ))}
            {(!data?.recentActivity || data.recentActivity.length === 0) && (
              <p className="text-xs text-zinc-500 py-4 text-center">No recent activity recorded.</p>
            )}
          </div>
        </Card>
      </div>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Quick Create Project">
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-400">Project Name</label>
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Fintech Core Ledger"
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-400">Target Database Engine</label>
            <select
              value={newEngine}
              onChange={(e) => setNewEngine(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
            >
              <option value="POSTGRESQL">PostgreSQL</option>
              <option value="MYSQL">MySQL 8</option>
              <option value="SQLSERVER">Microsoft SQL Server</option>
              <option value="SQLITE">SQLite</option>
              <option value="MONGODB">MongoDB</option>
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!newName.trim() || createMutation.isPending}
              onClick={() => createMutation.mutate()}
            >
              {createMutation.isPending ? 'Creating...' : 'Create Project'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
