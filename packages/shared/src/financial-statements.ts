import { z } from 'zod';

const shamsiDateRegex = /^[1-4]\d{3}\/(0[1-9]|1[0-2])\/(0[1-9]|[12]\d|3[01])$/;

// فیلتر گزارشات صورت‌های مالی اساسی
export const FinancialReportQuerySchema = z.object({
  asOfDateShamsi: z.string().regex(shamsiDateRegex, 'فرمت تاریخ شمسی نامعتبر است (مثال: ۱۴۰۳/۱۲/۲۹)').optional(),
  fromDateShamsi: z.string().regex(shamsiDateRegex, 'فرمت تاریخ شروع نامعتبر است').optional(),
  toDateShamsi: z.string().regex(shamsiDateRegex, 'فرمت تاریخ پایان نامعتبر است').optional(),
  fiscalYearId: z.string().optional(),
  comparative: z.boolean().optional().default(false),
});
export type FinancialReportQueryInput = z.infer<typeof FinancialReportQuerySchema>;

// بستن حساب‌های موقت (سود و زیانی)
export const FiscalYearCloseTemporarySchema = z.object({
  fiscalYearId: z.string().min(1, 'شناسه سال مالی الزامی است'),
  closingDateShamsi: z.string().regex(shamsiDateRegex, 'فرمت تاریخ بستن حساب‌ها نامعتبر است'),
  retainedEarningsAccountId: z.string().optional().default('sub-5201'),
  description: z.string().optional().default('بستن حساب‌های موقت درآمد و هزینه به سود و زیان انباشته سنواتی'),
});
export type FiscalYearCloseTemporaryInput = z.infer<typeof FiscalYearCloseTemporarySchema>;

// صدور سند اختتامیه و بستن حساب‌های دائم
export const FiscalYearClosePermanentSchema = z.object({
  fiscalYearId: z.string().min(1, 'شناسه سال مالی الزامی است'),
  closingDateShamsi: z.string().regex(shamsiDateRegex, 'فرمت تاریخ سند اختتامیه نامعتبر است'),
  description: z.string().optional().default('سند اختتامیه و بستن حساب‌های ترازنامه‌ای پایان سال مالی'),
});
export type FiscalYearClosePermanentInput = z.infer<typeof FiscalYearClosePermanentSchema>;

// صدور سند افتتاحیه سال مالی جدید
export const FiscalYearOpenNextSchema = z.object({
  previousFiscalYearId: z.string().min(1, 'شناسه سال مالی قبلی الزامی است'),
  newFiscalYearTitle: z.string().min(2, 'عنوان سال مالی جدید الزامی است'),
  newFiscalYearId: z.string().optional(),
  openingDateShamsi: z.string().regex(shamsiDateRegex, 'فرمت تاریخ شروع سال مالی جدید نامعتبر است'),
  endDateShamsi: z.string().regex(shamsiDateRegex, 'فرمت تاریخ پایان سال مالی جدید نامعتبر است'),
  description: z.string().optional().default('سند افتتاحیه سال مالی جدید منتقله از سال قبل'),
});
export type FiscalYearOpenNextInput = z.infer<typeof FiscalYearOpenNextSchema>;
