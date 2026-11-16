import { z } from 'zod';

export const WarehouseCreateSchema = z.object({
  code: z.string().min(1, 'کد انبار الزامی است.'),
  name: z.string().min(2, 'نام انبار الزامی است.'),
  address: z.string().optional(),
  phone: z.string().optional(),
  keeperName: z.string().optional(),
});
export type WarehouseCreateInput = z.infer<typeof WarehouseCreateSchema>;

export const ProductCreateSchema = z.object({
  code: z.string().min(1, 'کد کالا الزامی است.'),
  name: z.string().min(2, 'نام کالا الزامی است.'),
  unitId: z.string().min(1, 'واحد سنجش الزامی است.'),
  type: z.enum(['GOODS', 'SERVICE', 'RAW_MATERIAL', 'MANUFACTURED']).default('GOODS'),
  barcode: z.string().optional(),
  sellPrice: z.union([z.number().nonnegative(), z.string()]).default(0),
  purchasePrice: z.union([z.number().nonnegative(), z.string()]).default(0),
  taxExempt: z.boolean().default(false),
  vatRate: z.number().min(0).max(100).default(10),
  minStockAlert: z.number().nonnegative().optional(),
  maxStockAlert: z.number().nonnegative().optional(),
});
export type ProductCreateInput = z.infer<typeof ProductCreateSchema>;

export const InventoryCountItemSchema = z.object({
  productId: z.string().min(1, 'شناسه کالا الزامی است.'),
  systemQuantity: z.number().nonnegative(),
  countedQuantity: z.number().nonnegative(),
  unitCost: z.number().nonnegative(),
  description: z.string().optional(),
});

export const InventoryCountCreateSchema = z.object({
  warehouseId: z.string().min(1, 'انتخاب انبار الزامی است.'),
  countDateShamsi: z
    .string()
    .regex(/^\d{4}\/\d{2}\/\d{2}$/, 'فرمت تاریخ شمسی باید YYYY/MM/DD باشد.'),
  description: z.string().min(3, 'شرح انبارگردانی الزامی است.'),
  items: z.array(InventoryCountItemSchema).min(1, 'حداقل یک ردیف شمارش الزامی است.'),
});
export type InventoryCountCreateInput = z.infer<typeof InventoryCountCreateSchema>;

export const PurchaseInvoiceItemSchema = z.object({
  productId: z.string().min(1, 'شناسه کالا الزامی است.'),
  quantity: z.number().positive('تعداد باید بزرگتر از صفر باشد.'),
  unitCost: z.number().nonnegative('بهای واحد نمی‌تواند منفی باشد.'),
  discountAmount: z.number().nonnegative().default(0),
  taxExempt: z.boolean().default(false),
  vatRate: z.number().default(10),
});

export const PurchaseInvoiceCreateSchema = z.object({
  documentNumber: z.string().min(1, 'شماره فاکتور خرید الزامی است.'),
  dateShamsi: z
    .string()
    .regex(/^\d{4}\/\d{2}\/\d{2}$/, 'فرمت تاریخ شمسی باید YYYY/MM/DD باشد.'),
  supplierPartyId: z.string().min(1, 'انتخاب تامین‌کننده الزامی است.'),
  warehouseId: z.string().min(1, 'انتخاب انبار مقصد الزامی است.'),
  freightAmount: z.number().nonnegative().default(0),
  discountAmount: z.number().nonnegative().default(0),
  description: z.string().optional(),
  items: z.array(PurchaseInvoiceItemSchema).min(1, 'حداقل یک سطر کالا الزامی است.'),
});
export type PurchaseInvoiceCreateInput = z.infer<typeof PurchaseInvoiceCreateSchema>;
