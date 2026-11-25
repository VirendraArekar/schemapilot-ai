import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import {
  CanonicalSchema,
  DatabaseEngine,
  SchemaColumn,
  SchemaRelationship,
  SchemaTable,
} from '@schemapilot/shared-types';
import { autoLayoutTables } from '@schemapilot/schema-core';

interface SchemaState {
  activeProjectId: string | null;
  activeSchemaId: string | null;
  schema: CanonicalSchema;
  past: CanonicalSchema[];
  future: CanonicalSchema[];
  clipboardTable: SchemaTable | null;
  isDirty: boolean;
}

const defaultSchema: CanonicalSchema = {
  name: 'Untitled Schema',
  engine: 'POSTGRESQL',
  version: 1,
  tables: [
    {
      id: 't_users',
      name: 'users',
      description: 'Application user accounts',
      position: { x: 80, y: 80 },
      columns: [
        {
          id: 'c_u_id',
          name: 'id',
          dataType: 'UUID',
          isPrimaryKey: true,
          isForeignKey: false,
          isNullable: false,
          isUnique: true,
          defaultValue: 'UUID()',
        },
        {
          id: 'c_u_email',
          name: 'email',
          dataType: 'VARCHAR',
          length: 255,
          isPrimaryKey: false,
          isForeignKey: false,
          isNullable: false,
          isUnique: true,
        },
        {
          id: 'c_u_created',
          name: 'created_at',
          dataType: 'TIMESTAMP',
          isPrimaryKey: false,
          isForeignKey: false,
          isNullable: false,
          isUnique: false,
          defaultValue: 'CURRENT_TIMESTAMP',
        },
      ],
      indexes: [
        { id: 'i_u_email', name: 'idx_users_email', columns: ['email'], isUnique: true, type: 'UNIQUE' },
      ],
      constraints: [],
    },
  ],
  relationships: [],
};

const initialState: SchemaState = {
  activeProjectId: null,
  activeSchemaId: null,
  schema: defaultSchema,
  past: [],
  future: [],
  clipboardTable: null,
  isDirty: false,
};

function pushHistory(state: SchemaState) {
  state.past.push(JSON.parse(JSON.stringify(state.schema)));
  if (state.past.length > 40) state.past.shift();
  state.future = [];
  state.isDirty = true;
}

const schemaSlice = createSlice({
  name: 'schema',
  initialState,
  reducers: {
    loadSchema(
      state,
      action: PayloadAction<{ projectId?: string; schemaId?: string; schema: CanonicalSchema }>,
    ) {
      state.activeProjectId = action.payload.projectId ?? state.activeProjectId;
      state.activeSchemaId = action.payload.schemaId ?? state.activeSchemaId;
      state.schema = action.payload.schema;
      state.past = [];
      state.future = [];
      state.isDirty = false;
    },
    setEngine(state, action: PayloadAction<DatabaseEngine>) {
      pushHistory(state);
      state.schema.engine = action.payload;
    },
    addTable(state, action: PayloadAction<SchemaTable>) {
      pushHistory(state);
      state.schema.tables.push(action.payload);
    },
    updateTable(state, action: PayloadAction<SchemaTable>) {
      pushHistory(state);
      const idx = state.schema.tables.findIndex((t) => t.id === action.payload.id);
      if (idx !== -1) state.schema.tables[idx] = action.payload;
    },
    updateTablePosition(
      state,
      action: PayloadAction<{ tableId: string; position: { x: number; y: number } }>,
    ) {
      const tbl = state.schema.tables.find((t) => t.id === action.payload.tableId);
      if (tbl) {
        tbl.position = action.payload.position;
        state.isDirty = true;
      }
    },
    deleteTable(state, action: PayloadAction<string>) {
      pushHistory(state);
      const target = state.schema.tables.find((t) => t.id === action.payload);
      state.schema.tables = state.schema.tables.filter((t) => t.id !== action.payload);
      if (target) {
        state.schema.relationships = state.schema.relationships.filter(
          (r) => r.sourceTable !== target.name && r.targetTable !== target.name,
        );
      }
    },
    duplicateTable(state, action: PayloadAction<string>) {
      const src = state.schema.tables.find((t) => t.id === action.payload);
      if (!src) return;
      pushHistory(state);
      const copy: SchemaTable = {
        ...JSON.parse(JSON.stringify(src)),
        id: `t_${Date.now()}`,
        name: `${src.name}_copy`,
        position: { x: src.position.x + 40, y: src.position.y + 40 },
      };
      state.schema.tables.push(copy);
    },
    copyTable(state, action: PayloadAction<string>) {
      const src = state.schema.tables.find((t) => t.id === action.payload);
      if (src) state.clipboardTable = JSON.parse(JSON.stringify(src));
    },
    pasteTable(state) {
      if (!state.clipboardTable) return;
      pushHistory(state);
      const copy: SchemaTable = {
        ...JSON.parse(JSON.stringify(state.clipboardTable)),
        id: `t_${Date.now()}`,
        name: `${state.clipboardTable.name}_pasted`,
        position: {
          x: state.clipboardTable.position.x + 60,
          y: state.clipboardTable.position.y + 60,
        },
      };
      state.schema.tables.push(copy);
    },
    toggleCollapseTable(state, action: PayloadAction<string>) {
      const tbl = state.schema.tables.find((t) => t.id === action.payload);
      if (tbl) tbl.isCollapsed = !tbl.isCollapsed;
    },
    addColumn(state, action: PayloadAction<{ tableId: string; column: SchemaColumn }>) {
      pushHistory(state);
      const tbl = state.schema.tables.find((t) => t.id === action.payload.tableId);
      if (tbl) tbl.columns.push(action.payload.column);
    },
    addRelationship(state, action: PayloadAction<SchemaRelationship>) {
      pushHistory(state);
      state.schema.relationships.push(action.payload);
    },
    deleteRelationship(state, action: PayloadAction<string>) {
      pushHistory(state);
      state.schema.relationships = state.schema.relationships.filter((r) => r.id !== action.payload);
    },
    runAutoLayout(state) {
      pushHistory(state);
      state.schema = autoLayoutTables(state.schema);
    },
    undo(state) {
      if (state.past.length === 0) return;
      state.future.unshift(JSON.parse(JSON.stringify(state.schema)));
      state.schema = state.past.pop()!;
      state.isDirty = true;
    },
    redo(state) {
      if (state.future.length === 0) return;
      state.past.push(JSON.parse(JSON.stringify(state.schema)));
      state.schema = state.future.shift()!;
      state.isDirty = true;
    },
    markClean(state) {
      state.isDirty = false;
    },
  },
});

export const {
  loadSchema,
  setEngine,
  addTable,
  updateTable,
  updateTablePosition,
  deleteTable,
  duplicateTable,
  copyTable,
  pasteTable,
  toggleCollapseTable,
  addColumn,
  addRelationship,
  deleteRelationship,
  runAutoLayout,
  undo,
  redo,
  markClean,
} = schemaSlice.actions;
export default schemaSlice.reducer;
