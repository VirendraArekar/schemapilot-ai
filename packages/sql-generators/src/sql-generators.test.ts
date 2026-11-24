import test from 'node:test';
import assert from 'node:assert/strict';
import { CanonicalSchema } from '@schemapilot/shared-types';
import { compareSchemas } from '@schemapilot/schema-core';
import { generateSchemaCode, generateMigrationSql } from './index';

const sampleSchema: CanonicalSchema = {
  name: 'ShopDB',
  engine: 'POSTGRESQL',
  tables: [
    {
      id: 't1',
      name: 'users',
      position: { x: 0, y: 0 },
      columns: [
        { id: 'c1', name: 'id', dataType: 'UUID', isPrimaryKey: true, isForeignKey: false, isNullable: false, isUnique: true, defaultValue: 'UUID()' },
        { id: 'c2', name: 'email', dataType: 'VARCHAR', length: 255, isPrimaryKey: false, isForeignKey: false, isNullable: false, isUnique: true },
      ],
      indexes: [{ id: 'i1', name: 'idx_users_email', columns: ['email'], isUnique: true, type: 'UNIQUE' }],
      constraints: [],
    },
    {
      id: 't2',
      name: 'orders',
      position: { x: 300, y: 0 },
      columns: [
        { id: 'c3', name: 'id', dataType: 'UUID', isPrimaryKey: true, isForeignKey: false, isNullable: false, isUnique: true },
        { id: 'c4', name: 'user_id', dataType: 'UUID', isPrimaryKey: false, isForeignKey: true, isNullable: false, isUnique: false },
        { id: 'c5', name: 'total', dataType: 'DECIMAL', precision: 10, scale: 2, isPrimaryKey: false, isForeignKey: false, isNullable: false, isUnique: false },
      ],
      indexes: [{ id: 'i2', name: 'idx_orders_user_id', columns: ['user_id'], isUnique: false, type: 'BTREE' }],
      constraints: [],
    },
  ],
  relationships: [
    {
      id: 'r1',
      name: 'fk_orders_users',
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

test('generates PostgreSQL DDL with dependency ordering and sample inserts', () => {
  const sql = generateSchemaCode(sampleSchema, { includeSampleInserts: true });
  assert.ok(sql.includes('CREATE TABLE "users"'));
  assert.ok(sql.includes('CREATE TABLE "orders"'));
  assert.ok(sql.indexOf('CREATE TABLE "users"') < sql.indexOf('CREATE TABLE "orders"'));
  assert.ok(sql.includes('NUMERIC(10, 2)'));
  assert.ok(sql.includes('INSERT INTO "users"'));
});

test('generates MySQL, SQL Server, SQLite, and MongoDB outputs', () => {
  const mysqlSql = generateSchemaCode({ ...sampleSchema, engine: 'MYSQL' });
  assert.ok(mysqlSql.includes('CREATE TABLE `users`'));
  assert.ok(mysqlSql.includes('ENGINE=InnoDB'));

  const mssqlSql = generateSchemaCode({ ...sampleSchema, engine: 'SQLSERVER' });
  assert.ok(mssqlSql.includes('CREATE TABLE [users]'));
  assert.ok(mssqlSql.includes('UNIQUEIDENTIFIER'));

  const sqliteSql = generateSchemaCode({ ...sampleSchema, engine: 'SQLITE' });
  assert.ok(sqliteSql.includes('CREATE TABLE "users"'));

  const mongoJs = generateSchemaCode({ ...sampleSchema, engine: 'MONGODB' });
  assert.ok(mongoJs.includes('db.createCollection("users"'));
  assert.ok(mongoJs.includes('$jsonSchema'));
});

test('generates up and down migration SQL from diff', () => {
  const next: CanonicalSchema = {
    ...sampleSchema,
    tables: [
      {
        ...sampleSchema.tables[0],
        columns: [
          ...sampleSchema.tables[0].columns,
          { id: 'c9', name: 'phone', dataType: 'VARCHAR', length: 30, isPrimaryKey: false, isForeignKey: false, isNullable: true, isUnique: false },
        ],
      },
      sampleSchema.tables[1],
    ],
  };
  const diff = compareSchemas(sampleSchema, next);
  const mig = generateMigrationSql(diff, 'POSTGRESQL');
  assert.ok(mig.upSql.includes('ADD COLUMN "phone" VARCHAR(30) NULL'));
  assert.ok(mig.downSql.includes('DROP COLUMN "phone"'));
});
