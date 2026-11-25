import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AiGenerationOptions, CanonicalSchema, DatabaseEngine } from '@schemapilot/shared-types';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { AiService } from './ai.service';

@ApiTags('AI')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('generate-schema')
  generateSchema(@CurrentUser() user: AuthUser, @Body() options: AiGenerationOptions) {
    return this.aiService.generateSchema(user.id, options);
  }

  @Post('assistant')
  assistant(
    @CurrentUser() user: AuthUser,
    @Body()
    body: {
      schema: CanonicalSchema;
      instruction: string;
      projectId?: string;
      conversationId?: string;
    },
  ) {
    return this.aiService.assistantModify(
      user.id,
      body.schema,
      body.instruction,
      body.projectId,
      body.conversationId,
    );
  }

  @Post('explain-sql')
  explainSql(
    @CurrentUser() user: AuthUser,
    @Body() body: { sql: string; engine: DatabaseEngine },
  ) {
    return this.aiService.explainSql(user.id, body.sql, body.engine);
  }

  @Post('analyze-performance')
  analyzePerformance(@Body() schema: CanonicalSchema) {
    return this.aiService.analyzePerformance(schema);
  }
}
