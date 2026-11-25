import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CanonicalSchema, DatabaseEngine } from '@schemapilot/shared-types';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ImportExportService, ImportFormat } from './import-export.service';

@ApiTags('Import & Export')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('import-export')
export class ImportExportController {
  constructor(private readonly importExportService: ImportExportService) {}

  @Post('import')
  importSchema(
    @Body() body: { format: ImportFormat; content: string; engine?: DatabaseEngine },
  ) {
    return this.importExportService.importSchema(body.format, body.content, body.engine);
  }

  @Post('documentation')
  generateDocs(
    @Body() body: { schema: CanonicalSchema; format: 'MARKDOWN' | 'HTML' | 'JSON' },
  ) {
    return this.importExportService.generateDocumentation(body.schema, body.format || 'MARKDOWN');
  }
}
