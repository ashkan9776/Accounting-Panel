import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { DatabaseService } from './database/database.service';
import { TenancyModule } from './modules/tenancy/tenancy.module';
import { TenantMiddleware } from './modules/tenancy/tenant.middleware';
import { IdentityModule } from './modules/identity/identity.module';
import { AccountingModule } from './modules/accounting/accounting.module';
import { RulesModule } from './modules/rules/rules.module';
import { AuditModule } from './modules/audit/audit.module';

@Module({
  imports: [
    TenancyModule,
    IdentityModule,
    AccountingModule,
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
