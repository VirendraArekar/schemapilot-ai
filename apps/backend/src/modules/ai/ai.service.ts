import { BadRequestException, Injectable } from '@nestjs/common';
import {
  AiGenerationOptions,
  CanonicalSchema,
  DatabaseEngine,
  PerformanceIssue,
} from '@schemapilot/shared-types';
import { autoLayoutTables, compareSchemas } from '@schemapilot/schema-core';
import { validateSchema } from '@schemapilot/schema-validators';
import { PrismaService } from '../../database/prisma.service';
import { GeminiProvider } from './gemini.provider';

const SCHEMA_SYSTEM_PROMPT = `You are a Principal Database Architect.
Return ONLY valid JSON matching this exact TypeScript structure for a database-agnostic CanonicalSchema:
{
  "name": "string",
  "description": "string",
  "engine": "MYSQL | POSTGRESQL | SQLSERVER | SQLITE | MONGODB",
  "tables": [
    {
      "id": "t_1",
      "name": "snake_case_plural",
      "description": "string",
      "group": "Core | Billing | Auth | etc",
      "isSoftDelete": boolean,
      "isAudited": boolean,
      "position": { "x": 0, "y": 0 },
      "columns": [
        {
          "id": "c_1",
          "name": "string",
          "dataType": "UUID | INT | BIGINT | SMALLINT | TINYINT | DECIMAL | FLOAT | DOUBLE | BOOLEAN | VARCHAR | CHAR | TEXT | LONGTEXT | DATE | TIME | DATETIME | TIMESTAMP | JSON | BLOB | ENUM | ARRAY | OBJECT_ID",
          "length": number (optional, for VARCHAR/CHAR),
          "precision": number (optional, for DECIMAL),
          "scale": number (optional, for DECIMAL),
          "isPrimaryKey": boolean,
          "isForeignKey": boolean,
          "isNullable": boolean,
          "isUnique": boolean,
          "isAutoIncrement": boolean,
          "defaultValue": "string or null",
          "enumValues": ["string"] (if ENUM),
          "comment": "string"
        }
      ],
      "indexes": [
        { "id": "idx_1", "name": "idx_table_col", "columns": ["col"], "isUnique": boolean, "type": "BTREE | UNIQUE | FULLTEXT | GIN" }
      ],
      "constraints": [
        { "id": "chk_1", "name": "chk_name", "type": "CHECK | UNIQUE", "columns": ["col"], "expression": "col >= 0" }
      ]
    }
  ],
  "relationships": [
    {
      "id": "rel_1",
      "name": "fk_source_target",
      "sourceTable": "child_table_name",
      "sourceColumn": "fk_col",
      "targetTable": "parent_table_name",
      "targetColumn": "pk_col",
      "type": "ONE_TO_ONE | ONE_TO_MANY | MANY_TO_MANY",
      "onDelete": "CASCADE | SET_NULL | RESTRICT | NO_ACTION",
      "onUpdate": "CASCADE | RESTRICT | NO_ACTION"
    }
  ]
}
Rules:
- Every table MUST have a primary key.
- Every foreign key MUST have a corresponding index on the child table.
- Include timestamps (created_at, updated_at) and soft delete (deleted_at) when requested.
- Include junction tables for many-to-many relationships.`;

