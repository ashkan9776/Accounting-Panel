import Decimal from 'decimal.js';
import { CashFlowReport } from './types';

Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

export class CashFlowEngine {
  /**
   * تولید صورت جریان وجوه نقد استاندارد ایران (استاندارد شماره ۲)
   */
  public static generateCashFlowStatement(params: {
    companyTitle: string;
    fromDateShamsi: string;
    toDateShamsi: string;
    currency?: string;

    // اقلام عملیاتی
    netIncome: string | number;
    depreciationExpense?: string | number;
    gainOnAssetDisposal?: string | number; // سود واگذاری باید کسر شود چون در سرمایه‌گذاری می‌آید
    lossOnAssetDisposal?: string | number; // زیان واگذاری باید اضافه شود

    // تغییرات سرمایه در گردش
    accountsReceivableChange?: string | number; // مثبت = افزایش دریافتنی‌ها (کاهنده نقد)
    inventoryChange?: string | number;          // مثبت = افزایش موجودی انبار (کاهنده نقد)
    accountsPayableChange?: string | number;    // مثبت = افزایش بدهی‌ها به بستانکاران (افزاینده نقد)

    // اقلام سرمایه‌گذاری
    fixedAssetPurchases?: string | number;      // خرید دارایی ثابت (خروج نقد)
    fixedAssetSaleProceeds?: string | number;   // فروش دارایی ثابت (ورود نقد)

    // اقلام تامین مالی
    capitalInjections?: string | number;        // افزایش سرمایه نقدی
    borrowingsOrLoanRepayments?: string | number; // خالص دریافت/تسویه تسهیلات
    dividendsPaid?: string | number;            // سود تقسیمی پرداختی

    // مانده نقد و بانک
    beginningCashBalance: string | number;
  }): CashFlowReport {
    const cur = params.currency || 'IRR';

    // ۱. فعالیت‌های عملیاتی
    const netInc = new Decimal(params.netIncome || 0);
    const depExp = new Decimal(params.depreciationExpense || 0);
    const gainDisp = new Decimal(params.gainOnAssetDisposal || 0);
    const lossDisp = new Decimal(params.lossOnAssetDisposal || 0);

    // تعدیل اقلام غیرنقدی
    const nonCashAdj = depExp.plus(lossDisp).minus(gainDisp);

    // تغییرات سرمایه در گردش:
    // افزایش در دارایی جاری (بدهکاران، کالا) مصرف نقدینگی است -> علامت منفی
    // افزایش در بدهی جاری (بستانکاران) منبع نقدینگی است -> علامت مثبت
    const arChange = new Decimal(params.accountsReceivableChange || 0);
    const invChange = new Decimal(params.inventoryChange || 0);
    const apChange = new Decimal(params.accountsPayableChange || 0);

    const workingCapitalImpact = apChange.minus(arChange).minus(invChange);
    const operatingCashFlow = netInc.plus(nonCashAdj).plus(workingCapitalImpact);

    // ۲. فعالیت‌های سرمایه‌گذاری
    const assetBuy = new Decimal(params.fixedAssetPurchases || 0);
    const assetSale = new Decimal(params.fixedAssetSaleProceeds || 0);
    const investingCashFlow = assetSale.minus(assetBuy);

    // ۳. فعالیت‌های تامین مالی
    const capInj = new Decimal(params.capitalInjections || 0);
    const loans = new Decimal(params.borrowingsOrLoanRepayments || 0);
    const divs = new Decimal(params.dividendsPaid || 0);
    const financingCashFlow = capInj.plus(loans).minus(divs);

    // ۴. خالص جریان نقد و مانده پایان دوره
    const netCashChange = operatingCashFlow.plus(investingCashFlow).plus(financingCashFlow);
    const begCash = new Decimal(params.beginningCashBalance || 0);
    const endCash = begCash.plus(netCashChange);

    return {
      companyTitle: params.companyTitle,
      fromDateShamsi: params.fromDateShamsi,
      toDateShamsi: params.toDateShamsi,
      currency: cur,

      operatingActivities: {
        netIncome: netInc.toFixed(0),
        depreciationAdjustment: depExp.toFixed(0),
        otherNonCashAdjustments: lossDisp.minus(gainDisp).toFixed(0),
        workingCapitalChanges: {
          accountsReceivableChange: arChange.toFixed(0),
          inventoryChange: invChange.toFixed(0),
          accountsPayableChange: apChange.toFixed(0),
          netWorkingCapitalImpact: workingCapitalImpact.toFixed(0)
        },
        netCashFromOperatingActivities: operatingCashFlow.toFixed(0)
      },

      investingActivities: {
        fixedAssetPurchases: assetBuy.toFixed(0),
        fixedAssetSaleProceeds: assetSale.toFixed(0),
        netCashFromInvestingActivities: investingCashFlow.toFixed(0)
      },

      financingActivities: {
        capitalInjections: capInj.toFixed(0),
        borrowingsOrLoanRepayments: loans.toFixed(0),
        dividendsPaid: divs.toFixed(0),
        netCashFromFinancingActivities: financingCashFlow.toFixed(0)
      },

      netChangeInCash: netCashChange.toFixed(0),
      beginningCashBalance: begCash.toFixed(0),
      endingCashBalance: endCash.toFixed(0)
    };
  }
}
