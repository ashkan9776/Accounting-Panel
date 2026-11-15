import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { DatabaseService } from './database/database.service';
import { TenancyModule } from './modules/tenancy/tenancy.module';
import { TenantMiddleware } from './modules/tenancy/tenant.middleware';
import { IdentityModule } from './modules/identity/identity.module';
import { AccountingModule } from './modules/accounting/accounting.module';
import { RulesModule } from './modules/rules/rules.module';
import { AuditModule } from './modules/audit/audit.module';
import { PartiesModule } from './modules/parties/parties.module';
import { TreasuryModule } from './modules/treasury/treasury.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { PurchasesModule } from './modules/purchases/purchases.module';
import { SalesModule } from './modules/sales/sales.module';
import { MoadianModule } from './modules/moadian/moadian.module';
import { PosModule } from './modules/pos/pos.module';
import { RestaurantModule } from './modules/restaurant/restaurant.module';
import { ManufacturingModule } from './modules/manufacturing/manufacturing.module';
import { PayrollModule } from './modules/payroll/payroll.module';
import { FixedAssetsModule } from './modules/fixed-assets/fixed-assets.module';
import { TaxReportsModule } from './modules/tax-reports/tax-reports.module';
import { FinancialReportsModule } from './modules/financial-reports/financial-reports.module';

@Module({
  imports: [
    TenancyModule,
    IdentityModule,
    AccountingModule,
    PartiesModule,
    TreasuryModule,
    InventoryModule,
    PurchasesModule,
    SalesModule,
    MoadianModule,
    PosModule,
    RestaurantModule,
    ManufacturingModule,
    PayrollModule,
    FixedAssetsModule,
    TaxReportsModule,
    FinancialReportsModule,
    RulesModule,
    AuditModule
  ],
  providers: [DatabaseService],
  exports: [DatabaseService]
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantMiddleware).forRoutes('*');
  }
}
