import { Module } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { MoadianService } from './moadian.service';
import { MoadianController } from './moadian.controller';

@Module({
  controllers: [MoadianController],
  providers: [MoadianService, DatabaseService],
  exports: [MoadianService]
})
export class MoadianModule {}
