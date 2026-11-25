import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseEngine } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { generateSecureToken, sha256 } from '../../common/utils/crypto.util';
import { PROJECT_TEMPLATES } from '../templates/templates.data';

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workspacesService: WorkspacesService,
  ) {}

  async listProjects(
    userId: string,
    query: { workspaceId?: string; search?: string; engine?: DatabaseEngine; page?: number; limit?: number },
  ) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 50));

    const memberships = await this.prisma.workspaceMember.findMany({
      where: { userId },
      select: { workspaceId: true },
    });
    const workspaceIds = memberships.map((m) => m.workspaceId);

    const where: any = {
      deletedAt: null,
      workspaceId: query.workspaceId && workspaceIds.includes(query.workspaceId)
        ? query.workspaceId
        : { in: workspaceIds },
    };

    if (query.engine) where.engine = query.engine;
    if (query.search) {
      where.OR = [
        { name: { contains: query.search } },
        { description: { contains: query.search } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.project.findMany({
        where,
        include: {
          workspace: { select: { id: true, name: true } },
          createdBy: { select: { id: true, name: true } },
          schemas: {
            where: { deletedAt: null },
            select: {
              id: true,
              name: true,
              engine: true,
              currentVersion: true,
              updatedAt: true,
              _count: { select: { tables: true } },
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.project.count({ where }),
    ]);

    return {
      items,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async createProject(
    userId: string,
    dto: { workspaceId?: string; name: string; description?: string; engine?: DatabaseEngine },
  ) {
    let workspaceId = dto.workspaceId;
    if (!workspaceId) {
      const firstWs = await this.prisma.workspaceMember.findFirst({ where: { userId } });
      if (!firstWs) throw new NotFoundException('No workspace found for user');
      workspaceId = firstWs.workspaceId;
    } else {
      await this.workspacesService.assertMembership(workspaceId, userId, ['OWNER', 'ADMIN', 'EDITOR']);
    }

    const engine = dto.engine || 'POSTGRESQL';

    return this.prisma.$transaction(async (tx) => {
      const project = await tx.project.create({
        data: {
          workspaceId: workspaceId!,
          createdById: userId,
          name: dto.name,
          description: dto.description,
          engine,
        },
      });

      const schema = await tx.databaseSchema.create({
        data: {
          projectId: project.id,
          name: `${dto.name} Schema`,
          engine,
          currentVersion: 1,
          versions: {
            create: {
              versionNumber: 1,
              commitMessage: 'Initial empty schema',
              createdById: userId,
              snapshotJson: { name: `${dto.name} Schema`, engine, tables: [], relationships: [] },
            },
          },
        },
      });

      await tx.activityLog.create({
        data: {
          workspaceId,
          projectId: project.id,
          userId,
          action: 'PROJECT_CREATED',
          entityType: 'PROJECT',
          entityId: project.id,
          metadata: { name: project.name, engine },
        },
      });

      return { ...project, schemas: [schema] };
    });
  }

  async getProject(userId: string, projectId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, deletedAt: null },
      include: {
        workspace: { select: { id: true, name: true } },
        schemas: {
          where: { deletedAt: null },
          include: {
            tables: {
              include: {
                columns: { orderBy: { orderIndex: 'asc' } },
                indexes: true,
                constraints: true,
              },
            },
            relationships: true,
            versions: { orderBy: { versionNumber: 'desc' }, take: 20 },
          },
        },
        comments: {
          include: { user: { select: { id: true, name: true, avatarUrl: true } } },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!project) throw new NotFoundException('Project not found');
    await this.workspacesService.assertMembership(project.workspaceId, userId);
    return project;
  }

  async updateProject(
    userId: string,
    projectId: string,
    dto: { name?: string; description?: string; engine?: DatabaseEngine; isPublic?: boolean },
  ) {
    const project = await this.prisma.project.findFirst({ where: { id: projectId, deletedAt: null } });
    if (!project) throw new NotFoundException('Project not found');
    await this.workspacesService.assertMembership(project.workspaceId, userId, ['OWNER', 'ADMIN', 'EDITOR']);

    return this.prisma.project.update({
      where: { id: projectId },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.engine !== undefined ? { engine: dto.engine } : {}),
        ...(dto.isPublic !== undefined ? { isPublic: dto.isPublic } : {}),
      },
    });
  }

  async createShareLink(userId: string, projectId: string) {
    const project = await this.prisma.project.findFirst({ where: { id: projectId, deletedAt: null } });
    if (!project) throw new NotFoundException('Project not found');
    await this.workspacesService.assertMembership(project.workspaceId, userId, ['OWNER', 'ADMIN', 'EDITOR']);
    const shareToken = project.shareToken || generateSecureToken(16);
    return this.prisma.project.update({
      where: { id: projectId },
      data: { isPublic: true, shareToken },
      select: { id: true, shareToken: true, isPublic: true },
    });
  }

  async deleteProject(userId: string, projectId: string) {
    const project = await this.prisma.project.findFirst({ where: { id: projectId, deletedAt: null } });
    if (!project) throw new NotFoundException('Project not found');
    await this.workspacesService.assertMembership(project.workspaceId, userId, ['OWNER', 'ADMIN']);
    await this.prisma.project.update({
      where: { id: projectId },
      data: { deletedAt: new Date() },
    });
    return { deleted: true };
  }

  async seedSampleProjects(userId: string, workspaceId?: string, count = 50) {
    let targetWsId = workspaceId;
    if (!targetWsId) {
      const firstWs = await this.prisma.workspaceMember.findFirst({ where: { userId } });
      if (!firstWs) throw new NotFoundException('No workspace found for user');
      targetWsId = firstWs.workspaceId;
    } else {
      await this.workspacesService.assertMembership(targetWsId, userId, ['OWNER', 'ADMIN', 'EDITOR']);
    }

    const engines: DatabaseEngine[] = ['POSTGRESQL', 'MYSQL', 'SQLSERVER', 'SQLITE', 'MONGODB'];
    const domains = ['Core', 'Analytics', 'Production', 'Billing', 'Portal', 'Mobile'];
    const totalToCreate = Math.min(100, Math.max(1, count));
    let created = 0;

    for (let i = 0; i < totalToCreate; i++) {
      const tpl = PROJECT_TEMPLATES[i % PROJECT_TEMPLATES.length];
      const engine = engines[i % engines.length];
      const domain = domains[i % domains.length];
      const num = i + 1;
      const name = `${tpl.name} ${domain} #${num}`;

      const proj = await this.prisma.project.create({
        data: {
          workspaceId: targetWsId,
          createdById: userId,
          name,
          description: `[Sample #${num}] ${tpl.description}`,
          engine,
        },
      });

      const snapshot = { ...tpl.schema, name: `${name} Schema`, engine };
      const dbSchema = await this.prisma.databaseSchema.create({
        data: {
          projectId: proj.id,
          name: snapshot.name,
          description: tpl.description,
          engine,
          currentVersion: 1,
          versions: {
            create: {
              versionNumber: 1,
              commitMessage: `Initial sample #${num}`,
              snapshotJson: snapshot as any,
              createdById: userId,
            },
          },
        },
      });

      for (const tbl of tpl.schema.tables) {
        await this.prisma.schemaTable.create({
          data: {
            schemaId: dbSchema.id,
            name: tbl.name,
            description: tbl.description,
            positionX: tbl.position?.x || 0,
            positionY: tbl.position?.y || 0,
            columns: {
              create: tbl.columns.map((c, idx) => ({
                name: c.name,
                dataType: c.dataType,
                length: c.length,
                isPrimaryKey: c.isPrimaryKey,
                isForeignKey: c.isForeignKey,
                isNullable: c.isNullable,
                isUnique: c.isUnique,
                defaultValue: c.defaultValue ?? null,
                orderIndex: idx,
              })),
            },
          },
        });
      }

      if (tpl.schema.relationships.length > 0) {
        await this.prisma.schemaRelationship.createMany({
          data: tpl.schema.relationships.map((r) => ({
            schemaId: dbSchema.id,
            name: r.name,
            sourceTable: r.sourceTable,
            sourceColumn: r.sourceColumn,
            targetTable: r.targetTable,
            targetColumn: r.targetColumn,
            type: r.type,
            onDelete: r.onDelete || 'CASCADE',
            onUpdate: r.onUpdate || 'CASCADE',
          })),
        });
      }

      const upSql = `-- Migration V1 for ${name}\n-- ${tpl.schema.tables.length} tables created`;
      await this.prisma.migration.create({
        data: {
          schemaId: dbSchema.id,
          versionTag: `V1_${num}`,
          name: `init_${tpl.slug}_${num}`,
          upSql,
          downSql: `-- Rollback V1 for ${name}`,
          checksum: sha256(upSql),
          status: 'APPLIED',
        },
      });

      await this.prisma.projectComment.create({
        data: {
          projectId: proj.id,
          userId,
          tableName: tpl.schema.tables[0]?.name,
          content: `Initial architecture review completed for ${name}.`,
        },
      });

      await this.prisma.activityLog.create({
        data: {
          workspaceId: targetWsId,
          projectId: proj.id,
          userId,
          action: 'PROJECT_CREATED',
          entityType: 'PROJECT',
          entityId: proj.id,
          metadata: { name, engine },
        },
      });

      created++;
    }

    return { created };
  }
}
