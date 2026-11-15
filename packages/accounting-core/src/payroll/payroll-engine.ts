import Decimal from 'decimal.js';
import {
  EmployeeContractTerms,
  MonthlyTimecard,
  AdditionalDeduction,
  DeductionType,
  PayrollTaxBracket,
  PayrollSocialSecurityConfig,
  PayrollCalculationBreakdown,
  BankPaymentOrderLine
} from './types';
import { PayrollTaxEngine } from './payroll-tax-engine';
import { SocialSecurityEngine } from './social-security-engine';

Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

export class PayrollEngine {
  /**
   * محاسبه جامع حقوق، مزایا، کسورات و خالص دریافتی ماهانه پرسنل
   */
  public static calculateMonthlyPayroll(params: {
    contract: EmployeeContractTerms;
    timecard: MonthlyTimecard;
    additionalDeductions?: AdditionalDeduction[];
    bonusAmount?: string | number;
    taxBrackets?: PayrollTaxBracket[];
    socialSecurityParams?: PayrollSocialSecurityConfig;
    applyTwoSeventhsTaxExemption?: boolean; // اعمال معافیت ۲ هفتم بیمه سهم کارگر
  }): PayrollCalculationBreakdown {
    const { contract, timecard } = params;

    const baseSalary = new Decimal(contract.monthlyBaseSalary || 0);
    const workedDays = new Decimal(timecard.workedDays || 30);
    const standardMonthDays = new Decimal(30);

    // ۱. حقوق پایه کارکرد
    const dailyWage = baseSalary.dividedBy(standardMonthDays);
    const basePay = dailyWage.times(workedDays).round();

    // ۲. مزایای ثابت ماهانه (بن و مسکن)
    const housingPay = new Decimal(contract.monthlyHousingAllowance || 0);
    const groceryPay = new Decimal(contract.monthlyGroceryAllowance || 0);
    const seniorityPay = new Decimal(contract.monthlySeniorityBonus || 0);

    // ۳. حق اولاد (به ازای هر فرزند مشمول)
    const childCount = contract.childCount || 0;
    const childRate = new Decimal(contract.monthlyChildAllowancePerChild || 0);
    const childPay = childRate.times(childCount).round();

    // ۴. نرخ هر ساعت کار عادی طبق استاندارد وزارت کار (حقوق پایه تقسیم بر ۲۲۰ ساعت)
    const hourlyBaseRate = baseSalary.dividedBy(220);

    // اضافه‌کاری (ضریب ۱.۴)
    const overtimeHours = new Decimal(timecard.overtimeHours || 0);
    const overtimePay = hourlyBaseRate.times(1.4).times(overtimeHours).round();

    // تعطیل‌کاری و جمعه‌کاری (ضریب ۱.۸)
    const holidayHours = new Decimal(timecard.holidayWorkHours || 0);
    const holidayWorkPay = hourlyBaseRate.times(1.8).times(holidayHours).round();

    // شب‌کاری (ضریب ۱.۳۵)
    const nightHours = new Decimal(timecard.nightShiftHours || 0);
    const nightShiftPay = hourlyBaseRate.times(1.35).times(nightHours).round();

    // ماموریت کاری (حداقل یک روز مزد ثابت به ازای هر روز ماموریت)
    const missionDays = new Decimal(timecard.missionDays || 0);
    const missionPay = dailyWage.times(missionDays).round();

    // پاداش متفرقه
    const bonusPay = new Decimal(params.bonusAmount || 0);

    // مجموع ناخالص مزایای حکمی و کارکردی
    const grossPay = basePay
      .plus(housingPay)
      .plus(groceryPay)
      .plus(seniorityPay)
      .plus(childPay)
      .plus(overtimePay)
      .plus(holidayWorkPay)
      .plus(nightShiftPay)
      .plus(missionPay)
      .plus(bonusPay);

    // ۵. دستمزد مشمول کسر حق بیمه تامین اجتماعی
    // (طبق ماده ۳۰ قانون تامین اجتماعی: حقوق پایه + بن + مسکن + اضافه‌کار مشمول بیمه است. حق اولاد و حق ماموریت معاف از بیمه است)
    const insuredGrossWage = basePay
      .plus(housingPay)
      .plus(groceryPay)
      .plus(seniorityPay)
      .plus(overtimePay)
      .plus(holidayWorkPay)
      .plus(nightShiftPay);

    // محاسبه سهم‌های بیمه تامین اجتماعی
    const ssq = SocialSecurityEngine.calculateContributions(
      insuredGrossWage.toFixed(0),
      params.socialSecurityParams
    );

    // ۶. درآمد مشمول مالیات حقوق (ماده ۸۴ و ۸۵ ق.م.م)
    // معافیت‌های قانونی مالیات: حق ماموریت معاف است. حق اولاد مشمول نیست.
    // در صورت اعمال معافیت ۲ هفتم بیمه سهم کارگر:
    let taxableWage = grossPay.minus(missionPay).minus(childPay);
    if (params.applyTwoSeventhsTaxExemption !== false) {
      const twoSevenths = PayrollTaxEngine.calculateSocialSecurityTaxExemption(ssq.employeeShare);
      taxableWage = taxableWage.minus(twoSevenths);
    }
    taxableWage = Decimal.max(0, taxableWage);

    // محاسبه مالیات پلکانی حقوق
    const taxResult = PayrollTaxEngine.calculateIncomeTax(
      taxableWage.toFixed(0),
      params.taxBrackets
    );

    // ۷. کسورات غیرقانونی / تعهدی پرسنل
    let advanceDeduction = new Decimal(0);
    let loanDeduction = new Decimal(0);
    let absenceDeduction = new Decimal(0);
    let otherDeductions = new Decimal(0);

    if (timecard.unpaidAbsenceDays && timecard.unpaidAbsenceDays > 0) {
      absenceDeduction = dailyWage.times(timecard.unpaidAbsenceDays).round();
    }

    if (params.additionalDeductions && params.additionalDeductions.length > 0) {
      for (const d of params.additionalDeductions) {
        const amt = new Decimal(d.amount || 0);
        if (d.type === DeductionType.SALARY_ADVANCE) {
          advanceDeduction = advanceDeduction.plus(amt);
        } else if (d.type === DeductionType.LOAN_INSTALLMENT) {
          loanDeduction = loanDeduction.plus(amt);
        } else if (d.type === DeductionType.ABSENCE_PENALTY) {
          absenceDeduction = absenceDeduction.plus(amt);
        } else {
          otherDeductions = otherDeductions.plus(amt);
        }
      }
    }

    // مجموع کل کسورات از حقوق پرسنل (بیمه کارگر + مالیات + مساعده + وام + غیبت)
    const empInsShare = new Decimal(ssq.employeeShare);
    const incTax = new Decimal(taxResult.totalTax);
    const totalEmployeeDeductions = empInsShare
      .plus(incTax)
      .plus(advanceDeduction)
      .plus(loanDeduction)
      .plus(absenceDeduction)
      .plus(otherDeductions);

    // ۸. خالص حقوق پرداختی به کارمند
    const netPayable = Decimal.max(0, grossPay.minus(totalEmployeeDeductions));

    return {
      employeeId: contract.employeeId,
      contractType: contract.contractType,

      basePay: basePay.toFixed(0),
      housingPay: housingPay.toFixed(0),
      groceryPay: groceryPay.toFixed(0),
      childPay: childPay.toFixed(0),
      seniorityPay: seniorityPay.toFixed(0),
      overtimePay: overtimePay.toFixed(0),
      holidayWorkPay: holidayWorkPay.toFixed(0),
      nightShiftPay: nightShiftPay.toFixed(0),
      missionPay: missionPay.toFixed(0),
      bonusPay: bonusPay.toFixed(0),
      grossPay: grossPay.toFixed(0),

      insuredGrossWage: ssq.effectiveInsuredWage,
      taxableGrossWage: taxableWage.toFixed(0),

      employeeInsuranceShare: ssq.employeeShare,
      employerInsuranceShare: ssq.employerShare,
      employerUnemploymentShare: ssq.unemploymentShare,
      totalEmployerInsuranceContribution: ssq.totalEmployerShare,
      totalInsuranceContribution: ssq.totalContribution,
      incomeTax: taxResult.totalTax,

      salaryAdvanceDeduction: advanceDeduction.toFixed(0),
      loanInstallmentDeduction: loanDeduction.toFixed(0),
      absenceDeduction: absenceDeduction.toFixed(0),
      otherDeductions: otherDeductions.toFixed(0),
      totalEmployeeDeductions: totalEmployeeDeductions.toFixed(0),

      netPayableSalary: netPayable.toFixed(0)
    };
  }

