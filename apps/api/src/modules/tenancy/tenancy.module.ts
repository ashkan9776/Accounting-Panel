import { Module } from '@nestjs/common';
import { TenancyService } from './tenancy.service';
import { TenancyController } from './tenancy.controller';
import { DatabaseService } from '../../database/database.service';

@Module({
  controllers: [TenancyController],
  providers: [TenancyService, DatabaseService],
  exports: [TenancyService]
})
export class TenancyModule {}
