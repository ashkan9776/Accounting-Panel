import Decimal from 'decimal.js';
import {
  ReceivablesAgingSummary,
  CashFlowTrendPoint,
  TopProductSalesKPI,
  FinancialAlertItem
} from './types';

Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

export class DashboardEngine {
  /**
   * ۱. تحلیل سن مطالبات مشتریان (Receivables Aging Analysis)
   */
  public static calculateReceivablesAging(params: {
    asOfDateShamsi: string;
    items: Array<{
      partyId: string;
      partyName: string;
      openAmount: string | number;
      invoiceDateShamsi: string;
      dueDateShamsi?: string;
    }>;
  }): ReceivablesAgingSummary {
    let totalReceivables = new Decimal(0);

    let count0To30 = 0;
    let amt0To30 = new Decimal(0);

    let count31To60 = 0;
    let amt31To60 = new Decimal(0);

    let count61To90 = 0;
    let amt61To90 = new Decimal(0);

    let countOver90 = 0;
    let amtOver90 = new Decimal(0);

    let weightedDaysSum = new Decimal(0);

    for (const it of params.items) {
      const amt = new Decimal(it.openAmount || 0);
      if (amt.lessThanOrEqualTo(0)) continue;

      totalReceivables = totalReceivables.plus(amt);

      // محاسبه تقریبی اختلاف روز با تاریخ جاری بر اساس تاریخ شمسی YYYY/MM/DD
      const daysPassed = this.calculateDaysBetweenShamsi(it.invoiceDateShamsi, params.asOfDateShamsi);
      weightedDaysSum = weightedDaysSum.plus(amt.times(daysPassed));

      if (daysPassed <= 30) {
        count0To30++;
        amt0To30 = amt0To30.plus(amt);
      } else if (daysPassed <= 60) {
        count31To60++;
        amt31To60 = amt31To60.plus(amt);
      } else if (daysPassed <= 90) {
        count61To90++;
        amt61To90 = amt61To90.plus(amt);
      } else {
        countOver90++;
        amtOver90 = amtOver90.plus(amt);
      }
    }

    const calcPct = (amt: Decimal) =>
      totalReceivables.greaterThan(0)
        ? `${amt.dividedBy(totalReceivables).times(100).toDecimalPlaces(1)}%`
        : '0%';

    const weightedAvgDays = totalReceivables.greaterThan(0)
      ? weightedDaysSum.dividedBy(totalReceivables).toDecimalPlaces(0).toFixed(0)
      : '0';

    return {
      asOfDateShamsi: params.asOfDateShamsi,
      totalReceivables: totalReceivables.toFixed(0),

      current0To30Days: {
        bucketName: 'جاری (۰ تا ۳۰ روز)',
        partyCount: count0To30,
        totalAmount: amt0To30.toFixed(0),
        percentageOfTotal: calcPct(amt0To30)
      },

      pastDue31To60Days: {
        bucketName: 'سررسید گذشته (۳۱ تا ۶۰ روز)',
        partyCount: count31To60,
        totalAmount: amt31To60.toFixed(0),
        percentageOfTotal: calcPct(amt31To60)
      },

      pastDue61To90Days: {
        bucketName: 'مطالبات معوق (۶۱ تا ۹۰ روز)',
        partyCount: count61To90,
        totalAmount: amt61To90.toFixed(0),
        percentageOfTotal: calcPct(amt61To90)
      },

      overdueOver90Days: {
        bucketName: 'مشکوک‌الوصول (بیش از ۹۰ روز)',
        partyCount: countOver90,
        totalAmount: amtOver90.toFixed(0),
        percentageOfTotal: calcPct(amtOver90)
      },

      weightedAverageCollectionDays: weightedAvgDays
    };
  }

  /**
   * ۲. محاسبه روند سری زمانی نقدینگی و مانده تجمیعی (Cash Trend)
   */
  public static buildCashFlowTrend(params: {
    openingBalance: string | number;
    dailyMovements: Array<{
      dateShamsi: string;
      inflow: string | number;
      outflow: string | number;
    }>;
  }): CashFlowTrendPoint[] {
    let runningBalance = new Decimal(params.openingBalance || 0);
    const points: CashFlowTrendPoint[] = [];

    for (const d of params.dailyMovements) {
      const inf = new Decimal(d.inflow || 0);
      const outf = new Decimal(d.outflow || 0);
      const net = inf.minus(outf);
      runningBalance = runningBalance.plus(net);

      points.push({
        dateShamsi: d.dateShamsi,
        cashInflow: inf.toFixed(0),
        cashOutflow: outf.toFixed(0),
        netCash: net.toFixed(0),
        cumulativeBalance: runningBalance.toFixed(0)
      });
    }

    return points;
  }

  /**
   * ۳. رتبه‌بندی محصولات برتر از نظر فروش و سود ناخالص
   */
  public static rankTopProducts(
    products: Array<{
      productId: string;
      productTitle: string;
      unitsSold: string | number;
      totalRevenue: string | number;
      totalCost: string | number;
    }>,
    limit: number = 5
  ): TopProductSalesKPI[] {
    const list = products.map((p) => {
      const rev = new Decimal(p.totalRevenue || 0);
      const cost = new Decimal(p.totalCost || 0);
      const profit = rev.minus(cost);
      const margin = rev.greaterThan(0)
        ? `${profit.dividedBy(rev).times(100).toDecimalPlaces(1)}%`
        : '0%';

      return {
        productId: p.productId,
        productTitle: p.productTitle,
        unitsSold: new Decimal(p.unitsSold || 0).toFixed(0),
        totalRevenue: rev.toFixed(0),
        totalProfit: profit.toFixed(0),
        profitMarginPercentage: margin
      };
    });

    list.sort((a, b) => new Decimal(b.totalRevenue).minus(a.totalRevenue).toNumber());
    return list.slice(0, limit);
  }

