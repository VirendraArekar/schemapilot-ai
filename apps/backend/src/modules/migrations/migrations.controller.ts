import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CanonicalSchema } from '@schemapilot/shared-types';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { MigrationsService } from './migrations.service';

@ApiTags('Migrations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('migrations')
export class MigrationsController {
  constructor(private readonly migrationsService: MigrationsService) {}

  @Get('schema/:schemaId')
  list(@Param('schemaId') schemaId: string) {
    return this.migrationsService.listMigrations(schemaId);
  }

  @Post('schema/:schemaId')
  create(
    @Param('schemaId') schemaId: string,
    @Body() body: { name: string; before: CanonicalSchema; after: CanonicalSchema },
  ) {
    return this.migrationsService.createMigrationFromDiff(
      schemaId,
      body.name || 'Schema migration',
      body.before,
      body.after,
    );
  }

  @Post(':id/execute')
  execute(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: { direction: 'UP' | 'DOWN'; confirmDestructive?: boolean },
  ) {
    return this.migrationsService.executeMigration(
      id,
      user.id,
      body.direction || 'UP',
      Boolean(body.confirmDestructive),
    );
  }
}
