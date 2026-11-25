import { useState } from 'react';
import { Bot, Send, Check, X, RotateCcw } from 'lucide-react';
import { CanonicalSchema, SchemaDiff } from '@schemapilot/shared-types';
import { api, extractData } from '../services/api';
import { useAppDispatch, useAppSelector } from '../store';
import { loadSchema, undo } from '../store/schemaSlice';
import { addToast } from '../store/uiSlice';
import { Badge, Button, Card, Input } from '../components/ui/primitives';

const SUGGESTED_PROMPTS = [
  'Add payment gateway support with transactions and refunds.',
  'Add multi-tenant organization isolation across core tables.',
  'Identify missing indexes and add audit logs.',
  'Normalize the schema to 3NF.',
];

interface ChatMsg {
  role: 'user' | 'assistant';
  content: string;
  proposedSchema?: CanonicalSchema;
  diff?: SchemaDiff;
  status?: 'PROPOSED' | 'ACCEPTED' | 'REJECTED';
}

export function AiAssistantPage() {
  const dispatch = useAppDispatch();
  const { schema, activeProjectId, past } = useAppSelector((s) => s.schema);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      role: 'assistant',
      content: `Connected to "${schema.name}" (${schema.tables.length} tables, ${schema.engine}). Ask me to add modules, optimize indexes, or convert engines. All modifications are shown as a diff before applying.`,
    },
  ]);

  const sendInstruction = async (text?: string) => {
    const instruction = (text ?? input).trim();
    if (!instruction) return;
    setMessages((prev) => [...prev, { role: 'user', content: instruction }]);
    if (!text) setInput('');
    setLoading(true);

    try {
      const res = extractData<{
        conversationId: string;
        explanation: string;
        proposedSchema: CanonicalSchema;
        diff: SchemaDiff;
      }>(
        await api.post('/ai/assistant', {
          schema,
          instruction,
          projectId: activeProjectId || undefined,
          conversationId,
        }),
      );
      setConversationId(res.conversationId);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: res.explanation,
          proposedSchema: res.proposedSchema,
          diff: res.diff,
          status: 'PROPOSED',
        },
      ]);
    } catch (err: any) {
      dispatch(
        addToast({
          title: 'Assistant error',
          description: err.response?.data?.error?.message || 'Ensure GEMINI_API_KEY is configured.',
          variant: 'error',
        }),
      );
    } finally {
      setLoading(false);
    }
  };

  const acceptProposal = (idx: number, proposed: CanonicalSchema) => {
    dispatch(loadSchema({ schema: proposed }));
    setMessages((prev) =>
      prev.map((m, i) => (i === idx ? { ...m, status: 'ACCEPTED' } : m)),
    );
    dispatch(addToast({ title: 'Proposed changes applied to schema', variant: 'success' }));
  };

  const rejectProposal = (idx: number) => {
    setMessages((prev) =>
      prev.map((m, i) => (i === idx ? { ...m, status: 'REJECTED' } : m)),
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">AI Database Assistant</h1>
          <p className="text-sm text-slate-400">
            Schema-aware conversational architect with diff preview and rollback.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={past.length === 0}
          onClick={() => dispatch(undo())}
        >
          <RotateCcw className="h-3.5 w-3.5" /> Rollback Last Change
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {SUGGESTED_PROMPTS.map((p) => (
          <button
            key={p}
            onClick={() => sendInstruction(p)}
            className="rounded-full border border-slate-300 dark:border-slate-700 px-3 py-1 text-xs hover:border-indigo-500 hover:text-indigo-400 cursor-pointer"
          >
            {p}
          </button>
        ))}
      </div>

      <Card className="p-4 flex flex-col h-[540px]">
        <div className="flex-1 overflow-y-auto space-y-4 pr-2">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-2xl rounded-xl p-3.5 text-sm ${
                  m.role === 'user'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1 text-xs opacity-75">
                  {m.role === 'assistant' && <Bot className="h-3.5 w-3.5" />}
                  <span>{m.role === 'user' ? 'You' : 'SchemaPilot AI'}</span>
                </div>
                <p className="whitespace-pre-wrap">{m.content}</p>

                {m.diff && (
                  <div className="mt-3 rounded-lg border border-slate-700 bg-slate-950 p-3 text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-300">Proposed Schema Diff</span>
                      {m.status && <Badge variant={m.status === 'ACCEPTED' ? 'emerald' : 'indigo'}>{m.status}</Badge>}
                    </div>
                    <p className="text-emerald-400">
                      + Added tables: {m.diff.addedTables.map((t) => t.name).join(', ') || 'None'}
                    </p>
                    <p className="text-amber-400">
                      ~ Modified tables: {m.diff.modifiedTables.map((t) => t.tableName).join(', ') || 'None'}
                    </p>
                    <p className="text-rose-400">
                      - Deleted tables: {m.diff.deletedTables.map((t) => t.name).join(', ') || 'None'}
                    </p>

                    {m.status === 'PROPOSED' && m.proposedSchema && (
                      <div className="flex gap-2 pt-2">
                        <Button size="sm" onClick={() => acceptProposal(idx, m.proposedSchema!)}>
                          <Check className="h-3.5 w-3.5" /> Accept Changes
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => rejectProposal(idx)}>
                          <X className="h-3.5 w-3.5" /> Reject
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendInstruction();
          }}
          className="mt-4 flex gap-2 pt-3 border-t border-slate-200 dark:border-slate-800"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask AI to modify your schema..."
          />
          <Button type="submit" disabled={loading || !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </Card>
    </div>
  );
}
