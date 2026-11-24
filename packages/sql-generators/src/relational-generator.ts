import {
  CanonicalSchema,
  DatabaseEngine,
  SchemaColumn,
  SchemaTable,
} from '@schemapilot/shared-types';
import { sortTablesByDependency } from '@schemapilot/schema-core';
import { mapDataType, quoteIdentifier } from './type-mapper';

export interface SqlGenerationOptions {
  includeCreateDatabase?: boolean;
  includeDropStatements?: boolean;
  includeComments?: boolean;
  includeSampleInserts?: boolean;
  includeViewsAndTriggers?: boolean;
}

function formatDefault(defaultVal: string | null | undefined, col: SchemaColumn, engine: DatabaseEngine): string {
  if (defaultVal === undefined || defaultVal === null || defaultVal === '') return '';
  const upper = defaultVal.trim().toUpperCase();
  if (upper === 'CURRENT_TIMESTAMP' || upper === 'NOW()') {
    if (engine === 'SQLSERVER') return 'DEFAULT GETDATE()';
    if (engine === 'SQLITE') return 'DEFAULT CURRENT_TIMESTAMP';
    return 'DEFAULT CURRENT_TIMESTAMP';
  }
  if (upper === 'UUID()' || upper === 'GEN_RANDOM_UUID()') {
    if (engine === 'POSTGRESQL') return 'DEFAULT gen_random_uuid()';
    if (engine === 'SQLSERVER') return 'DEFAULT NEWID()';
    if (engine === 'MYSQL') return 'DEFAULT (UUID())';
    return '';
  }
  if (col.dataType === 'BOOLEAN') {
    if (engine === 'MYSQL' || engine === 'SQLITE' || engine === 'SQLSERVER') {
      return `DEFAULT ${upper === 'TRUE' || defaultVal === '1' ? '1' : '0'}`;
    }
    return `DEFAULT ${upper === 'TRUE' || defaultVal === '1' ? 'TRUE' : 'FALSE'}`;
  }
  if (!isNaN(Number(defaultVal))) {
    return `DEFAULT ${defaultVal}`;
  }
  if (defaultVal.startsWith("'") && defaultVal.endsWith("'")) {
    return `DEFAULT ${defaultVal}`;
  }
  return `DEFAULT '${defaultVal.replace(/'/g, "''")}'`;
}

function buildColumnDefinition(col: SchemaColumn, engine: DatabaseEngine, compositePk: boolean): string {
  const qCol = quoteIdentifier(col.name, engine);
  const sqlType = mapDataType(col, engine);
  const parts: string[] = [qCol, sqlType];

  if (col.isAutoIncrement) {
    if (engine === 'MYSQL') parts.push('AUTO_INCREMENT');
    if (engine === 'SQLSERVER') parts.push('IDENTITY(1,1)');
  }

  if (!col.isNullable) {
    parts.push('NOT NULL');
  } else if (engine !== 'SQLITE') {
    parts.push('NULL');
  }

  if (col.isPrimaryKey && !compositePk) {
    parts.push('PRIMARY KEY');
    if (engine === 'SQLITE' && col.isAutoIncrement) {
      parts.push('AUTOINCREMENT');
    }
  } else if (col.isUnique) {
    parts.push('UNIQUE');
  }

  const defClause = formatDefault(col.defaultValue, col, engine);
  if (defClause) parts.push(defClause);

  if (col.checkExpression) {
    parts.push(`CHECK (${col.checkExpression})`);
  }

  if (engine === 'MYSQL' && col.comment) {
    parts.push(`COMMENT '${col.comment.replace(/'/g, "''")}'`);
  }

  return parts.join(' ');
}

function buildSampleInsert(table: SchemaTable, engine: DatabaseEngine): string {
  const cols = table.columns.filter((c) => !c.isAutoIncrement);
  if (cols.length === 0) return '';
  const colNames = cols.map((c) => quoteIdentifier(c.name, engine)).join(', ');
  const values = cols.map((c) => {
    if (c.dataType === 'UUID') return `'00000000-0000-4000-8000-000000000001'`;
    if (['INT', 'BIGINT', 'SMALLINT', 'TINYINT'].includes(c.dataType)) return '1';
    if (['DECIMAL', 'FLOAT', 'DOUBLE'].includes(c.dataType)) return '99.99';
    if (c.dataType === 'BOOLEAN') return engine === 'POSTGRESQL' ? 'TRUE' : '1';
    if (c.dataType === 'DATE') return `'2026-01-15'`;
    if (['DATETIME', 'TIMESTAMP'].includes(c.dataType)) return `'2026-01-15 10:00:00'`;
    if (c.dataType === 'JSON') return `'{}'`;
    if (c.dataType === 'ENUM' && c.enumValues?.length) return `'${c.enumValues[0]}'`;
    return `'sample_${c.name}'`;
  });
  return `INSERT INTO ${quoteIdentifier(table.name, engine)} (${colNames}) VALUES (${values.join(', ')});`;
}

