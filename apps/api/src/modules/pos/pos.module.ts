import { Module } from '@nestjs/common';
import { AccountingModule } from '../accounting/accounting.module';
import { InventoryModule } from '../inventory/inventory.module';
import { PosShiftsService } from './pos-shifts.service';
import { PosOrdersService } from './pos-orders.service';
import { PosController } from './pos.controller';

@Module({
  imports: [AccountingModule, InventoryModule],
  controllers: [PosController],
  providers: [PosShiftsService, PosOrdersService],
  exports: [PosShiftsService, PosOrdersService]
})
export class PosModule {}
