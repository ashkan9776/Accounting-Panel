import { z } from 'zod';

export const BusinessPresetEnum = z.enum([
  'RESTAURANT',
  'RETAIL',
  'APPAREL',
  'SPARE_PARTS',
  'PHARMACY',
  'GOLD_JEWELRY',
  'MANUFACTURING',
  'WHOLESALE',
  'SERVICE',
  'E_COMMERCE'
]);

export type BusinessPreset = z.infer<typeof BusinessPresetEnum>;

export const BusinessPresetTitles: Record<BusinessPreset, string> = {
  RESTAURANT: 'رستوران، فست‌فود و کافه',
  RETAIL: 'فروشگاه عمومی و سوپرمارکت',
  APPAREL: 'پوشاک و کیف و کفش (ماتریس سایز/رنگ)',
  SPARE_PARTS: 'لوازم یدکی و ابزارفروشی',
  PHARMACY: 'داروخانه و آرایشی-بهداشتی',
  GOLD_JEWELRY: 'طلا و جواهر (الگوی مالیاتی طلا)',
  MANUFACTURING: 'کارگاه تولیدی و صنعتی (بهای تمام شده)',
  WHOLESALE: 'عمده‌فروشی و پخش مویرگی',
  SERVICE: 'شرکت خدماتی، کلینیک و پیمانکاری',
  E_COMMERCE: 'فروشگاه اینترنتی و چندکاناله'
};

export const CompanyRegistrationSchema = z.object({
  name: z.string().min(2, 'نام شرکت یا فروشگاه باید حداقل ۲ کاراکتر باشد.'),
  tradeName: z.string().optional(),
  preset: BusinessPresetEnum,
  nationalId: z
    .string()
    .trim()
    .regex(/^\d{10,11}$/, 'کد ملی حقیقی باید ۱۰ رقم و شناسه ملی حقوقی ۱۱ رقم باشد.'),
  economicCode: z.string().trim().optional(),
  currency: z.enum(['IRR', 'IRT']).default('IRR'),
  adminFullName: z.string().min(3, 'نام کامل مدیر الزامی است.'),
  adminMobile: z.string().regex(/^09\d{9}$/, 'شماره موبایل نامعتبر است.')
});

export type CompanyRegistrationInput = z.infer<typeof CompanyRegistrationSchema>;
