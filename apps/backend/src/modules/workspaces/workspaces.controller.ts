import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { WorkspaceRole } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { WorkspacesService } from './workspaces.service';

@ApiTags('Workspaces')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('workspaces')
export class WorkspacesController {
  constructor(private readonly workspacesService: WorkspacesService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.workspacesService.listUserWorkspaces(user.id);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() body: { name: string; description?: string }) {
    return this.workspacesService.createWorkspace(user.id, body.name, body.description);
  }

  @Get(':id')
  details(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.workspacesService.getWorkspaceDetails(id, user.id);
  }

  @Post(':id/members')
  invite(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: { email: string; role: WorkspaceRole },
  ) {
    return this.workspacesService.inviteMember(id, user.id, body.email, body.role || 'EDITOR');
  }

  @Patch(':id/members/:userId')
  updateRole(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('userId') memberUserId: string,
    @Body('role') role: WorkspaceRole,
  ) {
    return this.workspacesService.updateMemberRole(id, user.id, memberUserId, role);
  }

  @Delete(':id/members/:userId')
  removeMember(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('userId') memberUserId: string,
  ) {
    return this.workspacesService.removeMember(id, user.id, memberUserId);
  }

  @Post(':id/api-keys')
  createApiKey(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body('name') name: string) {
    return this.workspacesService.createApiKey(id, user.id, name || 'CLI Key');
  }
}
