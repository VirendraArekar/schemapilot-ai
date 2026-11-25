import { BadRequestException, Injectable } from '@nestjs/common';
import {
  CanonicalDataType,
  CanonicalSchema,
  DatabaseEngine,
  SchemaColumn,
  SchemaRelationship,
  SchemaTable,
} from '@schemapilot/shared-types';
import { autoLayoutTables } from '@schemapilot/schema-core';
import { validateSchema } from '@schemapilot/schema-validators';

export type ImportFormat =
  | 'SQL_DDL'
  | 'PRISMA'
  | 'JSON_SCHEMA'
  | 'MONGODB'
  | 'TYPEORM'
  | 'SEQUELIZE'
  | 'DRIZZLE';

@Injectable()
export class ImportExportService {
  private mapRawSqlType(raw: string): CanonicalDataType {
    const t = raw.toUpperCase();
    if (t.includes('UUID') || t.includes('UNIQUEIDENTIFIER')) return 'UUID';
    if (t.includes('BIGINT') || t.includes('BIGSERIAL')) return 'BIGINT';
    if (t.includes('SMALLINT')) return 'SMALLINT';
    if (t.includes('TINYINT(1)') || t === 'BIT' || t.includes('BOOL')) return 'BOOLEAN';
    if (t.includes('TINYINT')) return 'TINYINT';
    if (t.includes('INT') || t.includes('SERIAL')) return 'INT';
    if (t.includes('DECIMAL') || t.includes('NUMERIC')) return 'DECIMAL';
    if (t.includes('DOUBLE')) return 'DOUBLE';
    if (t.includes('FLOAT') || t.includes('REAL')) return 'FLOAT';
    if (t.includes('LONGTEXT')) return 'LONGTEXT';
    if (t.includes('TEXT')) return 'TEXT';
    if (t.includes('CHAR(')) return 'CHAR';
    if (t.includes('VARCHAR') || t.includes('NVARCHAR')) return 'VARCHAR';
    if (t.includes('TIMESTAMPTZ') || t.includes('TIMESTAMP')) return 'TIMESTAMP';
    if (t.includes('DATETIME')) return 'DATETIME';
    if (t.includes('DATE')) return 'DATE';
    if (t.includes('TIME')) return 'TIME';
    if (t.includes('JSON')) return 'JSON';
    if (t.includes('BLOB') || t.includes('BYTEA')) return 'BLOB';
    if (t.includes('ENUM')) return 'ENUM';
    return 'VARCHAR';
  }

