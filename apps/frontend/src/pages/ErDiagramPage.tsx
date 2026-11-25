import { useCallback, useMemo, useRef, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Handle,
  Position,
  Connection,
  ConnectionMode,
  Node,
  Edge,
  NodeProps,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { toPng, toSvg } from 'html-to-image';
import {
  Plus,
  Undo2,
  Redo2,
  LayoutGrid,
  Download,
  KeyRound,
  Link2,
  Trash2,
  Copy,
  ClipboardPaste,
  ChevronDown,
  ChevronRight,
  Save,
  Search,
  GitFork,
} from 'lucide-react';
import { RelationshipType, SchemaTable } from '@schemapilot/shared-types';
import { useAppDispatch, useAppSelector } from '../store';
import {
  addColumn,
  addRelationship,
  addTable,
  copyTable,
  deleteRelationship,
  deleteTable,
  pasteTable,
  redo,
  runAutoLayout,
  toggleCollapseTable,
  undo,
  updateTablePosition,
  markClean,
} from '../store/schemaSlice';
import { addToast } from '../store/uiSlice';
import { api } from '../services/api';
import { Badge, Button, Input, Modal } from '../components/ui/primitives';

function TableNode({ data, selected }: NodeProps<Node<{ table: SchemaTable }>>) {
  const dispatch = useAppDispatch();
  const table = data.table;
  const indexedCols = new Set(table.indexes.flatMap((i) => i.columns));

  return (
    <div
      className={`min-w-[165px] max-w-[205px] rounded-lg border bg-white dark:bg-zinc-900 shadow-md transition-shadow ${
        selected
          ? 'border-emerald-500 ring-2 ring-emerald-500/30'
          : 'border-zinc-300 dark:border-zinc-700'
      }`}
    >
      <Handle
        id="left"
        type="target"
        position={Position.Left}
        isConnectable
        className="!bg-emerald-400 !border-zinc-950 !w-2.5 !h-2.5 hover:!scale-125 transition-transform"
      />
      <Handle
        id="right"
        type="source"
        position={Position.Right}
        isConnectable
        className="!bg-cyan-400 !border-zinc-950 !w-2.5 !h-2.5 hover:!scale-125 transition-transform"
      />
      <Handle
        id="top"
        type="target"
        position={Position.Top}
        isConnectable
        className="!bg-emerald-400 !border-zinc-950 !w-2 !h-2 hover:!scale-125 transition-transform"
      />
      <Handle
        id="bottom"
        type="source"
        position={Position.Bottom}
        isConnectable
        className="!bg-cyan-400 !border-zinc-950 !w-2 !h-2 hover:!scale-125 transition-transform"
      />

      <div className="flex items-center justify-between rounded-t-lg bg-zinc-100 dark:bg-zinc-800/90 px-2 py-1 border-b border-zinc-200 dark:border-zinc-700">
        <div className="flex items-center gap-1 min-w-0">
          <button
            onClick={() => dispatch(toggleCollapseTable(table.id))}
            className="text-zinc-400 hover:text-zinc-200 cursor-pointer shrink-0"
          >
            {table.isCollapsed ? (
              <ChevronRight className="h-3 w-3" />
            ) : (
              <ChevronDown className="h-3 w-3" />
            )}
          </button>
          <span className="text-[11px] font-bold tracking-tight truncate text-zinc-900 dark:text-zinc-100">
            {table.name}
          </span>
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            onClick={() => dispatch(copyTable(table.id))}
            title="Copy table"
            className="p-0.5 text-zinc-400 hover:text-emerald-400 cursor-pointer"
          >
            <Copy className="h-2.5 w-2.5" />
          </button>
          <button
            onClick={() => dispatch(deleteTable(table.id))}
            title="Delete table"
            className="p-0.5 text-zinc-400 hover:text-rose-400 cursor-pointer"
          >
            <Trash2 className="h-2.5 w-2.5" />
          </button>
        </div>
      </div>

      {!table.isCollapsed && (
        <div className="divide-y divide-zinc-100 dark:divide-zinc-800/70">
          {table.columns.map((col) => (
            <div
              key={col.id}
              className="flex items-center justify-between px-2 py-0.5 text-[10px] gap-1.5"
            >
              <div className="flex items-center gap-1 min-w-0">
                {col.isPrimaryKey && (
                  <KeyRound className="h-2.5 w-2.5 text-amber-400 shrink-0" aria-label="PK" />
                )}
                {col.isForeignKey && (
                  <Link2 className="h-2.5 w-2.5 text-cyan-400 shrink-0" aria-label="FK" />
                )}
                <span className="truncate font-medium text-zinc-800 dark:text-zinc-200">
                  {col.name}
                </span>
                {col.isNullable && <span className="text-zinc-400">?</span>}
              </div>
              <div className="flex items-center gap-0.5 shrink-0">
                {col.isUnique && !col.isPrimaryKey && (
                  <span className="rounded bg-emerald-500/15 px-1 text-[8px] text-emerald-400">
                    UQ
                  </span>
                )}
                {indexedCols.has(col.name) && (
                  <span className="rounded bg-cyan-500/15 px-1 text-[8px] text-cyan-400">
                    IX
                  </span>
                )}
                <span className="font-mono text-[9px] text-zinc-400">
                  {col.dataType}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const nodeTypes = { tableNode: TableNode };

export function ErDiagramPage() {
  const dispatch = useAppDispatch();
  const { schema, activeSchemaId, past, future, clipboardTable, isDirty } = useAppSelector(
    (s) => s.schema,
  );
  const canvasRef = useRef<HTMLDivElement>(null);
  const [search, setSearch] = useState('');
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [newTableName, setNewTableName] = useState('');

  // Connect modal state
  const [connectOpen, setConnectOpen] = useState(false);
  const [srcTable, setSrcTable] = useState(schema.tables[0]?.name || '');
  const [srcCol, setSrcCol] = useState('');
  const [tgtTable, setTgtTable] = useState(schema.tables[1]?.name || schema.tables[0]?.name || '');
  const [tgtCol, setTgtCol] = useState('id');
  const [relType, setRelType] = useState<RelationshipType>('ONE_TO_MANY');

  const filteredTables = useMemo(
    () => schema.tables.filter((t) => t.name.toLowerCase().includes(search.toLowerCase())),
    [schema.tables, search],
  );

  const nodes: Node<{ table: SchemaTable }>[] = useMemo(
    () =>
      filteredTables.map((t) => ({
        id: t.name,
        type: 'tableNode',
        position: t.position || { x: 0, y: 0 },
        data: { table: t },
      })),
    [filteredTables],
  );

  const edges: Edge[] = useMemo(
    () =>
      schema.relationships.map((r) => ({
        id: r.id,
        source: r.sourceTable,
        target: r.targetTable,
        label: `${r.type === 'ONE_TO_ONE' ? '1:1' : r.type === 'MANY_TO_MANY' ? 'M:N' : '1:N'} (${r.sourceColumn})`,
        markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6' },
        style: { stroke: '#3b82f6', strokeWidth: 1.5 },
        labelStyle: { fontSize: 9, fill: '#a1a1aa' },
        labelBgStyle: { fill: '#09090b', fillOpacity: 0.8 },
      })),
    [schema.relationships],
  );

  const onNodeDragStop = useCallback(
    (_: unknown, node: Node<{ table: SchemaTable }>) => {
      dispatch(
        updateTablePosition({
          tableId: node.data.table.id,
          position: node.position,
        }),
      );
    },
    [dispatch],
  );

  const onConnect = useCallback(
    (conn: Connection) => {
      if (!conn.source || !conn.target) return;
      const sourceTbl = schema.tables.find((t) => t.name === conn.source);
      const targetTbl = schema.tables.find((t) => t.name === conn.target);
      if (!sourceTbl || !targetTbl) return;

      const tgtPk = targetTbl.columns.find((c) => c.isPrimaryKey) || targetTbl.columns[0];
      const tgtPkName = tgtPk?.name || 'id';
      const expectedFkName = `${targetTbl.name.replace(/s$/, '')}_id`;

      const existingFk = sourceTbl.columns.find(
        (c) => c.name === expectedFkName || (c.isForeignKey && c.name.includes(targetTbl.name)),
      );

      if (!existingFk) {
        dispatch(
          addColumn({
            tableId: sourceTbl.id,
            column: {
              id: `c_${Date.now()}`,
              name: expectedFkName,
              dataType: tgtPk?.dataType || 'UUID',
              isPrimaryKey: false,
              isForeignKey: true,
              isNullable: false,
              isUnique: false,
            },
          }),
        );
      }

      dispatch(
        addRelationship({
          id: `rel_${Date.now()}`,
          name: `fk_${sourceTbl.name}_${expectedFkName}`,
          sourceTable: sourceTbl.name,
          sourceColumn: existingFk?.name || expectedFkName,
          targetTable: targetTbl.name,
          targetColumn: tgtPkName,
          type: 'ONE_TO_MANY',
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE',
        }),
      );
      dispatch(
        addToast({
          title: `Connected ${sourceTbl.name} → ${targetTbl.name}`,
          variant: 'success',
        }),
      );
    },
    [schema.tables, dispatch],
  );

  const handleManualConnect = () => {
    if (!srcTable || !tgtTable) return;
    const fkCol = srcCol.trim() || `${tgtTable.replace(/s$/, '')}_id`;
    const sourceTbl = schema.tables.find((t) => t.name === srcTable);
    const targetTbl = schema.tables.find((t) => t.name === tgtTable);
    if (sourceTbl && !sourceTbl.columns.some((c) => c.name === fkCol)) {
      const tgtPk = targetTbl?.columns.find((c) => c.name === tgtCol);
      dispatch(
        addColumn({
          tableId: sourceTbl.id,
          column: {
            id: `c_${Date.now()}`,
            name: fkCol,
            dataType: tgtPk?.dataType || 'UUID',
            isPrimaryKey: false,
            isForeignKey: true,
            isNullable: false,
            isUnique: false,
          },
        }),
      );
    }
    dispatch(
      addRelationship({
        id: `rel_${Date.now()}`,
        name: `fk_${srcTable}_${fkCol}`,
        sourceTable: srcTable,
        sourceColumn: fkCol,
        targetTable: tgtTable,
        targetColumn: tgtCol || 'id',
        type: relType,
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      }),
    );
    setConnectOpen(false);
    dispatch(addToast({ title: `Relationship created (${relType})`, variant: 'success' }));
  };

  const handleCreateTable = () => {
    if (!newTableName.trim()) return;
    dispatch(
      addTable({
        id: `t_${Date.now()}`,
        name: newTableName.trim().toLowerCase().replace(/\s+/g, '_'),
        position: { x: 80 + schema.tables.length * 45, y: 80 },
        columns: [
          {
            id: `c_${Date.now()}`,
            name: 'id',
            dataType: 'UUID',
            isPrimaryKey: true,
            isForeignKey: false,
            isNullable: false,
            isUnique: true,
            defaultValue: 'UUID()',
          },
        ],
        indexes: [],
        constraints: [],
      }),
    );
    setNewTableName('');
    setAddModalOpen(false);
  };

  const handleExport = async (format: 'PNG' | 'SVG' | 'PDF') => {
    if (!canvasRef.current) return;
    if (format === 'PDF') {
      window.print();
      return;
    }
    const fn = format === 'PNG' ? toPng : toSvg;
    const dataUrl = await fn(canvasRef.current, { backgroundColor: '#09090b' });
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `${schema.name.toLowerCase().replace(/\s+/g, '_')}.${format.toLowerCase()}`;
    a.click();
    dispatch(addToast({ title: `Exported diagram as ${format}`, variant: 'success' }));
  };

  const handleSave = async () => {
    if (!activeSchemaId) {
      dispatch(
        addToast({
          title: 'Local Studio Mode',
          description: 'Open a project first to persist changes to the database.',
          variant: 'warning',
        }),
      );
      return;
    }
    await api.put(`/schemas/${activeSchemaId}`, {
      schema,
      commitMessage: 'Updated ER diagram',
    });
    dispatch(markClean());
    dispatch(addToast({ title: 'Schema saved to server', variant: 'success' }));
  };

  return (
    <div className="flex flex-col h-[calc(100vh-6.5rem)] gap-2.5">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <Button size="sm" onClick={() => setAddModalOpen(true)}>
            <Plus className="h-3.5 w-3.5" /> Add Table
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setSrcTable(schema.tables[0]?.name || '');
              setTgtTable(schema.tables[1]?.name || schema.tables[0]?.name || '');
              setConnectOpen(true);
            }}
          >
            <GitFork className="h-3.5 w-3.5" /> Connect
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={past.length === 0}
            onClick={() => dispatch(undo())}
            title="Undo"
          >
            <Undo2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={future.length === 0}
            onClick={() => dispatch(redo())}
            title="Redo"
          >
            <Redo2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={!clipboardTable}
            onClick={() => dispatch(pasteTable())}
            title="Paste copied table"
          >
            <ClipboardPaste className="h-3.5 w-3.5" />
          </Button>
          <Button size="sm" variant="outline" onClick={() => dispatch(runAutoLayout())}>
            <LayoutGrid className="h-3.5 w-3.5" /> Layout
          </Button>
          <div className="relative">
            <Search className="h-3.5 w-3.5 text-zinc-400 absolute left-2 top-2" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter..."
              className="h-8 w-28 sm:w-36 rounded-md border border-zinc-300 dark:border-zinc-700 bg-transparent pl-7 pr-2 text-xs focus:outline-none"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="emerald">{schema.engine}</Badge>
          {isDirty && <Badge variant="amber">Unsaved</Badge>}
          <Button size="sm" variant="outline" onClick={() => handleExport('PNG')}>
            <Download className="h-3.5 w-3.5" /> PNG
          </Button>
          <Button size="sm" variant="outline" onClick={() => handleExport('SVG')}>
            SVG
          </Button>
          <Button size="sm" variant="outline" onClick={() => handleExport('PDF')}>
            PDF
          </Button>
          <Button size="sm" onClick={handleSave}>
            <Save className="h-3.5 w-3.5" /> Save
          </Button>
        </div>
      </div>

      {/* Canvas */}
      <div
        ref={canvasRef}
        className="flex-1 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-950 overflow-hidden"
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          connectionMode={ConnectionMode.Loose}
          onNodeDragStop={onNodeDragStop}
          onConnect={onConnect}
          onEdgeDoubleClick={(_, edge) => dispatch(deleteRelationship(edge.id))}
          fitView
        >
          <Background gap={16} size={1} color="#18181b" />
          <Controls className="!scale-90" />
          <MiniMap
            style={{ width: 110, height: 72 }}
            className="!bg-slate-900/90 !border !border-slate-800 !rounded-lg"
            nodeColor="#3b82f6"
            maskColor="rgba(15, 23, 42, 0.75)"
          />
        </ReactFlow>
      </div>

      <Modal open={addModalOpen} onClose={() => setAddModalOpen(false)} title="Create Table">
        <div className="space-y-4">
          <Input
            value={newTableName}
            onChange={(e) => setNewTableName(e.target.value)}
            placeholder="e.g. invoices"
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setAddModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateTable}>Create Table</Button>
          </div>
        </div>
      </Modal>

      <Modal open={connectOpen} onClose={() => setConnectOpen(false)} title="Connect Tables (Relationship)">
        <div className="space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-zinc-400">Child / Source Table (FK)</label>
              <select
                value={srcTable}
                onChange={(e) => setSrcTable(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2.5 py-2"
              >
                {schema.tables.map((t) => (
                  <option key={t.id} value={t.name}>{t.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-zinc-400">FK Column Name</label>
              <Input
                value={srcCol}
                onChange={(e) => setSrcCol(e.target.value)}
                placeholder={`${tgtTable.replace(/s$/, '')}_id`}
                className="mt-1"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-zinc-400">Parent / Target Table (PK)</label>
              <select
                value={tgtTable}
                onChange={(e) => setTgtTable(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2.5 py-2"
              >
                {schema.tables.map((t) => (
                  <option key={t.id} value={t.name}>{t.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-zinc-400">Referenced Column</label>
              <Input
                value={tgtCol}
                onChange={(e) => setTgtCol(e.target.value)}
                placeholder="id"
                className="mt-1"
              />
            </div>
          </div>

          <div>
            <label className="text-zinc-400">Cardinality</label>
            <select
              value={relType}
              onChange={(e) => setRelType(e.target.value as RelationshipType)}
              className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2.5 py-2"
            >
              <option value="ONE_TO_MANY">One-to-Many (1:N)</option>
              <option value="ONE_TO_ONE">One-to-One (1:1)</option>
              <option value="MANY_TO_MANY">Many-to-Many (M:N)</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setConnectOpen(false)}>Cancel</Button>
            <Button onClick={handleManualConnect}>Create Relationship</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
