import {
  BusinessIndustry,
  TenantOnboardingInput,
  IndustryAccountTemplateItem,
  TenantSubscriptionRecord,
} from './types';
import { STANDARD_IRANIAN_HEADS, STANDARD_IRANIAN_SUBSIDIARIES } from '../chart-of-accounts/standard-iranian-chart';
import { AccountNature } from '../chart-of-accounts/types';

export class TenantOnboardingEngine {
  /**
   * اعتبارسنجی شناسه ملی اشخاص حقوقی و کد ملی حقیقی ایران
   */
  public static validateNationalIdentifier(id: string): { isValid: boolean; type: 'LEGAL' | 'INDIVIDUAL'; message?: string } {
    const cleaned = (id || '').trim();
    if (!/^\d{10,11}$/.test(cleaned)) {
      return { isValid: false, type: 'INDIVIDUAL', message: 'شناسه ملی یا کد ملی باید ۱۰ یا ۱۱ رقم عددی باشد.' };
    }

    // بررسی عدم تکرار تمامی ارقام یکسان (مانند 0000000000 یا 11111111111)
    if (/^(\d)\1+$/.test(cleaned)) {
      return {
        isValid: false,
        type: cleaned.length === 11 ? 'LEGAL' : 'INDIVIDUAL',
        message: 'شناسه ملی یا کد ملی نمی‌تواند تکرار یک رقم باشد.',
      };
    }

    if (cleaned.length === 11) {
      // شناسه ملی ۱۱ رقمی اشخاص حقوقی
      return {
        isValid: true,
        type: 'LEGAL',
      };
    } else {
      // کد ملی ۱۰ رقمی اشخاص حقیقی
      return {
        isValid: true,
        type: 'INDIVIDUAL',
      };
    }
  }

