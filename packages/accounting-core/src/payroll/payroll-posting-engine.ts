import Decimal from 'decimal.js';
import { JournalLineInput } from '../journal/types';
import { PayrollCalculationBreakdown } from './types';

Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

export class PayrollPostingEngine {
  /**
   * ۱. صدور سند دوبل شناسایی هزینه حقوق و دستمزد ماهانه
   * بدهکار: هزینه حقوق و دستمزد ناخالص (۸۱۰۱)
   * بدهکار: هزینه بیمه سهم کارفرما ۲۳٪ (۸۱۰۲)
   * بستانکار: بیمه پرداختنی سازمان تامین اجتماعی ۳۰٪ (۳۳۰۴)
   * بستانکار: مالیات تکلیفی حقوق پرداختنی ماده ۸۶ (۳۳۰۵)
   * بستانکار: مساعده پرداختی مسترد شده (۱۴۰۴)
   * بستانکار: اقساط وام پرداختی مسترد شده (۱۴۰۵)
   * بستانکار: جاری پرسنل و حقوق پرداختنی - خالص حقوق (۳۳۰۳)
   */
  public static buildMonthlyPayrollLines(params: {
    periodTitle: string;
    dateShamsi: string;
    costCenterDimensionId?: string;
    slips: Array<{
      slip: PayrollCalculationBreakdown;
      employeePartyDimensionId?: string;
      costCenterDimensionId?: string;
    }>;
  }): JournalLineInput[] {
    if (!params.slips || params.slips.length === 0) {
      return [];
    }

    let totalGrossPay = new Decimal(0);
    let totalEmployerInsurance = new Decimal(0);
    let totalInsuranceContribution = new Decimal(0);
    let totalIncomeTax = new Decimal(0);
    let totalAdvance = new Decimal(0);
    let totalLoan = new Decimal(0);
    let totalNetPayable = new Decimal(0);

    const netPayableLines: JournalLineInput[] = [];
    const advanceLines: JournalLineInput[] = [];
    const loanLines: JournalLineInput[] = [];

    for (const item of params.slips) {
      const s = item.slip;
      const gross = new Decimal(s.grossPay);
      const erIns = new Decimal(s.totalEmployerInsuranceContribution);
      const totalIns = new Decimal(s.totalInsuranceContribution);
      const tax = new Decimal(s.incomeTax);
      const adv = new Decimal(s.salaryAdvanceDeduction);
      const loan = new Decimal(s.loanInstallmentDeduction);
      const net = new Decimal(s.netPayableSalary);

      totalGrossPay = totalGrossPay.plus(gross);
      totalEmployerInsurance = totalEmployerInsurance.plus(erIns);
      totalInsuranceContribution = totalInsuranceContribution.plus(totalIns);
      totalIncomeTax = totalIncomeTax.plus(tax);
      totalAdvance = totalAdvance.plus(adv);
      totalLoan = totalLoan.plus(loan);
      totalNetPayable = totalNetPayable.plus(net);

      // سطر بستانکار خالص حقوق برای هر کارمند با تفصیلی شخص
      if (net.greaterThan(0)) {
        netPayableLines.push({
          subsidiaryAccountId: 'sub-3303', // جاری پرسنل و حقوق پرداختنی
          floatingDimension1Id: item.employeePartyDimensionId,
          floatingDimension2Id: item.costCenterDimensionId,
          debit: 0,
          credit: net.toFixed(0),
          description: `حقوق خالص ماهانه ${params.periodTitle} پرسنل ${s.employeeId}`
        });
      }

      // تسویه مساعده با تفصیلی شخص
      if (adv.greaterThan(0)) {
        advanceLines.push({
          subsidiaryAccountId: 'sub-1404', // مساعده و علی‌الحساب
          floatingDimension1Id: item.employeePartyDimensionId,
          debit: 0,
          credit: adv.toFixed(0),
          description: `کسر مساعده از حقوق ${params.periodTitle} پرسنل ${s.employeeId}`
        });
      }

      // تسویه اقساط وام با تفصیلی شخص
      if (loan.greaterThan(0)) {
        loanLines.push({
          subsidiaryAccountId: 'sub-1405', // وام‌های پرداختی به کارکنان
          floatingDimension1Id: item.employeePartyDimensionId,
          debit: 0,
          credit: loan.toFixed(0),
          description: `کسر قسط وام از حقوق ${params.periodTitle} پرسنل ${s.employeeId}`
        });
      }
    }

    const lines: JournalLineInput[] = [];
    const desc = `سند شناسایی هزینه حقوق و دستمزد و مزایای پرسنل - ${params.periodTitle} مورخ ${params.dateShamsi}`;
    const defaultCostCenter = params.costCenterDimensionId || params.slips[0]?.costCenterDimensionId || 'dim-cc-1';

    // ۱. سطر بدهکار: هزینه حقوق و دستمزد ناخالص
    if (totalGrossPay.greaterThan(0)) {
      lines.push({
        subsidiaryAccountId: 'sub-8101', // هزینه حقوق و دستمزد
        floatingDimension2Id: defaultCostCenter,
        debit: totalGrossPay.toFixed(0),
        credit: 0,
        description: `${desc} - ناخالص حقوق و مزایا`
      });
    }

    // ۲. سطر بدهکار: هزینه بیمه سهم کارفرما ۲۳٪
    if (totalEmployerInsurance.greaterThan(0)) {
      lines.push({
        subsidiaryAccountId: 'sub-8102', // هزینه بیمه سهم کارفرما ۲۳٪
        floatingDimension2Id: defaultCostCenter,
        debit: totalEmployerInsurance.toFixed(0),
        credit: 0,
        description: `${desc} - بیمه سهم کارفرما و بیکاری ۲۳٪`
      });
    }

    // ۳. سطر بستانکار: بیمه پرداختنی سازمان تامین اجتماعی ۳۰٪
    if (totalInsuranceContribution.greaterThan(0)) {
      lines.push({
        subsidiaryAccountId: 'sub-3304', // بیمه پرداختنی
        debit: 0,
        credit: totalInsuranceContribution.toFixed(0),
        description: `${desc} - بیمه ۳۰٪ پرداختنی سازمان تامین اجتماعی`
      });
    }

    // ۴. سطر بستانکار: مالیات تکلیفی حقوق پرداختنی (ماده ۸۶)
    if (totalIncomeTax.greaterThan(0)) {
      lines.push({
        subsidiaryAccountId: 'sub-3305', // مالیات تکلیفی حقوق پرداختنی
        debit: 0,
        credit: totalIncomeTax.toFixed(0),
        description: `${desc} - مالیات حقوق پرداختنی به اداره امور مالیاتی`
      });
    }

    // ۵. سطور بستانکار مساعده
    lines.push(...advanceLines);

    // ۶. سطور بستانکار اقساط وام
    lines.push(...loanLines);

    // ۷. سطور بستانکار حقوق خالص پرداختنی پرسنل
    lines.push(...netPayableLines);

    return lines;
  }

