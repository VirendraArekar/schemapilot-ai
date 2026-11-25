import { Body, Controller, Get, Param, ParseIntPipe, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CanonicalSchema } from '@schemapilot/shared-types';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { SchemasService } from './schemas.service';

@ApiTags('Schemas')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('schemas')
export class SchemasController {
  constructor(private readonly schemasService: SchemasService) {}

  @Get(':id')
  getSchema(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.schemasService.getSchema(user.id, id);
  }

  @Put(':id')
  saveSchema(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body()
    body: {
      schema: CanonicalSchema;
      commitMessage?: string;
      expectedVersion?: number;
    },
  ) {
    return this.schemasService.saveCanonicalSchema(user.id, id, body.schema, {
      commitMessage: body.commitMessage,
      expectedVersion: body.expectedVersion,
    });
  }

  @Post(':id/versions/:versionNumber/restore')
  restoreVersion(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('versionNumber', ParseIntPipe) versionNumber: number,
  ) {
    return this.schemasService.restoreVersion(user.id, id, versionNumber);
  }

  @Post('validate')
  validateInline(@Body() schema: CanonicalSchema) {
    return this.schemasService.validateInline(schema);
  }

  @Post('compare')
  compare(@Body() body: { before: CanonicalSchema; after: CanonicalSchema }) {
    return this.schemasService.compare(body.before, body.after);
  }
}
