import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileText, Download, Printer } from 'lucide-react';
import { api, extractData } from '../services/api';
import { useAppSelector } from '../store';
import { Button, Card } from '../components/ui/primitives';

export function DocumentationPage() {
  const { schema } = useAppSelector((s) => s.schema);
  const [format, setFormat] = useState<'MARKDOWN' | 'HTML' | 'JSON'>('MARKDOWN');

  const { data } = useQuery({
    queryKey: ['docs', schema, format],
    queryFn: async () =>
      extractData<{ format: string; content: string }>(
        await api.post('/import-export/documentation', { schema, format }),
      ),
  });

  const handleDownload = () => {
    if (!data?.content) return;
    const ext = format === 'MARKDOWN' ? 'md' : format === 'HTML' ? 'html' : 'json';
    const blob = new Blob([data.content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${schema.name.toLowerCase().replace(/\s+/g, '_')}_docs.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6 text-indigo-400" /> Schema Documentation
          </h1>
          <p className="text-sm text-slate-400">
            Auto-generated data dictionary, relationships, and indexes in Markdown, HTML, JSON, or PDF.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={format}
            onChange={(e) => setFormat(e.target.value as any)}
            className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
          >
            <option value="MARKDOWN">Markdown (.md)</option>
            <option value="HTML">HTML (.html)</option>
            <option value="JSON">JSON (.json)</option>
          </select>
          <Button variant="outline" size="sm" onClick={handleDownload}>
            <Download className="h-3.5 w-3.5" /> Export
          </Button>
          <Button size="sm" onClick={() => window.print()}>
            <Printer className="h-3.5 w-3.5" /> Print / PDF
          </Button>
        </div>
      </div>

      <Card className="p-6">
        <pre className="whitespace-pre-wrap text-xs font-mono text-slate-300 leading-relaxed">
          {data?.content || 'Generating documentation...'}
        </pre>
      </Card>
    </div>
  );
}
