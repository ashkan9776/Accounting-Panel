import { Module } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { AccountingModule } from '../accounting/accounting.module';
import { TaxReportsService } from './tax-reports.service';
import { TaxReportsController } from './tax-reports.controller';

@Module({
  imports: [AccountingModule],
  controllers: [TaxReportsController],
  providers: [
    DatabaseService,
    TaxReportsService
  ],
  exports: [
    TaxReportsService
  ]
})
export class TaxReportsModule {}
