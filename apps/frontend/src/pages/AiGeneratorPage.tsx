import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Check, Network } from 'lucide-react';
import { CanonicalSchema, DatabaseEngine } from '@schemapilot/shared-types';
import { api, extractData } from '../services/api';
import { useAppDispatch } from '../store';
import { loadSchema } from '../store/schemaSlice';
import { addToast } from '../store/uiSlice';
import { Badge, Button, Card } from '../components/ui/primitives';

const SAMPLE_PROMPT =
  'Create an ecommerce database with users, products, categories, orders, order items, payments, shopping carts, coupons, reviews, and inventory. Include proper foreign keys, indexes, timestamps, soft deletion, and audit fields. Design it for a scalable application.';

export function AiGeneratorPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const [prompt, setPrompt] = useState(SAMPLE_PROMPT);
  const [engine, setEngine] = useState<DatabaseEngine>('POSTGRESQL');
  const [applicationType, setApplicationType] = useState('SaaS / E-Commerce');
  const [normalization, setNormalization] = useState<'3NF' | 'BCNF' | '2NF'>('3NF');
  const [namingConvention, setNamingConvention] = useState<'snake_case' | 'camelCase'>('snake_case');
  const [expectedVolume, setExpectedVolume] = useState<'SMALL' | 'MEDIUM' | 'LARGE' | 'ENTERPRISE'>('LARGE');
  const [multiTenant, setMultiTenant] = useState(false);
  const [softDelete, setSoftDelete] = useState(true);
  const [auditLogging, setAuditLogging] = useState(true);

  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState<{ schema: CanonicalSchema; validation: any; usage: any } | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    try {
      const res = extractData<any>(
        await api.post('/ai/generate-schema', {
          prompt,
          engine,
          applicationType,
          normalization,
          namingConvention,
          expectedVolume,
          multiTenant,
          softDelete,
          auditLogging,
        }),
      );
      setGenerated(res);
      dispatch(addToast({ title: 'AI Schema generated successfully', variant: 'success' }));
    } catch (err: any) {
      dispatch(
        addToast({
          title: 'Generation failed',
          description: err.response?.data?.error?.message || 'Ensure GEMINI_API_KEY is configured.',
          variant: 'error',
        }),
      );
    } finally {
      setLoading(false);
    }
  };

  const handleApproveAndOpen = () => {
    if (!generated) return;
    dispatch(loadSchema({ schema: generated.schema }));
    dispatch(addToast({ title: 'Loaded generated schema into Studio', variant: 'success' }));
    navigate('/er-diagram');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">AI Schema Generator</h1>
        <p className="text-sm text-slate-400">
          Describe your domain requirements in natural language. AI returns a validated structured schema — never auto-executed.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        <Card className="lg:col-span-8 p-5 space-y-4">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Natural Language Requirements
          </label>
          <textarea
            rows={7}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe tables, relationships, scale, security..."
            className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 p-4 text-sm focus:border-indigo-500 focus:outline-none"
          />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setPrompt(SAMPLE_PROMPT)}
              className="text-xs text-indigo-400 hover:underline cursor-pointer"
            >
              Load E-Commerce Example Prompt
            </button>
            <Button onClick={handleGenerate} disabled={loading || !prompt.trim()}>
              <Sparkles className="h-4 w-4" />
              {loading ? 'Generating with Gemini...' : 'Generate Schema'}
            </Button>
          </div>
        </Card>

        <Card className="lg:col-span-4 p-5 space-y-3">
          <h2 className="text-sm font-semibold">Architecture Options</h2>
          <div className="space-y-2.5 text-xs">
            <div>
              <label className="text-slate-400">Database Engine</label>
              <select
                value={engine}
                onChange={(e) => setEngine(e.target.value as DatabaseEngine)}
                className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2.5 py-2"
              >
                <option value="POSTGRESQL">PostgreSQL</option>
                <option value="MYSQL">MySQL 8</option>
                <option value="SQLSERVER">Microsoft SQL Server</option>
                <option value="SQLITE">SQLite</option>
                <option value="MONGODB">MongoDB</option>
              </select>
            </div>
            <div>
              <label className="text-slate-400">Application Type</label>
              <input
                value={applicationType}
                onChange={(e) => setApplicationType(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2.5 py-2"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-slate-400">Normalization</label>
                <select
                  value={normalization}
                  onChange={(e) => setNormalization(e.target.value as any)}
                  className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2 py-2"
                >
                  <option value="3NF">3NF</option>
                  <option value="BCNF">BCNF</option>
                  <option value="2NF">2NF</option>
                </select>
              </div>
              <div>
                <label className="text-slate-400">Naming</label>
                <select
                  value={namingConvention}
                  onChange={(e) => setNamingConvention(e.target.value as any)}
                  className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2 py-2"
                >
                  <option value="snake_case">snake_case</option>
                  <option value="camelCase">camelCase</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-slate-400">Expected Data Volume</label>
              <select
                value={expectedVolume}
                onChange={(e) => setExpectedVolume(e.target.value as any)}
                className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2.5 py-2"
              >
                <option value="SMALL">Small (&lt;100k rows)</option>
                <option value="MEDIUM">Medium (100k - 10M rows)</option>
                <option value="LARGE">Large (10M - 100M rows)</option>
                <option value="ENTERPRISE">Enterprise (100M+ rows)</option>
              </select>
            </div>
            <label className="flex items-center gap-2 pt-1 cursor-pointer">
              <input type="checkbox" checked={multiTenant} onChange={(e) => setMultiTenant(e.target.checked)} />
              Multi-tenant isolation (tenant_id)
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={softDelete} onChange={(e) => setSoftDelete(e.target.checked)} />
              Soft delete support (deleted_at)
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={auditLogging} onChange={(e) => setAuditLogging(e.target.checked)} />
              Audit fields & audit log table
            </label>
          </div>
        </Card>
      </div>

      {generated && (
        <Card className="p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold">{generated.schema.name}</h2>
              <p className="text-xs text-slate-400">
                {generated.schema.tables.length} tables • {generated.schema.relationships.length} relationships •{' '}
                {generated.usage?.totalTokens || 0} tokens ({generated.usage?.latencyMs || 0}ms)
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={generated.validation.isValid ? 'emerald' : 'amber'}>
                {generated.validation.isValid ? 'Validated' : `${generated.validation.warningCount} Warnings`}
              </Badge>
              <Button onClick={handleApproveAndOpen}>
                <Check className="h-4 w-4" /> Approve & Open in ER Diagram <Network className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {generated.schema.tables.map((t) => (
              <div key={t.id} className="rounded-lg border border-slate-200 dark:border-slate-800 p-3 text-xs">
                <p className="font-semibold mb-1.5">{t.name}</p>
                <ul className="space-y-0.5 text-slate-400">
                  {t.columns.slice(0, 6).map((c) => (
                    <li key={c.id} className="flex justify-between">
                      <span>{c.name}</span>
                      <span className="font-mono text-[10px]">{c.dataType}</span>
                    </li>
                  ))}
                  {t.columns.length > 6 && (
                    <li className="text-indigo-400">+{t.columns.length - 6} more columns</li>
                  )}
                </ul>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
