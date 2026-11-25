import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CanonicalSchema, DatabaseEngine } from '@schemapilot/shared-types';
import { compareSchemas } from '@schemapilot/schema-core';
import { validateSchema } from '@schemapilot/schema-validators';
import { PrismaService } from '../../database/prisma.service';
import { WorkspacesService } from '../workspaces/workspaces.service';

@Injectable()
export class SchemasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workspacesService: WorkspacesService,
  ) {}

  toCanonical(dbSchema: any): CanonicalSchema {
    return {
      id: dbSchema.id,
      name: dbSchema.name,
      description: dbSchema.description || undefined,
      engine: dbSchema.engine as DatabaseEngine,
      version: dbSchema.currentVersion,
      metadata: (dbSchema.metadataJson as CanonicalSchema['metadata']) || undefined,
      tables: (dbSchema.tables || []).map((t: any) => ({
        id: t.id,
        name: t.name,
        description: t.description || undefined,
        group: t.groupName || undefined,
        isSoftDelete: t.isSoftDelete,
        isAudited: t.isAudited,
        position: { x: t.positionX || 0, y: t.positionY || 0 },
        columns: (t.columns || []).map((c: any) => ({
          id: c.id,
          name: c.name,
          dataType: c.dataType,
          length: c.length || undefined,
          precision: c.precision || undefined,
          scale: c.scale || undefined,
          isPrimaryKey: c.isPrimaryKey,
          isForeignKey: c.isForeignKey,
          isNullable: c.isNullable,
          isUnique: c.isUnique,
          isAutoIncrement: c.isAutoIncrement,
          defaultValue: c.defaultValue,
          enumValues: c.enumValues || undefined,
          checkExpression: c.checkExpression || undefined,
          comment: c.comment || undefined,
          orderIndex: c.orderIndex,
        })),
        indexes: (t.indexes || []).map((i: any) => ({
          id: i.id,
          name: i.name,
          columns: i.columnsJson || [],
          isUnique: i.isUnique,
          type: i.indexType || 'BTREE',
        })),
        constraints: (t.constraints || []).map((con: any) => ({
          id: con.id,
          name: con.name,
          type: con.constraintType,
          columns: con.columnsJson || [],
          expression: con.expression || undefined,
        })),
      })),
      relationships: (dbSchema.relationships || []).map((r: any) => ({
        id: r.id,
        name: r.name,
        sourceTable: r.sourceTable,
        sourceColumn: r.sourceColumn,
        targetTable: r.targetTable,
        targetColumn: r.targetColumn,
        type: r.type,
        onDelete: r.onDelete,
        onUpdate: r.onUpdate,
        isOptional: r.isOptional,
      })),
    };
  }

  async getSchema(userId: string, schemaId: string) {
    const dbSchema = await this.prisma.databaseSchema.findFirst({
      where: { id: schemaId, deletedAt: null },
      include: {
        project: true,
        tables: {
          include: {
            columns: { orderBy: { orderIndex: 'asc' } },
            indexes: true,
            constraints: true,
          },
        },
        relationships: true,
        versions: { orderBy: { versionNumber: 'desc' }, take: 30 },
      },
    });
    if (!dbSchema) throw new NotFoundException('Schema not found');
    await this.workspacesService.assertMembership(dbSchema.project.workspaceId, userId);
    const canonical = this.toCanonical(dbSchema);
    const validation = validateSchema(canonical);
    return {
      ...canonical,
      projectId: dbSchema.projectId,
      versions: dbSchema.versions,
      validation,
    };
  }

  async saveCanonicalSchema(
    userId: string,
    schemaId: string,
    canonical: CanonicalSchema,
    options: { commitMessage?: string; expectedVersion?: number } = {},
  ) {
    const existing = await this.prisma.databaseSchema.findFirst({
      where: { id: schemaId, deletedAt: null },
      include: { project: true },
    });
    if (!existing) throw new NotFoundException('Schema not found');
    await this.workspacesService.assertMembership(existing.project.workspaceId, userId, [
      'OWNER',
      'ADMIN',
      'EDITOR',
    ]);

    if (
      options.expectedVersion !== undefined &&
      options.expectedVersion !== existing.currentVersion
    ) {
      throw new ConflictException(
        `Version conflict: expected v${options.expectedVersion}, but current version is v${existing.currentVersion}. Please refresh before saving.`,
      );
    }

    const nextVersion = existing.currentVersion + 1;

    await this.prisma.$transaction(async (tx) => {
      await tx.schemaTable.deleteMany({ where: { schemaId } });
      await tx.schemaRelationship.deleteMany({ where: { schemaId } });

      for (const table of canonical.tables) {
        await tx.schemaTable.create({
          data: {
            schemaId,
            name: table.name,
            description: table.description,
            groupName: table.group,
            positionX: table.position?.x || 0,
            positionY: table.position?.y || 0,
            isSoftDelete: Boolean(table.isSoftDelete),
            isAudited: Boolean(table.isAudited),
            columns: {
              create: table.columns.map((col, idx) => ({
                name: col.name,
                dataType: col.dataType,
                length: col.length,
                precision: col.precision,
                scale: col.scale,
                isPrimaryKey: Boolean(col.isPrimaryKey),
                isForeignKey: Boolean(col.isForeignKey),
                isNullable: Boolean(col.isNullable),
                isUnique: Boolean(col.isUnique),
                isAutoIncrement: Boolean(col.isAutoIncrement),
                defaultValue: col.defaultValue ?? null,
                enumValues: col.enumValues ? (col.enumValues as any) : undefined,
                checkExpression: col.checkExpression,
                comment: col.comment,
                orderIndex: col.orderIndex ?? idx,
              })),
            },
            indexes: {
              create: (table.indexes || []).map((idx) => ({
                name: idx.name,
                columnsJson: idx.columns as any,
                isUnique: Boolean(idx.isUnique),
                indexType: idx.type || 'BTREE',
              })),
            },
            constraints: {
              create: (table.constraints || []).map((con) => ({
                name: con.name,
                constraintType: con.type,
                columnsJson: con.columns as any,
                expression: con.expression,
              })),
            },
          },
        });
      }

      if (canonical.relationships.length > 0) {
        await tx.schemaRelationship.createMany({
          data: canonical.relationships.map((r) => ({
            schemaId,
            name: r.name,
            sourceTable: r.sourceTable,
            sourceColumn: r.sourceColumn,
            targetTable: r.targetTable,
            targetColumn: r.targetColumn,
            type: r.type,
            onDelete: r.onDelete || 'CASCADE',
            onUpdate: r.onUpdate || 'CASCADE',
            isOptional: Boolean(r.isOptional),
          })),
        });
      }

      await tx.databaseSchema.update({
        where: { id: schemaId },
        data: {
          name: canonical.name || existing.name,
          description: canonical.description,
          engine: canonical.engine || existing.engine,
          currentVersion: nextVersion,
          metadataJson: canonical.metadata as any,
        },
      });

      await tx.schemaVersion.create({
        data: {
          schemaId,
          versionNumber: nextVersion,
          commitMessage: options.commitMessage || `Updated schema (v${nextVersion})`,
          snapshotJson: canonical as any,
          createdById: userId,
        },
      });

      await tx.activityLog.create({
        data: {
          workspaceId: existing.project.workspaceId,
          projectId: existing.projectId,
          userId,
          action: 'SCHEMA_UPDATED',
          entityType: 'SCHEMA',
          entityId: schemaId,
          metadata: { version: nextVersion, tableCount: canonical.tables.length },
        },
      });
    });

    return this.getSchema(userId, schemaId);
  }

  async restoreVersion(userId: string, schemaId: string, versionNumber: number) {
    const version = await this.prisma.schemaVersion.findUnique({
      where: { schemaId_versionNumber: { schemaId, versionNumber } },
    });
    if (!version) throw new NotFoundException('Schema version not found');
    return this.saveCanonicalSchema(userId, schemaId, version.snapshotJson as unknown as CanonicalSchema, {
      commitMessage: `Restored from v${versionNumber}`,
    });
  }

  validateInline(canonical: CanonicalSchema) {
    return validateSchema(canonical);
  }

  compare(before: CanonicalSchema, after: CanonicalSchema) {
    return compareSchemas(before, after);
  }
}
