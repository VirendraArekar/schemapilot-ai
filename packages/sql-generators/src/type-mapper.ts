import { CanonicalDataType, DatabaseEngine, SchemaColumn } from '@schemapilot/shared-types';

export function quoteIdentifier(name: string, engine: DatabaseEngine): string {
  switch (engine) {
    case 'MYSQL':
      return `\`${name.replace(/`/g, '``')}\``;
    case 'SQLSERVER':
      return `[${name.replace(/\]/g, ']]')}]`;
    case 'POSTGRESQL':
    case 'SQLITE':
    default:
      return `"${name.replace(/"/g, '""')}"`;
  }
}

export function mapDataType(col: SchemaColumn, engine: DatabaseEngine): string {
  const len = col.length ?? 255;
  const prec = col.precision ?? 12;
  const scale = col.scale ?? 2;

  const map: Record<DatabaseEngine, Record<CanonicalDataType, string>> = {
    MYSQL: {
      UUID: 'CHAR(36)',
      INT: 'INT',
      BIGINT: 'BIGINT',
      SMALLINT: 'SMALLINT',
      TINYINT: 'TINYINT',
      DECIMAL: `DECIMAL(${prec}, ${scale})`,
      FLOAT: 'FLOAT',
      DOUBLE: 'DOUBLE',
      BOOLEAN: 'TINYINT(1)',
      VARCHAR: `VARCHAR(${len})`,
      CHAR: `CHAR(${col.length ?? 1})`,
      TEXT: 'TEXT',
      LONGTEXT: 'LONGTEXT',
      DATE: 'DATE',
      TIME: 'TIME',
      DATETIME: 'DATETIME',
      TIMESTAMP: 'TIMESTAMP',
      JSON: 'JSON',
      BLOB: 'LONGBLOB',
      ENUM: col.enumValues?.length ? `ENUM(${col.enumValues.map((v) => `'${v}'`).join(', ')})` : 'VARCHAR(50)',
      ARRAY: 'JSON',
      OBJECT_ID: 'CHAR(24)',
    },
    POSTGRESQL: {
      UUID: 'UUID',
      INT: col.isAutoIncrement ? 'SERIAL' : 'INTEGER',
      BIGINT: col.isAutoIncrement ? 'BIGSERIAL' : 'BIGINT',
      SMALLINT: 'SMALLINT',
      TINYINT: 'SMALLINT',
      DECIMAL: `NUMERIC(${prec}, ${scale})`,
      FLOAT: 'REAL',
      DOUBLE: 'DOUBLE PRECISION',
      BOOLEAN: 'BOOLEAN',
      VARCHAR: `VARCHAR(${len})`,
      CHAR: `CHAR(${col.length ?? 1})`,
      TEXT: 'TEXT',
      LONGTEXT: 'TEXT',
      DATE: 'DATE',
      TIME: 'TIME',
      DATETIME: 'TIMESTAMP',
      TIMESTAMP: 'TIMESTAMPTZ',
      JSON: 'JSONB',
      BLOB: 'BYTEA',
      ENUM: `VARCHAR(64)`,
      ARRAY: 'TEXT[]',
      OBJECT_ID: 'CHAR(24)',
    },
    SQLSERVER: {
      UUID: 'UNIQUEIDENTIFIER',
      INT: 'INT',
      BIGINT: 'BIGINT',
      SMALLINT: 'SMALLINT',
      TINYINT: 'TINYINT',
      DECIMAL: `DECIMAL(${prec}, ${scale})`,
      FLOAT: 'REAL',
      DOUBLE: 'FLOAT',
      BOOLEAN: 'BIT',
      VARCHAR: `NVARCHAR(${len})`,
      CHAR: `NCHAR(${col.length ?? 1})`,
      TEXT: 'NVARCHAR(MAX)',
      LONGTEXT: 'NVARCHAR(MAX)',
      DATE: 'DATE',
      TIME: 'TIME',
      DATETIME: 'DATETIME2',
      TIMESTAMP: 'DATETIME2',
      JSON: 'NVARCHAR(MAX)',
      BLOB: 'VARBINARY(MAX)',
      ENUM: `NVARCHAR(64)`,
      ARRAY: 'NVARCHAR(MAX)',
      OBJECT_ID: 'NCHAR(24)',
    },
    SQLITE: {
      UUID: 'TEXT',
      INT: 'INTEGER',
      BIGINT: 'INTEGER',
      SMALLINT: 'INTEGER',
      TINYINT: 'INTEGER',
      DECIMAL: 'REAL',
      FLOAT: 'REAL',
      DOUBLE: 'REAL',
      BOOLEAN: 'INTEGER',
      VARCHAR: 'TEXT',
      CHAR: 'TEXT',
      TEXT: 'TEXT',
      LONGTEXT: 'TEXT',
      DATE: 'TEXT',
      TIME: 'TEXT',
      DATETIME: 'TEXT',
      TIMESTAMP: 'TEXT',
      JSON: 'TEXT',
      BLOB: 'BLOB',
      ENUM: 'TEXT',
      ARRAY: 'TEXT',
      OBJECT_ID: 'TEXT',
    },
    MONGODB: {
      UUID: 'string',
      INT: 'int',
      BIGINT: 'long',
      SMALLINT: 'int',
      TINYINT: 'int',
      DECIMAL: 'decimal',
      FLOAT: 'double',
      DOUBLE: 'double',
      BOOLEAN: 'bool',
      VARCHAR: 'string',
      CHAR: 'string',
      TEXT: 'string',
      LONGTEXT: 'string',
      DATE: 'date',
      TIME: 'string',
      DATETIME: 'date',
      TIMESTAMP: 'timestamp',
      JSON: 'object',
      BLOB: 'binData',
      ENUM: 'string',
      ARRAY: 'array',
      OBJECT_ID: 'objectId',
    },
  };

  return map[engine][col.dataType] || 'TEXT';
}
