import { z } from 'zod';

export const SalesDocumentTypeEnum = z.enum([
  'PROFORMA',
  'ORDER',
  'INVOICE',
  'RETURN_INVOICE',
  'CORRECTION_INVOICE'
]);

export const PaymentMethodEnum = z.enum([
  'CASH',
  'POS',
  'CHEQUE',
  'CREDIT',
  'COMBINED',
  'ONLINE'
]);

export const SalesInvoiceItemSchema = z.object({
  productId: z.string().min(1, 'شناسه کالا الزامی است.'),
  productCode: z.string().optional(),
  productName: z.string().min(1, 'عنوان کالا الزامی است.'),
  quantity: z.number().positive('تعداد باید بزرگتر از صفر باشد.'),
  unitPrice: z.number().nonnegative('قیمت واحد نمی‌تواند منفی باشد.'),
  discountAmount: z.number().nonnegative('تخفیف نمی‌تواند منفی باشد.').default(0),
  vatRate: z.number().min(0).max(1).default(0.10), // ۱۰٪ ارزش افزوده پیش‌فرض
  description: z.string().optional()
});

export type SalesInvoiceItem = z.infer<typeof SalesInvoiceItemSchema>;

export const SalesInvoiceCreateSchema = z.object({
  customerId: z.string().min(1, 'انتخاب طرف‌حساب الزامی است.'),
  dateShamsi: z
    .string()
    .regex(/^\d{4}\/\d{2}\/\d{2}$/, 'فرمت تاریخ شمسی باید YYYY/MM/DD باشد.'),
  dueDateShamsi: z
    .string()
    .regex(/^\d{4}\/\d{2}\/\d{2}$/, 'فرمت تاریخ سررسید باید YYYY/MM/DD باشد.')
    .optional(),
  paymentMethod: PaymentMethodEnum.default('CASH'),
  warehouseId: z.string().min(1, 'انتخاب انبار الزامی است.'),
  items: z.array(SalesInvoiceItemSchema).min(1, 'حداقل یک سطر کالا الزامی است.'),
  shippingFee: z.number().nonnegative().default(0),
  description: z.string().optional()
});

export type SalesInvoiceCreateInput = z.infer<typeof SalesInvoiceCreateSchema>;
