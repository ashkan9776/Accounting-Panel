import Decimal from 'decimal.js';
import {
  VersionedRule,
  VatRuleParameters,
  PayrollTaxParameters,
  SocialSecurityParameters,
  RuleEvaluationResult,
  PayrollTaxCalculationResult,
  VatCalculationResult
} from './types';
import { parseShamsiString } from '../localization/shamsi';

// پیکربندی دقت اعشاری بالا برای جلوگیری از تقریب
Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

export class VersionedRulesEngine {
  private rules: Map<string, VersionedRule[]> = new Map();

  constructor(initialRules: VersionedRule[] = []) {
    for (const rule of initialRules) {
      this.registerRule(rule);
    }
  }

  public registerRule(rule: VersionedRule): void {
    const list = this.rules.get(rule.ruleCode) || [];
    list.push(rule);
    // مرتب‌سازی نسخه‌ها بر اساس تاریخ شروع اعتبار نزولی
    list.sort((a, b) => b.effectiveFromShamsi.localeCompare(a.effectiveFromShamsi));
    this.rules.set(rule.ruleCode, list);
  }

  /**
   * دریافت قاعده معتبر در تاریخ سند مشخص
   */
  public getEffectiveRule<T>(ruleCode: string, documentDateShamsi: string): RuleEvaluationResult<T> {
    const list = this.rules.get(ruleCode);
    if (!list || list.length === 0) {
      throw new Error(`هیچ قاعده‌ای با کد ${ruleCode} در سیستم تعریف نشده است.`);
    }

    const docParsed = parseShamsiString(documentDateShamsi);
    const docDateStr = `${docParsed.year}/${docParsed.month.toString().padStart(2, '0')}/${docParsed.day.toString().padStart(2, '0')}`;

    for (const rule of list) {
      if (!rule.isActive) continue;

      const fromCheck = docDateStr >= rule.effectiveFromShamsi;
      const toCheck = !rule.effectiveToShamsi || docDateStr <= rule.effectiveToShamsi;

      if (fromCheck && toCheck) {
        return {
          ruleCode: rule.ruleCode,
          version: rule.version,
          legalReference: rule.legalReference,
          effectiveDate: docDateStr,
          parameters: rule.parameters as T,
          explanation: `قاعده ${ruleCode} نسخه ${rule.version} بر اساس ${rule.legalReference} (معتبر از ${rule.effectiveFromShamsi}) اعمال شد.`
        };
      }
    }

    throw new Error(`قاعده معتبری برای کد ${ruleCode} در تاریخ ${documentDateShamsi} یافت نشد.`);
  }

  /**
   * محاسبه مالیات بر ارزش افزوده برای یک سطر فاکتور
   */
  public calculateVat(
    grossAmountInput: string | number,
    discountAmountInput: string | number,
    commodityCode: string,
    documentDateShamsi: string,
    isGoldCommodity: boolean = false,
    goldDetails?: { rawGoldValue: string | number; wageAndProfitValue: string | number }
  ): VatCalculationResult {
    const gross = new Decimal(grossAmountInput);
    const discount = new Decimal(discountAmountInput);
    const net = gross.minus(discount);

    const ruleRes = this.getEffectiveRule<VatRuleParameters>('TAX_VAT', documentDateShamsi);
    const params = ruleRes.parameters;

    // بررسی معافیت
    if (params.exemptCommodityCodes.includes(commodityCode)) {
      return {
        grossAmount: gross.toFixed(0),
        discountAmount: discount.toFixed(0),
        netTaxableAmount: net.toFixed(0),
        vatRatePercent: 0,
        vatAmount: '0',
        dutyAmount: '0',
        totalWithVat: net.toFixed(0),
        isExempt: true,
        legalReference: ruleRes.legalReference,
        explanationTrace: `کالا با شناسه ${commodityCode} معاف از مالیات بر ارزش افزوده است (${ruleRes.legalReference}).`
      };
    }

    // حالت ویژه صنف طلا و جواهر (تبصره ۲ ماده ۲۶ قانون مالیات بر ارزش افزوده)
    if (isGoldCommodity && goldDetails) {
      const rawGold = new Decimal(goldDetails.rawGoldValue);
      const wageAndProfit = new Decimal(goldDetails.wageAndProfitValue);
      const rate = new Decimal(params.goldRules.rate).dividedBy(100);
      const vat = wageAndProfit.times(rate).round();

      return {
        grossAmount: gross.toFixed(0),
        discountAmount: discount.toFixed(0),
        netTaxableAmount: wageAndProfit.toFixed(0),
        vatRatePercent: params.goldRules.rate,
        vatAmount: vat.toFixed(0),
        dutyAmount: '0',
        totalWithVat: rawGold.plus(wageAndProfit).plus(vat).toFixed(0),
        isExempt: false,
        legalReference: 'تبصره ۲ ماده ۲۶ قانون مالیات بر ارزش افزوده مصوب ۱۴۰۰',
        explanationTrace: `ارزش طلای خام معاف بوده و مالیات ${params.goldRules.rate}٪ صرفاً به اجرت و سود (${wageAndProfit.toFixed(0)} ریال) تعلق گرفت.`
      };
    }

    // حالت کالای عمومی مشمول
    const rate = new Decimal(params.standardRate).dividedBy(100);
    const vat = net.times(rate).round();

    return {
      grossAmount: gross.toFixed(0),
      discountAmount: discount.toFixed(0),
      netTaxableAmount: net.toFixed(0),
      vatRatePercent: params.standardRate,
      vatAmount: vat.toFixed(0),
      dutyAmount: '0',
      totalWithVat: net.plus(vat).toFixed(0),
      isExempt: false,
      legalReference: ruleRes.legalReference,
      explanationTrace: `ارزش افزوده با نرخ ${params.standardRate}٪ بر مبلغ خالص ${net.toFixed(0)} ریال محاسبه شد (${ruleRes.legalReference}).`
    };
  }

