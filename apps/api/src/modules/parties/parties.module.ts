import { Module } from '@nestjs/common';
import { PartiesService } from './parties.service';
import { PartiesController } from './parties.controller';
import { DatabaseService } from '../../database/database.service';

@Module({
  controllers: [PartiesController],
  providers: [PartiesService, DatabaseService],
  exports: [PartiesService]
})
export class PartiesModule {}