  /**
   * نگاشت گروه یا کل به دسته‌بندی مالی
   */
  private static mapCategoryFromCode(code: string): 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE' {
    const firstChar = code.charAt(0);
    switch (firstChar) {
      case '1':
      case '2':
        return 'ASSET';
      case '3':
      case '4':
        return 'LIABILITY';
      case '5':
        return 'EQUITY';
      case '6':
        return 'REVENUE';
      case '7':
      case '8':
        return 'EXPENSE';
      default:
        return 'ASSET';
    }
  }

  /**
   * تولید درخت سرفصل‌های اختصاصی براساس صنف کسب‌وکار (Industry-specific Chart of Accounts)
   */
  public static generateIndustryAccounts(industry: BusinessIndustry): IndustryAccountTemplateItem[] {
    const accounts: IndustryAccountTemplateItem[] = [];

    // اضافه کردن حساب‌های کل (Heads)
    for (const head of STANDARD_IRANIAN_HEADS) {
      accounts.push({
        code: head.code,
        name: head.title,
        category: this.mapCategoryFromCode(head.code),
        nature: head.nature === AccountNature.CREDIT ? 'CREDIT' : 'DEBIT',
        level: 'GENERAL',
      });
    }

    // اضافه کردن حساب‌های معین پایه (Subsidiaries)
    for (const sub of STANDARD_IRANIAN_SUBSIDIARIES) {
      accounts.push({
        code: sub.code,
        name: sub.title,
        category: this.mapCategoryFromCode(sub.code),
        nature: sub.nature === AccountNature.CREDIT ? 'CREDIT' : 'DEBIT',
        level: 'SUBSIDIARY',
        parentCode: sub.code.substring(0, 2),
      });
    }

    // تنظیمات تکمیلی بر اساس صنف
    switch (industry) {
      case 'MANUFACTURING': {
        accounts.push(
          {
            code: '1504',
            name: 'موجودی مواد اولیه و قطعات مصرفی تولید',
            category: 'ASSET',
            nature: 'DEBIT',
            level: 'SUBSIDIARY',
            parentCode: '15',
          },
          {
            code: '1505',
            name: 'موجودی کالای در جریان ساخت (WIP)',
            category: 'ASSET',
            nature: 'DEBIT',
            level: 'SUBSIDIARY',
            parentCode: '15',
          },
          {
            code: '7201',
            name: 'بهای تمام شده کالای ساخته شده',
            category: 'EXPENSE',
            nature: 'DEBIT',
            level: 'SUBSIDIARY',
            parentCode: '71',
          },
          {
            code: '7202',
            name: 'سربار جذب شده تولید',
            category: 'EXPENSE',
            nature: 'CREDIT',
            level: 'SUBSIDIARY',
            parentCode: '71',
          },
          {
            code: '7203',
            name: 'انحرافات بهای تمام شده (نرخ و مصرف مواد و دستمزد)',
            category: 'EXPENSE',
            nature: 'DEBIT',
            level: 'SUBSIDIARY',
            parentCode: '71',
          },
        );
        break;
      }

      case 'CONTRACTING': {
        accounts.push(
          {
            code: '1601',
            name: 'پیمان‌های در جریان پیشرفت',
            category: 'ASSET',
            nature: 'DEBIT',
            level: 'SUBSIDIARY',
            parentCode: '16',
          },
          {
            code: '1402',
            name: 'سپرده حسن انجام کار نزد کارفرمایان',
            category: 'ASSET',
            nature: 'DEBIT',
            level: 'SUBSIDIARY',
            parentCode: '14',
          },
          {
            code: '3302',
            name: 'پیش‌دریافت کارفرمایان و پیمان‌ها',
            category: 'LIABILITY',
            nature: 'CREDIT',
            level: 'SUBSIDIARY',
            parentCode: '33',
          },
          {
            code: '6104',
            name: 'درآمد صورت وضعیت‌های تایید شده پیمانکاری',
            category: 'REVENUE',
            nature: 'CREDIT',
            level: 'SUBSIDIARY',
            parentCode: '61',
          },
        );
        break;
      }

      case 'RESTAURANT': {
        accounts.push(
          {
            code: '1506',
            name: 'موجودی مواد مصرفی و پروتئینی انبار سردخانه',
            category: 'ASSET',
            nature: 'DEBIT',
            level: 'SUBSIDIARY',
            parentCode: '15',
          },
          {
            code: '6106',
            name: 'فروش سالن و دلیوری رستوران',
            category: 'REVENUE',
            nature: 'CREDIT',
            level: 'SUBSIDIARY',
            parentCode: '61',
          },
          {
            code: '7103',
            name: 'بهای تمام شده مواد مصرفی غذا و نوشیدنی',
            category: 'EXPENSE',
            nature: 'DEBIT',
            level: 'SUBSIDIARY',
            parentCode: '71',
          },
          {
            code: '7104',
            name: 'هزینه غذای پرسنلی و ضایعات آشپزخانه',
            category: 'EXPENSE',
            nature: 'DEBIT',
            level: 'SUBSIDIARY',
            parentCode: '71',
          },
        );
        break;
      }

      case 'SERVICE': {
        accounts.push(
          {
            code: '6107',
            name: 'درآمد ارائه خدمات فنی، مشاوره‌ای و اجرایی',
            category: 'REVENUE',
            nature: 'CREDIT',
            level: 'SUBSIDIARY',
            parentCode: '61',
          },
          {
            code: '7105',
            name: 'بهای تمام شده خدمات ارائه شده (حق‌الزحمه مستقیم)',
            category: 'EXPENSE',
            nature: 'DEBIT',
            level: 'SUBSIDIARY',
            parentCode: '71',
          },
        );
        break;
      }

      case 'COMMERCIAL':
      default:
        break;
    }

    return accounts;
  }

  /**
   * تولید اشتراک آزمایشی ۱۴ روزه برای سازمان تازه تاسیس
   */
  public static createTrialSubscription(
    organizationId: string,
    startDate: Date = new Date(),
    trialDurationDays: number = 14,
  ): TenantSubscriptionRecord {
    const expiresAt = new Date(startDate.getTime() + trialDurationDays * 24 * 60 * 60 * 1000);

    return {
      id: `sub-trial-${Date.now()}`,
      organizationId,
      planId: 'plan-free-trial',
      status: 'TRIAL',
      startedAt: startDate.toISOString(),
      expiresAt: expiresAt.toISOString(),
      autoRenew: false,
      billingCycle: 'MONTHLY',
    };
  }
}
