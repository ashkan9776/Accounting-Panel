import Decimal from 'decimal.js';

export enum TaxQuarter {
  SPRING = 'SPRING', // بهار (۱ فروردین تا ۳۱ خرداد)
  SUMMER = 'SUMMER', // تابستان (۱ تیر تا ۳۱ شهریور)
  AUTUMN = 'AUTUMN', // پاییز (۱ مهر تا ۳۰ آذر)
  WINTER = 'WINTER'  // زمستان (۱ دی تا ۲۹/۳۰ اسفند)
}

export interface VatReturnSummary {
  yearShamsi: string;
  quarter: TaxQuarter;

  // فروش و خروجی ارزش افزوده
  grossSalesAmount: string;       // فروش ناخالص
  exemptSalesAmount: string;      // فروش معاف از مالیات
  taxableSalesAmount: string;     // فروش مشمول مالیات
  outputVatCollected: string;     // مالیات بر ارزش افزوده فروش (وصول‌شده)

  // خرید و ورودی ارزش افزوده (اعتبار مالیاتی)
  grossPurchasesAmount: string;   // خرید ناخالص
  exemptPurchasesAmount: string;  // خرید معاف از مالیات
  taxablePurchasesAmount: string; // خرید مشمول مالیات
  inputVatCredit: string;         // مالیات بر ارزش افزوده خرید (اعتبار مالیاتی پرداختی)

  // نتیجه اظهارنامه
  netVatPayable: string;          // خالص مالیات قابل پرداخت به سازمان امور مالیاتی
  isRefundableOrCredit: boolean;  // آیا طلبکار هستیم (اعتبار انتقالی به دوره بعد)
}

export interface Article169TransactionRecord {
  rowNumber: number;
  transactionType: 'SALE' | 'PURCHASE';
  partyName: string;
  partyNationalId: string;
  partyEconomicCode?: string;
  partyType: 'LEGAL' | 'INDIVIDUAL';
  invoiceNumber: string;
  invoiceDateShamsi: string;
  amountWithoutVat: string;
  vatAmount: string;
  totalAmount: string;
}

export interface Article169SeasonalReport {
  yearShamsi: string;
  quarter: TaxQuarter;
  salesCount: number;
  totalSalesAmount: string;
  totalSalesVat: string;
  purchasesCount: number;
  totalPurchasesAmount: string;
  totalPurchasesVat: string;
  transactions: Article169TransactionRecord[];
}

export interface CorporateTaxEstimation {
  yearShamsi: string;
  totalRevenues: string;          // مجموع درآمدهای عملیاتی و غیرعملیاتی
  totalAllowableExpenses: string; // مجموع هزینه‌های قابل قبول مالیاتی (ماده ۱۴۷ و ۱۴۸)
  accountingProfit: string;       // سود حسابداری قبل از کسر مالیات
  taxExemptions: string;          // معافیت‌های قانونی مالیاتی
  taxableProfit: string;          // سود مشمول مالیات (درآمد مشمول مالیات)
  taxRate: string;                // نرخ مالیات بر درآمد اشخاص حقوقی (ماده ۱۰۵: 0.25)
  estimatedTaxProvision: string;  // مبلغ ذخیره مالیات بر درآمد عملکرد
}
