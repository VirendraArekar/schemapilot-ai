import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { DatabaseEngine } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { ProjectsService } from './projects.service';

@ApiTags('Projects')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  list(
    @CurrentUser() user: AuthUser,
    @Query('workspaceId') workspaceId?: string,
    @Query('search') search?: string,
    @Query('engine') engine?: DatabaseEngine,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.projectsService.listProjects(user.id, { workspaceId, search, engine, page, limit });
  }

  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @Body() body: { workspaceId?: string; name: string; description?: string; engine?: DatabaseEngine },
  ) {
    return this.projectsService.createProject(user.id, body);
  }

  @Post('seed-samples')
  seedSamples(
    @CurrentUser() user: AuthUser,
    @Body() body: { workspaceId?: string; count?: number },
  ) {
    return this.projectsService.seedSampleProjects(user.id, body?.workspaceId, body?.count || 50);
  }

  @Get(':id')
  getOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.projectsService.getProject(user.id, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: { name?: string; description?: string; engine?: DatabaseEngine; isPublic?: boolean },
  ) {
    return this.projectsService.updateProject(user.id, id, body);
  }

  @Post(':id/share')
  share(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.projectsService.createShareLink(user.id, id);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.projectsService.deleteProject(user.id, id);
  }
}
