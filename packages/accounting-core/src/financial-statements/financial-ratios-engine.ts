import Decimal from 'decimal.js';
import { FinancialRatiosReport, BalanceSheetReport, IncomeStatementReport } from './types';

Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

export class FinancialRatiosEngine {
  /**
   * محاسبه جامع نسبت‌های مالی و ارزیابی سلامت تجاری بنگاه
   */
  public static calculateRatios(params: {
    balanceSheet: BalanceSheetReport;
    incomeStatement: IncomeStatementReport;
    inventoryAmount?: string | number;
    cashAndBankAmount?: string | number;
  }): FinancialRatiosReport {
    const bs = params.balanceSheet;
    const is = params.incomeStatement;

    const currentAssets = new Decimal(bs.currentAssets.subtotal);
    const totalAssets = new Decimal(bs.totalAssets);
    const currentLiabilities = new Decimal(bs.currentLiabilities.subtotal);
    const totalLiabilities = new Decimal(bs.totalLiabilities);
    const totalEquity = new Decimal(bs.totalEquity);

    const netSales = new Decimal(is.netRevenues);
    const cogs = new Decimal(is.costOfGoodsAndServicesSold);
    const grossProfit = new Decimal(is.grossProfit);
    const operatingProfit = new Decimal(is.operatingProfit);
    const netIncome = new Decimal(is.netIncome);

    // استخراج موجودی انبار و وجوه نقد از سطور ترازنامه در صورت عدم ارسال مستقیم
    let inventory = new Decimal(params.inventoryAmount || 0);
    if (inventory.isZero()) {
      for (const l of bs.currentAssets.lines) {
        if (l.code.startsWith('15')) {
          inventory = inventory.plus(l.amount);
        }
      }
    }

    let cash = new Decimal(params.cashAndBankAmount || 0);
    if (cash.isZero()) {
      for (const l of bs.currentAssets.lines) {
        if (l.code.startsWith('11')) {
          cash = cash.plus(l.amount);
        }
      }
    }

    // ۱. نسبت‌های نقدینگی (Liquidity Ratios)
    const curRatio = currentLiabilities.greaterThan(0)
      ? currentAssets.dividedBy(currentLiabilities).toDecimalPlaces(2)
      : new Decimal(0);

    const quickAssets = Decimal.max(0, currentAssets.minus(inventory));
    const qkRatio = currentLiabilities.greaterThan(0)
      ? quickAssets.dividedBy(currentLiabilities).toDecimalPlaces(2)
      : new Decimal(0);

    const cshRatio = currentLiabilities.greaterThan(0)
      ? cash.dividedBy(currentLiabilities).toDecimalPlaces(2)
      : new Decimal(0);

    // ۲. نسبت‌های سودآوری (Profitability Ratios)
    const gpm = netSales.greaterThan(0)
      ? grossProfit.dividedBy(netSales).times(100).toDecimalPlaces(2)
      : new Decimal(0);

    const opm = netSales.greaterThan(0)
      ? operatingProfit.dividedBy(netSales).times(100).toDecimalPlaces(2)
      : new Decimal(0);

    const npm = netSales.greaterThan(0)
      ? netIncome.dividedBy(netSales).times(100).toDecimalPlaces(2)
      : new Decimal(0);

    const roa = totalAssets.greaterThan(0)
      ? netIncome.dividedBy(totalAssets).times(100).toDecimalPlaces(2)
      : new Decimal(0);

    const roe = totalEquity.greaterThan(0)
      ? netIncome.dividedBy(totalEquity).times(100).toDecimalPlaces(2)
      : new Decimal(0);

    // ۳. نسبت‌های فعالیت (Activity Ratios)
    const invTurnover = inventory.greaterThan(0)
      ? cogs.dividedBy(inventory).toDecimalPlaces(2)
      : new Decimal(0);

    const daysInInv = invTurnover.greaterThan(0)
      ? new Decimal(365).dividedBy(invTurnover).toDecimalPlaces(0)
      : new Decimal(0);

    const assetTurnover = totalAssets.greaterThan(0)
      ? netSales.dividedBy(totalAssets).toDecimalPlaces(2)
      : new Decimal(0);

    // ۴. نسبت‌های اهرمی (Leverage Ratios)
    const debtRatio = totalAssets.greaterThan(0)
      ? totalLiabilities.dividedBy(totalAssets).times(100).toDecimalPlaces(2)
      : new Decimal(0);

    const debtToEquity = totalEquity.greaterThan(0)
      ? totalLiabilities.dividedBy(totalEquity).toDecimalPlaces(2)
      : new Decimal(0);

    const equityMultiplier = totalEquity.greaterThan(0)
      ? totalAssets.dividedBy(totalEquity).toDecimalPlaces(2)
      : new Decimal(0);

    // ۵. درجه سلامت مالی و نکات تحلیلی
    let grade: 'EXCELLENT' | 'GOOD' | 'MODERATE' | 'VULNERABLE' | 'DISTRESSED' = 'GOOD';
    const observations: string[] = [];

    if (curRatio.greaterThanOrEqualTo(2.0) && qkRatio.greaterThanOrEqualTo(1.2) && npm.greaterThanOrEqualTo(15)) {
      grade = 'EXCELLENT';
      observations.push('توان نقدینگی و سودآوری سازمان در سطح عالی و بسیار امن قرار دارد.');
    } else if (curRatio.greaterThanOrEqualTo(1.3) && npm.greaterThan(0)) {
      grade = 'GOOD';
      observations.push('وضعیت نقدینگی و بازدهی عملیاتی مطلوب و متعادل است.');
    } else if (curRatio.greaterThanOrEqualTo(1.0)) {
      grade = 'MODERATE';
      observations.push('نقدینگی در مرز پوشش تعهدات جاری است؛ نیازمند مدیریت دقیق جریان وجوه نقد.');
    } else if (curRatio.greaterThan(0.7)) {
      grade = 'VULNERABLE';
      observations.push('هشدار: دارایی‌های جاری پاسخگوی کل تعهدات کوتاه‌مدت نیست و کسری سرمایه در گردش وجود دارد.');
    } else {
      grade = 'DISTRESSED';
      observations.push('اخطار بحرانی: سازمان در وضعیت مخاطره شدید مالی و ناتوانی در تسویه تعهدات فوری قرار دارد.');
    }

    if (debtRatio.greaterThan(70)) {
      observations.push('ریسک اهرمی بالا: بیش از ۷۰ درصد از دارایی‌ها با بدهی تامین مالی شده است.');
    } else {
      observations.push(`ساختار سرمایه متوازن: نسبت بدهی ${debtRatio.toFixed(1)} درصد می‌باشد.`);
    }

    if (npm.greaterThan(0)) {
      observations.push(`حاشیه سود خالص ${npm.toFixed(1)}٪ ثبت شده است.`);
    }

    return {
      companyTitle: bs.companyTitle,
      asOfDateShamsi: bs.asOfDateShamsi,

      liquidity: {
        currentRatio: curRatio.toFixed(2),
        quickRatio: qkRatio.toFixed(2),
        cashRatio: cshRatio.toFixed(2)
      },

      profitability: {
        grossProfitMarginPercentage: `${gpm.toFixed(2)}%`,
        operatingMarginPercentage: `${opm.toFixed(2)}%`,
        netProfitMarginPercentage: `${npm.toFixed(2)}%`,
        returnOnAssetsPercentage: `${roa.toFixed(2)}%`,
        returnOnEquityPercentage: `${roe.toFixed(2)}%`
      },

      activity: {
        inventoryTurnoverRatio: invTurnover.toFixed(2),
        daysInInventory: daysInInv.toFixed(0),
        assetTurnoverRatio: assetTurnover.toFixed(2)
      },

      leverage: {
        debtRatioPercentage: `${debtRatio.toFixed(2)}%`,
        debtToEquityRatio: debtToEquity.toFixed(2),
        equityMultiplier: equityMultiplier.toFixed(2)
      },

      financialHealthGrade: grade,
      observations
    };
  }
}