export function generateRelationalSql(
  schema: CanonicalSchema,
  options: SqlGenerationOptions = {},
): string {
  const engine: DatabaseEngine = schema.engine === 'MONGODB' ? 'POSTGRESQL' : schema.engine;
  const { orderedTables } = sortTablesByDependency(schema);
  const lines: string[] = [];

  const dbSlug = schema.name.toLowerCase().replace(/[^a-z0-9_]/g, '_') || 'schemapilot_db';

  lines.push(`-- ============================================================`);
  lines.push(`-- SchemaPilot AI Generated SQL`);
  lines.push(`-- Schema: ${schema.name}`);
  lines.push(`-- Engine: ${engine}`);
  lines.push(`-- Tables: ${orderedTables.length}`);
  lines.push(`-- ============================================================`);
  lines.push('');

  if (options.includeCreateDatabase && engine !== 'SQLITE') {
    if (engine === 'MYSQL') {
      lines.push(`CREATE DATABASE IF NOT EXISTS ${quoteIdentifier(dbSlug, engine)} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
      lines.push(`USE ${quoteIdentifier(dbSlug, engine)};`);
    } else if (engine === 'POSTGRESQL') {
      lines.push(`-- CREATE DATABASE ${quoteIdentifier(dbSlug, engine)};`);
    } else if (engine === 'SQLSERVER') {
      lines.push(`IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = '${dbSlug}') CREATE DATABASE ${quoteIdentifier(dbSlug, engine)};`);
      lines.push(`GO`);
    }
    lines.push('');
  }

  if (options.includeDropStatements) {
    lines.push(`-- Drop existing tables in reverse dependency order`);
    for (const table of [...orderedTables].reverse()) {
      const qTable = quoteIdentifier(table.name, engine);
      if (engine === 'SQLSERVER') {
        lines.push(`DROP TABLE IF EXISTS ${qTable};`);
      } else {
        lines.push(`DROP TABLE IF EXISTS ${qTable}${engine === 'POSTGRESQL' ? ' CASCADE' : ''};`);
      }
    }
    lines.push('');
  }

  for (const table of orderedTables) {
    const qTable = quoteIdentifier(table.name, engine);
    if (options.includeComments !== false && table.description) {
      lines.push(`-- ${table.description}`);
    }

    const pkCols = table.columns.filter((c) => c.isPrimaryKey);
    const compositePk = pkCols.length > 1;
    const bodyLines: string[] = table.columns.map((col) =>
      `  ${buildColumnDefinition(col, engine, compositePk)}`,
    );

    if (compositePk) {
      const pkList = pkCols.map((c) => quoteIdentifier(c.name, engine)).join(', ');
      bodyLines.push(`  PRIMARY KEY (${pkList})`);
    }

    // Table-level check/unique constraints
    for (const con of table.constraints) {
      if (con.type === 'CHECK' && con.expression) {
        bodyLines.push(`  CONSTRAINT ${quoteIdentifier(con.name, engine)} CHECK (${con.expression})`);
      } else if (con.type === 'UNIQUE' && con.columns.length > 0) {
        const cols = con.columns.map((c) => quoteIdentifier(c, engine)).join(', ');
        bodyLines.push(`  CONSTRAINT ${quoteIdentifier(con.name, engine)} UNIQUE (${cols})`);
      }
    }

    // Foreign keys belonging to this table
    const tableRels = schema.relationships.filter((r) => r.sourceTable === table.name);
    for (const rel of tableRels) {
      const fkName = quoteIdentifier(rel.name, engine);
      const srcCol = quoteIdentifier(rel.sourceColumn, engine);
      const tgtTbl = quoteIdentifier(rel.targetTable, engine);
      const tgtCol = quoteIdentifier(rel.targetColumn, engine);
      const onDel = rel.onDelete.replace('_', ' ');
      const onUpd = rel.onUpdate.replace('_', ' ');
      if (engine === 'SQLSERVER') {
        bodyLines.push(
          `  CONSTRAINT ${fkName} FOREIGN KEY (${srcCol}) REFERENCES ${tgtTbl} (${tgtCol}) ON DELETE ${onDel}`,
        );
      } else {
        bodyLines.push(
          `  CONSTRAINT ${fkName} FOREIGN KEY (${srcCol}) REFERENCES ${tgtTbl} (${tgtCol}) ON DELETE ${onDel} ON UPDATE ${onUpd}`,
        );
      }
    }

    const suffix = engine === 'MYSQL' ? ' ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;' : ';';
    lines.push(`CREATE TABLE ${qTable} (`);
    lines.push(bodyLines.join(',\n'));
    lines.push(`)${suffix}`);

    // Indexes
    for (const idx of table.indexes) {
      const idxName = quoteIdentifier(idx.name, engine);
      const idxCols = idx.columns.map((c) => quoteIdentifier(c, engine)).join(', ');
      const uniqueKw = idx.isUnique || idx.type === 'UNIQUE' ? 'UNIQUE ' : '';
      if (engine === 'POSTGRESQL' && idx.type === 'GIN') {
        lines.push(`CREATE INDEX ${idxName} ON ${qTable} USING GIN (${idxCols});`);
      } else {
        lines.push(`CREATE ${uniqueKw}INDEX ${idxName} ON ${qTable} (${idxCols});`);
      }
    }

    lines.push('');
  }

  if (options.includeViewsAndTriggers !== false && schema.views?.length) {
    lines.push(`-- Views`);
    for (const v of schema.views) {
      lines.push(`CREATE OR REPLACE VIEW ${quoteIdentifier(v.name, engine)} AS\n${v.query};`);
      lines.push('');
    }
  }

  if (options.includeSampleInserts) {
    lines.push(`-- Sample Seed Inserts`);
    for (const table of orderedTables) {
      const ins = buildSampleInsert(table, engine);
      if (ins) lines.push(ins);
    }
    lines.push('');
  }

  return lines.join('\n');
}
