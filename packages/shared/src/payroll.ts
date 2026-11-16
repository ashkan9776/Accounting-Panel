import { z } from 'zod';

export const ContractTypeEnum = z.enum([
  'PERMANENT',     // قرارداد دائم / رسمی
  'TEMPORARY',     // قرارداد موقت قانون کار
  'PROJECT',       // پروژه‌ای / پیمانکاری
  'HOURLY',         // ساعتی
  'COMMISSION',    // پورسانتی / درصدی
]);
export type ContractType = z.infer<typeof ContractTypeEnum>;

export const PayrollPeriodStatusEnum = z.enum([
  'DRAFT',
  'CALCULATED',
  'APPROVED',
  'PAID',
]);
export type PayrollPeriodStatus = z.infer<typeof PayrollPeriodStatusEnum>;

export const SalaryItemTypeEnum = z.enum([
  'BASE_SALARY',
  'HOUSING_ALLOWANCE',
  'GROCERY_ALLOWANCE',
  'CHILD_ALLOWANCE',
  'SENIORITY_BONUS',
  'OVERTIME',
  'HOLIDAY_WORK',
  'NIGHT_SHIFT',
  'MISSION_ALLOWANCE',
  'BONUS',
  'EIDI_AND_BONUS',
]);
export type SalaryItemType = z.infer<typeof SalaryItemTypeEnum>;

export const DeductionTypeEnum = z.enum([
  'SOCIAL_SECURITY_EMPLOYEE',
  'INCOME_TAX',
  'SALARY_ADVANCE',
  'LOAN_INSTALLMENT',
  'ABSENCE_PENALTY',
  'DISCIPLINARY',
  'OTHER',
]);
export type DeductionType = z.infer<typeof DeductionTypeEnum>;

const shamsiDateRegex = /^[1-4]\d{3}\/(0[1-9]|1[0-2])\/(0[1-9]|[12]\d|3[01])$/;

// حکم کارگزینی اولیه و شرایط قرارداد پرسنل
export const EmployeeContractSchema = z.object({
  contractType: ContractTypeEnum.default('TEMPORARY'),
  startDateShamsi: z.string().regex(shamsiDateRegex, 'فرمت تاریخ شمسی نامعتبر است (مثال: ۱۴۰۳/۰۱/۰۱)'),
  endDateShamsi: z.string().regex(shamsiDateRegex, 'فرمت تاریخ شمسی نامعتبر است').optional(),
  monthlyBaseSalary: z.union([z.number().positive('حقوق پایه باید مثبت باشد'), z.string()]),
  monthlyHousingAllowance: z.union([z.number().nonnegative(), z.string()]).default(9000000), // ۹ میلیون ریال مصوب
  monthlyGroceryAllowance: z.union([z.number().nonnegative(), z.string()]).default(14000000), // ۱۴ میلیون ریال بن کارگری
  monthlySeniorityBonus: z.union([z.number().nonnegative(), z.string()]).optional().default(0),
  childCount: z.number().int().min(0, 'تعداد فرزند نمی‌تواند منفی باشد').default(0),
  monthlyChildAllowancePerChild: z.union([z.number().nonnegative(), z.string()]).optional(),
});
export type EmployeeContractInput = z.infer<typeof EmployeeContractSchema>;

// پرونده پرسنلی
export const EmployeeCreateSchema = z.object({
  personnelCode: z.string().min(1, 'کد پرسنلی الزامی است'),
  nationalId: z.string().regex(/^\d{10}$/, 'کد ملی باید دقیقاً ۱۰ رقم عددی باشد'),
  firstName: z.string().min(1, 'نام الزامی است'),
  lastName: z.string().min(1, 'نام خانوادگی الزامی است'),
  fatherName: z.string().optional(),
  birthDateShamsi: z.string().regex(shamsiDateRegex, 'فرمت تاریخ تولد نامعتبر است').optional(),
  hireDateShamsi: z.string().regex(shamsiDateRegex, 'فرمت تاریخ استخدام نامعتبر است'),
  insuranceNumber: z.string().optional(),
  bankName: z.string().optional(),
  bankAccountNumber: z.string().optional(),
  bankShebaNumber: z.string().regex(/^IR\d{24}$/, 'شماره شبا باید با IR و ۲۴ رقم عددی باشد'),
  department: z.string().optional(),
  jobTitle: z.string().min(1, 'عنوان شغلی الزامی است'),
  contract: EmployeeContractSchema,
});
export type EmployeeCreateInput = z.infer<typeof EmployeeCreateSchema>;

// دوره حقوق و دستمزد ماهانه
export const PayrollPeriodCreateSchema = z.object({
  title: z.string().min(2, 'عنوان دوره حقوق الزامی است'),
  yearShamsi: z.string().regex(/^[1-9]\d{3}$/, 'سال شمسی باید ۴ رقمی باشد (مثال: ۱۴۰۳)'),
  monthNumber: z.number().int().min(1).max(12, 'شماره ماه باید بین ۱ تا ۱۲ باشد'),
  startDateShamsi: z.string().regex(shamsiDateRegex, 'فرمت تاریخ شروع نامعتبر است'),
  endDateShamsi: z.string().regex(shamsiDateRegex, 'فرمت تاریخ پایان نامعتبر است'),
});
export type PayrollPeriodCreateInput = z.infer<typeof PayrollPeriodCreateSchema>;

// کارت ورود اطلاعات کارکرد پرسنل
export const TimecardItemSchema = z.object({
  employeeId: z.string().min(1, 'شناسه پرسنل الزامی است'),
  workedDays: z.number().min(0).max(31, 'روزهای کارکرد باید بین ۰ تا ۳۱ باشد').default(30),
  overtimeHours: z.number().nonnegative().optional().default(0),
  advanceDeduction: z.union([z.number().nonnegative(), z.string()]).optional().default(0),
  loanDeduction: z.union([z.number().nonnegative(), z.string()]).optional().default(0),
});
export type TimecardItemInput = z.infer<typeof TimecardItemSchema>;

// محاسبه کارکرد دوره حقوق
export const PayrollCalculatePeriodSchema = z.object({
  timecards: z.array(TimecardItemSchema).optional(),
});
export type PayrollCalculatePeriodInput = z.infer<typeof PayrollCalculatePeriodSchema>;

// تایید و صدور سند حقوق
export const PayrollApproveSchema = z.object({
  description: z.string().optional(),
});
export type PayrollApproveInput = z.infer<typeof PayrollApproveSchema>;

// پرداخت حقوق از طریق بانک
export const PayrollPayViaBankSchema = z.object({
  bankAccountId: z.string().min(1, 'انتخاب حساب بانکی پرداخت‌کننده الزامی است'),
  paymentDateShamsi: z.string().regex(shamsiDateRegex, 'فرمت تاریخ پرداخت نامعتبر است'),
  referenceNumber: z.string().optional(),
});
export type PayrollPayViaBankInput = z.infer<typeof PayrollPayViaBankSchema>;
