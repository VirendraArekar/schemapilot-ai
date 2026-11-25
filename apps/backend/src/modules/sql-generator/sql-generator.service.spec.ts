import { Test } from '@nestjs/testing';
import { SqlGeneratorService } from './sql-generator.service';
import { CanonicalSchema } from '@schemapilot/shared-types';

describe('SqlGeneratorService', () => {
  let service: SqlGeneratorService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [SqlGeneratorService],
    }).compile();
    service = moduleRef.get(SqlGeneratorService);
  });

  it('generates target engine SQL even when schema default engine differs', () => {
    const schema: CanonicalSchema = {
      name: 'App',
      engine: 'MYSQL',
      tables: [
        {
          id: 't1',
          name: 'items',
          position: { x: 0, y: 0 },
          columns: [
            { id: 'c1', name: 'id', dataType: 'UUID', isPrimaryKey: true, isForeignKey: false, isNullable: false, isUnique: true },
          ],
          indexes: [],
          constraints: [],
        },
      ],
      relationships: [],
    };

    const pg = service.generate(schema, 'POSTGRESQL');
    expect(pg.engine).toBe('POSTGRESQL');
    expect(pg.sql).toContain('CREATE TABLE "items"');

    const mongo = service.generate(schema, 'MONGODB');
    expect(mongo.engine).toBe('MONGODB');
    expect(mongo.sql).toContain('db.createCollection("items"');
  });
});
