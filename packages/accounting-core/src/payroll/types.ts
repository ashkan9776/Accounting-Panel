import Decimal from 'decimal.js';

export enum ContractType {
  PERMANENT = 'PERMANENT',     // قرارداد دائم / رسمی
  TEMPORARY = 'TEMPORARY',     // قرارداد موقت قانون کار
  PROJECT = 'PROJECT',         // پروژه‌ای / پیمانکاری
  HOURLY = 'HOURLY',           // ساعتی
  COMMISSION = 'COMMISSION'    // پورسانتی / درصدی
}

export enum SalaryItemType {
  BASE_SALARY = 'BASE_SALARY',             // حقوق پایه
  HOUSING_ALLOWANCE = 'HOUSING_ALLOWANCE', // حق مسکن
  GROCERY_ALLOWANCE = 'GROCERY_ALLOWANCE', // بن خواربار و معیشت
  CHILD_ALLOWANCE = 'CHILD_ALLOWANCE',     // حق اولاد (ماده ۸۶ تامین اجتماعی)
  SENIORITY_BONUS = 'SENIORITY_BONUS',     // پایه سنوات
  OVERTIME = 'OVERTIME',                   // اضافه‌کاری (ضریب ۱.۴)
  HOLIDAY_WORK = 'HOLIDAY_WORK',           // تعطیل‌کاری (ضریب ۱.۸)
  NIGHT_SHIFT = 'NIGHT_SHIFT',             // شب‌کاری (ضریب ۱.۳۵)
  MISSION_ALLOWANCE = 'MISSION_ALLOWANCE', // حق ماموریت
  BONUS = 'BONUS',                         // پاداش و بهره‌وری
  EIDI_AND_BONUS = 'EIDI_AND_BONUS'        // عیدی و پاداش پایان سال
}

export enum DeductionType {
  SOCIAL_SECURITY_EMPLOYEE = 'SOCIAL_SECURITY_EMPLOYEE', // بیمه سهم کارگر ۷٪
  INCOME_TAX = 'INCOME_TAX',                             // مالیات حقوق ماده ۸۶ ق.م.م
  SALARY_ADVANCE = 'SALARY_ADVANCE',                     // مساعده دریافتی
  LOAN_INSTALLMENT = 'LOAN_INSTALLMENT',                 // قسط وام پرسنلی
  ABSENCE_PENALTY = 'ABSENCE_PENALTY',                   // کسر کار و غیبت
  DISCIPLINARY = 'DISCIPLINARY',                         // جریمه انضباطی
  OTHER = 'OTHER'                                        // سایر کسورات
}

export interface PayrollTaxBracket {
  minMonthlyAmount: string; // حداقل سقف ماهانه ریال
  maxMonthlyAmount: string; // حداکثر سقف ماهانه ریال (یا بی‌نهایت)
  rate: string;            // نرخ مالیات (مثلاً 0.10, 0.15, 0.20, 0.30)
}

export interface PayrollSocialSecurityConfig {
  employeeRate: string;         // نرخ سهم بیمه شده (معمولاً 0.07)
  employerRate: string;         // نرخ سهم کارفرما (معمولاً 0.20)
  unemploymentRate: string;     // نرخ بیمه بیکاری سهم کارفرما (معمولاً 0.03)
  maxMonthlyInsuredWage: string; // سقف ماهانه دستمزد مشمول کسر حق بیمه (۷ برابر حداقل دستمزد)
}

export interface EmployeeContractTerms {
  employeeId: string;
  contractType: ContractType;
  monthlyBaseSalary: string | number;     // حقوق پایه ماهانه (۳۰ روزه)
  dailyBaseSalary?: string | number;      // حقوق روزانه
  monthlyHousingAllowance: string | number; // حق مسکن مصوب شورای عالی کار
  monthlyGroceryAllowance: string | number; // بن خواربار مصوب شورای عالی کار
  monthlySeniorityBonus?: string | number;  // پایه سنوات ماهانه
  childCount?: number;                   // تعداد فرزندان مشمول حق اولاد
  monthlyChildAllowancePerChild?: string | number; // مبلغ هر فرزند (۳ برابر حداقل دستمزد روزانه)
  otherTaxableAllowances?: string | number;
  otherExemptAllowances?: string | number;
}

export interface MonthlyTimecard {
  workedDays: number;            // روزهای کارکرد عادی (مثلاً ۳۰ یا ۳۱ روز)
  workedHours?: number;          // مجموع ساعات کارکرد
  overtimeHours?: number;        // ساعات اضافه‌کاری
  holidayWorkHours?: number;     // ساعات تعطیل‌کاری
  nightShiftHours?: number;      // ساعات شب‌کاری
  missionDays?: number;          // روزهای ماموریت کاری
  paidLeaveDays?: number;        // روزهای مرخصی استحقاقی
  unpaidAbsenceDays?: number;    // روزهای غیبت یا مرخصی بدون حقوق
}

export interface AdditionalDeduction {
  type: DeductionType;
  amount: string | number;
  description?: string;
  referenceId?: string; // شناسه مساعده یا وام
}

export interface PayrollCalculationBreakdown {
  employeeId: string;
  contractType: ContractType;

  // مزایای ناخالص
  basePay: string;
  housingPay: string;
  groceryPay: string;
  childPay: string;
  seniorityPay: string;
  overtimePay: string;
  holidayWorkPay: string;
  nightShiftPay: string;
  missionPay: string;
  bonusPay: string;
  grossPay: string; // مجموع ناخالص حقوق و مزایا

  // اقلام مشمول
  insuredGrossWage: string; // دستمزد مشمول کسر حق بیمه
  taxableGrossWage: string; // درآمد مشمول مالیات حقوق (پس از کسر معافیت‌ها)

  // کسورات قانونی
  employeeInsuranceShare: string;     // ۷٪ سهم بیمه شده
  employerInsuranceShare: string;     // ۲۰٪ سهم کارفرما
  employerUnemploymentShare: string;  // ۳٪ بیمه بیکاری
  totalEmployerInsuranceContribution: string; // ۲۳٪ کل سهم کارفرما
  totalInsuranceContribution: string; // ۳۰٪ کل بیمه به سازمان تامین اجتماعی
  incomeTax: string;                  // مالیات بر درآمد حقوق

  // کسورات متفرقه پرسنل
  salaryAdvanceDeduction: string;
  loanInstallmentDeduction: string;
  absenceDeduction: string;
  otherDeductions: string;
  totalEmployeeDeductions: string; // مجموع کسورات از حقوق پرسنل (بیمه ۷٪ + مالیات + مساعده + وام)

  // خالص دریافتی
  netPayableSalary: string; // حقوق خالص قابل پرداخت به کارمند
}

export interface BankPaymentOrderLine {
  rowNumber: number;
  employeeId: string;
  employeeName: string;
  nationalId: string;
  accountNumber?: string;
  shebaNumber: string; // کد شبا ۲۶ رقمی
  amount: string;
  description: string;
}
