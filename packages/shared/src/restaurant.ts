import { z } from 'zod';

export const RestaurantTableStatusEnum = z.enum([
  'VACANT',
  'OCCUPIED',
  'BILL_PRINTED',
  'RESERVED',
  'CLEANING',
]);
export type RestaurantTableStatus = z.infer<typeof RestaurantTableStatusEnum>;

export const RestaurantOrderChannelEnum = z.enum([
  'DINE_IN',
  'TAKEAWAY',
  'DELIVERY',
  'ONLINE_AGGREGATOR',
]);
export type RestaurantOrderChannel = z.infer<typeof RestaurantOrderChannelEnum>;

export const RestaurantKitchenStationEnum = z.enum([
  'HOT_KITCHEN',
  'COLD_KITCHEN',
  'BAR_CAFE',
  'BAKERY_DESSERT',
]);
export type RestaurantKitchenStation = z.infer<typeof RestaurantKitchenStationEnum>;

export const RestaurantKdsStatusEnum = z.enum(['QUEUED', 'PREPARING', 'READY', 'SERVED']);
export type RestaurantKdsStatus = z.infer<typeof RestaurantKdsStatusEnum>;

// تعریف میز در سالن
export const RestaurantTableCreateSchema = z.object({
  tableNumber: z.string().min(1, 'شماره میز الزامی است'),
  section: z.string().min(1, 'بخش یا سالن الزامی است').default('سالن اصلی'),
  capacity: z.number().int().positive('ظرفیت میز باید حداقل ۱ نفر باشد').default(4),
  status: RestaurantTableStatusEnum.default('VACANT'),
});
export type RestaurantTableCreateInput = z.infer<typeof RestaurantTableCreateSchema>;

// انتقال میز
export const RestaurantTableTransferSchema = z.object({
  fromTableId: z.string().min(1, 'شناسه میز مبدا الزامی است'),
  toTableId: z.string().min(1, 'شناسه میز مقصد الزامی است'),
});
export type RestaurantTableTransferInput = z.infer<typeof RestaurantTableTransferSchema>;

// ادغام میزها
export const RestaurantTableMergeSchema = z.object({
  primaryTableId: z.string().min(1, 'شناسه میز اصلی الزامی است'),
  secondaryTableId: z.string().min(1, 'شناسه میز فرعی الزامی است'),
});
export type RestaurantTableMergeInput = z.infer<typeof RestaurantTableMergeSchema>;

// قلم مواد اولیه فرمول تولید (BOM)
export const RestaurantRecipeItemSchema = z.object({
  rawProductId: z.string().min(1, 'شناسه ماده اولیه الزامی است'),
  rawProductName: z.string().min(1, 'نام ماده اولیه الزامی است'),
  quantity: z.number().positive('مقدار مصرف ماده اولیه باید بزرگتر از صفر باشد'),
  unit: z.string().min(1, 'واحد سنجش الزامی است').default('گرم'),
  unitCost: z.number().nonnegative('بهای واحد نمی‌تواند منفی باشد'),
  wastePercentage: z.number().min(0).max(100).default(0), // درصد ضایعات آماده‌سازی
});
export type RestaurantRecipeItemInput = z.infer<typeof RestaurantRecipeItemSchema>;

// فرمولاسیون و بهای تمام‌شده غذا (BOM)
export const RestaurantRecipeCreateSchema = z.object({
  menuProductId: z.string().min(1, 'شناسه محصول منو الزامی است'),
  menuProductName: z.string().min(1, 'نام غذای منو الزامی است'),
  yieldQuantity: z.number().positive('تعداد خروجی باید مثبت باشد').default(1),
  sellingPrice: z.number().positive('قیمت فروش باید بزرگتر از صفر باشد'),
  ingredients: z.array(RestaurantRecipeItemSchema).min(1, 'دستور پخت باید حداقل دارای یک ماده اولیه باشد'),
  preparationTimeMinutes: z.number().int().positive().default(15),
  kitchenStation: RestaurantKitchenStationEnum.default('HOT_KITCHEN'),
});
export type RestaurantRecipeCreateInput = z.infer<typeof RestaurantRecipeCreateSchema>;

// قلم سفارش رستوران
export const RestaurantOrderItemSchema = z.object({
  productId: z.string().min(1),
  productName: z.string().min(1),
  quantity: z.number().positive(),
  unitPrice: z.number().nonnegative(),
  vatAmount: z.number().nonnegative().default(0),
  totalPrice: z.number().nonnegative(),
  notes: z.string().optional(), // یادداشت مشتری یا سرآشپز مثلا بدون پیاز
  kitchenStation: RestaurantKitchenStationEnum.default('HOT_KITCHEN'),
});
export type RestaurantOrderItemInput = z.infer<typeof RestaurantOrderItemSchema>;

// ثبت سفارش رستوران
export const RestaurantOrderCreateSchema = z.object({
  channel: RestaurantOrderChannelEnum.default('DINE_IN'),
  tableId: z.string().optional(),
  tableNumber: z.string().optional(),
  customerName: z.string().default('مشتری سالن'),
  items: z.array(RestaurantOrderItemSchema).min(1, 'سفارش باید دارای اقلام غذایی باشد'),
  totalGross: z.number().nonnegative(),
  serviceFeeRate: z.number().min(0).max(100).default(0), // درصد حق سرویس
  serviceFeeAmount: z.number().nonnegative().default(0),
  tipAmount: z.number().nonnegative().default(0), // انعام
  totalVat: z.number().nonnegative().default(0),
  totalPayable: z.number().positive(),
  deliveryAddress: z.string().optional(),
  courierName: z.string().optional(),
});
export type RestaurantOrderCreateInput = z.infer<typeof RestaurantOrderCreateSchema>;
