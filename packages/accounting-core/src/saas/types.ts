/**
 * انواع و تعاریف داده‌ای ماژول زیرساخت SaaS، اشتراک، امنیت و مهاجرت داده
 */

export type SaaSTier = 'FREE' | 'STARTER' | 'PRO' | 'ENTERPRISE';

export type SubscriptionStatus = 'TRIAL' | 'ACTIVE' | 'EXPIRED' | 'CANCELLED' | 'GRACE_PERIOD';

export type BusinessIndustry = 
  | 'COMMERCIAL'    // بازرگانی
  | 'MANUFACTURING' // تولیدی و صنعتی
  | 'SERVICE'       // خدماتی
  | 'CONTRACTING'   // پیمانکاری و ساختمانی
  | 'RESTAURANT';   // رستوران، کافه و صنایع غذایی

export interface SaaSPlanDefinition {
  id: string;
  code: string;
  nameFa: string;
  tier: SaaSTier;
  monthlyPrice: string; // ریال
  yearlyPrice: string;  // ریال با تخفیف سالانه
  maxUsers: number;
  maxBranches: number;
  maxMonthlyTransactions: number;
  allowedModules: string[];
  hasApiAccess: boolean;
  hasAuditChainVerification: boolean;
  storageQuotaMb: number;
  isActive: boolean;
}

export interface TenantSubscriptionRecord {
  id: string;
  organizationId: string;
  planId: string;
  status: SubscriptionStatus;
  startedAt: string;
  expiresAt: string;
  autoRenew: boolean;
  billingCycle: 'MONTHLY' | 'YEARLY';
  paymentReference?: string;
}

export interface TenantUsageMetrics {
  organizationId: string;
  periodMonth: string; // YYYY-MM
  currentTransactions: number;
  currentUsers: number;
  currentStorageMb: number;
  lastUpdatedAt: string;
}

export interface QuotaCheckResult {
  isAllowed: boolean;
  reason?: string;
  quotaMetric: 'TRANSACTIONS' | 'USERS' | 'MODULE' | 'STORAGE' | 'API_ACCESS';
  currentUsage: number;
  maxAllowed: number;
}

export interface ProratedUpgradeCalculation {
  currentPlanId: string;
  newPlanId: string;
  remainingDays: number;
  daysInCycle: number;
  currentDailyRate: string;
  newDailyRate: string;
  creditUnusedCurrent: string;
  costNewPlan: string;
  netPayableAmount: string; // ریال
}

export interface TenantOnboardingInput {
  organizationName: string;
  nationalId: string;
  economicCode?: string;
  industry: BusinessIndustry;
  defaultCurrency: 'IRR' | 'IRT';
  initialFiscalYearTitle: string;
  fiscalYearStartDate: string; // YYYY-MM-DD شمسی یا میلادی
  fiscalYearEndDate: string;
  adminFullName: string;
  adminMobile: string;
  adminEmail?: string;
  storeName?: string;
}

export interface IndustryAccountTemplateItem {
  code: string;
  name: string;
  category: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
  nature: 'DEBIT' | 'CREDIT';
  level: 'GROUP' | 'GENERAL' | 'SUBSIDIARY';
  parentCode?: string;
}

export interface OnboardingResult {
  organizationId: string;
  fiscalYearId: string;
  defaultWarehouseId: string;
  assignedPlanId: string;
  initialAccountsCount: number;
  rolesCreated: string[];
  subscription: TenantSubscriptionRecord;
}

export type DataMigrationSource = 'SEPIDAR' | 'RAHKARAN' | 'CUSTOM_EXCEL';

export type MigrationEntityType = 'ACCOUNTS' | 'PARTIES' | 'PRODUCTS' | 'OPENING_BALANCES';

export interface MigrationRowError {
  row: number;
  field: string;
  message: string;
  rawValue?: any;
}

export interface AccountMigrationRow {
  code: string;
  name: string;
  type: 'GENERAL' | 'SUBSIDIARY';
  parentCode?: string;
  nature?: 'DEBIT' | 'CREDIT';
}

export interface PartyMigrationRow {
  code: string;
  name: string;
  partyType: 'INDIVIDUAL' | 'LEGAL';
  nationalId?: string;
  economicCode?: string;
  mobile?: string;
  phone?: string;
  address?: string;
  creditLimit?: string;
}

export interface ProductMigrationRow {
  code: string;
  barcode?: string;
  name: string;
  categoryName?: string;
  unitTitle: string;
  buyPrice: string;
  sellPrice: string;
  vatRate?: string;
  isService?: boolean;
}

export interface OpeningBalanceRow {
  subsidiaryCode: string;
  subsidiaryName?: string;
  dimensionCode?: string;
  dimensionName?: string;
  debit: string;
  credit: string;
  description?: string;
}

export interface MigrationValidationResult<T = any> {
  isValid: boolean;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  errors: MigrationRowError[];
  parsedData: T[];
  balanceCheck?: {
    totalDebit: string;
    totalCredit: string;
    isBalanced: boolean;
    difference: string;
  };
}

export interface TwoFactorSetupResponse {
  secret: string;
  otpAuthUrl: string;
  backupCodes: string[];
}

export interface SecurityAuditEntry {
  organizationId: string;
  userId: string;
  actionType: 'LOGIN' | 'FAILED_LOGIN' | '2FA_ENABLED' | '2FA_DISABLED' | 'PASSWORD_RESET' | 'DATA_EXPORT' | 'SETTINGS_CHANGE';
  ipAddress: string;
  userAgent?: string;
  status: 'SUCCESS' | 'FAILED' | 'BLOCKED';
  details?: Record<string, any>;
  timestamp: string;
}
