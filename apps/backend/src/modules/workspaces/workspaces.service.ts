import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { WorkspaceRole } from '@prisma/client';
import { generateSecureToken, sha256 } from '../../common/utils/crypto.util';

@Injectable()
export class WorkspacesService {
  constructor(private readonly prisma: PrismaService) {}

  async listUserWorkspaces(userId: string) {
    const memberships = await this.prisma.workspaceMember.findMany({
      where: { userId, workspace: { deletedAt: null } },
      include: {
        workspace: {
          include: {
            subscription: true,
            _count: { select: { projects: true, members: true } },
          },
        },
      },
    });
    return memberships.map((m) => ({
      ...m.workspace,
      myRole: m.role,
    }));
  }

  async createWorkspace(userId: string, name: string, description?: string) {
    const slugBase = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'ws';
    const slug = `${slugBase}-${Date.now().toString(36)}`;
    return this.prisma.workspace.create({
      data: {
        name,
        slug,
        description,
        ownerId: userId,
        members: {
          create: { userId, role: 'OWNER', joinedAt: new Date() },
        },
        subscription: {
          create: {
            plan: 'FREE',
            monthlyAiQuota: 100,
            currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
        },
      },
      include: { subscription: true, _count: { select: { projects: true, members: true } } },
    });
  }

  async assertMembership(workspaceId: string, userId: string, allowedRoles?: WorkspaceRole[]) {
    const member = await this.prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
    });
    if (!member) {
      throw new ForbiddenException('You do not have access to this workspace');
    }
    if (allowedRoles && !allowedRoles.includes(member.role)) {
      throw new ForbiddenException('Insufficient workspace role');
    }
    return member;
  }

  async getWorkspaceDetails(workspaceId: string, userId: string) {
    await this.assertMembership(workspaceId, userId);
    const ws = await this.prisma.workspace.findFirst({
      where: { id: workspaceId, deletedAt: null },
      include: {
        members: {
          include: {
            user: { select: { id: true, name: true, email: true, avatarUrl: true } },
          },
        },
        subscription: true,
        apiKeys: {
          select: { id: true, name: true, prefix: true, createdAt: true, lastUsedAt: true },
        },
      },
    });
    if (!ws) throw new NotFoundException('Workspace not found');
    return ws;
  }

  async inviteMember(workspaceId: string, actorId: string, email: string, role: WorkspaceRole) {
    await this.assertMembership(workspaceId, actorId, ['OWNER', 'ADMIN']);
    const target = await this.prisma.user.findFirst({
      where: { email: email.toLowerCase(), deletedAt: null },
    });
    if (!target) {
      throw new NotFoundException('No registered user found with that email');
    }
    return this.prisma.workspaceMember.upsert({
      where: { workspaceId_userId: { workspaceId, userId: target.id } },
      update: { role },
      create: { workspaceId, userId: target.id, role, joinedAt: new Date() },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
  }

  async updateMemberRole(workspaceId: string, actorId: string, memberUserId: string, role: WorkspaceRole) {
    await this.assertMembership(workspaceId, actorId, ['OWNER', 'ADMIN']);
    return this.prisma.workspaceMember.update({
      where: { workspaceId_userId: { workspaceId, userId: memberUserId } },
      data: { role },
    });
  }

  async removeMember(workspaceId: string, actorId: string, memberUserId: string) {
    await this.assertMembership(workspaceId, actorId, ['OWNER', 'ADMIN']);
    await this.prisma.workspaceMember.delete({
      where: { workspaceId_userId: { workspaceId, userId: memberUserId } },
    });
    return { removed: true };
  }

  async createApiKey(workspaceId: string, userId: string, name: string) {
    await this.assertMembership(workspaceId, userId, ['OWNER', 'ADMIN']);
    const rawKey = `sp_live_${generateSecureToken(24)}`;
    const record = await this.prisma.apiKey.create({
      data: {
        userId,
        workspaceId,
        name,
        keyHash: sha256(rawKey),
        prefix: rawKey.slice(0, 14),
      },
    });
    return { id: record.id, name: record.name, prefix: record.prefix, plainKey: rawKey };
  }
}