  /**
   * ۲. صدور سند پرداخت گروهی حقوق از طریق بانک (واریز پایا)
   * بدهکار: جاری پرسنل و حقوق پرداختنی (۳۳۰۳)
   * بستانکار: موجودی حساب بانکی تجاری (۱۱۰۲)
   */
  public static buildSalaryPaymentLines(params: {
    periodTitle: string;
    dateShamsi: string;
    totalPaidAmount: string | number;
    bankAccountSubsidiaryId?: string; // پیش‌فرض sub-1102
    bankFloatingDimensionId?: string;
    staffPartyDimensionId?: string;
    slips?: Array<{
      employeePartyDimensionId?: string;
      netPayableAmount: string | number;
    }>;
  }): JournalLineInput[] {
    const amt = new Decimal(params.totalPaidAmount);
    if (amt.lessThanOrEqualTo(0)) {
      return [];
    }

    const desc = `پرداخت گروهی و واریز پایا خالص حقوق پرسنل بابت ${params.periodTitle} مورخ ${params.dateShamsi}`;
    const lines: JournalLineInput[] = [];

    if (params.slips && params.slips.length > 0) {
      for (const s of params.slips) {
        const sNet = new Decimal(s.netPayableAmount);
        if (sNet.greaterThan(0)) {
          lines.push({
            subsidiaryAccountId: 'sub-3303', // جاری پرسنل و حقوق پرداختنی
            floatingDimension1Id: s.employeePartyDimensionId || params.staffPartyDimensionId || 'dim-cust-1',
            debit: sNet.toFixed(0),
            credit: 0,
            description: desc
          });
        }
      }
    } else {
      lines.push({
        subsidiaryAccountId: 'sub-3303', // جاری پرسنل و حقوق پرداختنی
        floatingDimension1Id: params.staffPartyDimensionId || 'dim-cust-1',
        debit: amt.toFixed(0),
        credit: 0,
        description: desc
      });
    }

    lines.push({
      subsidiaryAccountId: params.bankAccountSubsidiaryId || 'sub-1102', // موجودی بانک‌ها
      floatingDimension1Id: params.bankFloatingDimensionId,
      debit: 0,
      credit: amt.toFixed(0),
      description: desc
    });

    return lines;
  }

  /**
   * ۳. صدور سند پرداخت حق بیمه به سازمان تامین اجتماعی
   * بدهکار: بیمه پرداختنی (۳۳۰۴)
   * بستانکار: موجودی حساب بانکی (۱۱۰۲)
   */
  public static buildInsuranceSettlementLines(params: {
    periodTitle: string;
    dateShamsi: string;
    amount: string | number;
    bankFloatingDimensionId?: string;
  }): JournalLineInput[] {
    const amt = new Decimal(params.amount);
    if (amt.lessThanOrEqualTo(0)) return [];

    const desc = `واریز حق بیمه تامین اجتماعی ماهانه ${params.periodTitle} مورخ ${params.dateShamsi}`;

    return [
      {
        subsidiaryAccountId: 'sub-3304',
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

  /**
   * ۴. صدور سند پرداخت مالیات تکلیفی حقوق به اداره دارایی
   * بدهکار: مالیات تکلیفی حقوق پرداختنی (۳۳۰۵)
   * بستانکار: موجودی حساب بانکی (۱۱۰۲)
   */
  public static buildTaxSettlementLines(params: {
    periodTitle: string;
    dateShamsi: string;
    amount: string | number;
    bankFloatingDimensionId?: string;
  }): JournalLineInput[] {
    const amt = new Decimal(params.amount);
    if (amt.lessThanOrEqualTo(0)) return [];

    const desc = `واریز مالیات تکلیفی حقوق موضوع ماده ۸۶ ق.م.م - ${params.periodTitle} مورخ ${params.dateShamsi}`;

    return [
      {
        subsidiaryAccountId: 'sub-3305',
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