  /**
   * محاسبه مالیات حقوق بر اساس پلکان‌های ماهانه ماده ۸۴
   */
  public calculatePayrollTax(
    monthlyTaxableIncomeInput: string | number,
    documentDateShamsi: string
  ): PayrollTaxCalculationResult {
    const income = new Decimal(monthlyTaxableIncomeInput);
    const ruleRes = this.getEffectiveRule<PayrollTaxParameters>('PAYROLL_TAX_BRACKETS', documentDateShamsi);
    const brackets = ruleRes.parameters.monthlyBrackets;

    let totalTax = new Decimal(0);
    const bracketsUsed: PayrollTaxCalculationResult['bracketsUsed'] = [];
    let remainingIncome = income;

    for (const b of brackets) {
      if (remainingIncome.lessThanOrEqualTo(0)) break;

      const from = new Decimal(b.fromAmount);
      const to = b.toAmount !== null ? new Decimal(b.toAmount) : null;

      if (income.greaterThan(from)) {
        let taxableInBracket: Decimal;
        if (to !== null) {
          const bracketCapacity = to.minus(from);
          taxableInBracket = Decimal.min(remainingIncome, bracketCapacity);
        } else {
          taxableInBracket = remainingIncome;
        }

        const rate = new Decimal(b.ratePercent).dividedBy(100);
        const taxInThisBracket = taxableInBracket.times(rate).round();

        totalTax = totalTax.plus(taxInThisBracket);
        remainingIncome = remainingIncome.minus(taxableInBracket);

        bracketsUsed.push({
          bracket: b.bracketNumber,
          title: b.title,
          taxableInBracket: taxableInBracket.toFixed(0),
          ratePercent: b.ratePercent,
          taxAmount: taxInThisBracket.toFixed(0)
        });
      }
    }

    const effectiveRate = income.greaterThan(0)
      ? totalTax.dividedBy(income).times(100).toFixed(2)
      : '0.00';

    return {
      taxableIncome: income.toFixed(0),
      totalTax: totalTax.toFixed(0),
      effectiveRatePercent: effectiveRate,
      bracketsUsed,
      explanationTrace: `محاسبه مالیات حقوق بر اساس ${ruleRes.legalReference} با مالیات کل ${totalTax.toFixed(0)} ریال و نرخ موثر ${effectiveRate}٪ انجام شد.`
    };
  }

