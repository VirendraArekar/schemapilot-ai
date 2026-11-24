import {
  CanonicalSchema,
  ColumnDiff,
  RelationshipDiff,
  SchemaColumn,
  SchemaDiff,
  SchemaTable,
  TableDiff,
} from '@schemapilot/shared-types';

function compareColumns(before?: SchemaColumn, after?: SchemaColumn): string[] {
  if (!before || !after) return [];
  const changes: string[] = [];
  if (before.dataType !== after.dataType) {
    changes.push(`dataType: ${before.dataType} -> ${after.dataType}`);
  }
  if (before.length !== after.length) {
    changes.push(`length: ${before.length ?? 'none'} -> ${after.length ?? 'none'}`);
  }
  if (before.isNullable !== after.isNullable) {
    changes.push(`nullable: ${before.isNullable} -> ${after.isNullable}`);
  }
  if (before.isPrimaryKey !== after.isPrimaryKey) {
    changes.push(`primaryKey: ${before.isPrimaryKey} -> ${after.isPrimaryKey}`);
  }
  if (before.isUnique !== after.isUnique) {
    changes.push(`unique: ${before.isUnique} -> ${after.isUnique}`);
  }
  if ((before.defaultValue ?? null) !== (after.defaultValue ?? null)) {
    changes.push(`default: ${before.defaultValue ?? 'null'} -> ${after.defaultValue ?? 'null'}`);
  }
  return changes;
}

export function compareSchemas(before: CanonicalSchema, after: CanonicalSchema): SchemaDiff {
  const beforeTables = new Map<string, SchemaTable>(before.tables.map((t) => [t.name, t]));
  const afterTables = new Map<string, SchemaTable>(after.tables.map((t) => [t.name, t]));

  const addedTables: SchemaTable[] = [];
  const deletedTables: SchemaTable[] = [];
  const modifiedTables: TableDiff[] = [];
  const destructiveWarnings: string[] = [];

  for (const [name, table] of afterTables) {
    if (!beforeTables.has(name)) {
      addedTables.push(table);
    }
  }

  for (const [name, table] of beforeTables) {
    if (!afterTables.has(name)) {
      deletedTables.push(table);
      destructiveWarnings.push(`Dropping table "${name}" will permanently delete all its rows.`);
    }
  }

  for (const [name, afterTable] of afterTables) {
    const beforeTable = beforeTables.get(name);
    if (!beforeTable) continue;

    const beforeCols = new Map(beforeTable.columns.map((c) => [c.name, c]));
    const afterCols = new Map(afterTable.columns.map((c) => [c.name, c]));
    const columnDiffs: ColumnDiff[] = [];

    for (const [colName, col] of afterCols) {
      if (!beforeCols.has(colName)) {
        columnDiffs.push({ columnName: colName, changeType: 'ADDED', after: col });
        if (!col.isNullable && (col.defaultValue === undefined || col.defaultValue === null)) {
          destructiveWarnings.push(
            `Adding NOT NULL column "${name}.${colName}" without a default value may fail on non-empty tables.`,
          );
        }
      }
    }

    for (const [colName, col] of beforeCols) {
      if (!afterCols.has(colName)) {
        columnDiffs.push({ columnName: colName, changeType: 'DELETED', before: col });
        destructiveWarnings.push(
          `Dropping column "${name}.${colName}" will permanently delete data in that column.`,
        );
      }
    }

    for (const [colName, afterCol] of afterCols) {
      const beforeCol = beforeCols.get(colName);
      if (!beforeCol) continue;
      const changes = compareColumns(beforeCol, afterCol);
      if (changes.length > 0) {
        columnDiffs.push({
          columnName: colName,
          changeType: 'MODIFIED',
          before: beforeCol,
          after: afterCol,
          changes,
        });
        if (beforeCol.dataType !== afterCol.dataType) {
          destructiveWarnings.push(
            `Changing type of "${name}.${colName}" from ${beforeCol.dataType} to ${afterCol.dataType} may cause data truncation or cast errors.`,
          );
        }
      }
    }

    const beforeIdxNames = new Set(beforeTable.indexes.map((i) => i.name));
    const afterIdxNames = new Set(afterTable.indexes.map((i) => i.name));
    const indexChanges: string[] = [];
    for (const idx of afterTable.indexes) {
      if (!beforeIdxNames.has(idx.name)) indexChanges.push(`+ INDEX ${idx.name}`);
    }
    for (const idx of beforeTable.indexes) {
      if (!afterIdxNames.has(idx.name)) indexChanges.push(`- INDEX ${idx.name}`);
    }

    const beforeConNames = new Set(beforeTable.constraints.map((c) => c.name));
    const afterConNames = new Set(afterTable.constraints.map((c) => c.name));
    const constraintChanges: string[] = [];
    for (const con of afterTable.constraints) {
      if (!beforeConNames.has(con.name)) constraintChanges.push(`+ CONSTRAINT ${con.name}`);
    }
    for (const con of beforeTable.constraints) {
      if (!afterConNames.has(con.name)) constraintChanges.push(`- CONSTRAINT ${con.name}`);
    }

    if (columnDiffs.length > 0 || indexChanges.length > 0 || constraintChanges.length > 0) {
      modifiedTables.push({
        tableName: name,
        changeType: 'MODIFIED',
        before: beforeTable,
        after: afterTable,
        columnDiffs,
        indexChanges,
        constraintChanges,
      });
    }
  }

  const beforeRels = new Map(before.relationships.map((r) => [r.name, r]));
  const afterRels = new Map(after.relationships.map((r) => [r.name, r]));
  const relationshipDiffs: RelationshipDiff[] = [];

  for (const [name, rel] of afterRels) {
    if (!beforeRels.has(name)) {
      relationshipDiffs.push({ relationshipName: name, changeType: 'ADDED', after: rel });
    }
  }
  for (const [name, rel] of beforeRels) {
    if (!afterRels.has(name)) {
      relationshipDiffs.push({ relationshipName: name, changeType: 'DELETED', before: rel });
    }
  }

  const hasChanges =
    addedTables.length > 0 ||
    deletedTables.length > 0 ||
    modifiedTables.length > 0 ||
    relationshipDiffs.length > 0;

  return {
    hasChanges,
    addedTables,
    deletedTables,
    modifiedTables,
    relationshipDiffs,
    destructiveWarnings,
  };
}
