import { Module } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { AccountingModule } from '../accounting/accounting.module';
import { SaaSPlansService } from './saas-plans.service';
import { SaaSPlansController } from './saas-plans.controller';
import { OnboardingService } from './onboarding.service';
import { OnboardingController } from './onboarding.controller';
import { MigrationService } from './migration.service';
import { MigrationController } from './migration.controller';
import { SecurityService } from './security.service';
import { SecurityController } from './security.controller';
import { TenantIsolationGuard } from './tenant-isolation.guard';
import { PlanQuotaGuard } from './plan-quota.guard';

@Module({
  imports: [AccountingModule],
  controllers: [
    SaaSPlansController,
    OnboardingController,
    MigrationController,
    SecurityController,
  ],
  providers: [
    DatabaseService,
    SaaSPlansService,
    OnboardingService,
    MigrationService,
    SecurityService,
    TenantIsolationGuard,
    PlanQuotaGuard,
  ],
  exports: [
    SaaSPlansService,
    OnboardingService,
    MigrationService,
    SecurityService,
    TenantIsolationGuard,
    PlanQuotaGuard,
  ],
})
export class SaaSModule {}