@Injectable()
export class AiService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gemini: GeminiProvider,
  ) {}

  private parseSchemaJson(raw: string, fallbackEngine: DatabaseEngine): CanonicalSchema {
    const cleaned = raw
      .trim()
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/, '');
    let parsed: CanonicalSchema;
    try {
      parsed = JSON.parse(cleaned) as CanonicalSchema;
    } catch {
      throw new BadRequestException('AI returned invalid JSON structure. Please try again.');
    }
    if (!parsed || !Array.isArray(parsed.tables)) {
      throw new BadRequestException('AI response did not contain a valid tables array.');
    }
    parsed.engine = parsed.engine || fallbackEngine;
    parsed.relationships = parsed.relationships || [];
    for (const t of parsed.tables) {
      t.indexes = t.indexes || [];
      t.constraints = t.constraints || [];
      t.columns = t.columns || [];
      t.position = t.position || { x: 0, y: 0 };
    }
    return autoLayoutTables(parsed);
  }

  private async recordUsage(
    userId: string,
    operation: string,
    res: { provider: string; model: string; promptTokens: number; completionTokens: number; totalTokens: number; latencyMs: number },
  ) {
    await this.prisma.aiUsage.create({
      data: {
        userId,
        provider: res.provider,
        model: res.model,
        operation,
        promptTokens: res.promptTokens,
        completionTokens: res.completionTokens,
        totalTokens: res.totalTokens,
        latencyMs: res.latencyMs,
      },
    });
  }

  async generateSchema(userId: string, options: AiGenerationOptions) {
    const userPrompt = [
      `Requirements: ${options.prompt}`,
      `Target Engine: ${options.engine}`,
      options.applicationType ? `Application Type: ${options.applicationType}` : '',
      options.normalization ? `Normalization: ${options.normalization}` : '',
      options.namingConvention ? `Naming Convention: ${options.namingConvention}` : '',
      options.expectedVolume ? `Expected Data Volume: ${options.expectedVolume}` : '',
      options.scalability ? `Scalability Notes: ${options.scalability}` : '',
      options.multiTenant ? 'Multi-tenant architecture: YES (include tenant_id / organization_id isolation).' : '',
      options.softDelete ? 'Soft delete support: YES (include deleted_at nullable timestamp).' : '',
      options.auditLogging ? 'Audit logging: YES (include created_by, updated_by, audit_logs table).' : '',
      options.securityRequirements ? `Security: ${options.securityRequirements}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    const res = await this.gemini.complete({
      systemPrompt: SCHEMA_SYSTEM_PROMPT,
      userPrompt,
      jsonMode: true,
      temperature: 0.2,
    });

    await this.recordUsage(userId, 'GENERATE_SCHEMA', res);
    const schema = this.parseSchemaJson(res.text, options.engine);
    const validation = validateSchema(schema);

    return {
      schema,
      validation,
      usage: {
        model: res.model,
        totalTokens: res.totalTokens,
        latencyMs: res.latencyMs,
      },
    };
  }

  async assistantModify(
    userId: string,
    schema: CanonicalSchema,
    instruction: string,
    projectId?: string,
    conversationId?: string,
  ) {
    const systemPrompt = `${SCHEMA_SYSTEM_PROMPT}
You are acting as an AI Database Assistant modifying an existing schema.
Return ONLY valid JSON with two keys:
{
  "explanation": "Concise markdown explanation of what changed and why",
  "schema": <the complete updated CanonicalSchema JSON>
}`;

    const userPrompt = `Current Schema:\n${JSON.stringify(schema)}\n\nUser Instruction:\n${instruction}`;

    const res = await this.gemini.complete({
      systemPrompt,
      userPrompt,
      jsonMode: true,
      temperature: 0.2,
    });

    await this.recordUsage(userId, 'ASSISTANT_MODIFY', res);

    const cleaned = res.text
      .trim()
      .replace(/^```json\s*/i, '')
      .replace(/\s*```$/, '');
    let parsed: { explanation: string; schema: CanonicalSchema };
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      throw new BadRequestException('AI assistant returned invalid JSON.');
    }

    const proposedSchema = autoLayoutTables({
      ...parsed.schema,
      engine: parsed.schema.engine || schema.engine,
      relationships: parsed.schema.relationships || [],
    });
    const diff = compareSchemas(schema, proposedSchema);

    let convId = conversationId;
    if (!convId) {
      const conv = await this.prisma.aiConversation.create({
        data: {
          userId,
          projectId: projectId || null,
          title: instruction.slice(0, 80),
        },
      });
      convId = conv.id;
    }

    await this.prisma.aiMessage.createMany({
      data: [
        { conversationId: convId, role: 'user', content: instruction, status: 'APPLIED' },
        {
          conversationId: convId,
          role: 'assistant',
          content: parsed.explanation,
          proposedDiff: diff as any,
          status: 'PROPOSED',
        },
      ],
    });

    return {
      conversationId: convId,
      explanation: parsed.explanation,
      proposedSchema,
      diff,
      validation: validateSchema(proposedSchema),
    };
  }

  async explainSql(userId: string, sql: string, engine: DatabaseEngine) {
    const res = await this.gemini.complete({
      systemPrompt:
        'You are a Senior Database Performance Engineer. Explain the provided SQL DDL/DML clearly and list concrete index/query optimization suggestions in markdown. Never claim benchmark numbers you did not measure.',
      userPrompt: `Engine: ${engine}\n\nSQL:\n${sql}`,
      jsonMode: false,
      temperature: 0.3,
    });
    await this.recordUsage(userId, 'EXPLAIN_SQL', res);
    return { explanation: res.text, model: res.model, totalTokens: res.totalTokens };
  }

  analyzePerformance(schema: CanonicalSchema): PerformanceIssue[] {
    const issues: PerformanceIssue[] = [];
    let seq = 1;
    const id = () => `perf_${seq++}`;

    for (const table of schema.tables) {
      // 1. Unindexed foreign keys
      const fkCols = table.columns.filter((c) => c.isForeignKey);
      for (const fk of fkCols) {
        const hasIdx =
          fk.isPrimaryKey ||
          fk.isUnique ||
          table.indexes.some((i) => i.columns[0] === fk.name);
        if (!hasIdx) {
          issues.push({
            id: id(),
            severity: 'HIGH',
            category: 'FOREIGN_KEY',
            tableName: table.name,
            columnName: fk.name,
            title: `Missing index on foreign key ${table.name}.${fk.name}`,
            explanation: `Foreign key "${fk.name}" has no supporting index, which can cause full table scans during joins and parent-row deletes.`,
            recommendation: `Create a B-Tree index on "${table.name}(${fk.name})".`,
            expectedBenefit: 'Faster JOIN lookups and faster ON DELETE CASCADE checks.',
            suggestedSql: `CREATE INDEX idx_${table.name}_${fk.name} ON ${table.name} (${fk.name});`,
          });
        }
      }

      // 2. Excessive nullable columns
      const nullableCount = table.columns.filter((c) => c.isNullable && !c.isPrimaryKey).length;
      if (table.columns.length >= 5 && nullableCount / table.columns.length > 0.65) {
        issues.push({
          id: id(),
          severity: 'MEDIUM',
          category: 'NULLABILITY',
          tableName: table.name,
          title: `High ratio of nullable columns in ${table.name}`,
          explanation: `${nullableCount} of ${table.columns.length} columns are nullable, which increases storage overhead and complicates application null checks.`,
          recommendation: 'Mark required business fields as NOT NULL with sensible defaults.',
          expectedBenefit: 'Stronger data integrity and slightly smaller row bitmaps.',
        });
      }

      // 3. Large VARCHAR without TEXT or overly wide VARCHAR
      for (const col of table.columns) {
        if (col.dataType === 'VARCHAR' && (col.length || 0) > 1000) {
          issues.push({
            id: id(),
            severity: 'LOW',
            category: 'DATA_TYPE',
            tableName: table.name,
            columnName: col.name,
            title: `Overly wide VARCHAR(${col.length}) on ${table.name}.${col.name}`,
            explanation: `Very wide VARCHAR columns can exceed inline row-size limits in MySQL/InnoDB.`,
            recommendation: `Use TEXT for long unstructured text or tighten VARCHAR length.`,
            expectedBenefit: 'More predictable row sizing and index key compatibility.',
          });
        }
      }

      // 4. Redundant single-column index covered by composite index
      for (const idx of table.indexes) {
        if (idx.columns.length === 1) {
          const covered = table.indexes.some(
            (other) => other.id !== idx.id && other.columns.length > 1 && other.columns[0] === idx.columns[0],
          );
          if (covered) {
            issues.push({
              id: id(),
              severity: 'MEDIUM',
              category: 'REDUNDANT_INDEX',
              tableName: table.name,
              columnName: idx.columns[0],
              title: `Redundant index ${idx.name} on ${table.name}`,
              explanation: `Single-column index "${idx.name}" on (${idx.columns[0]}) is a leftmost prefix of an existing composite index.`,
              recommendation: `Drop "${idx.name}" unless it enforces a distinct UNIQUE constraint.`,
              expectedBenefit: 'Reduced write amplification on INSERT/UPDATE/DELETE and lower index storage.',
              suggestedSql: `DROP INDEX ${idx.name};`,
            });
          }
        }
      }

      // 5. Partitioning candidate for append-heavy log/event tables
      if (/log|event|audit|history|transaction|ledger/i.test(table.name)) {
        const hasTimestamp = table.columns.some((c) => ['TIMESTAMP', 'DATETIME', 'DATE'].includes(c.dataType));
        if (hasTimestamp) {
          issues.push({
            id: id(),
            severity: 'LOW',
            category: 'PARTITIONING',
            tableName: table.name,
            title: `Time-series partitioning candidate: ${table.name}`,
            explanation: `Append-heavy tables like "${table.name}" grow unbounded over time.`,
            recommendation: 'Consider RANGE partitioning by month/quarter on created_at for efficient archival.',
            expectedBenefit: 'Instant partition pruning for date-range queries and fast old-data drops.',
          });
        }
      }
    }

    return issues;
  }
}
