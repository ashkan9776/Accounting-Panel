import { Module } from '@nestjs/common';
import { ChartOfAccountsService } from './chart-of-accounts.service';
import { ChartOfAccountsController } from './chart-of-accounts.controller';
import { JournalEntriesService } from './journal-entries.service';
import { JournalEntriesController } from './journal-entries.controller';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { DatabaseService } from '../../database/database.service';

@Module({
  controllers: [ChartOfAccountsController, JournalEntriesController, ReportsController],
  providers: [ChartOfAccountsService, JournalEntriesService, ReportsService, DatabaseService],
  exports: [ChartOfAccountsService, JournalEntriesService, ReportsService]
})
export class AccountingModule {}
