import { Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuthUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { AnalyticsService } from './analytics.service';

@ApiTags('Analytics & Admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('dashboard')
  getDashboard(@CurrentUser() user: AuthUser) {
    return this.analyticsService.getDashboardStats(user.id);
  }

  @Patch('notifications/:id/read')
  markRead(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.analyticsService.markNotificationRead(user.id, id);
  }

  @Get('admin/overview')
  @Roles('SUPER_ADMIN')
  adminOverview() {
    return this.analyticsService.getAdminOverview();
  }
}
