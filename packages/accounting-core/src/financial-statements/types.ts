import Decimal from 'decimal.js';

// ==========================================
// ۱. تایپ‌های ترازنامه (Balance Sheet) - استاندارد ۱ ایران
// ==========================================

export interface FinancialStatementLine {
  code: string;
  title: string;
  amount: string;
  notes?: string;
}

export interface BalanceSheetSection {
  title: string;
  lines: FinancialStatementLine[];
  subtotal: string;
}

export interface BalanceSheetReport {
  companyTitle: string;
  asOfDateShamsi: string;
  currency: string;

  // ۱. دارایی‌ها (Assets)
  currentAssets: BalanceSheetSection;       // دارایی‌های جاری
  nonCurrentAssets: BalanceSheetSection;    // دارایی‌های غیرجاری
  totalAssets: string;                      // جمع کل دارایی‌ها

  // ۲. بدهی‌ها (Liabilities)
  currentLiabilities: BalanceSheetSection;    // بدهی‌های جاری
  nonCurrentLiabilities: BalanceSheetSection; // بدهی‌های غیرجاری
  totalLiabilities: string;                   // جمع کل بدهی‌ها

  // ۳. حقوق مالکانه / حقوق صاحبان سرمایه (Equity)
  equity: BalanceSheetSection;
  netIncomeCurrentPeriod: string;           // سود (زیان) خالص دوره جاری
  totalEquity: string;                      // جمع حقوق صاحبان سرمایه

  // ۴. جمع کل بدهی‌ها و حقوق مالکانه
  totalLiabilitiesAndEquity: string;
  isBalanced: boolean;                      // آیا دارایی = بدهی + حقوق مالکانه است؟
  discrepancyAmount: string;                // مبلغ مغایرت (باید صفر باشد)
}

// ==========================================
// ۲. تایپ‌های صورت سود و زیان جامع (Income Statement)
// ==========================================

export interface IncomeStatementReport {
  companyTitle: string;
  fromDateShamsi: string;
  toDateShamsi: string;
  currency: string;

  // ۱. درآمدهای عملیاتی و بهای تمام‌شده
  grossRevenues: string;                    // درآمدهای ناخالص عملیاتی (فروش)
  salesDiscountsAndReturns: string;         // تخفیفات و برگشت از فروش
  netRevenues: string;                      // درآمد عملیاتی خالص
  costOfGoodsAndServicesSold: string;       // بهای تمام‌شده کالای فروش‌رفته و خدمات (COGS)
  grossProfit: string;                      // سود (زیان) ناخالص

  // ۲. هزینه‌های عملیاتی و اداری
  administrativeExpenses: string;           // هزینه‌های عمومی، اداری و تشکیلاتی
  salesAndDistributionExpenses: string;     // هزینه‌های توزیع و فروش
  totalOperatingExpenses: string;           // جمع هزینه‌های عملیاتی
  operatingProfit: string;                  // سود (زیان) عملیاتی

  // ۳. اقلام غیرعملیاتی و مالی
  financialExpenses: string;                // هزینه‌های مالی (کارمزد، سود تسهیلات)
  otherNonOperatingRevenues: string;        // سایر درآمدهای غیرعملیاتی (سود واگذاری دارایی و ...)
  otherNonOperatingExpenses: string;        // سایر هزینه‌های غیرعملیاتی (زیان واگذاری و ...)
  profitBeforeTax: string;                  // سود (زیان) قبل از مالیات

  // ۴. مالیات و سود خالص نهایی
  incomeTaxProvision: string;               // مالیات بر درآمد عملکرد (ماده ۱۰۵)
  netIncome: string;                        // سود (زیان) خالص دوره
  isProfitable: boolean;                    // آیا شرکت سودده است؟
}

// ==========================================
// ۳. تایپ‌های صورت جریان وجوه نقد (Cash Flow Statement) - استاندارد ۲ ایران
// ==========================================

export interface CashFlowReport {
  companyTitle: string;
  fromDateShamsi: string;
  toDateShamsi: string;
  currency: string;

  // بخش ۱: فعالیت‌های عملیاتی (Operating Activities)
  operatingActivities: {
    netIncome: string;                      // سود خالص دوره
    depreciationAdjustment: string;         // تعدیل استهلاک دارایی‌ها (غیرنقدی)
    otherNonCashAdjustments: string;        // سایر تعدیلات غیرنقدی
    workingCapitalChanges: {
      accountsReceivableChange: string;     // تغییر در بدهکاران و دریافتنی‌ها
      inventoryChange: string;              // تغییر در موجودی کالا و مواد
      accountsPayableChange: string;        // تغییر در بستانکاران و پرداختنی‌ها
      netWorkingCapitalImpact: string;      // اثر خالص سرمایه در گردش
    };
    netCashFromOperatingActivities: string; // خالص جریان نقد ناشی از فعالیت‌های عملیاتی
  };

  // بخش ۲: فعالیت‌های سرمایه‌گذاری (Investing Activities)
  investingActivities: {
    fixedAssetPurchases: string;            // خرید و تحصیل دارایی‌های ثابت
    fixedAssetSaleProceeds: string;         // وجوه حاصل از فروش دارایی‌های ثابت
    netCashFromInvestingActivities: string; // خالص جریان نقد ناشی از فعالیت‌های سرمایه‌گذاری
  };

