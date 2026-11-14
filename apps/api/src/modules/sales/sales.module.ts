import { Module } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { AccountingModule } from '../accounting/accounting.module';
import { InventoryModule } from '../inventory/inventory.module';
import { SalesService } from './sales.service';
import { SalesController } from './sales.controller';

@Module({
  imports: [AccountingModule, InventoryModule],
  controllers: [SalesController],
  providers: [SalesService, DatabaseService],
  exports: [SalesService]
})
export class SalesModule {}
