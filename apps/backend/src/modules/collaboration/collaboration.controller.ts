import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { CollaborationService } from './collaboration.service';

@ApiTags('Collaboration')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('collaboration')
export class CollaborationController {
  constructor(private readonly collaborationService: CollaborationService) {}

  @Get('projects/:projectId/comments')
  listComments(@Param('projectId') projectId: string) {
    return this.collaborationService.listComments(projectId);
  }

  @Post('projects/:projectId/comments')
  addComment(
    @CurrentUser() user: AuthUser,
    @Param('projectId') projectId: string,
    @Body() body: { content: string; tableName?: string },
  ) {
    return this.collaborationService.addComment(projectId, user.id, body.content, body.tableName);
  }

  @Patch('comments/:id/resolve')
  resolve(@Param('id') id: string, @Body('resolved') resolved: boolean) {
    return this.collaborationService.resolveComment(id, resolved ?? true);
  }

  @Get('projects/:projectId/activity')
  activity(@Param('projectId') projectId: string) {
    return this.collaborationService.listActivity(projectId);
  }
}
