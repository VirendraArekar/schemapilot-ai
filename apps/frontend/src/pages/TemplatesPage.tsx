import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Layers, ArrowRight } from 'lucide-react';
import { api, extractData } from '../services/api';
import { useAppDispatch } from '../store';
import { loadSchema } from '../store/schemaSlice';
import { addToast } from '../store/uiSlice';
import { Badge, Button, Card, Input } from '../components/ui/primitives';

export function TemplatesPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['templates'],
    queryFn: async () => extractData<any[]>(await api.get('/templates')),
  });

  const handleUseTemplate = async (id: string) => {
    const full = extractData<any>(await api.get(`/templates/${id}`));
    dispatch(loadSchema({ schema: full.schema }));
    dispatch(addToast({ title: `Loaded "${full.name}" template`, variant: 'success' }));
    navigate('/er-diagram');
  };

  const filtered = templates.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.category.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Layers className="h-5 w-5 text-emerald-400" /> ER Diagram Blueprints ({filtered.length})
          </h1>
          <p className="text-sm text-slate-400">
            Production-ready database architectures ready to customize in the ER Designer.
          </p>
        </div>
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter templates..."
          className="max-w-xs"
        />
      </div>

      {isLoading ? (
        <p className="text-sm text-slate-400">Loading templates...</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((t) => (
            <Card key={t.id} className="p-5 flex flex-col justify-between gap-4">
              <div>
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-sm">{t.name}</h3>
                  <Badge variant="indigo">{t.engine}</Badge>
                </div>
                <p className="text-[11px] text-indigo-400 mt-0.5">{t.category}</p>
                <p className="text-xs text-slate-400 mt-2">{t.description}</p>
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800">
                <span className="text-xs text-slate-500">
                  {t.tableCount} tables • {t.relationshipCount} relations
                </span>
                <Button size="sm" onClick={() => handleUseTemplate(t.id)}>
                  Use Template <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
