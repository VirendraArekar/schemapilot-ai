export type DatabaseEngine = 'MYSQL' | 'POSTGRESQL' | 'SQLSERVER' | 'SQLITE' | 'MONGODB';

export type WorkspaceRole = 'SUPER_ADMIN' | 'OWNER' | 'ADMIN' | 'EDITOR' | 'VIEWER';

export type CanonicalDataType =
  | 'UUID'
  | 'INT'
  | 'BIGINT'
  | 'SMALLINT'
  | 'TINYINT'
  | 'DECIMAL'
  | 'FLOAT'
  | 'DOUBLE'
  | 'BOOLEAN'
  | 'VARCHAR'
  | 'CHAR'
  | 'TEXT'
  | 'LONGTEXT'
  | 'DATE'
  | 'TIME'
  | 'DATETIME'
  | 'TIMESTAMP'
  | 'JSON'
  | 'BLOB'
  | 'ENUM'
  | 'ARRAY'
  | 'OBJECT_ID';

export type RelationshipType = 'ONE_TO_ONE' | 'ONE_TO_MANY' | 'MANY_TO_MANY';

export type ReferentialAction = 'CASCADE' | 'SET_NULL' | 'RESTRICT' | 'NO_ACTION';

export type IndexType = 'BTREE' | 'HASH' | 'FULLTEXT' | 'GIN' | 'UNIQUE';

export type ConstraintType = 'PRIMARY_KEY' | 'UNIQUE' | 'CHECK' | 'FOREIGN_KEY' | 'NOT_NULL';

export interface SchemaColumn {
  id: string;
  name: string;
  dataType: CanonicalDataType;
  nativeType?: string;
  length?: number;
  precision?: number;
  scale?: number;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  isNullable: boolean;
  isUnique: boolean;
  isAutoIncrement?: boolean;
  defaultValue?: string | null;
  enumValues?: string[];
  checkExpression?: string;
  comment?: string;
  orderIndex?: number;
}

export interface SchemaIndex {
  id: string;
  name: string;
  columns: string[];
  isUnique: boolean;
  type: IndexType;
  whereClause?: string;
}

export interface SchemaConstraint {
  id: string;
  name: string;
  type: ConstraintType;
  columns: string[];
  expression?: string;
}

export interface SchemaTable {
  id: string;
  name: string;
  description?: string;
  group?: string;
  isSoftDelete?: boolean;
  isAudited?: boolean;
  isCollapsed?: boolean;
  position: {
    x: number;
    y: number;
  };
  columns: SchemaColumn[];
  indexes: SchemaIndex[];
  constraints: SchemaConstraint[];
}

export interface SchemaRelationship {
  id: string;
  name: string;
  sourceTable: string;
  sourceColumn: string;
  targetTable: string;
  targetColumn: string;
  type: RelationshipType;
  onDelete: ReferentialAction;
  onUpdate: ReferentialAction;
  isOptional?: boolean;
}

export interface SchemaEnum {
  name: string;
  values: string[];
  description?: string;
}

export interface SchemaView {
  name: string;
  query: string;
  description?: string;
}

export interface SchemaTrigger {
  name: string;
  tableName: string;
  timing: 'BEFORE' | 'AFTER';
  event: 'INSERT' | 'UPDATE' | 'DELETE';
  body: string;
}

export interface CanonicalSchema {
  id?: string;
  name: string;
  description?: string;
  engine: DatabaseEngine;
  version?: number;
  tables: SchemaTable[];
  relationships: SchemaRelationship[];
  enums?: SchemaEnum[];
  views?: SchemaView[];
  triggers?: SchemaTrigger[];
  metadata?: {
    namingConvention?: 'snake_case' | 'camelCase' | 'PascalCase';
    multiTenant?: boolean;
    softDelete?: boolean;
    auditFields?: boolean;
    notes?: string[];
  };
}

export type ValidationSeverity = 'error' | 'warning' | 'info';

export interface ValidationIssue {
  id: string;
  code: string;
  severity: ValidationSeverity;
  tableName?: string;
  columnName?: string;
  message: string;
  suggestion?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errorCount: number;
  warningCount: number;
  infoCount: number;
  issues: ValidationIssue[];
}

export interface ColumnDiff {
  columnName: string;
  changeType: 'ADDED' | 'DELETED' | 'MODIFIED';
  before?: SchemaColumn;
  after?: SchemaColumn;
  changes?: string[];
}

export interface TableDiff {
  tableName: string;
  changeType: 'ADDED' | 'DELETED' | 'MODIFIED';
  before?: SchemaTable;
  after?: SchemaTable;
  columnDiffs: ColumnDiff[];
  indexChanges: string[];
  constraintChanges: string[];
}

export interface RelationshipDiff {
  relationshipName: string;
  changeType: 'ADDED' | 'DELETED' | 'MODIFIED';
  before?: SchemaRelationship;
  after?: SchemaRelationship;
}

export interface SchemaDiff {
  hasChanges: boolean;
  addedTables: SchemaTable[];
  deletedTables: SchemaTable[];
  modifiedTables: TableDiff[];
  relationshipDiffs: RelationshipDiff[];
  destructiveWarnings: string[];
}

export interface AiGenerationOptions {
  prompt: string;
  engine: DatabaseEngine;
  applicationType?: string;
  normalization?: '1NF' | '2NF' | '3NF' | 'BCNF' | 'DENORMALIZED';
  namingConvention?: 'snake_case' | 'camelCase' | 'PascalCase';
  expectedVolume?: 'SMALL' | 'MEDIUM' | 'LARGE' | 'ENTERPRISE';
  scalability?: string;
  multiTenant?: boolean;
  softDelete?: boolean;
  auditLogging?: boolean;
  securityRequirements?: string;
}

export interface PerformanceIssue {
  id: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  category:
    | 'MISSING_INDEX'
    | 'COMPOSITE_INDEX'
    | 'REDUNDANT_INDEX'
    | 'DATA_TYPE'
    | 'NULLABILITY'
    | 'NORMALIZATION'
    | 'PARTITIONING'
    | 'FOREIGN_KEY';
  tableName: string;
  columnName?: string;
  title: string;
  explanation: string;
  recommendation: string;
  expectedBenefit: string;
  suggestedSql?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}
