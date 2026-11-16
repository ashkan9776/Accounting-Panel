/**
 * تایپ‌های صندوق فروشگاهی، پایانه‌های فروشگاهی و ماژول POS آفلاین
 */

export enum PosShiftStatus {
  OPEN = 'OPEN',     // شیفت فعال و باز
  CLOSED = 'CLOSED'  // شیفت بسته و تسویه‌شده
}

export enum PosPaymentMethod {
  CASH = 'CASH',         // نقدی (صندوق)
  POS_CARD = 'POS_CARD', // کارتخوان بانکی
  MIXED = 'MIXED',       // ترکیبی نقدی + کارتخوان
  CREDIT = 'CREDIT'      // نسیه / مشتری اعتباری
}

export enum PosOrderStatus {
  HOLD = 'HOLD',           // سفارش معلق / در انتظار مشتری
  COMPLETED = 'COMPLETED', // پرداخت و تکمیل شده
  CANCELLED = 'CANCELLED', // لغو شده
  REFUNDED = 'REFUNDED'    // مرجوعی / عودت داده شده
}

export enum CashMovementType {
  CASH_DROP = 'CASH_DROP', // تخلیه یا انتقال وجه به گاوصندوق/بانک (Drop)
  CASH_IN = 'CASH_IN',     // واریز پول خرد به صندوق (Float In)
  EXPENSE = 'EXPENSE'      // هزینه تنخواه خرد از صندوق
}

export interface CashDenominationBreakdown {
  toman50000?: number;   // اسکناس ۵۰,۰۰۰ تومانی (۵۰۰,۰۰۰ ریال)
  toman100000?: number;  // ایران‌چک ۱۰۰,۰۰۰ تومانی (۱,۰۰۰,۰۰۰ ریال)
  toman200000?: number;  // ایران‌چک ۲۰۰,۰۰۰ تومانی (۲,۰۰۰,۰۰۰ ریال)
  coinsAndOther?: number; // خرده‌ریز و سایر مسکوکات (به ریال)
}

export interface WeightBarcodeParsedResult {
  isWeightBarcode: boolean;
  productCode: string;
  weightGrams?: number;
  weightKg?: string;
  priceRials?: string;
}

export interface ConsolidatedShiftPostingContext {
  shiftNumber: string;
  dateShamsi: string;
  cashDeskDimensionId: string;       // تفصیلی شناور صندوق نقدی (معین ۱۱۰۱)
  posTerminalDimensionId: string;   // تفصیلی شناور پایانه کارتخوان (معین ۱۱۰۴)
  totalCashSales: string | number;   // جمع کل فروش‌های نقدی
  totalPosCardSales: string | number;// جمع کل فروش‌های کارتی
  totalDiscount: string | number;    // جمع کل تخفیفات فروشگاه
  totalGrossSales: string | number;  // جمع کل فروش ناخالص کالاها
  totalVat: string | number;         // جمع کل مالیات ارزش افزوده (۱۰٪)
  totalCogs?: string | number;       // جمع کل بهای تمام‌شده کالای فروش‌رفته (COGS)
  costCenterDimensionId?: string;    // مرکز هزینه فروشگاه
  // مغایرت کسری یا فزونی نقدینگی صندوق در پایان شیفت
  cashDiscrepancy?: string | number; // منفی: کسری صندوق / مثبت: فزونی صندوق
  accountOverrides?: {
    cashAccountId?: string;
    posInTransitAccountId?: string;
    discountAccountId?: string;
    salesRevenueAccountId?: string;
    vatOutputAccountId?: string;
  };
}