  parseSqlDdl(sql: string, engine: DatabaseEngine = 'POSTGRESQL'): CanonicalSchema {
    const tables: SchemaTable[] = [];
    const relationships: SchemaRelationship[] = [];
    const tableRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?[`"[\]]?([\w.]+)[`"\]]?\s*\(([\s\S]*?)\)\s*(?:ENGINE=|;|$)/gi;

    let match: RegExpExecArray | null;
    let tSeq = 1;

    while ((match = tableRegex.exec(sql)) !== null) {
      const tableName = match[1].replace(/^.*\./, '');
      const body = match[2];
      const lines = body
        .split(/,\s*(?![^()]*\))/)
        .map((l) => l.trim())
        .filter(Boolean);

      const columns: SchemaColumn[] = [];
      let cSeq = 1;

      for (const line of lines) {
        const upper = line.toUpperCase();
        if (upper.startsWith('PRIMARY KEY')) {
          const pkMatch = line.match(/\(([^)]+)\)/);
          if (pkMatch) {
            const pkCols = pkMatch[1].split(',').map((s) => s.replace(/[`"[\]\s]/g, ''));
            for (const c of columns) {
              if (pkCols.includes(c.name)) c.isPrimaryKey = true;
            }
          }
          continue;
        }
        if (upper.startsWith('CONSTRAINT') || upper.startsWith('FOREIGN KEY')) {
          const fkMatch = line.match(
            /FOREIGN\s+KEY\s*\([`"[\]]?(\w+)[`"\]]?\)\s*REFERENCES\s+[`"[\]]?(\w+)[`"\]]?\s*\([`"[\]]?(\w+)[`"\]]?\)/i,
          );
          if (fkMatch) {
            const [, srcCol, tgtTbl, tgtCol] = fkMatch;
            const col = columns.find((c) => c.name === srcCol);
            if (col) col.isForeignKey = true;
            relationships.push({
              id: `rel_${relationships.length + 1}`,
              name: `fk_${tableName}_${srcCol}`,
              sourceTable: tableName,
              sourceColumn: srcCol,
              targetTable: tgtTbl,
              targetColumn: tgtCol,
              type: 'ONE_TO_MANY',
              onDelete: 'CASCADE',
              onUpdate: 'CASCADE',
            });
          }
          continue;
        }
        if (upper.startsWith('UNIQUE') || upper.startsWith('INDEX') || upper.startsWith('KEY') || upper.startsWith('CHECK')) {
          continue;
        }

        const colMatch = line.match(/^[`"[\]]?(\w+)[`"\]]?\s+([A-Za-z0-9_]+(?:\([^)]+\))?)(.*)$/i);
        if (colMatch) {
          const [, colName, rawType, rest] = colMatch;
          const restUpper = rest.toUpperCase();
          const lenMatch = rawType.match(/\((\d+)/);
          columns.push({
            id: `col_${tSeq}_${cSeq++}`,
            name: colName,
            dataType: this.mapRawSqlType(rawType),
            length: lenMatch ? parseInt(lenMatch[1], 10) : undefined,
            isPrimaryKey: restUpper.includes('PRIMARY KEY'),
            isForeignKey: false,
            isNullable: !restUpper.includes('NOT NULL') && !restUpper.includes('PRIMARY KEY'),
            isUnique: restUpper.includes('UNIQUE'),
            isAutoIncrement: restUpper.includes('AUTO_INCREMENT') || restUpper.includes('AUTOINCREMENT') || rawType.toUpperCase().includes('SERIAL'),
          });
        }
      }

      tables.push({
        id: `tbl_${tSeq++}`,
        name: tableName,
        position: { x: 0, y: 0 },
        columns,
        indexes: [],
        constraints: [],
      });
    }

    if (tables.length === 0) {
      throw new BadRequestException('No valid CREATE TABLE statements found in SQL input.');
    }

