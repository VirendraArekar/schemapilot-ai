import { useQuery } from '@tanstack/react-query';
import { Activity, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { PerformanceIssue } from '@schemapilot/shared-types';
import { api, extractData } from '../services/api';
import { useAppSelector } from '../store';
import { Badge, Card } from '../components/ui/primitives';

export function AnalyzerPage() {
  const { schema } = useAppSelector((s) => s.schema);

  const { data: issues = [], isLoading } = useQuery({
    queryKey: ['perf-analyze', schema],
    queryFn: async () =>
      extractData<PerformanceIssue[]>(await api.post('/ai/analyze-performance', schema)),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Activity className="h-6 w-6 text-indigo-400" /> Database Performance Analyzer
        </h1>
        <p className="text-sm text-slate-400">
          Static & heuristic audit for missing foreign key indexes, redundant indexes, nullability, and partitioning opportunities.
        </p>
      </div>

      {isLoading ? (
        <Card className="p-8 text-center text-sm text-slate-400">Analyzing schema...</Card>
      ) : issues.length === 0 ? (
        <Card className="p-8 text-center space-y-2">
          <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto" />
          <p className="font-semibold">No structural performance issues detected</p>
          <p className="text-xs text-slate-400">
            All foreign keys are indexed and column types look well-proportioned.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {issues.map((issue) => (
            <Card key={issue.id} className="p-5 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle
                    className={`h-4 w-4 ${
                      issue.severity === 'HIGH'
                        ? 'text-rose-400'
                        : issue.severity === 'MEDIUM'
                          ? 'text-amber-400'
                          : 'text-indigo-400'
                    }`}
                  />
                  <h3 className="font-semibold text-sm">{issue.title}</h3>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={
                      issue.severity === 'HIGH'
                        ? 'rose'
                        : issue.severity === 'MEDIUM'
                          ? 'amber'
                          : 'indigo'
                    }
                  >
                    {issue.severity}
                  </Badge>
                  <Badge>{issue.category}</Badge>
                </div>
              </div>
              <p className="text-xs text-slate-400">{issue.explanation}</p>
              <p className="text-xs text-emerald-400">
                <strong>Recommendation:</strong> {issue.recommendation} ({issue.expectedBenefit})
              </p>
              {issue.suggestedSql && (
                <pre className="rounded-lg bg-slate-950 border border-slate-800 p-2.5 text-xs font-mono text-indigo-300 overflow-x-auto">
                  {issue.suggestedSql}
                </pre>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