  /**
   * محاسبه بیمه سهم کارگر و کارفرما
   */
  public calculateSocialSecurity(
    grossInsurableWageInput: string | number,
    documentDateShamsi: string
  ): {
    insurableWage: string;
    employeeShare: string;
    employerShare: string;
    unemploymentShare: string;
    totalEmployerCost: string;
    totalPayableToOrganization: string;
    explanation: string;
  } {
    const wage = new Decimal(grossInsurableWageInput);
    const ruleRes = this.getEffectiveRule<SocialSecurityParameters>('SOCIAL_SECURITY_RATES', documentDateShamsi);
    const p = ruleRes.parameters;

    let insurable = wage;
    if (p.maxInsurableMonthlyWage && insurable.greaterThan(p.maxInsurableMonthlyWage)) {
      insurable = new Decimal(p.maxInsurableMonthlyWage);
    }

    const empRate = new Decimal(p.employeeRatePercent).dividedBy(100);
    const empyrRate = new Decimal(p.employerRatePercent).dividedBy(100);
    const unempRate = new Decimal(p.unemploymentRatePercent).dividedBy(100);

    const empShare = insurable.times(empRate).round();
    const empyrShare = insurable.times(empyrRate).round();
    const unempShare = insurable.times(unempRate).round();

    const totalEmployer = empyrShare.plus(unempShare);
    const totalToOrg = empShare.plus(totalEmployer);

    return {
      insurableWage: insurable.toFixed(0),
      employeeShare: empShare.toFixed(0),
      employerShare: empyrShare.toFixed(0),
      unemploymentShare: unempShare.toFixed(0),
      totalEmployerCost: totalEmployer.toFixed(0),
      totalPayableToOrganization: totalToOrg.toFixed(0),
      explanation: `محاسبه حق بیمه بر اساس قانون تامین اجتماعی (کارگر ${p.employeeRatePercent}٪، کارفرما ${p.employerRatePercent}٪، بیکاری ${p.unemploymentRatePercent}٪).`
    };
  }
}

/**
 * قوانین پیش‌فرض سال ۱۴۰۳ ایران
 */
export const DEFAULT_IRANIAN_RULES_1403: VersionedRule[] = [
  {
    id: 'rule-vat-1403',
    ruleCode: 'TAX_VAT',
    version: 4,
    effectiveFromShamsi: '1403/01/01',
    effectiveToShamsi: '1403/12/29',
    legalReference: 'بند (ر) تبصره ۶ قانون بودجه سال ۱۴۰۳ کل کشور (نرخ عمومی ۱۰٪)',
    isActive: true,
    parameters: {
      standardRate: 10.0,
      exemptCommodityCodes: ['EXEMPT_BREAD', 'EXEMPT_FLOUR', 'EXEMPT_MEDICINE', 'EXEMPT_MILK'],
      goldRules: {
        rawGoldExempt: true,
        appliesToWageAndProfitOnly: true,
        rate: 10.0
      }
    } as VatRuleParameters
  },
  {
    id: 'rule-payroll-1403',
    ruleCode: 'PAYROLL_TAX_BRACKETS',
    version: 2024,
    effectiveFromShamsi: '1403/01/01',
    effectiveToShamsi: '1403/12/29',
    legalReference: 'ماده ۸۴ قانون مالیات‌های مستقیم مصوب قانون بودجه ۱۴۰۳ کل کشور',
    isActive: true,
    parameters: {
      annualExemptionCeiling: 1440000000,
      monthlyBrackets: [
        { bracketNumber: 1, title: 'معافیت پایه ماهانه ماده ۸۴', fromAmount: 0, toAmount: 120000000, ratePercent: 0.0 },
        { bracketNumber: 2, title: 'مازاد تا ۱۶۵ میلیون ریال (۱۰٪)', fromAmount: 120000000, toAmount: 165000000, ratePercent: 10.0 },
        { bracketNumber: 3, title: 'مازاد تا ۲۷۰ میلیون ریال (۱۵٪)', fromAmount: 165000000, toAmount: 270000000, ratePercent: 15.0 },
        { bracketNumber: 4, title: 'مازاد تا ۴۰۰ میلیون ریال (۲۰٪)', fromAmount: 270000000, toAmount: 400000000, ratePercent: 20.0 },
        { bracketNumber: 5, title: 'مازاد بر ۴۰۰ میلیون ریال (۳۰٪)', fromAmount: 400000000, toAmount: null, ratePercent: 30.0 }
      ]
    } as PayrollTaxParameters
  },
  {
    id: 'rule-sso-1403',
    ruleCode: 'SOCIAL_SECURITY_RATES',
    version: 1,
    effectiveFromShamsi: '1403/01/01',
    effectiveToShamsi: '1403/12/29',
    legalReference: 'قانون تامین اجتماعی ماده ۲۸ و قانون بیمه بیکاری',
    isActive: true,
    parameters: {
      employeeRatePercent: 7.0,
      employerRatePercent: 20.0,
      unemploymentRatePercent: 3.0,
      maxInsurableMonthlyWage: 500000000
    } as SocialSecurityParameters
  }
];
