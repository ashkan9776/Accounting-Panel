import { Module } from '@nestjs/common';
import { MoadianService } from './moadian.service';
import { MoadianController } from './moadian.controller';

@Module({
  controllers: [MoadianController],
  providers: [MoadianService],
  exports: [MoadianService]
})
export class MoadianModule {}
