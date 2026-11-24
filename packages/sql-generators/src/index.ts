import { CanonicalSchema } from '@schemapilot/shared-types';
import { generateRelationalSql, SqlGenerationOptions } from './relational-generator';
import { generateMongoDbScript } from './mongodb-generator';

export * from './type-mapper';
export * from './relational-generator';
export * from './mongodb-generator';
export * from './migration-generator';

export function generateSchemaCode(
  schema: CanonicalSchema,
  options: SqlGenerationOptions = {},
): string {
  if (schema.engine === 'MONGODB') {
    return generateMongoDbScript(schema);
  }
  return generateRelationalSql(schema, options);
}