    return autoLayoutTables({
      name: 'Imported SQL Schema',
      engine,
      tables,
      relationships,
    });
  }

  parsePrismaSchema(content: string): CanonicalSchema {
    const tables: SchemaTable[] = [];
    const relationships: SchemaRelationship[] = [];
    const modelRegex = /model\s+(\w+)\s*\{([\s\S]*?)\}/g;
    let match: RegExpExecArray | null;
    let tSeq = 1;

    while ((match = modelRegex.exec(content)) !== null) {
      const modelName = match[1];
      const body = match[2];
      const columns: SchemaColumn[] = [];
      let cSeq = 1;

      for (const rawLine of body.split('\n')) {
        const line = rawLine.trim();
        if (!line || line.startsWith('//') || line.startsWith('@@')) continue;
        const fieldMatch = line.match(/^(\w+)\s+([A-Za-z0-9_]+)(\[\])?(\?)?(.*)$/);
        if (!fieldMatch) continue;
        const [, fieldName, fieldType, isArr, isOpt, attrs] = fieldMatch;
        if (isArr) continue; // relation list

        const relMatch = attrs.match(/@relation\([^)]*fields:\s*\[(\w+)\][^)]*references:\s*\[(\w+)\]/);
        if (relMatch) {
          relationships.push({
            id: `rel_${relationships.length + 1}`,
            name: `fk_${modelName}_${relMatch[1]}`,
            sourceTable: modelName,
            sourceColumn: relMatch[1],
            targetTable: fieldType,
            targetColumn: relMatch[2],
            type: 'ONE_TO_MANY',
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
          });
          continue;
        }

        const prismaTypeMap: Record<string, CanonicalDataType> = {
          String: attrs.includes('@db.Text') ? 'TEXT' : 'VARCHAR',
          Int: 'INT',
          BigInt: 'BIGINT',
          Float: 'FLOAT',
          Decimal: 'DECIMAL',
          Boolean: 'BOOLEAN',
          DateTime: 'TIMESTAMP',
          Json: 'JSON',
          Bytes: 'BLOB',
        };

        const mapped = prismaTypeMap[fieldType];
        if (!mapped) continue;

        columns.push({
          id: `col_${tSeq}_${cSeq++}`,
          name: fieldName,
          dataType: attrs.includes('uuid()') ? 'UUID' : mapped,
          length: mapped === 'VARCHAR' ? 255 : undefined,
          isPrimaryKey: attrs.includes('@id'),
          isForeignKey: false,
          isNullable: Boolean(isOpt),
          isUnique: attrs.includes('@unique'),
          isAutoIncrement: attrs.includes('autoincrement()'),
        });
      }

      tables.push({
        id: `tbl_${tSeq++}`,
        name: modelName,
        position: { x: 0, y: 0 },
        columns,
        indexes: [],
        constraints: [],
      });
    }

    if (tables.length === 0) {
      throw new BadRequestException('No valid Prisma models found.');
    }

    for (const rel of relationships) {
      const tbl = tables.find((t) => t.name === rel.sourceTable);
      const col = tbl?.columns.find((c) => c.name === rel.sourceColumn);
      if (col) col.isForeignKey = true;
    }

    return autoLayoutTables({
      name: 'Imported Prisma Schema',
      engine: 'POSTGRESQL',
      tables,
      relationships,
    });
  }

  parseJsonSchema(content: string): CanonicalSchema {
    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch {
      throw new BadRequestException('Invalid JSON Schema payload.');
    }

    const defs = parsed.definitions || parsed.$defs || (parsed.properties ? { [parsed.title || 'root']: parsed } : null);
    if (!defs) {
      throw new BadRequestException('JSON Schema must contain properties, definitions, or $defs.');
    }

    const tables: SchemaTable[] = [];
    let tSeq = 1;
    for (const [name, def] of Object.entries<any>(defs)) {
      const required = new Set<string>(def.required || []);
      const columns: SchemaColumn[] = Object.entries<any>(def.properties || {}).map(([prop, spec], idx) => ({
        id: `col_${tSeq}_${idx + 1}`,
        name: prop,
        dataType:
          spec.type === 'integer'
            ? 'INT'
            : spec.type === 'number'
              ? 'DECIMAL'
              : spec.type === 'boolean'
                ? 'BOOLEAN'
                : spec.type === 'array'
                  ? 'ARRAY'
                  : spec.type === 'object'
                    ? 'JSON'
                    : 'VARCHAR',
        length: spec.maxLength || (spec.type === 'string' ? 255 : undefined),
        isPrimaryKey: prop === 'id' || prop === '_id',
        isForeignKey: prop.endsWith('_id'),
        isNullable: !required.has(prop),
        isUnique: prop === 'id' || prop === 'email',
      }));

      tables.push({
        id: `tbl_${tSeq++}`,
        name,
        position: { x: 0, y: 0 },
        columns,
        indexes: [],
        constraints: [],
      });
    }

    return autoLayoutTables({
      name: parsed.title || 'Imported JSON Schema',
      engine: 'POSTGRESQL',
      tables,
      relationships: [],
    });
  }

  importSchema(format: ImportFormat, content: string, engine: DatabaseEngine = 'POSTGRESQL') {
    let schema: CanonicalSchema;
    if (format === 'PRISMA') {
      schema = this.parsePrismaSchema(content);
    } else if (format === 'JSON_SCHEMA') {
      schema = this.parseJsonSchema(content);
    } else if (format === 'SQL_DDL') {
      schema = this.parseSqlDdl(content, engine);
    } else {
      // Fallback: extract SQL-like or JSON-like definitions safely without executing anything
      try {
        schema = this.parseSqlDdl(content, engine);
      } catch {
        schema = this.parseJsonSchema(content);
      }
    }

    return {
      schema,
      validation: validateSchema(schema),
    };
  }

  generateDocumentation(schema: CanonicalSchema, format: 'MARKDOWN' | 'HTML' | 'JSON') {
    if (format === 'JSON') {
      return { format, content: JSON.stringify(schema, null, 2) };
    }

    const mdLines: string[] = [
      `# ${schema.name} — Database Documentation`,
      '',
      `**Target Engine:** \`${schema.engine}\`  `,
      `**Tables:** ${schema.tables.length}  `,
      `**Relationships:** ${schema.relationships.length}`,
      '',
      schema.description ? `> ${schema.description}\n` : '',
      '## Tables Overview',
      '',
      '| Table | Columns | Indexes | Description |',
      '| --- | ---: | ---: | --- |',
      ...schema.tables.map(
        (t) => `| \`${t.name}\` | ${t.columns.length} | ${t.indexes.length} | ${t.description || '—'} |`,
      ),
      '',
    ];

    for (const table of schema.tables) {
      mdLines.push(`## Table: \`${table.name}\``);
      if (table.description) mdLines.push(`\n${table.description}\n`);
      mdLines.push('');
      mdLines.push('| Column | Type | PK | FK | Nullable | Unique | Default |');
      mdLines.push('| --- | --- | :---: | :---: | :---: | :---: | --- |');
      for (const c of table.columns) {
        const typeStr = c.length ? `${c.dataType}(${c.length})` : c.dataType;
        mdLines.push(
          `| \`${c.name}\` | \`${typeStr}\` | ${c.isPrimaryKey ? '✓' : ''} | ${c.isForeignKey ? '✓' : ''} | ${c.isNullable ? 'YES' : 'NO'} | ${c.isUnique ? '✓' : ''} | ${c.defaultValue ?? '—'} |`,
        );
      }
      mdLines.push('');
    }

    if (schema.relationships.length > 0) {
      mdLines.push('## Relationships');
      mdLines.push('');
      mdLines.push('| Name | Source | Target | Type | On Delete |');
      mdLines.push('| --- | --- | --- | --- | --- |');
      for (const r of schema.relationships) {
        mdLines.push(
          `| \`${r.name}\` | \`${r.sourceTable}.${r.sourceColumn}\` | \`${r.targetTable}.${r.targetColumn}\` | ${r.type} | ${r.onDelete} |`,
        );
      }
    }

    const markdown = mdLines.join('\n');
    if (format === 'MARKDOWN') {
      return { format, content: markdown };
    }

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>${schema.name} - Schema Documentation</title>
<style>
  body { font-family: system-ui, -apple-system, sans-serif; max-width: 960px; margin: 2rem auto; padding: 0 1rem; color: #0f172a; line-height: 1.6; }
  table { border-collapse: collapse; width: 100%; margin: 1rem 0 2rem; font-size: 14px; }
  th, td { border: 1px solid #e2e8f0; padding: 8px 12px; text-align: left; }
  th { background: #f8fafc; font-weight: 600; }
  code { background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-size: 13px; }
  h1, h2 { border-bottom: 1px solid #e2e8f0; padding-bottom: 0.4rem; }
</style>
</head>
<body>
<pre style="white-space: pre-wrap; font-family: inherit;">${markdown.replace(/</g, '&lt;')}</pre>
</body>
</html>`;
    return { format, content: html };
  }
}
