import Decimal from 'decimal.js';
import { PayrollSocialSecurityConfig } from './types';

Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

export class SocialSecurityEngine {
  /**
   * پارامترهای پیش‌فرض بیمه تامین اجتماعی ایران (سال ۱۴۰۳)
   * سقف دستمزد مشمول کسر حق بیمه = روزانه حدود ۱۶,۹۰۱,۲۳۲ ریال (ماهانه ۵۰۷,۰۳۶,۹۶۰ ریال)
   */
  public static readonly DEFAULT_PARAMS_1403: PayrollSocialSecurityConfig = {
    employeeRate: '0.07',
    employerRate: '0.20',
    unemploymentRate: '0.03',
    maxMonthlyInsuredWage: '507036960'
  };

  /**
   * محاسبه حق بیمه تامین اجتماعی (سهم بیمه‌شده، سهم کارفرما، بیمه بیکاری و مجموع)
   */
  public static calculateContributions(
    insuredWageInput: string | number,
    params: PayrollSocialSecurityConfig = this.DEFAULT_PARAMS_1403
  ): {
    effectiveInsuredWage: string;
    employeeShare: string;
    employerShare: string;
    unemploymentShare: string;
    totalEmployerShare: string;
    totalContribution: string;
    hasExceededCeiling: boolean;
  } {
    const rawWage = new Decimal(insuredWageInput || 0);
    const ceiling = new Decimal(params.maxMonthlyInsuredWage);

    const hasExceeded = rawWage.greaterThan(ceiling);
    const effectiveWage = hasExceeded ? ceiling : rawWage;

    const empRate = new Decimal(params.employeeRate);
    const erRate = new Decimal(params.employerRate);
    const unempRate = new Decimal(params.unemploymentRate);

    const employeeShare = effectiveWage.times(empRate).round();
    const employerShare = effectiveWage.times(erRate).round();
    const unemploymentShare = effectiveWage.times(unempRate).round();

    const totalEmployerShare = employerShare.plus(unemploymentShare);
    const totalContribution = employeeShare.plus(totalEmployerShare);

    return {
      effectiveInsuredWage: effectiveWage.toFixed(0),
      employeeShare: employeeShare.toFixed(0),
      employerShare: employerShare.toFixed(0),
      unemploymentShare: unemploymentShare.toFixed(0),
      totalEmployerShare: totalEmployerShare.toFixed(0),
      totalContribution: totalContribution.toFixed(0),
      hasExceededCeiling: hasExceeded
    };
  }

  /**
   * تولید رکورد استاندارد فایل بیمه‌شدگان (DSKWOR) سازمان تامین اجتماعی
   */
  public static generateTaminWorkerRecord(worker: {
    workshopCode: string;
    nationalId: string;
    insuranceNumber: string;
    firstName: string;
    lastName: string;
    fatherName: string;
    birthDateShamsi: string;
    identityCardNumber: string;
    jobTitle: string;
    jobCode: string;
    workingDays: number;
    dailyWage: string | number;
    monthlyWage: string | number;
    benefitWage: string | number;
    totalInsuredWage: string | number;
    employeeShare: string | number;
    employerShare: string | number;
  }): string {
    const pad = (val: string | number, len: number, char: string = ' ', rightAlign: boolean = false) => {
      const s = (val || '').toString();
      if (s.length >= len) return s.substring(0, len);
      return rightAlign ? s.padStart(len, char) : s.padEnd(len, char);
    };

    // فرمت متنی ساختاریافته استاندارد تامین اجتماعی
    return [
      pad(worker.workshopCode, 10),
      pad(worker.insuranceNumber, 10),
      pad(worker.nationalId, 10),
      pad(worker.firstName, 20),
      pad(worker.lastName, 25),
      pad(worker.workingDays, 2, '0', true),
      pad(worker.dailyWage, 12, '0', true),
      pad(worker.monthlyWage, 14, '0', true),
      pad(worker.benefitWage, 14, '0', true),
      pad(worker.totalInsuredWage, 14, '0', true),
      pad(worker.employeeShare, 12, '0', true),
      pad(worker.employerShare, 12, '0', true)
    ].join('|');
  }
}
