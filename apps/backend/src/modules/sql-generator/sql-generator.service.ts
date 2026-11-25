import { Injectable } from '@nestjs/common';
import { CanonicalSchema, DatabaseEngine, SchemaDiff } from '@schemapilot/shared-types';
import {
  generateMigrationSql,
  generateSchemaCode,
  SqlGenerationOptions,
} from '@schemapilot/sql-generators';

@Injectable()
export class SqlGeneratorService {
  generate(
    schema: CanonicalSchema,
    targetEngine?: DatabaseEngine,
    options?: SqlGenerationOptions,
  ) {
    const effectiveSchema: CanonicalSchema = targetEngine
      ? { ...schema, engine: targetEngine }
      : schema;
    const sql = generateSchemaCode(effectiveSchema, options);
    return {
      engine: effectiveSchema.engine,
      sql,
      tableCount: effectiveSchema.tables.length,
    };
  }

  generateMigration(diff: SchemaDiff, engine: DatabaseEngine) {
    return generateMigrationSql(diff, engine);
  }
}
