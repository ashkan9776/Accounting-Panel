import { z } from 'zod';

export const PosPaymentMethodEnum = z.enum(['CASH', 'CARD', 'CREDIT', 'SPLIT']);
export type PosPaymentMethod = z.infer<typeof PosPaymentMethodEnum>;

export const PosCashMovementTypeEnum = z.enum(['CASH_IN', 'CASH_OUT']);
export type PosCashMovementType = z.infer<typeof PosCashMovementTypeEnum>;

// اقلام فاکتور پایانه فروشگاهی
export const PosOrderItemSchema = z.object({
  productId: z.string().min(1, 'شناسه کالا الزامی است'),
  productName: z.string().min(1, 'نام کالا الزامی است'),
  barcode: z.string().optional(),
  quantity: z.number().positive('تعداد کالا باید بزرگتر از صفر باشد'),
  unitPrice: z.number().nonnegative('قیمت واحد نمی‌تواند منفی باشد'),
  discount: z.number().nonnegative('تخفیف نمی‌تواند منفی باشد').default(0),
  taxExempt: z.boolean().default(false),
  vatRate: z.number().min(0).max(100).default(10), // ۱۰٪ ارزش افزوده پیش‌فرض
  vatAmount: z.number().nonnegative().default(0),
  totalPrice: z.number().nonnegative(),
});
export type PosOrderItemInput = z.infer<typeof PosOrderItemSchema>;

// ثبت سفارش و فاکتور نهایی POS
export const PosOrderCreateSchema = z.object({
  shiftId: z.string().min(1, 'شناسه شیفت فعال الزامی است'),
  customerId: z.string().optional(),
  customerName: z.string().default('مشتری حضوری / متفرقه'),
  paymentMethod: PosPaymentMethodEnum.default('CASH'),
  paidCash: z.number().nonnegative().default(0),
  paidCard: z.number().nonnegative().default(0),
  paidCredit: z.number().nonnegative().default(0),
  items: z.array(PosOrderItemSchema).min(1, 'سبد خرید پایانه باید حداقل یک قلم کالا داشته باشد'),
  totalGross: z.number().nonnegative(),
  totalDiscount: z.number().nonnegative().default(0),
  totalVat: z.number().nonnegative().default(0),
  totalPayable: z.number().positive('مبلغ نهایی فاکتور باید بزرگتر از صفر باشد'),
  isOffline: z.boolean().default(false),
  offlineLocalId: z.string().optional(),
  notes: z.string().optional(),
});
export type PosOrderCreateInput = z.infer<typeof PosOrderCreateSchema>;

// باز کردن شیفت صندوق
export const PosShiftOpenSchema = z.object({
  cashDeskId: z.string().min(1, 'شناسه صندوق الزامی است'),
  openingCash: z.number().nonnegative('موجودی نقدی اولیه نمی‌تواند منفی باشد').default(0),
  notes: z.string().optional(),
});
export type PosShiftOpenInput = z.infer<typeof PosShiftOpenSchema>;

// بستن شیفت صندوق
export const PosShiftCloseSchema = z.object({
  closingCashActual: z.number().nonnegative('موجودی نقدی شمرده‌شده نمی‌تواند منفی باشد'),
  notes: z.string().optional(),
});
export type PosShiftCloseInput = z.infer<typeof PosShiftCloseSchema>;

// ورود و خروج نقدی صندوق در حین شیفت
export const PosCashMovementSchema = z.object({
  type: PosCashMovementTypeEnum,
  amount: z.number().positive('مبلغ ورود یا خروج وجه باید مثبت باشد'),
  reason: z.string().min(2, 'علت تراکنش نقدی الزامی است'),
});
export type PosCashMovementInput = z.infer<typeof PosCashMovementSchema>;

// تعلیق فاکتور (Hold / Park Order)
export const PosHoldOrderSchema = z.object({
  tag: z.string().default('مشتری معلق'),
  items: z.array(PosOrderItemSchema).min(1),
  totalPayable: z.number().positive(),
  heldAt: z.string().optional(),
});
export type PosHoldOrderInput = z.infer<typeof PosHoldOrderSchema>;
