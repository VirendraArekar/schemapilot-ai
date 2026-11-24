import { DatabaseEngine, SchemaDiff } from '@schemapilot/shared-types';
import { generateRelationalSql } from './relational-generator';
import { mapDataType, quoteIdentifier } from './type-mapper';

export interface MigrationSqlPair {
  upSql: string;
  downSql: string;
  warnings: string[];
}

export function generateMigrationSql(diff: SchemaDiff, engine: DatabaseEngine): MigrationSqlPair {
  if (engine === 'MONGODB') {
    const upLines: string[] = ['// MongoDB Migration UP'];
    const downLines: string[] = ['// MongoDB Migration DOWN'];
    for (const t of diff.addedTables) {
      upLines.push(`db.createCollection("${t.name}");`);
      downLines.push(`db.${t.name}.drop();`);
    }
    for (const t of diff.deletedTables) {
      upLines.push(`db.${t.name}.drop();`);
      downLines.push(`db.createCollection("${t.name}");`);
    }
    return {
      upSql: upLines.join('\n'),
      downSql: downLines.join('\n'),
      warnings: diff.destructiveWarnings,
    };
  }

  const upLines: string[] = [`-- Migration UP (${engine})`];
  const downLines: string[] = [`-- Migration DOWN (${engine})`];

  if (diff.addedTables.length > 0) {
    upLines.push(
      generateRelationalSql(
        { name: 'migration', engine, tables: diff.addedTables, relationships: [] },
        { includeComments: false },
      ),
    );
    for (const t of [...diff.addedTables].reverse()) {
      downLines.push(`DROP TABLE IF EXISTS ${quoteIdentifier(t.name, engine)};`);
    }
  }

  for (const t of diff.deletedTables) {
    upLines.push(`DROP TABLE IF EXISTS ${quoteIdentifier(t.name, engine)};`);
    downLines.push(
      generateRelationalSql(
        { name: 'rollback', engine, tables: [t], relationships: [] },
        { includeComments: false },
      ),
    );
  }

  for (const mod of diff.modifiedTables) {
    const qTable = quoteIdentifier(mod.tableName, engine);
    for (const colDiff of mod.columnDiffs) {
      const qCol = quoteIdentifier(colDiff.columnName, engine);
      if (colDiff.changeType === 'ADDED' && colDiff.after) {
        const typeStr = mapDataType(colDiff.after, engine);
        const nullStr = colDiff.after.isNullable ? 'NULL' : 'NOT NULL';
        upLines.push(`ALTER TABLE ${qTable} ADD COLUMN ${qCol} ${typeStr} ${nullStr};`);
        downLines.push(`ALTER TABLE ${qTable} DROP COLUMN ${qCol};`);
      } else if (colDiff.changeType === 'DELETED' && colDiff.before) {
        upLines.push(`ALTER TABLE ${qTable} DROP COLUMN ${qCol};`);
        const typeStr = mapDataType(colDiff.before, engine);
        const nullStr = colDiff.before.isNullable ? 'NULL' : 'NOT NULL';
        downLines.push(`ALTER TABLE ${qTable} ADD COLUMN ${qCol} ${typeStr} ${nullStr};`);
      } else if (colDiff.changeType === 'MODIFIED' && colDiff.after && colDiff.before) {
        const afterType = mapDataType(colDiff.after, engine);
        const beforeType = mapDataType(colDiff.before, engine);
        if (engine === 'POSTGRESQL') {
          upLines.push(`ALTER TABLE ${qTable} ALTER COLUMN ${qCol} TYPE ${afterType};`);
          downLines.push(`ALTER TABLE ${qTable} ALTER COLUMN ${qCol} TYPE ${beforeType};`);
        } else if (engine === 'MYSQL') {
          upLines.push(`ALTER TABLE ${qTable} MODIFY COLUMN ${qCol} ${afterType};`);
          downLines.push(`ALTER TABLE ${qTable} MODIFY COLUMN ${qCol} ${beforeType};`);
        } else if (engine === 'SQLSERVER') {
          upLines.push(`ALTER TABLE ${qTable} ALTER COLUMN ${qCol} ${afterType};`);
          downLines.push(`ALTER TABLE ${qTable} ALTER COLUMN ${qCol} ${beforeType};`);
        } else {
          upLines.push(`-- SQLite requires table rebuild to alter column ${qTable}.${qCol} to ${afterType}`);
          downLines.push(`-- SQLite requires table rebuild to revert column ${qTable}.${qCol} to ${beforeType}`);
        }
      }
    }
  }

  for (const relDiff of diff.relationshipDiffs) {
    if (relDiff.changeType === 'ADDED' && relDiff.after) {
      const r = relDiff.after;
      upLines.push(
        `ALTER TABLE ${quoteIdentifier(r.sourceTable, engine)} ADD CONSTRAINT ${quoteIdentifier(r.name, engine)} FOREIGN KEY (${quoteIdentifier(r.sourceColumn, engine)}) REFERENCES ${quoteIdentifier(r.targetTable, engine)} (${quoteIdentifier(r.targetColumn, engine)});`,
      );
      downLines.push(
        `ALTER TABLE ${quoteIdentifier(r.sourceTable, engine)} DROP ${engine === 'MYSQL' ? 'FOREIGN KEY' : 'CONSTRAINT'} ${quoteIdentifier(r.name, engine)};`,
      );
    }
  }

  return {
    upSql: upLines.join('\n'),
    downSql: downLines.join('\n'),
    warnings: diff.destructiveWarnings,
  };
}
