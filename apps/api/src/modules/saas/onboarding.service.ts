import { Injectable, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { DatabaseService } from '../../database/database.service';
import {
  TenantOnboardingInput,
  TenantOnboardingEngine,
  OnboardingResult,
} from '@accounting/core';

@Injectable()
export class OnboardingService {
  constructor(private readonly db: DatabaseService) {}

  /**
   * راه‌اندازی سریع و تمام‌خودکار سازمان جدید متناسب با صنف کاری
   */
  async onboardTenant(input: TenantOnboardingInput): Promise<OnboardingResult> {
    // ۱. اعتبارسنجی شناسه ملی یا کد ملی
    const idValidation = TenantOnboardingEngine.validateNationalIdentifier(input.nationalId);
    if (!idValidation.isValid) {
      throw new BadRequestException(idValidation.message || 'شناسه ملی یا کد ملی نامعتبر است.');
    }

    const timestamp = Date.now();
    const now = new Date().toISOString();

    const tenantId = `tenant-${timestamp}`;
    const companyId = `comp-${timestamp}`;
    const branchId = `branch-${timestamp}`;
    const warehouseId = `wh-${timestamp}`;
    const fiscalYearId = `fy-${timestamp}`;
    const adminUserId = `user-admin-${timestamp}`;

    // ۲. ایجاد Tenant و Company
    await this.db.run(
      `INSERT INTO tenants (id, name, subdomain, is_active, created_at)
       VALUES (?, ?, ?, 1, ?)`,
      [tenantId, input.organizationName, `sub-${timestamp}`, now],
    );

    await this.db.run(
      `INSERT INTO companies (
        id, tenant_id, legal_name, trade_name, national_id, economic_code,
        currency_code, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        companyId,
        tenantId,
        input.organizationName,
        input.storeName || input.organizationName,
        input.nationalId,
        input.economicCode || input.nationalId,
        input.defaultCurrency || 'IRR',
        now,
      ],
    );

    // ۳. ایجاد شعبه مرکزی و انبار پیش‌فرض
    await this.db.run(
      `INSERT INTO branches (id, tenant_id, company_id, code, name, is_central, created_at)
       VALUES (?, ?, ?, '001', 'دفتر مرکزی', 1, ?)`,
      [branchId, tenantId, companyId, now],
    );

    await this.db.run(
      `INSERT INTO warehouses (id, tenant_id, company_id, branch_id, code, name, is_active, created_at)
       VALUES (?, ?, ?, ?, 'WH-MAIN', 'انبار مرکزی', 1, ?)`,
      [warehouseId, tenantId, companyId, branchId, now],
    );

    // ۴. ایجاد سال مالی
    await this.db.run(
      `INSERT INTO fiscal_years (
        id, tenant_id, company_id, title, start_date_shamsi, end_date_shamsi,
        start_date_gregorian, end_date_gregorian, is_closed, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, '2025-03-21', '2026-03-20', 0, ?)`,
      [
        fiscalYearId,
        tenantId,
        companyId,
        input.initialFiscalYearTitle || 'سال مالی ۱۴۰۴',
        input.fiscalYearStartDate || '1404/01/01',
        input.fiscalYearEndDate || '1404/12/29',
        now,
      ],
    );

    // ۵. ایجاد کاربر ادمین سازمان
    const hashedPassword = await bcrypt.hash('Admin@2026!Sec', 10);
    await this.db.run(
      `INSERT INTO users (
        id, tenant_id, mobile, email, password_hash, full_name, is_super_admin, is_active, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, 1, 1, ?)`,
      [
        adminUserId,
        tenantId,
        input.adminMobile,
        input.adminEmail || `${input.adminMobile}@saas-accounting.ir`,
        hashedPassword,
        input.adminFullName,
        now,
      ],
    );

    // ۶. تخصیص کدینگ حساب‌ها متناسب با صنف کسب‌وکار (Industry-specific Chart)
    const industryAccounts = TenantOnboardingEngine.generateIndustryAccounts(input.industry);
    let accountsInserted = 0;

    for (const acc of industryAccounts) {
      if (acc.level === 'SUBSIDIARY') {
        const subId = `sub-${tenantId}-${acc.code}`;
        const headCode = acc.parentCode || acc.code.substring(0, 2);
        const headId = `head-${headCode}`;

        // اطمینان از وجود یا درج معین
        await this.db.run(
          `INSERT OR IGNORE INTO account_subsidiaries (
            id, tenant_id, company_id, head_id, code, title, nature,
            requires_floating_dimension_1, is_active
          ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, 1)`,
          [subId, tenantId, companyId, headId, acc.code, acc.name, acc.nature],
        );
        accountsInserted++;
      }
    }

    // ۷. ایجاد اشتراک آزمایشی ۱۴ روزه و سهمیه منابع
    const trialSub = TenantOnboardingEngine.createTrialSubscription(tenantId, new Date(), 14);
    await this.db.run(
      `INSERT INTO tenant_subscriptions (
        id, organization_id, plan_id, status, started_at, expires_at, auto_renew,
        billing_cycle, payment_reference, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'TRIAL-ONBOARDING', ?, ?)`,
      [
        trialSub.id,
        tenantId,
        trialSub.planId,
        trialSub.status,
        trialSub.startedAt,
        trialSub.expiresAt,
        trialSub.autoRenew ? 1 : 0,
        trialSub.billingCycle,
        now,
        now,
      ],
    );

    await this.db.run(
      `INSERT INTO tenant_usage_quotas (
        id, organization_id, period_month, current_transactions, current_users, current_storage_mb, last_updated_at
      ) VALUES (?, ?, '1404-01', 0, 1, 5, ?)`,
      [`quota-${tenantId}`, tenantId, now],
    );

    return {
      organizationId: tenantId,
      fiscalYearId,
      defaultWarehouseId: warehouseId,
      assignedPlanId: trialSub.planId,
      initialAccountsCount: accountsInserted,
      rolesCreated: ['ADMIN', 'ACCOUNTANT', 'AUDITOR', 'CASHIER'],
      subscription: trialSub,
    };
  }
}
