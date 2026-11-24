import test from 'node:test';
import assert from 'node:assert/strict';
import { CanonicalSchema } from '@schemapilot/shared-types';
import { sortTablesByDependency, compareSchemas } from './index';

const baseSchema: CanonicalSchema = {
  name: 'TestDB',
  engine: 'POSTGRESQL',
  tables: [
    {
      id: 't2',
      name: 'orders',
      position: { x: 0, y: 0 },
      columns: [
        { id: 'c1', name: 'id', dataType: 'UUID', isPrimaryKey: true, isForeignKey: false, isNullable: false, isUnique: true },
        { id: 'c2', name: 'user_id', dataType: 'UUID', isPrimaryKey: false, isForeignKey: true, isNullable: false, isUnique: false },
      ],
      indexes: [],
      constraints: [],
    },
    {
      id: 't1',
      name: 'users',
      position: { x: 0, y: 0 },
      columns: [
        { id: 'c3', name: 'id', dataType: 'UUID', isPrimaryKey: true, isForeignKey: false, isNullable: false, isUnique: true },
        { id: 'c4', name: 'email', dataType: 'VARCHAR', length: 255, isPrimaryKey: false, isForeignKey: false, isNullable: false, isUnique: true },
      ],
      indexes: [],
      constraints: [],
    },
  ],
  relationships: [
    {
      id: 'r1',
      name: 'fk_orders_user',
      sourceTable: 'orders',
      sourceColumn: 'user_id',
      targetTable: 'users',
      targetColumn: 'id',
      type: 'ONE_TO_MANY',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
  ],
};

test('sortTablesByDependency places parent tables before child tables', () => {
  const result = sortTablesByDependency(baseSchema);
  assert.equal(result.hasCycles, false);
  assert.deepEqual(
    result.orderedTables.map((t) => t.name),
    ['users', 'orders'],
  );
});

test('compareSchemas detects added tables, modified columns, and destructive warnings', () => {
  const nextSchema: CanonicalSchema = {
    ...baseSchema,
    tables: [
      baseSchema.tables[1], // users (orders removed)
      {
        id: 't3',
        name: 'products',
        position: { x: 0, y: 0 },
        columns: [
          { id: 'c5', name: 'id', dataType: 'UUID', isPrimaryKey: true, isForeignKey: false, isNullable: false, isUnique: true },
        ],
        indexes: [],
        constraints: [],
      },
    ],
  };

  const diff = compareSchemas(baseSchema, nextSchema);
  assert.equal(diff.hasChanges, true);
  assert.equal(diff.addedTables.length, 1);
  assert.equal(diff.deletedTables.length, 1);
  assert.equal(diff.deletedTables[0].name, 'orders');
  assert.ok(diff.destructiveWarnings.some((w) => w.includes('orders')));
});
