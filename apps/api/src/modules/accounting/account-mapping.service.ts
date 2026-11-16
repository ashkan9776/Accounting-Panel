import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';

export type AccountMappingKey =
  | 'SALES_REVENUE'
  | 'SALES_DISCOUNT'
  | 'COGS'
  | 'INVENTORY'
  | 'AR'
  | 'AP'
  | 'CASH'
  | 'BANK'
  | 'VAT_OUTPUT'
  | 'VAT_INPUT'
  | 'SALARY_EXPENSE'
  | 'INSURANCE_EXPENSE'
  | 'TAX_EXPENSE'
  | 'TAX_PAYABLE'
  | 'POS_IN_TRANSIT'
  | 'INSURANCE_PAYABLE'
  | 'SALARY_PAYABLE';

export const DEFAULT_ACCOUNT_CODES: Record<AccountMappingKey, string> = {
  SALES_REVENUE: '6101',
  SALES_DISCOUNT: '6201',
  COGS: '7101',
  INVENTORY: '1501',
  AR: '1301',
  AP: '3101',
  CASH: '1101',
  BANK: '1102',
  VAT_OUTPUT: '3306',
  VAT_INPUT: '1505',
  SALARY_EXPENSE: '8101',
  INSURANCE_EXPENSE: '8102',
  TAX_EXPENSE: '8109',
  TAX_PAYABLE: '3305',
  POS_IN_TRANSIT: '1104',
  INSURANCE_PAYABLE: '3304',
  SALARY_PAYABLE: '3303',
};

@Injectable()
export class AccountMappingService {
  private cache = new Map<string, Map<AccountMappingKey, string>>();

  constructor(private readonly db: DatabaseService) {}

  async getAccount(
    tenantId: string,
    companyId: string,
    key: AccountMappingKey,
    defaultSubId?: string,
  ): Promise<string> {
    const cacheKey = `${tenantId}:${companyId}`;
    let tenantCache = this.cache.get(cacheKey);
    if (!tenantCache) {
      tenantCache = new Map<AccountMappingKey, string>();
      this.cache.set(cacheKey, tenantCache);
    }

    if (tenantCache.has(key)) {
      return tenantCache.get(key)!;
    }

    // ۱. بررسی جدول اختصاصی نگاشت حساب‌ها
    const mapping = await this.db.queryOne<any>(
      'SELECT subsidiary_account_id FROM account_mappings WHERE tenant_id = ? AND company_id = ? AND mapping_key = ?',
      [tenantId, companyId, key],
    );

    if (mapping?.subsidiary_account_id) {
      tenantCache.set(key, mapping.subsidiary_account_id);
      return mapping.subsidiary_account_id;
    }

    // ۲. جستجو بر اساس کدهای استاندارد در حساب‌های معین
    const defaultCode = DEFAULT_ACCOUNT_CODES[key];
    if (defaultCode) {
      const sub = await this.db.queryOne<any>(
        'SELECT id FROM account_subsidiaries WHERE tenant_id = ? AND company_id = ? AND code = ? AND is_active = 1',
        [tenantId, companyId, defaultCode],
      );

      if (sub?.id) {
        tenantCache.set(key, sub.id);
        return sub.id;
      }
    }

    // fallback به فرمت پیش‌فرض
    const fallbackId = defaultSubId || (defaultCode ? `sub-${defaultCode}` : 'sub-unknown');
    tenantCache.set(key, fallbackId);
    return fallbackId;
  }

  clearCache(tenantId?: string, companyId?: string) {
    if (tenantId && companyId) {
      this.cache.delete(`${tenantId}:${companyId}`);
    } else {
      this.cache.clear();
    }
  }
}
