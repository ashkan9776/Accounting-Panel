/**
 * تایپ‌های سامانه مودیان و پایانه‌های فروشگاهی (قانون پایانه‌های فروشگاهی و سامانه مودیان)
 */

export enum MoadianInvoiceType {
  TYPE_1 = 'TYPE_1', // نوع اول: با اطلاعات کامل خریدار و فروشنده (صورتحساب الکترونیکی با اطلاعات هویتی)
  TYPE_2 = 'TYPE_2', // نوع دوم: صورتحساب الکترونیکی با اطلاعات کامل خریدار بدون نیاز به اطلاعات هویتی مصرف‌کننده نهایی
  TYPE_3 = 'TYPE_3'  // نوع سوم: رسید پرداخت پایانه‌های فروشگاهی / POS
}

export enum MoadianInvoicePattern {
  PATTERN_1_GENERAL = 'PATTERN_1_GENERAL',       // الگوی ۱: فروش کالا و خدمات عمومی
  PATTERN_2_GOLD = 'PATTERN_2_GOLD',             // الگوی ۲: فروش طلا، جواهر و پلاتین
  PATTERN_3_CONTRACTING = 'PATTERN_3_CONTRACTING', // الگوی ۳: قراردادهای پیمانکاری / صورت‌وضعیت
  PATTERN_4_EXPORT = 'PATTERN_4_EXPORT',         // الگوی ۴: صادرات
  PATTERN_5_UTILITIES = 'PATTERN_5_UTILITIES',   // الگوی ۵: قبوض خدماتی
  PATTERN_6_AIRLINE = 'PATTERN_6_AIRLINE',       // الگوی ۶: بلیط هواپیما
  PATTERN_7_CARGO = 'PATTERN_7_CARGO'            // الگوی ۷: بارنامه
}

export enum MoadianInvoiceSubject {
  MAIN = 'MAIN',                 // اصلی (صورتحساب اولیه)
  CORRECTION = 'CORRECTION',     // اصلاحی (عطف به صورتحساب قبلی)
  CANCELLATION = 'CANCELLATION', // ابطالی (ابطال کامل صورتحساب قبلی)
  RETURN = 'RETURN'              // برگشت از فروش (برگشت بخشی یا تمام کالا/خدمات)
}

export enum MoadianInvoiceStatus {
  PENDING = 'PENDING',               // در انتظار ارسال
  QUEUED = 'QUEUED',                 // در صف ارسال (Outbox)
  SENT = 'SENT',                     // ارسال‌شده به سرور مالیاتی
  IN_PROGRESS = 'IN_PROGRESS',       // در حال پردازش در کارپوشه
  CONFIRMED = 'CONFIRMED',           // تایید نهایی در کارپوشه مودیان (مورد تایید ممیزی)
  REJECTED = 'REJECTED',             // رد شده به همراه کدهای خطای رسمی
  FAILED = 'FAILED'                  // خطای غیرقابل بازیابی در ارسال
}

export enum MoadianTransportMethod {
  DIRECT = 'DIRECT',                         // ارسال مستقیم توسط مودی با کلید اختصاصی
  TRUSTED_COMPANY = 'TRUSTED_COMPANY',       // ارسال از طریق شرکت‌های معتمد ارائه‌دهنده خدمات مالیاتی (TSP)
  GOVERNMENT_GATEWAY = 'GOVERNMENT_GATEWAY'  // سامانه جامع دولتی
}

export interface MoadianInvoiceHeader {
  taxId: string;                   // شماره منحصر به فرد مالیاتی ۲۲ کاراکتری (Tax ID)
  issueDateShamsi: string;         // تاریخ صدور به فرمت شمسی (مثلاً 1403/11/15)
  issueDateTimeStamp: number;      // زمان صدور به میلی‌ثانیه UTC
  invoiceType: MoadianInvoiceType;
  invoicePattern: MoadianInvoicePattern;
  invoiceSubject: MoadianInvoiceSubject;
  referenceTaxId?: string;         // شماره مالیاتی صورتحساب مرجع در اصلاحی/ابطالی
  sellerFiscalMemoryId: string;    // شناسه یکتای حافظه مالیاتی فروشنده (۶ کاراکتر)
  sellerNationalId: string;        // شناسه ملی / کد ملی فروشنده
  sellerEconomicCode?: string;     // کد اقتصادی قدیم/جدید فروشنده
  sellerPostalCode?: string;       // کد پستی فروشنده
  customerType?: 'LEGAL' | 'INDIVIDUAL' | 'FOREIGN_NATIONAL' | 'CONSUMER';
  customerNationalId?: string;     // شناسه ملی / کد ملی خریدار
  customerEconomicCode?: string;   // کد اقتصادی خریدار
  customerPostalCode?: string;     // کد پستی خریدار
  totalGrossAmount: string;        // مجموع مبلغ قبل از کسر تخفیف (ریال)
  totalDiscountAmount: string;     // مجموع تخفیفات (ریال)
  totalNetAmount: string;          // مجموع مبلغ پس از کسر تخفیف (ریال)
  totalVatAmount: string;          // مجموع مالیات بر ارزش افزوده (ریال)
  totalGrandAmount: string;        // مجموع کل صورتحساب (ریال)
  settlementMethod?: 'CASH' | 'CREDIT' | 'MIXED';
  cashPaidAmount?: string;
  creditPaidAmount?: string;
}

export interface MoadianInvoiceItem {
  rowNumber: number;
  sstid: string;                   // شناسه ۱۳ رقمی کالا یا خدمت در سامانه مودیان (Tax ID)
  description: string;             // شرح کالا یا خدمت
  quantity: string;                // تعداد یا مقدار
  unitCode: string;                // کد ۴ رقمی واحد اندازه‌گیری طبق جدول مودیان (مثلاً 1640 عدد)
  unitPrice: string;               // مبلغ واحد کالا/خدمت (ریال)
  totalPrice: string;              // مبلغ کل ناخالص (ریال)
  discountAmount: string;          // مبلغ تخفیف (ریال)
  netPrice: string;                // مبلغ خالص پس از کسر تخفیف (ریال)
  vatRate: string;                 // نرخ مالیات ارزش افزوده (مثلاً 0.10)
  vatAmount: string;               // مبلغ مالیات ارزش افزوده (ریال)
  otherTaxesAmount?: string;       // سایر عوارض و وجوه قانونی
  finalAmount: string;             // مبلغ نهایی سطر (ریال)
  // فیلدهای اختصاصی الگوی طلا (الگوی ۲)
  constructionWage?: string;       // اجرت ساخت طلا
  sellerProfit?: string;           // سود فروشنده
  commission?: string;             // حق‌العمل
}

export interface MoadianInvoicePayload {
  header: MoadianInvoiceHeader;
  items: MoadianInvoiceItem[];
}

export interface MoadianSendResult {
  isSuccess: boolean;
  referenceTaxId: string;
  packetId: string;
  trackingToken?: string;
  serverTimestamp?: number;
  errors?: Array<{ code: string; message: string }>;
}

export interface MoadianInquiryResult {
  taxId: string;
  status: MoadianInvoiceStatus;
  hasErrors: boolean;
  errors?: Array<{ code: string; message: string }>;
  confirmationDate?: string;
}