  // بخش ۳: فعالیت‌های تامین مالی (Financing Activities)
  financingActivities: {
    capitalInjections: string;              // افزایش سرمایه نقدی سهامداران
    borrowingsOrLoanRepayments: string;     // تسهیلات مالی دریافتی یا تسویه‌شده
    dividendsPaid: string;                  // سود سهام پرداختی
    netCashFromFinancingActivities: string; // خالص جریان نقد ناشی از فعالیت‌های تامین مالی
  };

  // تطبیق با مانده پایان دوره
  netChangeInCash: string;                  // خالص افزایش (کاهش) در وجوه نقد
  beginningCashBalance: string;             // موجودی نقد ابتدای دوره
  endingCashBalance: string;                // موجودی نقد انتهای دوره (باید با دفاتر مطابقت کند)
}

// ==========================================
// ۴. تایپ‌های نسبت‌های مالی (Financial Ratios)
// ==========================================

export interface LiquidityRatios {
  currentRatio: string;                     // نسبت جاری (Current Assets / Current Liabilities)
  quickRatio: string;                       // نسبت آنی ((Current Assets - Inventory) / Current Liabilities)
  cashRatio: string;                        // نسبت نقدینگی (Cash / Current Liabilities)
}

export interface ProfitabilityRatios {
  grossProfitMarginPercentage: string;      // درصد حاشیه سود ناخالص
  operatingMarginPercentage: string;        // درصد حاشیه سود عملیاتی
  netProfitMarginPercentage: string;        // درصد حاشیه سود خالص
  returnOnAssetsPercentage: string;         // بازده دارایی‌ها (ROA)
  returnOnEquityPercentage: string;         // بازده حقوق صاحبان سهام (ROE)
}

export interface ActivityRatios {
  inventoryTurnoverRatio: string;           // گردش موجودی کالا (COGS / Average Inventory)
  daysInInventory: string;                  // دوره گردش موجودی به روز (365 / Inventory Turnover)
  assetTurnoverRatio: string;               // گردش کل دارایی‌ها (Net Sales / Total Assets)
}

export interface LeverageRatios {
  debtRatioPercentage: string;              // نسبت بدهی (Total Debt / Total Assets)
  debtToEquityRatio: string;                // نسبت بدهی به حقوق صاحبان سهام (Total Debt / Total Equity)
  equityMultiplier: string;                 // ضریب حقوق صاحبان سهام (Total Assets / Total Equity)
}

export interface FinancialRatiosReport {
  companyTitle: string;
  asOfDateShamsi: string;
  liquidity: LiquidityRatios;
  profitability: ProfitabilityRatios;
  activity: ActivityRatios;
  leverage: LeverageRatios;
  financialHealthGrade: 'EXCELLENT' | 'GOOD' | 'MODERATE' | 'VULNERABLE' | 'DISTRESSED';
  summaryObservations?: string[];
  observations: string[];
}

// ==========================================
// ۵. تایپ‌های داشبورد مدیریتی و هوش تجاری (BI & KPIs)
// ==========================================

export interface CashFlowTrendPoint {
  dateShamsi: string;
  cashInflow: string;
  cashOutflow: string;
  netCash: string;
  cumulativeBalance: string;
}

export interface ReceivablesAgingBucket {
  bucketName: string;                       // جاری (0-30 روز)، 31-60 روز، 61-90 روز، بالای 90 روز
  partyCount: number;
  totalAmount: string;
  percentageOfTotal: string;
}

export interface ReceivablesAgingSummary {
  asOfDateShamsi: string;
  totalReceivables: string;
  current0To30Days: ReceivablesAgingBucket;
  pastDue31To60Days: ReceivablesAgingBucket;
  pastDue61To90Days: ReceivablesAgingBucket;
  overdueOver90Days: ReceivablesAgingBucket;
  weightedAverageCollectionDays: string;
}

export interface TopProductSalesKPI {
  productId: string;
  productTitle: string;
  unitsSold: string;
  totalRevenue: string;
  totalProfit: string;
  profitMarginPercentage: string;
}

export interface FinancialAlertItem {
  id: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  title: string;
  message: string;
  dueDateShamsi?: string;
  actionRequired: string;
}

export interface ExecutiveDashboardReport {
  companyTitle: string;
  reportDateShamsi: string;
  todayCashBalance: string;                 // مانده نقد و بانک امروز
  monthlySalesRevenue: string;              // فروش ماه جاری
  monthlySalesGrowthPercentage: string;     // رشد فروش نسبت به ماه قبل
  monthlyGrossProfit: string;               // سود ناخالص ماه جاری
  monthlyNetProfit: string;                 // سود خالص ماه جاری
  totalOpenReceivables: string;             // مطالبات باز از مشتریان
  totalOpenPayables: string;                // بدهی‌های باز به تامین‌کنندگان
  receivablesAging: ReceivablesAgingSummary;
  cashTrendLast30Days: CashFlowTrendPoint[];
  topProducts: TopProductSalesKPI[];
  activeAlerts: FinancialAlertItem[];
}
