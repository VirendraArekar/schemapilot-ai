import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { GeminiProvider } from './gemini.provider';

@Module({
  controllers: [AiController],
  providers: [AiService, GeminiProvider],
  exports: [AiService],
})
export class AiModule {}
