import { Module } from '@nestjs/common';
import { SqlGeneratorController } from './sql-generator.controller';
import { SqlGeneratorService } from './sql-generator.service';

@Module({
  controllers: [SqlGeneratorController],
  providers: [SqlGeneratorService],
  exports: [SqlGeneratorService],
})
export class SqlGeneratorModule {}
