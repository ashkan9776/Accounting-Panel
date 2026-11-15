import Decimal from 'decimal.js';
import {
  SaaSPlanDefinition,
  TenantSubscriptionRecord,
  TenantUsageMetrics,
  QuotaCheckResult,
  ProratedUpgradeCalculation,
} from './types';

/**
 * کاتالوگ پلن‌های استاندارد پلتفرم ابری حسابداری ایران
 */
export const STANDARD_SAAS_PLANS: SaaSPlanDefinition[] = [
  {
    id: 'plan-free-trial',
    code: 'TRIAL',
    nameFa: 'نسخه آزمایشی رایگان (۱۴ روزه)',
    tier: 'FREE',
    monthlyPrice: '0',
    yearlyPrice: '0',
    maxUsers: 1,
    maxBranches: 1,
    maxMonthlyTransactions: 200,
    allowedModules: ['GENERAL_LEDGER', 'TREASURY', 'INVENTORY', 'SALES'],
    hasApiAccess: false,
    hasAuditChainVerification: true,
    storageQuotaMb: 100,
    isActive: true,
  },
  {
    id: 'plan-starter',
    code: 'STARTER',
    nameFa: 'پایه کسب‌وکار و فروشگاهی',
    tier: 'STARTER',
    monthlyPrice: '4500000', // ۴۵۰ هزار تومان (۴,۵۰۰,۰۰۰ ریال)
    yearlyPrice: '45000000',  // با ۲ ماه رایگان
    maxUsers: 5,
    maxBranches: 2,
    maxMonthlyTransactions: 2000,
    allowedModules: ['GENERAL_LEDGER', 'TREASURY', 'INVENTORY', 'SALES', 'MOADIAN', 'POS'],
    hasApiAccess: false,
    hasAuditChainVerification: true,
    storageQuotaMb: 1024, // 1 GB
    isActive: true,
  },
  {
    id: 'plan-pro',
    code: 'PRO',
    nameFa: 'حرفه‌ای و چندشعبه‌ای (تولیدی و رستورانی)',
    tier: 'PRO',
    monthlyPrice: '12000000', // ۱.۲ میلیون تومان (۱۲,۰۰۰,۰۰۰ ریال)
    yearlyPrice: '120000000',
    maxUsers: 20,
    maxBranches: 10,
    maxMonthlyTransactions: 15000,
    allowedModules: [
      'GENERAL_LEDGER',
      'TREASURY',
      'INVENTORY',
      'SALES',
      'MOADIAN',
      'POS',
      'RESTAURANT',
      'MANUFACTURING',
      'PAYROLL',
      'FIXED_ASSETS',
      'OMNICHANNEL',
    ],
    hasApiAccess: true,
    hasAuditChainVerification: true,
    storageQuotaMb: 10240, // 10 GB
    isActive: true,
  },
  {
    id: 'plan-enterprise',
    code: 'ENTERPRISE',
    nameFa: 'سازمانی و هلدینگ (نامحدود)',
    tier: 'ENTERPRISE',
    monthlyPrice: '35000000', // ۳.۵ میلیون تومان (۳۵,۰۰۰,۰۰۰ ریال)
    yearlyPrice: '350000000',
    maxUsers: 9999,
    maxBranches: 9999,
    maxMonthlyTransactions: 9999999,
    allowedModules: [
      'GENERAL_LEDGER',
      'TREASURY',
      'INVENTORY',
      'SALES',
      'MOADIAN',
      'POS',
      'RESTAURANT',
      'MANUFACTURING',
      'PAYROLL',
      'FIXED_ASSETS',
      'BI_REPORTS',
      'OMNICHANNEL',
      'INTEGRATION_API',
    ],
    hasApiAccess: true,
    hasAuditChainVerification: true,
    storageQuotaMb: 102400, // 100 GB
    isActive: true,
  },
];

export class SaaSSubscriptionEngine {
  /**
   * بررسی انقضای اشتراک و دوره تنفس
   */
  public static evaluateSubscriptionStatus(
    subscription: TenantSubscriptionRecord,
    currentDate: Date = new Date(),
    gracePeriodDays: number = 5,
  ): { status: TenantSubscriptionRecord['status']; daysRemaining: number; isInGracePeriod: boolean } {
    const expiresAt = new Date(subscription.expiresAt);
    const diffTime = expiresAt.getTime() - currentDate.getTime();
    const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (subscription.status === 'CANCELLED') {
      return { status: 'CANCELLED', daysRemaining, isInGracePeriod: false };
    }

    if (daysRemaining > 0) {
      return {
        status: subscription.status === 'TRIAL' ? 'TRIAL' : 'ACTIVE',
        daysRemaining,
        isInGracePeriod: false,
      };
    }

    // تاریخ منقضی شده است؛ بررسی دوره تنفس (Grace Period)
    const overdueDays = Math.abs(daysRemaining);
    if (overdueDays <= gracePeriodDays) {
      return {
        status: 'GRACE_PERIOD',
        daysRemaining,
        isInGracePeriod: true,
      };
    }

    return {
      status: 'EXPIRED',
      daysRemaining,
      isInGracePeriod: false,
    };
  }

