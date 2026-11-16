import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { DatabaseService } from '../../database/database.service';
import {
  SaaSPlanDefinition,
  TenantSubscriptionRecord,
  SaaSSubscriptionEngine,
  TenantUsageMetrics,
} from '@accounting/core';

@Injectable()
export class SaaSPlansService {
  constructor(private readonly db: DatabaseService) {}

  /**
   * دریافت فهرست تمام پلن‌های اشتراک ابری
   */
  async listPlans(): Promise<SaaSPlanDefinition[]> {
    const rows = await this.db.query<any>(`SELECT * FROM saas_plans WHERE is_active = true ORDER BY max_monthly_transactions ASC`);
    return rows.map((r: any) => ({
      id: r.id,
      code: r.code,
      nameFa: r.name_fa,
      tier: r.tier,
      monthlyPrice: r.monthly_price,
      yearlyPrice: r.yearly_price,
      maxUsers: r.max_users,
      maxBranches: r.max_branches,
      maxMonthlyTransactions: r.max_monthly_transactions,
      allowedModules: JSON.parse(r.allowed_modules_json || '[]'),
      hasApiAccess: Boolean(r.has_api_access),
      hasAuditChainVerification: Boolean(r.has_audit_chain_verification),
      storageQuotaMb: r.storage_quota_mb,
      isActive: Boolean(r.is_active),
    }));
  }

  /**
   * استعلام وضعیت اشتراک فعلی یک سازمان به همراه بررسی دوره تنفس و روزهای باقیمانده
   */
  async getTenantSubscription(organizationId: string) {
    const sub = await this.db.queryOne<any>(
      `SELECT s.*, p.name_fa as plan_name, p.code as plan_code, p.tier as plan_tier,
              p.max_monthly_transactions, p.max_users, p.allowed_modules_json, p.has_api_access
       FROM tenant_subscriptions s
       JOIN saas_plans p ON s.plan_id = p.id
       WHERE s.organization_id = ?
       ORDER BY s.created_at DESC LIMIT 1`,
      [organizationId],
    );

    if (!sub) {
      throw new NotFoundException('هیچ اشتراکی برای این سازمان یافت نشد.');
    }

    const subRecord: TenantSubscriptionRecord = {
      id: sub.id,
      organizationId: sub.organization_id,
      planId: sub.plan_id,
      status: sub.status,
      startedAt: sub.started_at,
      expiresAt: sub.expires_at,
      autoRenew: Boolean(sub.auto_renew),
      billingCycle: sub.billing_cycle,
      paymentReference: sub.payment_reference,
    };

    const evaluation = SaaSSubscriptionEngine.evaluateSubscriptionStatus(subRecord, new Date(), 5);

    return {
      subscription: subRecord,
      plan: {
        id: sub.plan_id,
        code: sub.plan_code,
        nameFa: sub.plan_name,
        tier: sub.plan_tier,
        maxMonthlyTransactions: sub.max_monthly_transactions,
        maxUsers: sub.max_users,
        allowedModules: JSON.parse(sub.allowed_modules_json || '[]'),
        hasApiAccess: Boolean(sub.has_api_access),
      },
      evaluation,
    };
  }

  /**
   * استعلام میزان مصرف سهمیه‌های ماه جاری در مقایسه با سقف پلن
   */
  async getTenantUsageMetrics(organizationId: string) {
    const subData = await this.getTenantSubscription(organizationId);
    const quota = await this.db.queryOne<any>(
      `SELECT * FROM tenant_usage_quotas WHERE organization_id = ? ORDER BY last_updated_at DESC LIMIT 1`,
      [organizationId],
    );

    const metrics: TenantUsageMetrics = {
      organizationId,
      periodMonth: quota?.period_month || '1403-12',
      currentTransactions: quota?.current_transactions || 0,
      currentUsers: quota?.current_users || 1,
      currentStorageMb: quota?.current_storage_mb || 10,
      lastUpdatedAt: quota?.last_updated_at || new Date().toISOString(),
    };

    const maxTx = subData.plan.maxMonthlyTransactions;
    const maxUsers = subData.plan.maxUsers;

    const txUsagePercent = Math.min(100, Math.round((metrics.currentTransactions / maxTx) * 100));
    const userUsagePercent = Math.min(100, Math.round((metrics.currentUsers / maxUsers) * 100));

    return {
      metrics,
      limits: {
        maxTransactions: maxTx,
        maxUsers,
      },
      usagePercentages: {
        transactions: txUsagePercent,
        users: userUsagePercent,
      },
      isNearLimit: txUsagePercent >= 85 || userUsagePercent >= 85,
    };
  }

  /**
   * محاسبه پیش‌فاکتور ارتقای پلن به صورت تناسبی
   */
  async calculateUpgrade(organizationId: string, newPlanId: string) {
    const subData = await this.getTenantSubscription(organizationId);
    const plans = await this.listPlans();

    const currentPlan = plans.find((p) => p.id === subData.subscription.planId);
    const newPlan = plans.find((p) => p.id === newPlanId);

    if (!currentPlan || !newPlan) {
      throw new NotFoundException('پلن جاری یا پلن درخواستی یافت نشد.');
    }

    const calc = SaaSSubscriptionEngine.calculateProratedUpgrade(
      currentPlan,
      newPlan,
      subData.subscription,
      new Date(),
    );

    return {
      currentPlan,
      newPlan,
      calculation: calc,
    };
  }

  /**
   * اعمال ارتقای پلن اشتراک سازمان
   */
  async executeUpgrade(
    organizationId: string,
    newPlanId: string,
    billingCycle: 'MONTHLY' | 'YEARLY' = 'MONTHLY',
    paymentReference?: string,
  ) {
    if (!paymentReference || !paymentReference.trim()) {
      throw new BadRequestException('شناسه مرجع پرداخت بانکی الزامی است.');
    }
    const upgradeCalc = await this.calculateUpgrade(organizationId, newPlanId);
    const now = new Date().toISOString();
    const durationDays = billingCycle === 'YEARLY' ? 365 : 30;
    const expiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString();

    const newSubId = randomUUID();
    await this.db.run(
      `INSERT INTO tenant_subscriptions (
        id, organization_id, plan_id, status, started_at, expires_at, auto_renew,
        billing_cycle, payment_reference, created_at, updated_at
      ) VALUES (?, ?, ?, 'ACTIVE', ?, ?, true, ?, ?, ?, ?)`,
      [newSubId, organizationId, newPlanId, now, expiresAt, billingCycle, paymentReference, now, now],
    );

    return {
      success: true,
      subscriptionId: newSubId,
      newPlan: upgradeCalc.newPlan,
      amountPaid: upgradeCalc.calculation.netPayableAmount,
      expiresAt,
    };
  }
}
