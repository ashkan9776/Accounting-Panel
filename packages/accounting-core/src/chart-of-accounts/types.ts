/**
 * تعاریف و تایپ‌های ساختار کدینگ درختی و تفصیلی شناور
 */

export enum AccountNature {
  DEBIT = 'DEBIT',       // ماهیت بدهکار (دارایی‌ها و هزینه‌ها و بهای تمام‌شده)
  CREDIT = 'CREDIT',     // ماهیت بستانکار (بدهی‌ها، حقوق مالکانه و درآمدها)
  EITHER = 'EITHER'      // متغیر (جاری شرکا، سود و زیان دوره، حساب‌های واسط)
}

export enum FloatingDimensionType {
  PARTY = 'PARTY',               // اشخاص (مشتری، تامین‌کننده، کارمند، شریک)
  BANK_ACCOUNT = 'BANK_ACCOUNT', // حساب‌های بانکی
  CASH_DESK = 'CASH_DESK',       // صندوق‌ها
  PROJECT = 'PROJECT',           // پروژه‌ها و قراردادها
  COST_CENTER = 'COST_CENTER',   // مراکز هزینه (اداری، تولید، بازاریابی، رستوران)
  PRODUCT = 'PRODUCT'            // انبار یا رده کالا در صورت لزوم
}

export interface AccountGroup {
  id: string;
  code: string; // 1 digit e.g. "1"
  title: string;
  nature: AccountNature;
  description?: string;
}

export interface AccountHead {
  id: string;
  groupId: string;
  code: string; // 2 digits e.g. "11"
  title: string;
  nature: AccountNature;
  description?: string;
}

export interface AccountSubsidiary {
  id: string;
  headId: string;
  code: string; // 4-5 digits e.g. "1101"
  title: string;
  nature: AccountNature;
  requiresFloatingDimension1: boolean;
  allowedDimension1Type?: FloatingDimensionType;
  requiresFloatingDimension2: boolean;
  allowedDimension2Type?: FloatingDimensionType;
  requiresFloatingDimension3: boolean;
  allowedDimension3Type?: FloatingDimensionType;
  isCurrencyDependent: boolean;
  isActive: boolean;
  description?: string;
}

export interface FloatingDimension {
  id: string;
  dimensionType: FloatingDimensionType;
  code: string; // 6 digits e.g. "000101"
  title: string;
  referenceId?: string; // e.g. party_id or bank_account_id
  isActive: boolean;
}
