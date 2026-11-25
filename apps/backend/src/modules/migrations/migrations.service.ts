import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CanonicalSchema, DatabaseEngine } from '@schemapilot/shared-types';
import { compareSchemas } from '@schemapilot/schema-core';
import { generateMigrationSql } from '@schemapilot/sql-generators';
import { PrismaService } from '../../database/prisma.service';
import { sha256 } from '../../common/utils/crypto.util';

@Injectable()
export class MigrationsService {
  constructor(private readonly prisma: PrismaService) {}

  async listMigrations(schemaId: string) {
    return this.prisma.migration.findMany({
      where: { schemaId },
      include: { executions: { orderBy: { executedAt: 'desc' }, take: 5 } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createMigrationFromDiff(
    schemaId: string,
    name: string,
    before: CanonicalSchema,
    after: CanonicalSchema,
  ) {
    const diff = compareSchemas(before, after);
    if (!diff.hasChanges) {
      throw new BadRequestException('No schema differences detected to generate a migration.');
    }
    const pair = generateMigrationSql(diff, after.engine as DatabaseEngine);
    const versionTag = `V${Date.now()}`;
    const checksum = sha256(pair.upSql);

    return this.prisma.migration.create({
      data: {
        schemaId,
        versionTag,
        name,
        upSql: pair.upSql,
        downSql: pair.downSql,
        checksum,
        status: 'PENDING',
        hasDestructive: pair.warnings.length > 0,
      },
    });
  }

  async executeMigration(
    migrationId: string,
    userId: string,
    direction: 'UP' | 'DOWN',
    confirmDestructive = false,
  ) {
    const mig = await this.prisma.migration.findUnique({ where: { id: migrationId } });
    if (!mig) throw new NotFoundException('Migration not found');

    if (mig.hasDestructive && !confirmDestructive) {
      throw new BadRequestException(
        'This migration contains potentially destructive operations. Explicit confirmation is required.',
      );
    }

    const nextStatus = direction === 'UP' ? 'APPLIED' : 'ROLLED_BACK';

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.migration.update({
        where: { id: migrationId },
        data: { status: nextStatus },
      });

      await tx.migrationExecution.create({
        data: {
          migrationId,
          direction,
          status: nextStatus,
          executedBy: userId,
          notes: `Marked ${nextStatus} (${direction}) with checksum ${mig.checksum.slice(0, 12)}`,
        },
      });

      return updated;
    });
  }
}
