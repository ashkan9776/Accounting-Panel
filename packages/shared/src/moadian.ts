import { z } from 'zod';

export const MoadianInvoiceTypeEnum = z.enum(['TYPE_1', 'TYPE_2', 'TYPE_3']);
export type MoadianInvoiceTypeEnum = z.infer<typeof MoadianInvoiceTypeEnum>;

export const MoadianInvoicePatternEnum = z.enum([
  'PATTERN_1_GENERAL',
  'PATTERN_2_GOLD',
  'PATTERN_3_CONTRACTING',
  'PATTERN_4_EXPORT',
  'PATTERN_5_UTILITIES',
  'PATTERN_6_AIRLINE',
  'PATTERN_7_CARGO',
]);
export type MoadianInvoicePatternEnum = z.infer<typeof MoadianInvoicePatternEnum>;

export const MoadianInvoiceSubjectEnum = z.enum(['MAIN', 'CORRECTION', 'CANCELLATION', 'RETURN']);
export type MoadianInvoiceSubjectEnum = z.infer<typeof MoadianInvoiceSubjectEnum>;

export const MoadianTransportMethodEnum = z.enum(['DIRECT', 'TRUSTED_COMPANY', 'GOVERNMENT_GATEWAY', 'SANDBOX']);
export type MoadianTransportMethodEnum = z.infer<typeof MoadianTransportMethodEnum>;

export const MoadianCustomerTypeEnum = z.enum(['LEGAL', 'INDIVIDUAL', 'FOREIGN_NATIONAL', 'CONSUMER']);
export type MoadianCustomerTypeEnum = z.infer<typeof MoadianCustomerTypeEnum>;

// Tax ID regex: 22 alphanumeric characters, uppercase
export const MoadianTaxIdSchema = z
  .string()
  .length(22, 'شماره منحصر به فرد مالیاتی باید دقیقاً ۲۲ کاراکتر باشد')
  .regex(/^[A-Z0-9]{22}$/, 'شماره مالیاتی فقط باید شامل ارقام و حروف بزرگ لاتین باشد');

// تنظیمات اتصال به سامانه مودیان و کلیدهای دیجیتال
export const MoadianConfigSchema = z.object({
  fiscalMemoryId: z
    .string()
    .length(6, 'شناسه یکتای حافظه مالیاتی باید ۶ کاراکتر باشد')
    .regex(/^[A-Z0-9]{6}$/, 'شناسه حافظه مالیاتی باید شامل ارقام و حروف بزرگ انگلیسی باشد'),
  privateKey: z.string().min(20, 'کلید خصوصی RSA معتبر الزامی است'),
  publicKey: z.string().min(20, 'کلید عمومی / گواهی دیجیتال CRT الزامی است'),
  clientId: z.string().optional(),
  transportMethod: MoadianTransportMethodEnum.default('DIRECT'),
  tspProvider: z.string().optional(),
  fiscalYear: z.string().regex(/^\d{4}$/, 'سال مالی باید ۴ رقم باشد').default('1403'),
  isSandbox: z.boolean().default(false),
});
export type MoadianConfigInput = z.infer<typeof MoadianConfigSchema>;

// قلم کالای صورتحساب مودیان
export const MoadianInvoiceItemSchema = z.object({
  rowNumber: z.number().int().positive('شماره سطر باید مثبت باشد'),
  sstid: z
    .string()
    .min(13, 'شناسه کالا/خدمت سازمان امور مالیاتی باید حداقل ۱۳ کاراکتر باشد')
    .max(13, 'شناسه کالا/خدمت سازمان امور مالیاتی باید ۱۳ کاراکتر باشد'),
  description: z.string().min(2, 'شرح کالا یا خدمت الزامی است'),
  quantity: z.string().regex(/^\d+(\.\d+)?$/, 'مقدار کالا باید عددی معتبر باشد'),
  unitCode: z.string().min(1, 'کد واحد سنجش الزامی است').default('1640'),
  unitPrice: z.string().regex(/^\d+$/, 'مبلغ واحد باید عدد صحیح ریالی باشد'),
  totalPrice: z.string().regex(/^\d+$/, 'مبلغ کل باید عدد صحیح ریالی باشد'),
  discountAmount: z.string().regex(/^\d+$/, 'مبلغ تخفیف نامعتبر است').default('0'),
  netPrice: z.string().regex(/^\d+$/, 'مبلغ خالص پس از تخفیف باید عدد صحیح باشد'),
  vatRate: z.string().regex(/^0(\.\d+)?$/, 'نرخ ارزش افزوده باید اعشاری بین ۰ تا ۱ باشد').default('0.10'),
  vatAmount: z.string().regex(/^\d+$/, 'مبلغ ارزش افزوده باید عدد صحیح باشد'),
  otherTaxesAmount: z.string().regex(/^\d+$/).default('0'),
  finalAmount: z.string().regex(/^\d+$/, 'مبلغ نهایی سطر نامعتبر است'),
  // طلا و جواهر
  constructionWage: z.string().optional(),
  sellerProfit: z.string().optional(),
  commission: z.string().optional(),
});
export type MoadianInvoiceItemInput = z.infer<typeof MoadianInvoiceItemSchema>;

// هدر صورتحساب مودیان
export const MoadianInvoiceHeaderSchema = z.object({
  taxId: MoadianTaxIdSchema,
  issueDateShamsi: z.string().regex(/^\d{4}\/\d{2}\/\d{2}$/, 'فرمت تاریخ شمسی باید YYYY/MM/DD باشد'),
  issueDateTimeStamp: z.number().int().positive(),
  invoiceType: MoadianInvoiceTypeEnum.default('TYPE_1'),
  invoicePattern: MoadianInvoicePatternEnum.default('PATTERN_1_GENERAL'),
  invoiceSubject: MoadianInvoiceSubjectEnum.default('MAIN'),
  referenceTaxId: MoadianTaxIdSchema.optional(),
  sellerFiscalMemoryId: z.string().length(6),
  sellerNationalId: z.string().min(10).max(11),
  sellerEconomicCode: z.string().optional(),
  sellerPostalCode: z.string().length(10, 'کد پستی ۱۰ رقمی الزامی است').optional(),
  customerType: MoadianCustomerTypeEnum.default('LEGAL'),
  customerNationalId: z.string().min(10).max(11).optional(),
  customerEconomicCode: z.string().optional(),
  customerPostalCode: z.string().length(10).optional(),
  totalGrossAmount: z.string().regex(/^\d+$/),
  totalDiscountAmount: z.string().regex(/^\d+$/).default('0'),
  totalNetAmount: z.string().regex(/^\d+$/),
  totalVatAmount: z.string().regex(/^\d+$/),
  totalGrandAmount: z.string().regex(/^\d+$/),
  settlementMethod: z.enum(['CASH', 'CREDIT', 'MIXED']).default('CASH'),
});
export type MoadianInvoiceHeaderInput = z.infer<typeof MoadianInvoiceHeaderSchema>;

// بدنه کامل ارسالی به مودیان
export const MoadianInvoicePayloadSchema = z.object({
  header: MoadianInvoiceHeaderSchema,
  items: z.array(MoadianInvoiceItemSchema).min(1, 'صورتحساب باید حداقل دارای یک سطر کالا یا خدمت باشد'),
});
export type MoadianInvoicePayloadInput = z.infer<typeof MoadianInvoicePayloadSchema>;
