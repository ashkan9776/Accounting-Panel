import { Module } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { AccountingModule } from '../accounting/accounting.module';
import { FinancialReportsService } from './financial-reports.service';
import { DashboardService } from './dashboard.service';
import { FinancialReportsController } from './financial-reports.controller';
import { DashboardController } from './dashboard.controller';

@Module({
  imports: [AccountingModule],
  controllers: [FinancialReportsController, DashboardController],
  providers: [
    DatabaseService,
    FinancialReportsService,
    DashboardService
  ],
  exports: [
    FinancialReportsService,
    DashboardService
  ]
})
export class FinancialReportsModule {}