  /**
   * تولید رکوردهای پرداخت دسته‌ای بانک (فرمت حواله پایا و شبا بانکی)
   */
  public static generateBankPaymentBatch(
    items: Array<{
      employeeId: string;
      employeeName: string;
      nationalId: string;
      shebaNumber: string;
      accountNumber?: string;
      netPayableAmount: string | number;
      periodTitle: string;
    }>
  ): {
    totalRecords: number;
    totalAmount: string;
    records: BankPaymentOrderLine[];
    csvContent: string;
  } {
    let totalAmt = new Decimal(0);
    const records: BankPaymentOrderLine[] = [];
    const lines: string[] = ['ردیف,شناسه پرسنلی,نام و نام خانوادگی,کد ملی,شماره شبا,مبلغ ریال,شرح پرداخت'];

    let rowIndex = 1;
    for (const it of items) {
      const amt = new Decimal(it.netPayableAmount);
      totalAmt = totalAmt.plus(amt);

      const desc = `حقوق ${it.periodTitle} - ${it.employeeName}`;
      records.push({
        rowNumber: rowIndex,
        employeeId: it.employeeId,
        employeeName: it.employeeName,
        nationalId: it.nationalId,
        accountNumber: it.accountNumber,
        shebaNumber: it.shebaNumber,
        amount: amt.toFixed(0),
        description: desc
      });

      lines.push(`${rowIndex},${it.employeeId},${it.employeeName},${it.nationalId},${it.shebaNumber},${amt.toFixed(0)},"${desc}"`);
      rowIndex++;
    }

    return {
      totalRecords: records.length,
      totalAmount: totalAmt.toFixed(0),
      records,
      csvContent: lines.join('\n')
    };
  }
}
