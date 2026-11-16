import { Injectable, BadRequestException, Optional } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'crypto';
import * as bcrypt from 'bcryptjs';
import { DatabaseService } from '../../database/database.service';
import {
  TenantOnboardingInput,
  TenantOnboardingEngine,
  OnboardingResult,
  STANDARD_IRANIAN_GROUPS,
  STANDARD_IRANIAN_HEADS,
} from '@accounting/core';

@Injectable()
export class OnboardingService {
  constructor(
    private readonly db: DatabaseService,
    @Optional() private readonly jwtService?: JwtService
  ) {}

  /**
   * راه‌اندازی سریع و تمام‌خودکار سازمان جدید متناسب با صنف کاری
   */
  async onboardTenant(input: TenantOnboardingInput): Promise<OnboardingResult> {
    // ۱. اعتبارسنجی شناسه ملی یا کد ملی
    const idValidation = TenantOnboardingEngine.validateNationalIdentifier(input.nationalId);
    if (!idValidation.isValid) {
      throw new BadRequestException(idValidation.message || 'شناسه ملی یا کد ملی نامعتبر است.');
    }

    const now = new Date().toISOString();

    const tenantId = randomUUID();
    const companyId = randomUUID();
    const branchId = randomUUID();
    const warehouseId = randomUUID();
    const fiscalYearId = randomUUID();
    const adminUserId = randomUUID();
    const subdomain = `sub-${randomUUID().substring(0, 8)}`;

    const trialSub = TenantOnboardingEngine.createTrialSubscription(tenantId, new Date(), 14);
    let accountsInserted = 0;

    await this.db.transaction(async (tx) => {
      // ۲. ایجاد Tenant و Company
      await tx.run(
        `INSERT INTO tenants (id, name, subdomain, is_active, created_at)
         VALUES (?, ?, ?, true, ?)`,
        [tenantId, input.organizationName, subdomain, now],
      );

      await tx.run(
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
      await tx.run(
        `INSERT INTO branches (id, tenant_id, company_id, code, name, is_central, created_at)
         VALUES (?, ?, ?, '001', 'دفتر مرکزی', true, ?)`,
        [branchId, tenantId, companyId, now],
      );

      await tx.run(
        `INSERT INTO warehouses (id, tenant_id, company_id, branch_id, code, name, is_active, created_at)
         VALUES (?, ?, ?, ?, 'WH-MAIN', 'انبار مرکزی', true, ?)`,
        [warehouseId, tenantId, companyId, branchId, now],
      );

      // ۳.۱. ایجاد واحدهای سنجش پیش‌فرض (عدد، کیلوگرم، بسته)
      await tx.run(
        `INSERT INTO product_units (id, tenant_id, company_id, code, title, symbol, is_reference, created_at)
         VALUES (?, ?, ?, 'PCS', 'دستگاه / عدد', 'عدد', true, ?) ON CONFLICT DO NOTHING`,
        [`unit-piece-${tenantId}`, tenantId, companyId, now],
      );
      await tx.run(
        `INSERT INTO product_units (id, tenant_id, company_id, code, title, symbol, is_reference, created_at)
         VALUES (?, ?, ?, 'KG', 'کیلوگرم', 'کیلو', false, ?) ON CONFLICT DO NOTHING`,
        [`unit-kg-${tenantId}`, tenantId, companyId, now],
      );
      await tx.run(
        `INSERT INTO product_units (id, tenant_id, company_id, code, title, symbol, is_reference, created_at)
         VALUES (?, ?, ?, 'BOX', 'بسته / کارتن', 'بسته', false, ?) ON CONFLICT DO NOTHING`,
        [`unit-box-${tenantId}`, tenantId, companyId, now],
      );

      // ۴. ایجاد سال مالی
      await tx.run(
        `INSERT INTO fiscal_years (
          id, tenant_id, company_id, title, start_date_shamsi, end_date_shamsi,
          start_date_gregorian, end_date_gregorian, is_closed, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, '2025-03-21', '2026-03-20', false, ?)`,
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
      await tx.run(
        `INSERT INTO users (
          id, tenant_id, mobile, email, password_hash, full_name, is_super_admin, is_active, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, true, true, ?)`,
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

      // ۵.۱. ایجاد نقش‌های پیش‌فرض سازمانی و انتساب نقش ADMIN
      const defaultRoles = [
        { code: 'ADMIN', title: 'مدیر ارشد سازمان' },
        { code: 'ACCOUNTANT', title: 'حسابدار ارشد' },
        { code: 'AUDITOR', title: 'حسابرس و ناظر' },
        { code: 'CASHIER', title: 'صندوق‌دار فروشگاه' },
      ];
      let adminRoleId = `role-${tenantId}-admin`;
      for (const r of defaultRoles) {
        const roleId = `role-${tenantId}-${r.code.toLowerCase()}`;
        if (r.code === 'ADMIN') adminRoleId = roleId;
        await tx.run(
          `INSERT INTO roles (id, tenant_id, code, title, description) VALUES (?, ?, ?, ?, ?) ON CONFLICT DO NOTHING`,
          [roleId, tenantId, `${r.code}_${tenantId}`, r.title, `نقش ${r.title} در سازمان`],
        );
      }
      await tx.run(
        `INSERT INTO user_roles (user_id, role_id, branch_id) VALUES (?, ?, ?) ON CONFLICT DO NOTHING`,
        [adminUserId, adminRoleId, branchId],
      );

      // ۶. درج گروه‌ها و حساب‌های کل استاندارد برای سازمان جدید
      for (const g of STANDARD_IRANIAN_GROUPS) {
        const grpId = `group-${tenantId}-${g.code}`;
        await tx.run(
          `INSERT INTO account_groups (id, tenant_id, company_id, code, title, nature, description)
           VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT DO NOTHING`,
          [grpId, tenantId, companyId, g.code, g.title, g.nature, g.description || ''],
        );
      }

      for (const h of STANDARD_IRANIAN_HEADS) {
        const headId = `head-${tenantId}-${h.code}`;
        const grpId = `group-${tenantId}-${h.code.charAt(0)}`;
        await tx.run(
          `INSERT INTO account_heads (id, tenant_id, company_id, group_id, code, title, nature, description)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT DO NOTHING`,
          [headId, tenantId, companyId, grpId, h.code, h.title, h.nature, h.description || ''],
        );
      }

      // ۶.۱. تخصیص کدینگ حساب‌های معین متناسب با صنف کسب‌وکار (Industry-specific Chart)
      const industryAccounts = TenantOnboardingEngine.generateIndustryAccounts(input.industry);
      for (const acc of industryAccounts) {
        if (acc.level === 'SUBSIDIARY') {
          const subId = `sub-${tenantId}-${acc.code}`;
          const headCode = acc.parentCode || acc.code.substring(0, 2);
          const headId = `head-${tenantId}-${headCode}`;

          await tx.run(
            `INSERT INTO account_subsidiaries (
              id, tenant_id, company_id, head_id, code, title, nature,
              requires_floating_dimension_1, is_active
            ) VALUES (?, ?, ?, ?, ?, ?, ?, false, true) ON CONFLICT DO NOTHING`,
            [subId, tenantId, companyId, headId, acc.code, acc.name, acc.nature],
          );
          accountsInserted++;
        }
      }

      // ۷. اطمینان از وجود پلن آزمایشی رایگان در صورت نبود
      await tx.run(
        `INSERT INTO saas_plans (
          id, code, name_fa, tier, monthly_price, yearly_price, max_users, max_branches,
          max_monthly_transactions, allowed_modules_json, has_api_access,
          has_audit_chain_verification, storage_quota_mb, is_active, created_at
        ) VALUES (
          'plan-free-trial', 'TRIAL', 'نسخه آزمایشی رایگان (۱۴ روزه)', 'FREE',
          '0', '0', 1, 1, 200, '["GENERAL_LEDGER","TREASURY","INVENTORY","SALES"]',
          false, true, 100, true, ?
        ) ON CONFLICT (id) DO NOTHING`,
        [now]
      );

      // ۷.۱. ایجاد اشتراک آزمایشی ۱۴ روزه و سهمیه منابع
      await tx.run(
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
          Boolean(trialSub.autoRenew),
          trialSub.billingCycle,
          now,
          now,
        ],
      );

      await tx.run(
        `INSERT INTO tenant_usage_quotas (
          id, organization_id, period_month, current_transactions, current_users, current_storage_mb, last_updated_at
        ) VALUES (?, ?, '1404-01', 0, 1, 5, ?)`,
        [`quota-${tenantId}`, tenantId, now],
      );
    });

    // صدور توکن ورود خودکار برای مدیر ارشد سازمان تازه تاسیس
    let accessToken: string | null = null;
    if (this.jwtService) {
      accessToken = this.jwtService.sign({
        sub: adminUserId,
        tenantId,
        mobile: input.adminMobile,
        isSuperAdmin: true,
      });
    }

    return {
      organizationId: tenantId,
      companyId,
      fiscalYearId,
      defaultWarehouseId: warehouseId,
      assignedPlanId: trialSub.planId,
      initialAccountsCount: accountsInserted,
      rolesCreated: ['ADMIN', 'ACCOUNTANT', 'AUDITOR', 'CASHIER'],
      subscription: trialSub,
      accessToken,
      user: {
        id: adminUserId,
        tenantId,
        mobile: input.adminMobile,
        fullName: input.adminFullName,
        isSuperAdmin: true,
        roles: ['ADMIN'],
      },
    } as any;
  }
}
