import Decimal from 'decimal.js';
import { CorporateTaxEstimation } from './types';
import { JournalLineInput } from '../journal/types';

Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

export class CorporateTaxEngine {
  /**
   * نرخ رسمی مالیات بر درآمد عملکرد اشخاص حقوقی موضوع ماده ۱۰۵ ق.م.م (۲۵٪)
   */
  public static readonly DEFAULT_CORPORATE_TAX_RATE = '0.25';

  /**
   * محاسبه و برآورد ذخیره مالیات عملکرد سالانه
   */
  public static estimateCorporateTax(params: {
    yearShamsi: string;
    totalRevenues: string | number;
    totalAllowableExpenses: string | number;
    taxExemptions?: string | number;
    taxRate?: string | number;
  }): CorporateTaxEstimation {
    const rev = new Decimal(params.totalRevenues || 0);
    const exp = new Decimal(params.totalAllowableExpenses || 0);
    const exemp = new Decimal(params.taxExemptions || 0);
    const rate = new Decimal(params.taxRate || this.DEFAULT_CORPORATE_TAX_RATE);

    const profit = rev.minus(exp);
    const taxableProfit = Decimal.max(0, profit.minus(exemp));
    const taxProvision = taxableProfit.times(rate).round();

    return {
      yearShamsi: params.yearShamsi,
      totalRevenues: rev.toFixed(0),
      totalAllowableExpenses: exp.toFixed(0),
      accountingProfit: profit.toFixed(0),
      taxExemptions: exemp.toFixed(0),
      taxableProfit: taxableProfit.toFixed(0),
      taxRate: rate.toString(),
      estimatedTaxProvision: taxProvision.toFixed(0)
    };
  }

  /**
   * صدور سند دوبل شناسایی ذخیره مالیات عملکرد پایان سال مالی
   * بدهکار: هزینه مالیات بر درآمد عملکرد دوره (۸۱۰۹)
   * بستانکار: ذخیره مالیات بر درآمد عملکرد (۳۳۰۷)
   */
  public static buildCorporateTaxProvisionLines(params: {
    yearShamsi: string;
    dateShamsi: string;
    taxAmount: string | number;
    costCenterDimensionId?: string;
  }): JournalLineInput[] {
    const amt = new Decimal(params.taxAmount);
    if (amt.lessThanOrEqualTo(0)) return [];

    const desc = `شناسایی ذخیره مالیات بر درآمد عملکرد موضوع ماده ۱۰۵ ق.م.م - سال مالی ${params.yearShamsi} مورخ ${params.dateShamsi}`;

    return [
      {
        subsidiaryAccountId: 'sub-8109', // هزینه مالیات عملکرد
        floatingDimension2Id: params.costCenterDimensionId,
        debit: amt.toFixed(0),
        credit: 0,
        description: desc
      },
      {
        subsidiaryAccountId: 'sub-3307', // ذخیره مالیات بر درآمد عملکرد
        debit: 0,
        credit: amt.toFixed(0),
        description: desc
      }
    ];
  }

  /**
   * صدور سند واریز و تسویه قطعی مالیات عملکرد با برگ قطعی مالیاتی
   * بدهکار: ذخیره مالیات بر درآمد عملکرد (۳۳۰۷)
   * بستانکار: موجودی بانک (۱۱۰۲)
   */
  public static buildCorporateTaxSettlementLines(params: {
    yearShamsi: string;
    dateShamsi: string;
    paidAmount: string | number;
    bankFloatingDimensionId?: string;
  }): JournalLineInput[] {
    const amt = new Decimal(params.paidAmount);
    if (amt.lessThanOrEqualTo(0)) return [];

    const desc = `تسویه مالیات بر درآمد عملکرد سال مالی ${params.yearShamsi} به حساب خزانه دولت مورخ ${params.dateShamsi}`;

    return [
      {
        subsidiaryAccountId: 'sub-3307',
        debit: amt.toFixed(0),
        credit: 0,
        description: desc
      },
      {
        subsidiaryAccountId: 'sub-1102',
        floatingDimension1Id: params.bankFloatingDimensionId,
        debit: 0,
        credit: amt.toFixed(0),
        description: desc
      }
    ];
  }
}
