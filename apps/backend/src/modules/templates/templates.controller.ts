import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ALL_100_TEMPLATES } from './templates.data';

@ApiTags('Templates')
@Controller('templates')
export class TemplatesController {
  @Get()
  list() {
    return ALL_100_TEMPLATES.map((t) => ({
      id: t.id,
      slug: t.slug,
      name: t.name,
      category: t.category,
      description: t.description,
      engine: t.engine,
      tableCount: t.schema.tables.length,
      relationshipCount: t.schema.relationships.length,
    }));
  }

  @Get(':id')
  getOne(@Param('id') id: string) {
    const found = ALL_100_TEMPLATES.find((t) => t.id === id || t.slug === id);
    if (!found) throw new NotFoundException('Template not found');
    return found;
  }
}
