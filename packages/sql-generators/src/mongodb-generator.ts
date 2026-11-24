import { CanonicalSchema } from '@schemapilot/shared-types';
import { mapDataType } from './type-mapper';

export function generateMongoDbScript(schema: CanonicalSchema): string {
  const lines: string[] = [];
  const dbName = schema.name.toLowerCase().replace(/[^a-z0-9_]/g, '_') || 'schemapilot_db';

  lines.push(`// ============================================================`);
  lines.push(`// SchemaPilot AI - MongoDB Collection & Validator Definitions`);
  lines.push(`// Database: ${dbName}`);
  lines.push(`// ============================================================`);
  lines.push(`use('${dbName}');`);
  lines.push('');

  for (const table of schema.tables) {
    const requiredFields = table.columns
      .filter((c) => !c.isNullable && c.name !== '_id')
      .map((c) => c.name);

    const properties: Record<string, Record<string, unknown>> = {};
    for (const col of table.columns) {
      const prop: Record<string, unknown> = {
        bsonType: mapDataType(col, 'MONGODB'),
      };
      if (col.comment) prop.description = col.comment;
      if (col.enumValues?.length) prop.enum = col.enumValues;
      properties[col.name] = prop;
    }

    const rels = schema.relationships.filter((r) => r.sourceTable === table.name);
    if (rels.length > 0) {
      lines.push(`// Embedding / Reference Recommendations for "${table.name}":`);
      for (const rel of rels) {
        if (rel.type === 'ONE_TO_ONE') {
          lines.push(`// - Consider embedding "${rel.targetTable}" directly if accessed together, or reference via ${rel.sourceColumn}.`);
        } else {
          lines.push(`// - Reference "${rel.targetTable}" via "${rel.sourceColumn}" (1:N relationship).`);
        }
      }
    }

    lines.push(`db.createCollection("${table.name}", {`);
    lines.push(`  validator: {`);
    lines.push(`    $jsonSchema: ${JSON.stringify(
      {
        bsonType: 'object',
        required: requiredFields,
        properties,
      },
      null,
      6,
    ).replace(/\n/g, '\n    ')}`);
    lines.push(`  }`);
    lines.push(`});`);

    for (const idx of table.indexes) {
      const keys: Record<string, number> = {};
      for (const c of idx.columns) keys[c] = 1;
      lines.push(
        `db.${table.name}.createIndex(${JSON.stringify(keys)}, { name: "${idx.name}", unique: ${Boolean(idx.isUnique)} });`,
      );
    }

    for (const col of table.columns.filter((c) => c.isUnique && !c.isPrimaryKey)) {
      lines.push(`db.${table.name}.createIndex({ "${col.name}": 1 }, { unique: true });`);
    }

    lines.push('');
  }

  return lines.join('\n');
}
