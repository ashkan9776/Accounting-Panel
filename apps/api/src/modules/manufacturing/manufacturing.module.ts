import { Module } from '@nestjs/common';
import { AccountingModule } from '../accounting/accounting.module';
import { InventoryModule } from '../inventory/inventory.module';
import { WorkCentersService } from './work-centers.service';
import { BomsService } from './boms.service';
import { ProductionOrdersService } from './production-orders.service';
import { ManufacturingController } from './manufacturing.controller';

@Module({
  imports: [AccountingModule, InventoryModule],
  controllers: [ManufacturingController],
  providers: [
    WorkCentersService,
    BomsService,
    ProductionOrdersService
  ],
  exports: [
    WorkCentersService,
    BomsService,
    ProductionOrdersService
  ]
})
export class ManufacturingModule {}
