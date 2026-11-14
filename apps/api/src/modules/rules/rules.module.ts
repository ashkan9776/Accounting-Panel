import { Module } from '@nestjs/common';
import { RulesService } from './rules.service';
import { RulesController } from './rules.controller';
import { DatabaseService } from '../../database/database.service';

@Module({
  controllers: [RulesController],
  providers: [RulesService, DatabaseService],
  exports: [RulesService]
})
export class RulesModule {}
