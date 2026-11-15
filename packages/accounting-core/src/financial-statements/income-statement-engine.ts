import Decimal from 'decimal.js';
import { IncomeStatementReport } from './types';
import { TrialBalanceRow } from '../reports/trial-balance';

Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

export class IncomeStatementEngine {
  /**
   * تولید صورت سود و زیان جامع چند مرحله‌ای مطابق استاندارد حسابداری ایران
   */
  public static generateIncomeStatement(params: {
    companyTitle: string;
    fromDateShamsi: string;
    toDateShamsi: string;
    currency?: string;
    trialBalanceRows: TrialBalanceRow[];
    corporateTaxRate?: string | number; // پیش‌فرض 0.25 (۲۵٪)
  }): IncomeStatementReport {
    const cur = params.currency || 'IRR';
    const rows = params.trialBalanceRows;

    let grossRevenues = new Decimal(0);
    let salesDiscounts = new Decimal(0);
    let cogs = new Decimal(0);
    let adminExpenses = new Decimal(0);
    let salesExpenses = new Decimal(0);
    let financialExpenses = new Decimal(0);
    let otherRevenues = new Decimal(0);
    let otherExpenses = new Decimal(0);
    let bookedTaxExpense = new Decimal(0);

    for (const r of rows) {
      const code = r.accountCode;
      const debitPeriod = new Decimal(r.periodDebit || 0);
      const creditPeriod = new Decimal(r.periodCredit || 0);

      // درآمدهای عملیاتی (کد ۶۱)
      if (code.startsWith('61')) {
        if (code === '6106') {
          // سود ناشی از واگذاری دارایی‌های ثابت (غیرعملیاتی)
          otherRevenues = otherRevenues.plus(creditPeriod.minus(debitPeriod));
        } else if ((code === '6102' || code === '6103') && debitPeriod.greaterThan(creditPeriod)) {
          // برگشت از فروش و تخفیفات فروش در ساختارهای حساب ۶۱
          salesDiscounts = salesDiscounts.plus(debitPeriod.minus(creditPeriod));
        } else {
          // فروش ناخالص کالا، خدمات یا رستوران
          grossRevenues = grossRevenues.plus(creditPeriod.minus(debitPeriod));
        }
      }
      // تخفیفات و برگشت از فروش (کد ۶۲)
      else if (code.startsWith('62')) {
        salesDiscounts = salesDiscounts.plus(debitPeriod.minus(creditPeriod));
      }
      // سایر درآمدهای متفرقه و غیرعملیاتی (کد ۶۳ یا ۶۴)
      else if (code.startsWith('63') || code.startsWith('64')) {
        otherRevenues = otherRevenues.plus(creditPeriod.minus(debitPeriod));
      }
      // بهای تمام‌شده و هزینه‌های ساخت (کد ۷۱)
      else if (code.startsWith('71')) {
        // هزینه‌های جذب‌شده تولید و بهای تمام‌شده
        cogs = cogs.plus(debitPeriod.minus(creditPeriod));
      }
      // هزینه‌های عملیاتی و اداری (کد ۸۱)
      else if (code.startsWith('81')) {
        if (code === '8106' || code === '8109') {
          // هزینه مالیات بر درآمد عملکرد
          bookedTaxExpense = bookedTaxExpense.plus(debitPeriod.minus(creditPeriod));
        } else if (code === '8110') {
          // زیان واگذاری دارایی‌های ثابت (غیرعملیاتی)
          otherExpenses = otherExpenses.plus(debitPeriod.minus(creditPeriod));
        } else if (code.startsWith('8105')) {
          // هزینه‌های مالی
          financialExpenses = financialExpenses.plus(debitPeriod.minus(creditPeriod));
        } else if (code === '8107') {
          // هزینه‌های توزیع و فروش
          salesExpenses = salesExpenses.plus(debitPeriod.minus(creditPeriod));
        } else {
          // هزینه‌های عمومی و اداری و حقوق و استهلاک
          adminExpenses = adminExpenses.plus(debitPeriod.minus(creditPeriod));
        }
      }
    }

    // ۱. محاسبات فروش و سود ناخالص
    const netRevenues = grossRevenues.minus(salesDiscounts);
    const grossProfit = netRevenues.minus(cogs);

    // ۲. هزینه‌های عملیاتی و سود عملیاتی
    const totalOperatingExpenses = adminExpenses.plus(salesExpenses);
    const operatingProfit = grossProfit.minus(totalOperatingExpenses);

    // ۳. سود قبل از مالیات
    const profitBeforeTax = operatingProfit
      .minus(financialExpenses)
      .plus(otherRevenues)
      .minus(otherExpenses);

    // ۴. مالیات عملکرد و سود خالص
    let taxProvision = bookedTaxExpense;
    if (taxProvision.isZero() && profitBeforeTax.greaterThan(0)) {
      const rate = new Decimal(params.corporateTaxRate || 0.25);
      taxProvision = profitBeforeTax.times(rate).round();
    }

    const netIncome = profitBeforeTax.minus(taxProvision);
    const isProfitable = netIncome.greaterThan(0);

    return {
      companyTitle: params.companyTitle,
      fromDateShamsi: params.fromDateShamsi,
      toDateShamsi: params.toDateShamsi,
      currency: cur,

      grossRevenues: grossRevenues.toFixed(0),
      salesDiscountsAndReturns: salesDiscounts.toFixed(0),
      netRevenues: netRevenues.toFixed(0),
      costOfGoodsAndServicesSold: cogs.toFixed(0),
      grossProfit: grossProfit.toFixed(0),

      administrativeExpenses: adminExpenses.toFixed(0),
      salesAndDistributionExpenses: salesExpenses.toFixed(0),
      totalOperatingExpenses: totalOperatingExpenses.toFixed(0),
      operatingProfit: operatingProfit.toFixed(0),

      financialExpenses: financialExpenses.toFixed(0),
      otherNonOperatingRevenues: otherRevenues.toFixed(0),
      otherNonOperatingExpenses: otherExpenses.toFixed(0),
      profitBeforeTax: profitBeforeTax.toFixed(0),

      incomeTaxProvision: taxProvision.toFixed(0),
      netIncome: netIncome.toFixed(0),
      isProfitable
    };
  }
}
