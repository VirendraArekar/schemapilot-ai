import { useMemo, useState } from 'react';
import { GitCompare, AlertTriangle } from 'lucide-react';
import { compareSchemas } from '@schemapilot/schema-core';
import { generateMigrationSql } from '@schemapilot/sql-generators';
import { useAppSelector } from '../store';
import { Badge, Card } from '../components/ui/primitives';

export function SchemaComparePage() {
  const { schema, past } = useAppSelector((s) => s.schema);
  const [compareIdx, setCompareIdx] = useState(0);

  const baseline = past[compareIdx] || {
    ...schema,
    tables: schema.tables.slice(0, Math.max(0, schema.tables.length - 1)),
  };

  const diff = useMemo(() => compareSchemas(baseline, schema), [baseline, schema]);
  const migration = useMemo(
    () => generateMigrationSql(diff, schema.engine),
    [diff, schema.engine],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <GitCompare className="h-6 w-6 text-indigo-400" /> Schema Comparison
          </h1>
          <p className="text-sm text-slate-400">
            Compare your current schema against a previous snapshot and inspect migration SQL.
          </p>
        </div>
        {past.length > 0 && (
          <select
            value={compareIdx}
            onChange={(e) => setCompareIdx(Number(e.target.value))}
            className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
          >
            {past.map((_, idx) => (
              <option key={idx} value={idx}>
                Snapshot #{idx + 1}
              </option>
            ))}
          </select>
        )}
      </div>

      {diff.destructiveWarnings.length > 0 && (
        <Card className="p-4 border-rose-500/40 bg-rose-500/10 space-y-1">
          <div className="flex items-center gap-2 text-rose-400 font-semibold text-sm">
            <AlertTriangle className="h-4 w-4" /> Destructive Operation Warnings
          </div>
          {diff.destructiveWarnings.map((w, i) => (
            <p key={i} className="text-xs text-rose-300">
              • {w}
            </p>
          ))}
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-xs text-slate-400 mb-2">Added Tables</p>
          {diff.addedTables.length === 0 ? (
            <span className="text-xs text-slate-500">None</span>
          ) : (
            diff.addedTables.map((t) => (
              <Badge key={t.id} variant="emerald" className="mr-1 mb-1">
                + {t.name}
              </Badge>
            ))
          )}
        </Card>
        <Card className="p-4">
          <p className="text-xs text-slate-400 mb-2">Modified Tables</p>
          {diff.modifiedTables.length === 0 ? (
            <span className="text-xs text-slate-500">None</span>
          ) : (
            diff.modifiedTables.map((t) => (
              <Badge key={t.tableName} variant="amber" className="mr-1 mb-1">
                ~ {t.tableName}
              </Badge>
            ))
          )}
        </Card>
        <Card className="p-4">
          <p className="text-xs text-slate-400 mb-2">Deleted Tables</p>
          {diff.deletedTables.length === 0 ? (
            <span className="text-xs text-slate-500">None</span>
          ) : (
            diff.deletedTables.map((t) => (
              <Badge key={t.id} variant="rose" className="mr-1 mb-1">
                - {t.name}
              </Badge>
            ))
          )}
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <h3 className="text-sm font-semibold mb-2">Generated UP Migration</h3>
          <pre className="rounded-lg bg-slate-950 p-3 text-xs font-mono text-emerald-300 overflow-x-auto max-h-80">
            {migration.upSql || '-- No changes'}
          </pre>
        </Card>
        <Card className="p-4">
          <h3 className="text-sm font-semibold mb-2">Generated DOWN Rollback</h3>
          <pre className="rounded-lg bg-slate-950 p-3 text-xs font-mono text-amber-300 overflow-x-auto max-h-80">
            {migration.downSql || '-- No changes'}
          </pre>
        </Card>
      </div>
    </div>
  );
}
