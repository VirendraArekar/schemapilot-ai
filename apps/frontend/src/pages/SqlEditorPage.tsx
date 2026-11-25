import { useMemo, useState } from 'react';
import Editor from '@monaco-editor/react';
import { Copy, Download, Sparkles } from 'lucide-react';
import { DatabaseEngine } from '@schemapilot/shared-types';
import { generateSchemaCode } from '@schemapilot/sql-generators';
import { useAppDispatch, useAppSelector } from '../store';
import { addToast } from '../store/uiSlice';
import { api, extractData } from '../services/api';
import { Button, Card } from '../components/ui/primitives';

export function SqlEditorPage() {
  const dispatch = useAppDispatch();
  const { schema } = useAppSelector((s) => s.schema);
  const theme = useAppSelector((s) => s.ui.theme);
  const [targetEngine, setTargetEngine] = useState<DatabaseEngine>(schema.engine);
  const [includeCreateDb, setIncludeCreateDb] = useState(true);
  const [includeDrop, setIncludeDrop] = useState(false);
  const [includeSamples, setIncludeSamples] = useState(false);
  const [explanation, setExplanation] = useState('');
  const [explaining, setExplaining] = useState(false);

  const generatedSql = useMemo(
    () =>
      generateSchemaCode(
        { ...schema, engine: targetEngine },
        {
          includeCreateDatabase: includeCreateDb,
          includeDropStatements: includeDrop,
          includeSampleInserts: includeSamples,
        },
      ),
    [schema, targetEngine, includeCreateDb, includeDrop, includeSamples],
  );

  const handleCopy = async () => {
    await navigator.clipboard.writeText(generatedSql);
    dispatch(addToast({ title: 'SQL copied to clipboard', variant: 'success' }));
  };

  const handleDownload = () => {
    const ext = targetEngine === 'MONGODB' ? 'js' : 'sql';
    const blob = new Blob([generatedSql], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${schema.name.toLowerCase().replace(/\s+/g, '_')}_${targetEngine.toLowerCase()}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExplain = async () => {
    setExplaining(true);
    try {
      const res = extractData<{ explanation: string }>(
        await api.post('/ai/explain-sql', { sql: generatedSql, engine: targetEngine }),
      );
      setExplanation(res.explanation);
    } catch (err: any) {
      dispatch(
        addToast({
          title: 'AI Explain unavailable',
          description: err.response?.data?.error?.message || 'Configure GEMINI_API_KEY to use AI Explain.',
          variant: 'warning',
        }),
      );
    } finally {
      setExplaining(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">SQL & Script Generator</h1>
          <p className="text-sm text-slate-400">
            Dependency-ordered DDL and MongoDB validators with Monaco Editor preview.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={targetEngine}
            onChange={(e) => setTargetEngine(e.target.value as DatabaseEngine)}
            className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
          >
            <option value="POSTGRESQL">PostgreSQL</option>
            <option value="MYSQL">MySQL 8</option>
            <option value="SQLSERVER">Microsoft SQL Server</option>
            <option value="SQLITE">SQLite</option>
            <option value="MONGODB">MongoDB</option>
          </select>
          <Button variant="outline" size="sm" onClick={handleCopy}>
            <Copy className="h-3.5 w-3.5" /> Copy
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownload}>
            <Download className="h-3.5 w-3.5" /> Download
          </Button>
          <Button size="sm" onClick={handleExplain} disabled={explaining}>
            <Sparkles className="h-3.5 w-3.5" /> {explaining ? 'Analyzing...' : 'Explain SQL'}
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 text-xs">
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={includeCreateDb}
            onChange={(e) => setIncludeCreateDb(e.target.checked)}
          />
          Include CREATE DATABASE
        </label>
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={includeDrop}
            onChange={(e) => setIncludeDrop(e.target.checked)}
          />
          Include DROP TABLE IF EXISTS
        </label>
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={includeSamples}
            onChange={(e) => setIncludeSamples(e.target.checked)}
          />
          Include Sample INSERTs
        </label>
      </div>

      <Card className="overflow-auto border border-zinc-200 dark:border-zinc-800 h-[65vh] min-h-[420px]">
        <Editor
          height="100%"
          language={targetEngine === 'MONGODB' ? 'javascript' : 'sql'}
          theme={theme === 'dark' ? 'vs-dark' : 'light'}
          value={generatedSql}
          options={{
            readOnly: true,
            minimap: { enabled: true },
            fontSize: 12,
            wordWrap: 'on',
            scrollBeyondLastLine: true,
            scrollbar: {
              vertical: 'visible',
              horizontal: 'visible',
              alwaysConsumeMouseWheel: false,
            },
          }}
        />
      </Card>

      {explanation && (
        <Card className="p-5">
          <h3 className="text-sm font-semibold mb-2">AI SQL Explanation & Optimization Notes</h3>
          <pre className="whitespace-pre-wrap text-xs text-slate-300 font-sans leading-relaxed">
            {explanation}
          </pre>
        </Card>
      )}
    </div>
  );
}
