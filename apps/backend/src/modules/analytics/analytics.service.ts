import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboardStats(userId: string) {
    const memberships = await this.prisma.workspaceMember.findMany({
      where: { userId },
      select: { workspaceId: true },
    });
    const workspaceIds = memberships.map((m) => m.workspaceId);

    const [
      totalProjects,
      totalSchemas,
      totalTables,
      aiUsageCount,
      recentProjects,
      recentActivity,
      engineGroups,
      aiUsageHistory,
      notifications,
    ] = await Promise.all([
      this.prisma.project.count({ where: { workspaceId: { in: workspaceIds }, deletedAt: null } }),
      this.prisma.databaseSchema.count({
        where: { project: { workspaceId: { in: workspaceIds }, deletedAt: null }, deletedAt: null },
      }),
      this.prisma.schemaTable.count({
        where: { schema: { project: { workspaceId: { in: workspaceIds }, deletedAt: null } } },
      }),
      this.prisma.aiUsage.count({ where: { userId } }),
      this.prisma.project.findMany({
        where: { workspaceId: { in: workspaceIds }, deletedAt: null },
        include: {
          schemas: { select: { id: true, name: true, engine: true, currentVersion: true, updatedAt: true } },
        },
        orderBy: { updatedAt: 'desc' },
        take: 50,
      }),
      this.prisma.activityLog.findMany({
        where: { workspaceId: { in: workspaceIds } },
        include: { user: { select: { id: true, name: true } }, project: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      this.prisma.project.groupBy({
        by: ['engine'],
        where: { workspaceId: { in: workspaceIds }, deletedAt: null },
        _count: { engine: true },
      }),
      this.prisma.aiUsage.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
    ]);

    return {
      summary: {
        totalProjects,
        totalSchemas,
        totalTables,
        aiGenerations: aiUsageCount,
      },
      engineDistribution: engineGroups.map((g) => ({
        engine: g.engine,
        count: g._count.engine,
      })),
      recentProjects,
      recentActivity,
      aiUsageHistory,
      notifications,
    };
  }

  async markNotificationRead(userId: string, notificationId: string) {
    return this.prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { isRead: true },
    });
  }

  async getAdminOverview() {
    const [totalUsers, totalWorkspaces, totalProjects, totalAiCalls] = await Promise.all([
      this.prisma.user.count({ where: { deletedAt: null } }),
      this.prisma.workspace.count({ where: { deletedAt: null } }),
      this.prisma.project.count({ where: { deletedAt: null } }),
      this.prisma.aiUsage.count(),
    ]);
    const recentUsers = await this.prisma.user.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true, email: true, globalRole: true, isEmailVerified: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    return { totalUsers, totalWorkspaces, totalProjects, totalAiCalls, recentUsers };
  }
}
