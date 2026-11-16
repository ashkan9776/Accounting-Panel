import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { SaaSSubscriptionEngine, SaaSPlanDefinition, TenantUsageMetrics } from '@accounting/core';

@Injectable()
export class PlanQuotaGuard implements CanActivate {
  constructor(private readonly db: DatabaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const tenantId = user?.tenant_id || user?.tenantId;
    if (!user || !tenantId) {
      return true;
    }

    // استعلام اشتراک فعال و پلن
    const subRow = await this.db.queryOne<any>(
      `SELECT s.*, p.max_monthly_transactions, p.max_users, p.allowed_modules_json, p.has_api_access, p.name_fa, p.code as plan_code
       FROM tenant_subscriptions s
       JOIN saas_plans p ON s.plan_id = p.id
       WHERE s.organization_id = ?
       ORDER BY s.created_at DESC LIMIT 1`,
      [tenantId],
    );

    if (!subRow) {
      return true; // سازمان پیش‌فرض بدون پلن محدود نمی‌شود
    }

    const plan: SaaSPlanDefinition = {
      id: subRow.plan_id,
      code: subRow.plan_code,
      nameFa: subRow.name_fa,
      tier: 'STARTER',
      monthlyPrice: '0',
      yearlyPrice: '0',
      maxUsers: subRow.max_users,
      maxBranches: 10,
      maxMonthlyTransactions: subRow.max_monthly_transactions,
      allowedModules: JSON.parse(subRow.allowed_modules_json || '[]'),
      hasApiAccess: Boolean(subRow.has_api_access),
      hasAuditChainVerification: true,
      storageQuotaMb: 1024,
      isActive: true,
    };

    const quotaRow = await this.db.queryOne<any>(
      `SELECT * FROM tenant_usage_quotas WHERE organization_id = ? ORDER BY last_updated_at DESC LIMIT 1`,
      [user.tenantId],
    );

    const metrics: TenantUsageMetrics = {
      organizationId: user.tenantId,
      periodMonth: quotaRow?.period_month || '1403-12',
      currentTransactions: quotaRow?.current_transactions || 0,
      currentUsers: quotaRow?.current_users || 1,
      currentStorageMb: quotaRow?.current_storage_mb || 10,
      lastUpdatedAt: quotaRow?.last_updated_at || new Date().toISOString(),
    };

    // اگر درخواست ثبت سند یا تراکنش است (متدهای POST/PUT روی ماژول‌های تراکنشی)
    if (request.method === 'POST') {
      const quotaCheck = SaaSSubscriptionEngine.checkQuota(plan, metrics, 'TRANSACTIONS', { incrementBy: 1 });
      if (!quotaCheck.isAllowed) {
        throw new ForbiddenException(quotaCheck.reason);
      }
    }

    return true;
  }
}
