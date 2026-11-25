import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { GitBranch, Play, RotateCcw, Plus } from 'lucide-react';
import { api, extractData } from '../services/api';
import { useAppDispatch, useAppSelector } from '../store';
import { addToast } from '../store/uiSlice';
import { Badge, Button, Card, Input, Modal } from '../components/ui/primitives';

export function MigrationsPage() {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const { activeSchemaId, schema, past } = useAppSelector((s) => s.schema);
  const [name, setName] = useState('add_core_changes');
  const [confirmMig, setConfirmMig] = useState<any>(null);

  const { data: migrations = [] } = useQuery({
    queryKey: ['migrations', activeSchemaId],
    enabled: Boolean(activeSchemaId),
    queryFn: async () => extractData<any[]>(await api.get(`/migrations/schema/${activeSchemaId}`)),
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const before = past[0] || { ...schema, tables: [] };
      return extractData<any>(
        await api.post(`/migrations/schema/${activeSchemaId}`, {
          name,
          before,
          after: schema,
        }),
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['migrations', activeSchemaId] });
      dispatch(addToast({ title: 'Migration created', variant: 'success' }));
    },
    onError: (err: any) => {
      dispatch(
        addToast({
          title: 'Could not create migration',
          description: err.response?.data?.error?.message,
          variant: 'warning',
        }),
      );
    },
  });

  const execMutation = useMutation({
    mutationFn: async ({
      id,
      direction,
      confirmDestructive,
    }: {
      id: string;
      direction: 'UP' | 'DOWN';
      confirmDestructive?: boolean;
    }) => api.post(`/migrations/${id}/execute`, { direction, confirmDestructive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['migrations', activeSchemaId] });
      dispatch(addToast({ title: 'Migration state updated', variant: 'success' }));
      setConfirmMig(null);
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <GitBranch className="h-6 w-6 text-indigo-400" /> Database Migration Manager
          </h1>
          <p className="text-sm text-slate-400">
            Track versioned Up/Down migrations, SHA-256 checksums, and safe rollback history.
          </p>
        </div>
        {activeSchemaId && (
          <div className="flex items-center gap-2">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Migration name"
              className="w-52"
            />
            <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
              <Plus className="h-4 w-4" /> Generate Migration
            </Button>
          </div>
        )}
      </div>

      {!activeSchemaId ? (
        <Card className="p-6 text-sm text-slate-400">
          Open a project workspace first to manage persisted migrations.
        </Card>
      ) : migrations.length === 0 ? (
        <Card className="p-6 text-sm text-slate-400">
          No migrations recorded for this schema yet. Click "Generate Migration" to create one.
        </Card>
      ) : (
        <div className="space-y-4">
          {migrations.map((m: any) => (
            <Card key={m.id} className="p-5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="font-mono text-xs text-indigo-400 mr-2">{m.versionTag}</span>
                  <span className="font-semibold text-sm">{m.name}</span>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Checksum: {m.checksum.slice(0, 16)}...
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={m.status === 'APPLIED' ? 'emerald' : 'amber'}>{m.status}</Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      m.hasDestructive
                        ? setConfirmMig({ ...m, dir: 'UP' })
                        : execMutation.mutate({ id: m.id, direction: 'UP' })
                    }
                  >
                    <Play className="h-3.5 w-3.5" /> Apply UP
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      m.hasDestructive
                        ? setConfirmMig({ ...m, dir: 'DOWN' })
                        : execMutation.mutate({ id: m.id, direction: 'DOWN' })
                    }
                  >
                    <RotateCcw className="h-3.5 w-3.5" /> Rollback
                  </Button>
                </div>
              </div>
              <pre className="rounded-lg bg-slate-950 p-3 text-xs font-mono text-slate-300 overflow-x-auto max-h-40">
                {m.upSql}
              </pre>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={Boolean(confirmMig)}
        onClose={() => setConfirmMig(null)}
        title="Confirm Destructive Migration"
      >
        <p className="text-sm text-slate-300 mb-4">
          Migration <strong>{confirmMig?.name}</strong> contains potentially destructive SQL
          statements (DROP TABLE / DROP COLUMN). Confirm before proceeding.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirmMig(null)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={() =>
              execMutation.mutate({
                id: confirmMig.id,
                direction: confirmMig.dir,
                confirmDestructive: true,
              })
            }
          >
            Confirm & Execute
          </Button>
        </div>
      </Modal>
    </div>
  );
}
