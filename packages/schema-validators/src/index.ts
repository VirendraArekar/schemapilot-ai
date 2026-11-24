import { CanonicalSchema, ValidationIssue, ValidationResult } from '@schemapilot/shared-types';
import { sortTablesByDependency } from '@schemapilot/schema-core';

const VALID_DATA_TYPES = new Set([
  'UUID', 'INT', 'BIGINT', 'SMALLINT', 'TINYINT', 'DECIMAL', 'FLOAT', 'DOUBLE',
  'BOOLEAN', 'VARCHAR', 'CHAR', 'TEXT', 'LONGTEXT', 'DATE', 'TIME', 'DATETIME',
  'TIMESTAMP', 'JSON', 'BLOB', 'ENUM', 'ARRAY', 'OBJECT_ID',
]);

export function validateSchema(schema: CanonicalSchema): ValidationResult {
  const issues: ValidationIssue[] = [];
  let seq = 1;
  const nextId = () => `val_${seq++}`;

  const tableNames = new Set<string>();
  const tableMap = new Map(schema.tables.map((t) => [t.name, t]));

  for (const table of schema.tables) {
    if (!table.name.trim()) {
      issues.push({
        id: nextId(),
        code: 'EMPTY_TABLE_NAME',
        severity: 'error',
        tableName: table.name,
        message: 'Table name cannot be empty.',
      });
    } else if (tableNames.has(table.name)) {
      issues.push({
        id: nextId(),
        code: 'DUPLICATE_TABLE_NAME',
        severity: 'error',
        tableName: table.name,
        message: `Duplicate table name "${table.name}".`,
      });
    }
    tableNames.add(table.name);

    const hasPrimaryKey = table.columns.some((c) => c.isPrimaryKey);
    if (!hasPrimaryKey) {
      issues.push({
        id: nextId(),
        code: 'MISSING_PRIMARY_KEY',
        severity: 'warning',
        tableName: table.name,
        message: `Table "${table.name}" does not have a primary key.`,
        suggestion: 'Add an "id" primary key column for reliable row identity and replication.',
      });
    }

    const colNames = new Set<string>();
    for (const col of table.columns) {
      if (colNames.has(col.name)) {
        issues.push({
          id: nextId(),
          code: 'DUPLICATE_COLUMN_NAME',
          severity: 'error',
          tableName: table.name,
          columnName: col.name,
          message: `Duplicate column "${col.name}" in table "${table.name}".`,
        });
      }
      colNames.add(col.name);

      if (!VALID_DATA_TYPES.has(col.dataType)) {
        issues.push({
          id: nextId(),
          code: 'INVALID_DATA_TYPE',
          severity: 'error',
          tableName: table.name,
          columnName: col.name,
          message: `Invalid data type "${col.dataType}" on "${table.name}.${col.name}".`,
        });
      }

      if (col.dataType === 'VARCHAR' && (!col.length || col.length <= 0)) {
        issues.push({
          id: nextId(),
          code: 'MISSING_VARCHAR_LENGTH',
          severity: 'warning',
          tableName: table.name,
          columnName: col.name,
          message: `VARCHAR column "${table.name}.${col.name}" has no explicit length (defaults to 255).`,
          suggestion: 'Specify an explicit length such as 100 or 255.',
        });
      }

      if (['email', 'slug', 'username', 'sku', 'code'].includes(col.name.toLowerCase()) && !col.isUnique && !col.isPrimaryKey) {
        issues.push({
          id: nextId(),
          code: 'MISSING_UNIQUE_CONSTRAINT',
          severity: 'info',
          tableName: table.name,
          columnName: col.name,
          message: `Natural key "${table.name}.${col.name}" is not marked UNIQUE.`,
          suggestion: 'Consider adding a UNIQUE constraint to prevent duplicate values.',
        });
      }
    }

    // Check for repeating group columns (potential 1NF violation)
    const numberedCols = table.columns.filter((c) => /_[1-9]\d*$/.test(c.name) || /[a-z][1-9]$/.test(c.name));
    if (numberedCols.length >= 2) {
      issues.push({
        id: nextId(),
        code: 'NORMALIZATION_REPEATING_GROUP',
        severity: 'warning',
        tableName: table.name,
        message: `Table "${table.name}" has numbered columns (${numberedCols.map((c) => c.name).join(', ')}), which may indicate a 1NF violation.`,
        suggestion: 'Consider extracting repeating attributes into a child table.',
      });
    }
  }

  // Validate relationships & foreign keys
  for (const rel of schema.relationships) {
    const srcTable = tableMap.get(rel.sourceTable);
    const tgtTable = tableMap.get(rel.targetTable);

    if (!srcTable || !tgtTable) {
      issues.push({
        id: nextId(),
        code: 'INVALID_FOREIGN_KEY_TABLE',
        severity: 'error',
        tableName: rel.sourceTable,
        message: `Relationship "${rel.name}" references missing table (${rel.sourceTable} -> ${rel.targetTable}).`,
      });
      continue;
    }

    const srcCol = srcTable.columns.find((c) => c.name === rel.sourceColumn);
    const tgtCol = tgtTable.columns.find((c) => c.name === rel.targetColumn);

    if (!srcCol || !tgtCol) {
      issues.push({
        id: nextId(),
        code: 'INVALID_FOREIGN_KEY_COLUMN',
        severity: 'error',
        tableName: rel.sourceTable,
        columnName: rel.sourceColumn,
        message: `Relationship "${rel.name}" references missing column (${rel.sourceTable}.${rel.sourceColumn} -> ${rel.targetTable}.${rel.targetColumn}).`,
      });
      continue;
    }

    if (srcCol.dataType !== tgtCol.dataType) {
      issues.push({
        id: nextId(),
        code: 'DATA_TYPE_MISMATCH',
        severity: 'error',
        tableName: rel.sourceTable,
        columnName: rel.sourceColumn,
        message: `Foreign key "${rel.sourceTable}.${rel.sourceColumn}" (${srcCol.dataType}) does not match referenced column "${rel.targetTable}.${rel.targetColumn}" (${tgtCol.dataType}).`,
        suggestion: `Change "${rel.sourceColumn}" type to ${tgtCol.dataType}.`,
      });
    }

    const isIndexed =
      srcCol.isPrimaryKey ||
      srcCol.isUnique ||
      srcTable.indexes.some((idx) => idx.columns[0] === srcCol.name);

    if (!isIndexed) {
      issues.push({
        id: nextId(),
        code: 'UNINDEXED_FOREIGN_KEY',
        severity: 'warning',
        tableName: rel.sourceTable,
        columnName: rel.sourceColumn,
        message: `Foreign key "${rel.sourceTable}.${rel.sourceColumn}" is not indexed.`,
        suggestion: `Add an index on "${rel.sourceTable}(${rel.sourceColumn})" to speed up joins and cascading deletes.`,
      });
    }
  }

  // Check circular dependencies
  const topology = sortTablesByDependency(schema);
  if (topology.hasCycles) {
    issues.push({
      id: nextId(),
      code: 'CIRCULAR_DEPENDENCY',
      severity: 'warning',
      message: `Circular foreign key dependency detected involving: ${topology.cycleNodes.join(', ')}.`,
      suggestion: 'Break the cycle by making one relationship nullable or using a junction table.',
    });
  }

  const errorCount = issues.filter((i) => i.severity === 'error').length;
  const warningCount = issues.filter((i) => i.severity === 'warning').length;
  const infoCount = issues.filter((i) => i.severity === 'info').length;

  return {
    isValid: errorCount === 0,
    errorCount,
    warningCount,
    infoCount,
    issues,
  };
}
