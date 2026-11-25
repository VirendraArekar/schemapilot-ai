import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Network } from 'lucide-react';
import { DatabaseEngine } from '@schemapilot/shared-types';
import { api, extractData } from '../services/api';
import { useAppDispatch } from '../store';
import { loadSchema } from '../store/schemaSlice';
import { addToast } from '../store/uiSlice';
import { Button, Card } from '../components/ui/primitives';

const SAMPLE_SQL = `CREATE TABLE users (
  id CHAR(36) PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE projects (
  id CHAR(36) PRIMARY KEY,
  owner_id CHAR(36) NOT NULL,
  name VARCHAR(150) NOT NULL,
  FOREIGN KEY (owner_id) REFERENCES users (id)
);`;

export function ImportPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [format, setFormat] = useState('SQL_DDL');
  const [engine, setEngine] = useState<DatabaseEngine>('POSTGRESQL');
  const [content, setContent] = useState(SAMPLE_SQL);
  const [loading, setLoading] = useState(false);

  const handleImport = async () => {
    setLoading(true);
    try {
      const res = extractData<{ schema: any; validation: any }>(
        await api.post('/import-export/import', { format, content, engine }),
      );
      dispatch(loadSchema({ schema: res.schema }));
      dispatch(
        addToast({
          title: `Imported ${res.schema.tables.length} tables`,
          variant: 'success',
        }),
      );
      navigate('/er-diagram');
    } catch (err: any) {
      dispatch(
        addToast({
          title: 'Import failed',
          description: err.response?.data?.error?.message || 'Check input syntax.',
          variant: 'error',
        }),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Database Import & Reverse Engineering</h1>
        <p className="text-sm text-slate-400">
          Safely parse SQL DDL, Prisma schemas, JSON Schema, or ORM models into an interactive ER diagram. Uploaded SQL is never executed.
        </p>
      </div>

      <Card className="p-5 space-y-4">
        <div className="flex flex-wrap gap-3">
          <select
            value={format}
            onChange={(e) => setFormat(e.target.value)}
            className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
          >
            <option value="SQL_DDL">SQL DDL / Dump</option>
            <option value="PRISMA">Prisma Schema</option>
            <option value="JSON_SCHEMA">JSON Schema</option>
            <option value="MONGODB">MongoDB Collection</option>
            <option value="TYPEORM">TypeORM Entities</option>
            <option value="SEQUELIZE">Sequelize Models</option>
            <option value="DRIZZLE">Drizzle Schema</option>
          </select>

          <select
            value={engine}
            onChange={(e) => setEngine(e.target.value as DatabaseEngine)}
            className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
          >
            <option value="POSTGRESQL">PostgreSQL</option>
            <option value="MYSQL">MySQL 8</option>
            <option value="SQLSERVER">SQL Server</option>
            <option value="SQLITE">SQLite</option>
            <option value="MONGODB">MongoDB</option>
          </select>
        </div>

        <textarea
          rows={12}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 p-4 font-mono text-xs focus:border-indigo-500 focus:outline-none"
        />

        <div className="flex justify-end">
          <Button onClick={handleImport} disabled={loading || !content.trim()}>
            <Upload className="h-4 w-4" />
            {loading ? 'Parsing...' : 'Parse & Open ER Diagram'}
            <Network className="h-4 w-4" />
          </Button>
        </div>
      </Card>
    </div>
  );
}
