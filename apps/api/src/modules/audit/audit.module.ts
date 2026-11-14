import { Module } from '@nestjs/common';
import { AuditService } from './audit.service';
import { AuditController } from './audit.controller';
import { DatabaseService } from '../../database/database.service';

@Module({
  controllers: [AuditController],
  providers: [AuditService, DatabaseService],
  exports: [AuditService]
})
export class AuditModule {}
