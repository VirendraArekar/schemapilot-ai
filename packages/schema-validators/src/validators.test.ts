import test from 'node:test';
import assert from 'node:assert/strict';
import { CanonicalSchema } from '@schemapilot/shared-types';
import { validateSchema } from './index';

test('validateSchema catches missing PK, type mismatch, and unindexed FK', () => {
  const schema: CanonicalSchema = {
    name: 'BrokenDB',
    engine: 'MYSQL',
    tables: [
      {
        id: 't1',
        name: 'users',
        position: { x: 0, y: 0 },
        columns: [
          { id: 'c1', name: 'id', dataType: 'INT', isPrimaryKey: true, isForeignKey: false, isNullable: false, isUnique: true },
          { id: 'c2', name: 'email', dataType: 'VARCHAR', length: 255, isPrimaryKey: false, isForeignKey: false, isNullable: false, isUnique: false },
        ],
        indexes: [],
        constraints: [],
      },
      {
        id: 't2',
        name: 'logs',
        position: { x: 0, y: 0 },
        columns: [
          { id: 'c3', name: 'user_id', dataType: 'VARCHAR', length: 36, isPrimaryKey: false, isForeignKey: true, isNullable: false, isUnique: false },
        ],
        indexes: [],
        constraints: [],
      },
    ],
    relationships: [
      {
        id: 'r1',
        name: 'fk_logs_user',
        sourceTable: 'logs',
        sourceColumn: 'user_id',
        targetTable: 'users',
        targetColumn: 'id',
        type: 'ONE_TO_MANY',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
    ],
  };

  const res = validateSchema(schema);
  assert.equal(res.isValid, false);
  assert.ok(res.issues.some((i) => i.code === 'MISSING_PRIMARY_KEY'));
  assert.ok(res.issues.some((i) => i.code === 'DATA_TYPE_MISMATCH'));
  assert.ok(res.issues.some((i) => i.code === 'UNINDEXED_FOREIGN_KEY'));
  assert.ok(res.issues.some((i) => i.code === 'MISSING_UNIQUE_CONSTRAINT'));
});
