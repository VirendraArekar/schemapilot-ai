import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { io } from 'socket.io-client';
import {
  Network,
  TableProperties,
  Code2,
  Bot,
  Activity,
  GitBranch,
  FileText,
  History,
  MessageSquare,
  Users,
  RotateCcw,
} from 'lucide-react';
import { api, extractData } from '../services/api';
import { useAppDispatch, useAppSelector } from '../store';
import { loadSchema } from '../store/schemaSlice';
import { addToast } from '../store/uiSlice';
import { Badge, Button, Card, Input } from '../components/ui/primitives';

export function ProjectWorkspacePage() {
  const { projectId } = useParams<{ projectId: string }>();
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const user = useAppSelector((s) => s.auth.user);
  const [commentText, setCommentText] = useState('');
  const [tableTarget, setTableTarget] = useState('');
  const [onlineUsers, setOnlineUsers] = useState<Array<{ userId: string; name: string }>>([]);

  const { data: project, isLoading } = useQuery({
    queryKey: ['project', projectId],
    enabled: Boolean(projectId),
    queryFn: async () => extractData<any>(await api.get(`/projects/${projectId}`)),
  });

  const primarySchema = project?.schemas?.[0];

  useEffect(() => {
    if (primarySchema) {
      dispatch(
        loadSchema({
          projectId: project.id,
          schemaId: primarySchema.id,
          schema: {
            id: primarySchema.id,
            name: primarySchema.name,
            description: primarySchema.description,
            engine: primarySchema.engine,
            version: primarySchema.currentVersion,
            tables: (primarySchema.tables || []).map((t: any) => ({
              ...t,
              position: { x: t.positionX || 0, y: t.positionY || 0 },
              indexes: (t.indexes || []).map((i: any) => ({ ...i, columns: i.columnsJson || [], type: i.indexType })),
              constraints: (t.constraints || []).map((c: any) => ({ ...c, columns: c.columnsJson || [], type: c.constraintType })),
            })),
            relationships: primarySchema.relationships || [],
          },
        }),
      );
    }
  }, [primarySchema, project?.id, dispatch]);

  useEffect(() => {
    if (!projectId || !user) return;
    const wsUrl = import.meta.env.VITE_WS_URL || 'http://localhost:4000';
    const socket = io(`${wsUrl}/collaboration`, { withCredentials: true });
    socket.emit('join_project', { projectId, userId: user.id, name: user.name });
    socket.on('presence_update', (users) => setOnlineUsers(users));
    return () => {
      socket.disconnect();
    };
  }, [projectId, user]);

  const commentMutation = useMutation({
    mutationFn: async () =>
      api.post(`/collaboration/projects/${projectId}/comments`, {
        content: commentText,
        tableName: tableTarget || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      setCommentText('');
      dispatch(addToast({ title: 'Comment posted', variant: 'success' }));
    },
  });

  const restoreMutation = useMutation({
    mutationFn: async (versionNumber: number) =>
      api.post(`/schemas/${primarySchema.id}/versions/${versionNumber}/restore`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      dispatch(addToast({ title: 'Schema version restored', variant: 'success' }));
    },
  });

  if (isLoading) return <p className="text-sm text-slate-400">Loading project workspace...</p>;
  if (!project) return <p className="text-sm text-rose-400">Project not found.</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold">{project.name}</h1>
            <Badge variant="indigo">{project.engine}</Badge>
            <Badge variant="emerald">v{primarySchema?.currentVersion || 1}</Badge>
          </div>
          <p className="text-sm text-slate-400 mt-1">{project.description || 'Active schema workspace'}</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Users className="h-4 w-4 text-emerald-400" />
          <span>{Math.max(1, onlineUsers.length)} online</span>
        </div>
      </div>

      {/* Guided End-to-End Workflow */}
      <Card className="p-4 border-blue-500/30 bg-blue-500/5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-blue-400">
            Guided Workflow: From Idea to Production SQL
          </h2>
          <span className="text-xs text-slate-400">Follow steps 1 → 4</span>
        </div>
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4 text-xs">
          <Link to="/ai-generator" className="rounded-lg border border-slate-800 bg-slate-900/80 p-3 hover:border-blue-500/50">
            <p className="font-semibold text-blue-400">Step 1: Generate / Import</p>
            <p className="text-slate-400 mt-1">Describe your app in AI Generator, pick a Blueprint, or import SQL/Prisma.</p>
          </Link>
          <Link to="/er-diagram" className="rounded-lg border border-slate-800 bg-slate-900/80 p-3 hover:border-blue-500/50">
            <p className="font-semibold text-blue-400">Step 2: Visual ER Diagram</p>
            <p className="text-slate-400 mt-1">Arrange tables, drag connections, and export PNG/SVG/PDF diagrams.</p>
          </Link>
          <Link to="/schema-editor" className="rounded-lg border border-slate-800 bg-slate-900/80 p-3 hover:border-blue-500/50">
            <p className="font-semibold text-blue-400">Step 3: Constraints & Audit</p>
            <p className="text-slate-400 mt-1">Refine columns, CHECK/UNIQUE constraints, indexes, and run Performance Analyzer.</p>
          </Link>
          <Link to="/sql-editor" className="rounded-lg border border-slate-800 bg-slate-900/80 p-3 hover:border-blue-500/50">
            <p className="font-semibold text-blue-400">Step 4: SQL, Migrations & Docs</p>
            <p className="text-slate-400 mt-1">Export multi-engine DDL, generate Up/Down migrations, and Markdown/HTML docs.</p>
          </Link>
        </div>
      </Card>

      {/* Studio Quick Launch */}
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-7">
        {[
          { to: '/er-diagram', label: 'ER Diagram', icon: Network },
          { to: '/schema-editor', label: 'Schema Editor', icon: TableProperties },
          { to: '/sql-editor', label: 'SQL Editor', icon: Code2 },
          { to: '/ai-assistant', label: 'AI Assistant', icon: Bot },
          { to: '/analyzer', label: 'Analyzer', icon: Activity },
          { to: '/migrations', label: 'Migrations', icon: GitBranch },
          { to: '/documentation', label: 'Docs', icon: FileText },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.to} to={item.to}>
              <Card className="p-3.5 flex flex-col items-center gap-2 hover:border-indigo-500/50 transition-colors text-center">
                <Icon className="h-5 w-5 text-indigo-400" />
                <span className="text-xs font-medium">{item.label}</span>
              </Card>
            </Link>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Version History */}
        <Card className="p-5 space-y-3">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-indigo-400" />
            <h2 className="text-sm font-semibold">Version History</h2>
          </div>
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {(primarySchema?.versions || []).map((v: any) => (
              <div
                key={v.id}
                className="flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-800 p-2.5 text-xs"
              >
                <div>
                  <span className="font-semibold text-indigo-400 mr-2">v{v.versionNumber}</span>
                  <span>{v.commitMessage}</span>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => restoreMutation.mutate(v.versionNumber)}
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Restore
                </Button>
              </div>
            ))}
          </div>
        </Card>

        {/* Collaboration Comments */}
        <Card className="p-5 space-y-3">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-indigo-400" />
            <h2 className="text-sm font-semibold">Team Discussion</h2>
          </div>
          <div className="flex gap-2">
            <Input
              value={tableTarget}
              onChange={(e) => setTableTarget(e.target.value)}
              placeholder="Table (optional)"
              className="w-32"
            />
            <Input
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Leave a schema review comment..."
            />
            <Button
              size="sm"
              disabled={!commentText.trim() || commentMutation.isPending}
              onClick={() => commentMutation.mutate()}
            >
              Post
            </Button>
          </div>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {(project.comments || []).map((c: any) => (
              <div key={c.id} className="rounded-lg border border-slate-200 dark:border-slate-800 p-2.5 text-xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold">{c.user?.name}</span>
                  {c.tableName && <Badge variant="indigo">{c.tableName}</Badge>}
                </div>
                <p className="text-slate-400">{c.content}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
