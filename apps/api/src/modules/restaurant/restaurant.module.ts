import { Module } from '@nestjs/common';
import { AccountingModule } from '../accounting/accounting.module';
import { InventoryModule } from '../inventory/inventory.module';
import { TablesService } from './tables.service';
import { RecipesService } from './recipes.service';
import { KdsService } from './kds.service';
import { DeliveriesService } from './deliveries.service';
import { RestaurantOrdersService } from './restaurant-orders.service';
import { RestaurantController } from './restaurant.controller';

@Module({
  imports: [AccountingModule, InventoryModule],
  controllers: [RestaurantController],
  providers: [
    TablesService,
    RecipesService,
    KdsService,
    DeliveriesService,
    RestaurantOrdersService
  ],
  exports: [
    TablesService,
    RecipesService,
    KdsService,
    DeliveriesService,
    RestaurantOrdersService
  ]
})
export class RestaurantModule {}
