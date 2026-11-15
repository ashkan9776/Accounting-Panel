import Decimal from 'decimal.js';
import { PayrollTaxBracket } from './types';

Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

export class PayrollTaxEngine {
  /**
   * جدول پیش‌فرض مالیات پلکانی حقوق سال ۱۴۰۳ موضوع ماده ۸۴ قانون مالیات‌های مستقیم
   * ۱. تا ۱۲۰,۰۰۰,۰۰۰ ریال ماهانه: معاف (۰٪)
   * ۲. از ۱۲۰,۰۰۰,۰۰۱ تا ۱۶۵,۰۰۰,۰۰۰ ریال: ۱۰٪
   * ۳. از ۱۶۵,۰۰۰,۰۰۱ تا ۲۷۰,۰۰۰,۰۰۰ ریال: ۱۵٪
   * ۴. از ۲۷۰,۰۰۰,۰۰۱ تا ۴۰۰,۰۰۰,۰۰۰ ریال: ۲۰٪
   * ۵. مازاد بر ۴۰۰,۰۰۰,۰۰۰ ریال: ۳۰٪
   */
  public static readonly DEFAULT_BRACKETS_1403: PayrollTaxBracket[] = [
    { minMonthlyAmount: '0', maxMonthlyAmount: '120000000', rate: '0.00' },
    { minMonthlyAmount: '120000000', maxMonthlyAmount: '165000000', rate: '0.10' },
    { minMonthlyAmount: '165000000', maxMonthlyAmount: '270000000', rate: '0.15' },
    { minMonthlyAmount: '270000000', maxMonthlyAmount: '400000000', rate: '0.20' },
    { minMonthlyAmount: '400000000', maxMonthlyAmount: 'Infinity', rate: '0.30' }
  ];

  /**
   * محاسبه مالیات بر درآمد حقوق به روش پلکانی (Progressive Tax Brackets)
   * @param taxableWage درآمد مشمول مالیات حقوق پس از اعمال معافیت‌های قانونی
   * @param brackets جدول پلکان‌های مالیاتی مصوب قانون بودجه
   */
  public static calculateIncomeTax(
    taxableWage: string | number,
    brackets: PayrollTaxBracket[] = this.DEFAULT_BRACKETS_1403
  ): {
    totalTax: string;
    bracketDetails: Array<{
      bracketIndex: number;
      minAmount: string;
      maxAmount: string;
      rate: string;
      taxableInBracket: string;
      taxAmount: string;
    }>;
  } {
    const income = new Decimal(taxableWage);
    if (income.lessThanOrEqualTo(0)) {
      return { totalTax: '0', bracketDetails: [] };
    }

    let totalTax = new Decimal(0);
    const details: any[] = [];

    for (let i = 0; i < brackets.length; i++) {
      const b = brackets[i];
      const min = new Decimal(b.minMonthlyAmount);
      const max = b.maxMonthlyAmount === 'Infinity' ? new Decimal(Infinity) : new Decimal(b.maxMonthlyAmount);
      const rate = new Decimal(b.rate);

      if (income.greaterThan(min)) {
        // بخش درآمدی که در این پله قرار می‌گیرد
        const effectiveMax = Decimal.min(income, max);
        const taxableInBracket = effectiveMax.minus(min);
        const taxInBracket = taxableInBracket.times(rate).round();

        totalTax = totalTax.plus(taxInBracket);

        details.push({
          bracketIndex: i + 1,
          minAmount: min.toFixed(0),
          maxAmount: b.maxMonthlyAmount,
          rate: rate.toString(),
          taxableInBracket: taxableInBracket.toFixed(0),
          taxAmount: taxInBracket.toFixed(0)
        });
      }
    }

    return {
      totalTax: totalTax.toFixed(0),
      bracketDetails: details
    };
  }

  /**
   * محاسبه معافیت ۲ هفتم بیمه سهم کارگر از مالیات (موضوع ماده ۱۳۷ ق.م.م و بخشنامه‌های مالیاتی)
   */
  public static calculateSocialSecurityTaxExemption(employeeInsurance: string | number): string {
    const ins = new Decimal(employeeInsurance || 0);
    return ins.times(2).dividedBy(7).round().toFixed(0);
  }
}
