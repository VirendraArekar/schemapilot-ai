import { DatabaseEngine, PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { PROJECT_TEMPLATES } = (() => {
  try {
    return require('../dist/modules/templates/templates.data');
  } catch {
    return require('../src/modules/templates/templates.data');
  }
})();

const prisma = new PrismaClient();

const ENGINES: DatabaseEngine[] = ['POSTGRESQL', 'MYSQL', 'SQLSERVER', 'SQLITE', 'MONGODB'];
const DOMAINS = [
  'Core',
  'Analytics',
  'Staging',
  'Production',
  'Microservice',
  'Billing',
  'Reporting',
];

async function main() {
  const passwordHash = await bcrypt.hash('DemoPass123!', 12);

  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@schemapilot.ai' },
    update: {},
    create: {
      email: 'demo@schemapilot.ai',
      name: 'Alex Rivera',
      passwordHash,
      globalRole: 'SUPER_ADMIN',
      isEmailVerified: true,
    },
  });

  const workspace = await prisma.workspace.upsert({
    where: { slug: 'schemapilot-demo-ws' },
    update: {},
    create: {
      name: 'SchemaPilot Engineering',
      slug: 'schemapilot-demo-ws',
      description: 'Primary architecture workspace',
      ownerId: demoUser.id,
      members: {
        create: { userId: demoUser.id, role: 'OWNER', joinedAt: new Date() },
      },
      subscription: {
        create: {
          plan: 'PRO',
          monthlyAiQuota: 2000,
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      },
    },
  });

  const existingProjects = await prisma.project.findMany({
    where: { workspaceId: workspace.id, deletedAt: null },
    include: { schemas: { include: { _count: { select: { tables: true } } } } },
  });

  const targetTotal = 100;
  const toCreate = Math.max(0, targetTotal - existingProjects.length);

  // Backfill tables for any existing seeded projects that don't have relational tables yet
  for (let i = 0; i < existingProjects.length; i++) {
    const proj = existingProjects[i];
    const sch = proj.schemas[0];
    if (sch && sch._count.tables === 0) {
      const tpl = PROJECT_TEMPLATES[i % PROJECT_TEMPLATES.length];
      for (const tbl of tpl.schema.tables) {
        await prisma.schemaTable.create({
          data: {
            schemaId: sch.id,
            name: tbl.name,
            description: tbl.description,
            positionX: tbl.position?.x || 0,
            positionY: tbl.position?.y || 0,
            columns: {
              create: tbl.columns.map((c: any, idx: number) => ({
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
        await prisma.schemaRelationship.createMany({
          data: tpl.schema.relationships.map((r: any) => ({
            schemaId: sch.id,
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
    }
  }

  for (let i = 0; i < toCreate; i++) {
    const tpl = PROJECT_TEMPLATES[i % PROJECT_TEMPLATES.length];
    const engine = ENGINES[i % ENGINES.length];
    const domain = DOMAINS[i % DOMAINS.length];
    const num = existingProjects.length + i + 1;
    const projectName = `${tpl.name} ${domain} #${num}`;

    const project = await prisma.project.create({
      data: {
        workspaceId: workspace.id,
        createdById: demoUser.id,
        name: projectName,
        description: `[Sample #${num}] ${tpl.description}`,
        engine,
      },
    });

    const schemaSnapshot = {
      ...tpl.schema,
      name: `${projectName} Schema`,
      engine,
    };

    const dbSchema = await prisma.databaseSchema.create({
      data: {
        projectId: project.id,
        name: schemaSnapshot.name,
        description: tpl.description,
        engine,
        currentVersion: 1,
        versions: {
          create: {
            versionNumber: 1,
            commitMessage: `Initial seeded sample #${num}`,
            snapshotJson: schemaSnapshot as any,
            createdById: demoUser.id,
          },
        },
      },
    });

    for (const tbl of tpl.schema.tables) {
      await prisma.schemaTable.create({
        data: {
          schemaId: dbSchema.id,
          name: tbl.name,
          description: tbl.description,
          positionX: tbl.position?.x || 0,
          positionY: tbl.position?.y || 0,
          columns: {
            create: tbl.columns.map((c: any, idx: number) => ({
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
      await prisma.schemaRelationship.createMany({
        data: tpl.schema.relationships.map((r: any) => ({
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
  }

  // Ensure at least 100 ActivityLog, Notification, and AiUsage entries for dashboard & analytics testing
  const actCount = await prisma.activityLog.count({ where: { workspaceId: workspace.id } });
  if (actCount < 100) {
    const needed = 100 - actCount;
    await prisma.activityLog.createMany({
      data: Array.from({ length: needed }, (_, idx) => ({
        workspaceId: workspace.id,
        userId: demoUser.id,
        action: idx % 3 === 0 ? 'SCHEMA_UPDATED' : idx % 3 === 1 ? 'PROJECT_CREATED' : 'AI_GENERATED',
        entityType: 'SCHEMA',
        metadata: { sampleIndex: actCount + idx + 1 } as any,
      })),
    });
  }

  const aiCount = await prisma.aiUsage.count({ where: { userId: demoUser.id } });
  if (aiCount < 100) {
    const needed = 100 - aiCount;
    await prisma.aiUsage.createMany({
      data: Array.from({ length: needed }, (_, idx) => ({
        userId: demoUser.id,
        provider: 'gemini',
        model: 'gemini-3.8-flash',
        operation: idx % 2 === 0 ? 'GENERATE_SCHEMA' : 'EXPLAIN_SQL',
        promptTokens: 250 + (idx % 10) * 30,
        completionTokens: 600 + (idx % 12) * 45,
        totalTokens: 850 + (idx % 10) * 75,
        latencyMs: 700 + (idx % 8) * 90,
      })),
    });
  }

  const notifCount = await prisma.notification.count({ where: { userId: demoUser.id } });
  if (notifCount < 100) {
    const needed = 100 - notifCount;
    await prisma.notification.createMany({
      data: Array.from({ length: needed }, (_, idx) => ({
        userId: demoUser.id,
        title: `Schema Audit #${notifCount + idx + 1}`,
        message: `Sample notification #${notifCount + idx + 1} for workspace testing.`,
        type: 'INFO',
      })),
    });
  }

  console.log('Seed completed: 100 projects/ER diagrams, 100 activities, 100 AI usage logs, and 100 notifications ready.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