  /**
   * ۴. محاسبه نقطه سر به سر فروش (Break-even Point)
   */
  public static calculateBreakEvenPoint(params: {
    fixedCosts: string | number;
    totalRevenues: string | number;
    variableCosts: string | number;
  }): {
    contributionMarginAmount: string;
    contributionMarginRatio: string;
    breakEvenSalesAmount: string;
    marginOfSafetyAmount: string;
    marginOfSafetyPercentage: string;
  } {
    const fc = new Decimal(params.fixedCosts || 0);
    const rev = new Decimal(params.totalRevenues || 0);
    const vc = new Decimal(params.variableCosts || 0);

    const cm = rev.minus(vc);
    const cmr = rev.greaterThan(0) ? cm.dividedBy(rev) : new Decimal(0);

    const bep = cmr.greaterThan(0) ? fc.dividedBy(cmr).round() : new Decimal(0);
    const mos = Decimal.max(0, rev.minus(bep));
    const mosPct = rev.greaterThan(0) ? mos.dividedBy(rev).times(100).toDecimalPlaces(1) : new Decimal(0);

    return {
      contributionMarginAmount: cm.toFixed(0),
      contributionMarginRatio: `${cmr.times(100).toFixed(1)}%`,
      breakEvenSalesAmount: bep.toFixed(0),
      marginOfSafetyAmount: mos.toFixed(0),
      marginOfSafetyPercentage: `${mosPct.toFixed(1)}%`
    };
  }

  /**
   * ۵. ارزیابی هشدارهای هوشمند مالیاتی، بانکی و نقدینگی
   */
  public static evaluateFinancialAlerts(params: {
    cashBalance: string | number;
    upcomingChequesDue: string | number;
    overdueReceivables: string | number;
    nextTaxPaymentDateShamsi?: string;
    nextInsurancePaymentDateShamsi?: string;
  }): FinancialAlertItem[] {
    const alerts: FinancialAlertItem[] = [];
    const cash = new Decimal(params.cashBalance || 0);
    const cheques = new Decimal(params.upcomingChequesDue || 0);
    const overdue = new Decimal(params.overdueReceivables || 0);

    // ۱. بررسی پوشش چک‌های سررسید نزدیک
    if (cheques.greaterThan(cash)) {
      alerts.push({
        id: 'alert-cash-deficit',
        severity: 'CRITICAL',
        title: 'خطر کسری نقدینگی برای پاس کردن چک‌های صادره',
        message: `مجموع چک‌های سررسید آتی (${cheques.toFixed(0)} ریال) از کل مانده نقد و بانک (${cash.toFixed(0)} ریال) بیشتر است.`,
        actionRequired: 'تزریق فوری نقدینگی یا وصول فوری مطالبات جاری جهت جلوگیری از برگشت چک صیاد.'
      });
    }

    // ۲. بررسی مطالبات معوق با ریسک سوخت
    if (overdue.greaterThan(0)) {
      alerts.push({
        id: 'alert-overdue-receivables',
        severity: 'WARNING',
        title: 'وجود مطالبات سررسید گذشته از مشتریان',
        message: `مبلغ ${overdue.toFixed(0)} ریال از فاکتورهای فروش بیش از ۶۰ روز معوق مانده‌اند.`,
        actionRequired: 'پیگیری حقوقی یا فعال‌سازی مسدودی فروش اعتباری برای مشتریان با حساب باز.'
      });
    }

    // ۳. هشدار موعد تکالیف مالیاتی
    if (params.nextTaxPaymentDateShamsi) {
      alerts.push({
        id: 'alert-tax-deadline',
        severity: 'INFO',
        title: 'مهلت ارسال اظهارنامه و تسویه مالیاتی',
        message: `آخرین مهلت قانونی اظهارنامه ارزش افزوده / ماده ۱۶۹: ${params.nextTaxPaymentDateShamsi}`,
        dueDateShamsi: params.nextTaxPaymentDateShamsi,
        actionRequired: 'کنترل نهایی دفاتر کل و ارسال به موقع جهت جلوگیری از جرایم غیرقابل بخشش.'
      });
    }

    return alerts;
  }

  /**
   * محاسبه روزهای بین دو تاریخ شمسی به صورت تخمینی و دقیق
   */
  private static calculateDaysBetweenShamsi(date1: string, date2: string): number {
    try {
      const [y1, m1, d1] = date1.split('/').map(Number);
      const [y2, m2, d2] = date2.split('/').map(Number);
      const days1 = y1 * 365 + (m1 <= 6 ? (m1 - 1) * 31 : 6 * 31 + (m1 - 7) * 30) + d1;
      const days2 = y2 * 365 + (m2 <= 6 ? (m2 - 1) * 31 : 6 * 31 + (m2 - 7) * 30) + d2;
      return Math.max(0, days2 - days1);
    } catch {
      return 0;
    }
  }
}
