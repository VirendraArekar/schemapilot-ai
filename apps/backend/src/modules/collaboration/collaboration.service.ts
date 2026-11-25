import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class CollaborationService {
  constructor(private readonly prisma: PrismaService) {}

  listComments(projectId: string) {
    return this.prisma.projectComment.findMany({
      where: { projectId },
      include: { user: { select: { id: true, name: true, avatarUrl: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  addComment(projectId: string, userId: string, content: string, tableName?: string) {
    return this.prisma.projectComment.create({
      data: { projectId, userId, content, tableName },
      include: { user: { select: { id: true, name: true, avatarUrl: true } } },
    });
  }

  resolveComment(commentId: string, resolved: boolean) {
    return this.prisma.projectComment.update({
      where: { id: commentId },
      data: { resolved },
    });
  }

  listActivity(projectId: string) {
    return this.prisma.activityLog.findMany({
      where: { projectId },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });
  }
}
