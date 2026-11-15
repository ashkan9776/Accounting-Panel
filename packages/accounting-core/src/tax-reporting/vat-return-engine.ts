import Decimal from 'decimal.js';
import { TaxQuarter, VatReturnSummary } from './types';
import { JournalLineInput } from '../journal/types';

Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

export class VatReturnEngine {
  /**
   * محاسبه و تلفیق اظهارنامه فصلی مالیات بر ارزش افزوده
   * تطبیق مالیات فروش وصولی (Output VAT) با اعتبار مالیاتی خرید پرداختی (Input VAT)
   */
  public static calculateQuarterlyVatReturn(params: {
    yearShamsi: string;
    quarter: TaxQuarter;
    sales: Array<{
      grossAmount: string | number;
      exemptAmount?: string | number;
      taxableAmount: string | number;
      vatAmount: string | number;
    }>;
    purchases: Array<{
      grossAmount: string | number;
      exemptAmount?: string | number;
      taxableAmount: string | number;
      vatAmount: string | number;
    }>;
  }): VatReturnSummary {
    let grossSales = new Decimal(0);
    let exemptSales = new Decimal(0);
    let taxableSales = new Decimal(0);
    let outputVat = new Decimal(0);

    for (const s of params.sales) {
      grossSales = grossSales.plus(s.grossAmount || 0);
      exemptSales = exemptSales.plus(s.exemptAmount || 0);
      taxableSales = taxableSales.plus(s.taxableAmount || 0);
      outputVat = outputVat.plus(s.vatAmount || 0);
    }

    let grossPurchases = new Decimal(0);
    let exemptPurchases = new Decimal(0);
    let taxablePurchases = new Decimal(0);
    let inputVat = new Decimal(0);

    for (const p of params.purchases) {
      grossPurchases = grossPurchases.plus(p.grossAmount || 0);
      exemptPurchases = exemptPurchases.plus(p.exemptAmount || 0);
      taxablePurchases = taxablePurchases.plus(p.taxableAmount || 0);
      inputVat = inputVat.plus(p.vatAmount || 0);
    }

    // خالص مالیات قابل پرداخت یا بستانکاری (اعتبار انتقالی به دوره بعد)
    const diff = outputVat.minus(inputVat);
    const isRefundable = diff.isNegative();
    const netPayable = diff.abs();

    return {
      yearShamsi: params.yearShamsi,
      quarter: params.quarter,
      grossSalesAmount: grossSales.round().toFixed(0),
      exemptSalesAmount: exemptSales.round().toFixed(0),
      taxableSalesAmount: taxableSales.round().toFixed(0),
      outputVatCollected: outputVat.round().toFixed(0),
      grossPurchasesAmount: grossPurchases.round().toFixed(0),
      exemptPurchasesAmount: exemptPurchases.round().toFixed(0),
      taxablePurchasesAmount: taxablePurchases.round().toFixed(0),
      inputVatCredit: inputVat.round().toFixed(0),
      netVatPayable: netPayable.round().toFixed(0),
      isRefundableOrCredit: isRefundable
    };
  }

  /**
   * صدور سند دوبل بستن و تسویه اظهارنامه مالیات بر ارزش افزوده پایان فصل
   * بدهکار: مالیات بر ارزش افزوده فروش (۳۳۰۶)
   * بستانکار: مالیات بر ارزش افزوده خرید - اعتبار مالیاتی (۱۴۰۳)
   * بستانکار: موجودی بانک (۱۱۰۲) بابت واریز مابه‌التفاوت به حساب سازمان امور مالیاتی
   */
  public static buildVatSettlementLines(params: {
    yearShamsi: string;
    quarter: TaxQuarter;
    dateShamsi: string;
    outputVatAmount: string | number;
    inputVatCreditAmount: string | number;
    bankAccountSubsidiaryId?: string; // پیش‌فرض sub-1102
    bankFloatingDimensionId?: string;
  }): JournalLineInput[] {
    const outputVat = new Decimal(params.outputVatAmount || 0);
    const inputVat = new Decimal(params.inputVatCreditAmount || 0);

    if (outputVat.isZero() && inputVat.isZero()) {
      return [];
    }

    const desc = `تسویه اظهارنامه ارزش افزوده دوره ${params.quarter} سال ${params.yearShamsi} مورخ ${params.dateShamsi}`;
    const lines: JournalLineInput[] = [];

    if (outputVat.greaterThan(inputVat)) {
      // حالت اول: مالیات فروش بیشتر از اعتبار خرید است -> پرداخت مابه‌التفاوت به سازمان
      const netPayable = outputVat.minus(inputVat);

      // بدهکار کردن حساب ارزش افزوده فروش برای صفر کردن مانده بستانکار
      lines.push({
        subsidiaryAccountId: 'sub-3306',
        debit: outputVat.toFixed(0),
        credit: 0,
        description: `${desc} - بستن حساب ارزش افزوده فروش`
      });

      // بستانکار کردن حساب اعتبار مالیاتی خرید برای صفر کردن مانده بدهکار
      if (inputVat.greaterThan(0)) {
        lines.push({
          subsidiaryAccountId: 'sub-1403',
          debit: 0,
          credit: inputVat.toFixed(0),
          description: `${desc} - تهاتر اعتبار مالیاتی خرید`
        });
      }

      // واریز وجه مابه‌التفاوت از طریق بانک
      lines.push({
        subsidiaryAccountId: params.bankAccountSubsidiaryId || 'sub-1102',
        floatingDimension1Id: params.bankFloatingDimensionId,
        debit: 0,
        credit: netPayable.toFixed(0),
        description: `${desc} - واریز وجه مابه‌التفاوت به سازمان امور مالیاتی`
      });
    } else {
      // حالت دوم: اعتبار مالیاتی خرید بیشتر یا مساوی فروش است -> تهاتر به میزان فروش و انتقال باقیمانده
      lines.push({
        subsidiaryAccountId: 'sub-3306',
        debit: outputVat.toFixed(0),
        credit: 0,
        description: `${desc} - بستن حساب ارزش افزوده فروش`
      });

      lines.push({
        subsidiaryAccountId: 'sub-1403',
        debit: 0,
        credit: outputVat.toFixed(0),
        description: `${desc} - تهاتر به میزان فروش (مانده اعتبار به دوره بعد منتقل می‌شود)`
      });
    }

    return lines;
  }
}