  /**
   * کنترل سهمیه و اعتبارسنجی محدودیت‌های پلن
   */
  public static checkQuota(
    plan: SaaSPlanDefinition,
    metrics: TenantUsageMetrics,
    metricToCheck: 'TRANSACTIONS' | 'USERS' | 'MODULE' | 'STORAGE' | 'API_ACCESS',
    requestedPayload?: { moduleCode?: string; incrementBy?: number },
  ): QuotaCheckResult {
    const increment = requestedPayload?.incrementBy || 1;

    switch (metricToCheck) {
      case 'TRANSACTIONS': {
        const nextTotal = metrics.currentTransactions + increment;
        const isAllowed = nextTotal <= plan.maxMonthlyTransactions;
        return {
          isAllowed,
          quotaMetric: 'TRANSACTIONS',
          currentUsage: metrics.currentTransactions,
          maxAllowed: plan.maxMonthlyTransactions,
          reason: isAllowed
            ? undefined
            : `سقف تراکنش ماهانه پلن (${plan.maxMonthlyTransactions.toLocaleString('fa-IR')}) تکمیل شده است. لطفا پلن خود را ارتقا دهید.`,
        };
      }

      case 'USERS': {
        const nextUsers = metrics.currentUsers + increment;
        const isAllowed = nextUsers <= plan.maxUsers;
        return {
          isAllowed,
          quotaMetric: 'USERS',
          currentUsage: metrics.currentUsers,
          maxAllowed: plan.maxUsers,
          reason: isAllowed
            ? undefined
            : `حداکثر تعداد مجاز کاربران در پلن ${plan.nameFa} (${plan.maxUsers}) تکمیل شده است.`,
        };
      }

      case 'STORAGE': {
        const isAllowed = metrics.currentStorageMb <= plan.storageQuotaMb;
        return {
          isAllowed,
          quotaMetric: 'STORAGE',
          currentUsage: metrics.currentStorageMb,
          maxAllowed: plan.storageQuotaMb,
          reason: isAllowed
            ? undefined
            : `سهمیه فضای ذخیره‌سازی ابری پلن (${plan.storageQuotaMb} مگابایت) پر شده است.`,
        };
      }

      case 'MODULE': {
        const targetModule = requestedPayload?.moduleCode;
        if (!targetModule) {
          return { isAllowed: true, quotaMetric: 'MODULE', currentUsage: 0, maxAllowed: 0 };
        }
        const isAllowed = plan.allowedModules.includes(targetModule);
        return {
          isAllowed,
          quotaMetric: 'MODULE',
          currentUsage: 0,
          maxAllowed: plan.allowedModules.length,
          reason: isAllowed
            ? undefined
            : `ماژول '${targetModule}' در پلن ${plan.nameFa} فعال نیست. برای دسترسی به این بخش، پلن خود را ارتقا دهید.`,
        };
      }

      case 'API_ACCESS': {
        const isAllowed = plan.hasApiAccess;
        return {
          isAllowed,
          quotaMetric: 'API_ACCESS',
          currentUsage: 0,
          maxAllowed: isAllowed ? 1 : 0,
          reason: isAllowed ? undefined : `دسترسی به وب‌سرویس و API برای پلن ${plan.nameFa} فعال نیست.`,
        };
      }

      default:
        return { isAllowed: true, quotaMetric: metricToCheck, currentUsage: 0, maxAllowed: 0 };
    }
  }

  /**
   * محاسبه هزینه تناسبی ارتقای پلن (Prorated Upgrade) با دقت اعشاری بالا
   */
  public static calculateProratedUpgrade(
    currentPlan: SaaSPlanDefinition,
    newPlan: SaaSPlanDefinition,
    subscription: TenantSubscriptionRecord,
    currentDate: Date = new Date(),
  ): ProratedUpgradeCalculation {
    const expiresAt = new Date(subscription.expiresAt);
    const startedAt = new Date(subscription.startedAt);

    const totalCycleMs = expiresAt.getTime() - startedAt.getTime();
    const daysInCycle = Math.max(1, Math.round(totalCycleMs / (1000 * 60 * 60 * 24)));

    const remainingMs = Math.max(0, expiresAt.getTime() - currentDate.getTime());
    const remainingDays = Math.ceil(remainingMs / (1000 * 60 * 60 * 24));

    const isYearly = subscription.billingCycle === 'YEARLY';
    const currentPrice = new Decimal(isYearly ? currentPlan.yearlyPrice : currentPlan.monthlyPrice);
    const newPrice = new Decimal(isYearly ? newPlan.yearlyPrice : newPlan.monthlyPrice);

    const decDaysInCycle = new Decimal(daysInCycle);
    const decRemainingDays = new Decimal(remainingDays);

    const currentDailyRate = currentPrice.dividedBy(decDaysInCycle);
    const newDailyRate = newPrice.dividedBy(decDaysInCycle);

    // اعتبار مصرف‌نشده از پلن فعلی
    const creditUnusedCurrent = currentDailyRate.times(decRemainingDays).toDecimalPlaces(0, Decimal.ROUND_HALF_UP);

    // بهای پلن جدید برای باقیمانده روزها
    const costNewPlan = newDailyRate.times(decRemainingDays).toDecimalPlaces(0, Decimal.ROUND_HALF_UP);

    // خالص مبلغ قابل پرداخت
    let netPayable = costNewPlan.minus(creditUnusedCurrent);
    if (netPayable.isNegative()) {
      netPayable = new Decimal(0);
    }

    return {
      currentPlanId: currentPlan.id,
      newPlanId: newPlan.id,
      remainingDays,
      daysInCycle,
      currentDailyRate: currentDailyRate.toFixed(2),
      newDailyRate: newDailyRate.toFixed(2),
      creditUnusedCurrent: creditUnusedCurrent.toFixed(0),
      costNewPlan: costNewPlan.toFixed(0),
      netPayableAmount: netPayable.toFixed(0),
    };
  }
}
