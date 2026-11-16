import { z } from 'zod';

export const AssetCategoryEnum = z.enum([
  'FURNITURE_OFFICE',       // اثاثه و تجهیزات اداری و کامپیوتری
  'VEHICLES',               // وسایط نقلیه
  'MACHINERY_TECHNICAL',   // ماشین‌آلات و تجهیزات فنی و تولیدی
]);
export type AssetCategory = z.infer<typeof AssetCategoryEnum>;

export const DepreciationMethodEnum = z.enum([
  'STRAIGHT_LINE',         // روش خط مستقیم (ماده ۱۴۹ ق.م.م)
  'DECLINING_BALANCE',     // روش مانده نزولی
]);
export type DepreciationMethod = z.infer<typeof DepreciationMethodEnum>;

export const AssetStatusEnum = z.enum([
  'ACTIVE',           // در حال بهره‌برداری
  'DEPRECIATED',      // مستهلک‌شده کامل
  'SOLD',             // واگذار شده / فروخته شده
  'SCRAPPED',         // اسقاط شده و از مدار خارج
]);
export type AssetStatus = z.infer<typeof AssetStatusEnum>;

const shamsiDateRegex = /^[1-4]\d{3}\/(0[1-9]|1[0-2])\/(0[1-9]|[12]\d|3[01])$/;

// ثبت دارایی ثابت جدید و پلاک‌کوبی اموال
export const FixedAssetCreateSchema = z.object({
  assetCode: z.string().min(1, 'کد یا شماره پلاک اموال الزامی است'),
  title: z.string().min(2, 'شرح و عنوان دارایی الزامی است'),
  category: AssetCategoryEnum.default('FURNITURE_OFFICE'),
  purchaseDateShamsi: z.string().regex(shamsiDateRegex, 'فرمت تاریخ تحصیل شمسی نامعتبر است (مثال: ۱۴۰۳/۰۱/۰۱)'),
  historicalCost: z.union([z.number().positive('بهای تمام‌شده تاریخی باید مثبت باشد'), z.string()]),
  salvageValue: z.union([z.number().nonnegative(), z.string()]).default(0),
  depreciationMethod: DepreciationMethodEnum.default('STRAIGHT_LINE'),
  annualRatePercentage: z.union([z.number().nonnegative(), z.string()]).optional(),
  usefulLifeYears: z.number().int().positive('عمر مفید باید حداقل ۱ سال باشد').optional(),
  costCenterDimensionId: z.string().optional(),
  keeperPartyId: z.string().optional(),
  location: z.string().optional(),
});
export type FixedAssetCreateInput = z.infer<typeof FixedAssetCreateSchema>;

// محاسبه و ثبت استهلاک دوره‌ای
export const DepreciationCalculateSchema = z.object({
  periodDateShamsi: z.string().regex(shamsiDateRegex, 'فرمت تاریخ دوره استهلاک نامعتبر است'),
  monthsCount: z.number().int().min(1).max(12, 'تعداد ماه‌های استهلاک باید بین ۱ تا ۱۲ باشد').default(1),
  costCenterDimensionId: z.string().optional(),
});
export type DepreciationCalculateInput = z.infer<typeof DepreciationCalculateSchema>;

// اسقاط یا فروش دارایی ثابت
export const AssetDisposalSchema = z.object({
  disposalDateShamsi: z.string().regex(shamsiDateRegex, 'فرمت تاریخ واگذاری یا اسقاط نامعتبر است'),
  salePrice: z.union([z.number().nonnegative('مبلغ فروش نمی‌تواند منفی باشد'), z.string()]).default(0),
  receivingBankAccountId: z.string().min(1, 'انتخاب حساب بانکی دریافت وجه الزامی است'),
});
export type AssetDisposalInput = z.infer<typeof AssetDisposalSchema>;
