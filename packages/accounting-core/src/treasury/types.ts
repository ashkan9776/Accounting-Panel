/**
 * تعاریف و تایپ‌های خزانه‌داری، اشخاص، بانک، صندوق و چک صیاد
 */

export enum PartyType {
  INDIVIDUAL_IRANIAN = 'INDIVIDUAL_IRANIAN', // شخص حقیقی ایرانی (کد ملی ۱۰ رقمی)
  LEGAL_ENTITY = 'LEGAL_ENTITY',             // شخص حقوقی (شناسه ملی ۱۱ رقمی)
  PARTNERSHIP = 'PARTNERSHIP',               // مشارکت مدنی
  FOREIGN_NATIONAL = 'FOREIGN_NATIONAL'      // اتباع غیرایرانی (کد فراگیر)
}

export interface Party {
  id: string;
  tenantId: string;
  companyId: string;
  partyType: PartyType;
  name: string;
  firstName?: string;
  lastName?: string;
  nationalId?: string;
  economicCode?: string;
  registrationNumber?: string;
  mobile?: string;
  phone?: string;
  email?: string;
  postalCode?: string;
  address?: string;
  creditLimit: string; // Decimal string
  creditTermsDays: number;
  isCustomer: boolean;
  isSupplier: boolean;
  isEmployee: boolean;
  isShareholder: boolean;
  floatingDimensionId: string;
  isActive: boolean;
}

export enum ChequeDirection {
  RECEIVABLE = 'RECEIVABLE', // چک دریافتی از مشتریان
  PAYABLE = 'PAYABLE'        // چک پرداختی به تامین‌کنندگان
}

export enum ChequeStatus {
  AT_HAND = 'AT_HAND',           // نزد صندوق
  IN_CLEARING = 'IN_CLEARING',   // در جریان وصول (واگذار به بانک)
  CLEARED = 'CLEARED',           // وصول شده / پاس شده
  BOUNCED = 'BOUNCED',           // برگشت خورده
  TRANSFERRED = 'TRANSFERRED',   // خرج شده (انتقال به شخص ثالث)
  CANCELLED = 'CANCELLED'        // ابطال یا استرداد
}

export enum PostingPolicy {
  AUTO_POST = 'AUTO_POST',                   // صدور خودکار سند و قطعی‌سازی فوری
  DRAFT_AND_APPROVE = 'DRAFT_AND_APPROVE',   // صدور خودکار سند به عنوان پیش‌نویس (نیاز به تایید دستی حسابدار)
  MANUAL = 'MANUAL'                          // بدون صدور سند خودکار (ثبت دستی توسط حسابدار)
}

export enum SayadColor {
  WHITE = 'WHITE',   // وضعیت سفید: فاقد هرگونه چک برگشتی
  YELLOW = 'YELLOW', // وضعیت زرد: دارای یک فقره چک برگشتی یا حداکثر ۵۰ میلیون تومان
  ORANGE = 'ORANGE', // وضعیت نارنجی: دارای دو تا چهار فقره چک برگشتی
  BROWN = 'BROWN',   // وضعیت قهوه‌ای: دارای پنج تا ده فقره چک برگشتی
  RED = 'RED'        // وضعیت قرمز: دارای بیش از ده فقره چک برگشتی (مسدود)
}

export interface SayadInquiryResult {
  sayadId: string;
  isValid: boolean;
  drawerNationalId: string;
  drawerName: string;
  amount: string;
  dueDateShamsi: string;
  bankName: string;
  color: SayadColor;
  isBounced: boolean;
  message: string;
}

export interface ISayadChequeAdapter {
  inquireCheque(sayadId: string): Promise<SayadInquiryResult>;
  registerCheque(data: {
    sayadId: string;
    amount: string;
    dueDateShamsi: string;
    payeeNationalId: string;
    description?: string;
  }): Promise<{ success: boolean; trackingNumber: string; message: string }>;
  confirmCheque(sayadId: string, receiverNationalId: string): Promise<{ success: boolean; message: string }>;
  transferCheque(sayadId: string, currentHolderNationalId: string, newReceiverNationalId: string): Promise<{ success: boolean; message: string }>;
}

export interface AgingBucket {
  range: '0_30' | '31_60' | '61_90' | '90_PLUS';
  title: string;
  amount: string;
  invoicesCount: number;
}

export interface PartyAgingReport {
  partyId: string;
  partyName: string;
  totalReceivable: string;
  buckets: {
    days0To30: string;
    days31To60: string;
    days61To90: string;
    daysOver90: string;
  };
}
