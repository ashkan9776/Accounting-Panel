import { Module } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { AccountingModule } from '../accounting/accounting.module';
import { InventoryService } from './inventory.service';
import { InventoryController } from './inventory.controller';

@Module({
  imports: [AccountingModule],
  controllers: [InventoryController],
  providers: [InventoryService, DatabaseService],
  exports: [InventoryService]
})
export class InventoryModule {}
