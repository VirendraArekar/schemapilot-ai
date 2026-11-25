import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Trash2, ExternalLink, Share2, ChevronLeft, ChevronRight } from 'lucide-react';
import { api, extractData } from '../services/api';
import { useAppDispatch, useAppSelector } from '../store';
import { addToast } from '../store/uiSlice';
import { Badge, Button, Card, Input, Modal } from '../components/ui/primitives';

export function ProjectsPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const activeWorkspaceId = useAppSelector((s) => s.auth.activeWorkspaceId);
  const [search, setSearch] = useState('');
  const [engineFilter, setEngineFilter] = useState('');
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [engine, setEngine] = useState('POSTGRESQL');
  const [nextStep, setNextStep] = useState<'workspace' | 'ai' | 'er'>('workspace');

  const { data, isLoading } = useQuery({
    queryKey: ['projects', activeWorkspaceId, search, engineFilter, page],
    queryFn: async () =>
      extractData<any>(
        await api.get('/projects', {
          params: {
            workspaceId: activeWorkspaceId || undefined,
            search: search || undefined,
            engine: engineFilter || undefined,
            page,
            limit: 50,
          },
        }),
      ),
  });

  const createMutation = useMutation({
    mutationFn: async () =>
      extractData<any>(
        await api.post('/projects', {
          workspaceId: activeWorkspaceId || undefined,
          name,
          description,
          engine,
        }),
      ),
    onSuccess: (p) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      dispatch(addToast({ title: 'Project created', variant: 'success' }));
      setCreateOpen(false);
      setName('');
      setDescription('');
      if (nextStep === 'ai') navigate('/ai-generator');
      else if (nextStep === 'er') navigate('/er-diagram');
      else navigate(`/projects/${p.id}`);
    },
  });

  const seedMutation = useMutation({
    mutationFn: async () =>
      extractData<{ created: number }>(
        await api.post('/projects/seed-samples', {
          workspaceId: activeWorkspaceId || undefined,
          count: 50,
        }),
      ),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      dispatch(
        addToast({
          title: `Loaded ${res.created} sample projects & related schemas`,
          variant: 'success',
        }),
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/projects/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      dispatch(addToast({ title: 'Project deleted', variant: 'success' }));
    },
  });

  const shareProject = async (id: string) => {
    const res = extractData<{ shareToken: string }>(await api.post(`/projects/${id}/share`));
    await navigator.clipboard.writeText(`${window.location.origin}/shared/${res.shareToken}`);
    dispatch(addToast({ title: 'Share link copied to clipboard', variant: 'success' }));
  };

  const meta = data?.meta || { page: 1, totalPages: 1, total: 0 };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Projects ({meta.total})</h1>
          <p className="text-sm text-zinc-400">Manage database architecture projects in your workspace.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => seedMutation.mutate()}
            disabled={seedMutation.isPending}
          >
            {seedMutation.isPending ? 'Loading 50 Samples...' : 'Load 50 Sample Projects'}
          </Button>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> New Project
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="h-4 w-4 text-zinc-400 absolute left-3 top-2.5" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search projects..."
            className="pl-9"
          />
        </div>
        <select
          value={engineFilter}
          onChange={(e) => {
            setEngineFilter(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm"
        >
          <option value="">All Engines</option>
          <option value="POSTGRESQL">PostgreSQL</option>
          <option value="MYSQL">MySQL 8</option>
          <option value="SQLSERVER">SQL Server</option>
          <option value="SQLITE">SQLite</option>
          <option value="MONGODB">MongoDB</option>
        </select>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((n) => (
            <Card key={n} className="h-40 animate-pulse bg-zinc-800/40">
              <div />
            </Card>
          ))}
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(data?.items || []).map((p: any) => (
              <Card key={p.id} className="p-5 flex flex-col justify-between gap-4">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <Link to={`/projects/${p.id}`} className="font-semibold hover:text-emerald-400">
                      {p.name}
                    </Link>
                    <Badge variant="emerald">{p.engine}</Badge>
                  </div>
                  <p className="text-xs text-zinc-400 mt-1.5 line-clamp-2">
                    {p.description || 'No description provided.'}
                  </p>
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-zinc-200 dark:border-zinc-800">
                  <span className="text-xs text-zinc-500">
                    {p.schemas?.[0]?._count?.tables ?? 0} tables • v{p.schemas?.[0]?.currentVersion ?? 1}
                  </span>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" onClick={() => shareProject(p.id)} title="Share">
                      <Share2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteMutation.mutate(p.id)}
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-rose-400" />
                    </Button>
                    <Link to={`/projects/${p.id}`}>
                      <Button size="sm" variant="outline">
                        Open <ExternalLink className="h-3.5 w-3.5" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {meta.totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-zinc-400">
                Page {meta.page} of {meta.totalPages} ({meta.total} total)
              </span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ChevronLeft className="h-4 w-4" /> Prev
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page >= meta.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create New Project">
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-zinc-400">Project Name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="SaaS Analytics DB" className="mt-1" />
          </div>
          <div>
            <label className="text-xs font-medium text-zinc-400">Description</label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Multi-tenant analytics warehouse" className="mt-1" />
          </div>
          <div>
            <label className="text-xs font-medium text-zinc-400">Database Engine</label>
            <select
              value={engine}
              onChange={(e) => setEngine(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm"
            >
              <option value="POSTGRESQL">PostgreSQL</option>
              <option value="MYSQL">MySQL 8</option>
              <option value="SQLSERVER">Microsoft SQL Server</option>
              <option value="SQLITE">SQLite</option>
              <option value="MONGODB">MongoDB</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-zinc-400">After Creating, Start With:</label>
            <select
              value={nextStep}
              onChange={(e) => setNextStep(e.target.value as any)}
              className="mt-1 w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm"
            >
              <option value="workspace">Project Hub (Guided Workflow)</option>
              <option value="ai">AI Schema Generator (Natural Language)</option>
              <option value="er">Visual ER Diagram Designer</option>
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button disabled={!name.trim() || createMutation.isPending} onClick={() => createMutation.mutate()}>
              Create Project
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
