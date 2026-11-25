import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CanonicalSchema, DatabaseEngine, SchemaDiff } from '@schemapilot/shared-types';
import { SqlGenerationOptions } from '@schemapilot/sql-generators';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { SqlGeneratorService } from './sql-generator.service';

@ApiTags('SQL Generator')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('sql-generator')
export class SqlGeneratorController {
  constructor(private readonly sqlService: SqlGeneratorService) {}

  @Post('generate')
  generate(
    @Body()
    body: {
      schema: CanonicalSchema;
      targetEngine?: DatabaseEngine;
      options?: SqlGenerationOptions;
    },
  ) {
    return this.sqlService.generate(body.schema, body.targetEngine, body.options);
  }

  @Post('migration')
  generateMigration(@Body() body: { diff: SchemaDiff; engine: DatabaseEngine }) {
    return this.sqlService.generateMigration(body.diff, body.engine);
  }
}
