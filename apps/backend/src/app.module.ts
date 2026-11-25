import { Controller, Get, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import configuration from './config/configuration';
import { PrismaModule } from './database/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { WorkspacesModule } from './modules/workspaces/workspaces.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { SchemasModule } from './modules/schemas/schemas.module';
import { SqlGeneratorModule } from './modules/sql-generator/sql-generator.module';
import { AiModule } from './modules/ai/ai.module';
import { ImportExportModule } from './modules/import-export/import-export.module';
import { MigrationsModule } from './modules/migrations/migrations.module';
import { CollaborationModule } from './modules/collaboration/collaboration.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { TemplatesModule } from './modules/templates/templates.module';

@Controller('health')
export class HealthController {
  @Get()
  check() {
    return { status: 'ok', service: 'schemapilot-backend', timestamp: new Date().toISOString() };
  }
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 120,
      },
    ]),
    PrismaModule,
    AuthModule,
    UsersModule,
    WorkspacesModule,
    ProjectsModule,
    SchemasModule,
    SqlGeneratorModule,
    AiModule,
    ImportExportModule,
    MigrationsModule,
    CollaborationModule,
    AnalyticsModule,
    TemplatesModule,
  ],
  controllers: [HealthController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
