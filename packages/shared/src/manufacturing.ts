import { z } from 'zod';

export const BomStatusEnum = z.enum(['DRAFT', 'ACTIVE', 'OBSOLETE']);
export type BomStatus = z.infer<typeof BomStatusEnum>;

export const BomItemTypeEnum = z.enum(['RAW_MATERIAL', 'SEMI_FINISHED', 'PACKAGING']);
export type BomItemType = z.infer<typeof BomItemTypeEnum>;

export const ProductionOrderStatusEnum = z.enum([
  'DRAFT',
  'RELEASED',
  'IN_PROGRESS',
  'COMPLETED',
  'CLOSED',
  'CANCELLED',
]);
export type ProductionOrderStatus = z.infer<typeof ProductionOrderStatusEnum>;

export const WorkCenterTypeEnum = z.enum([
  'MACHINE',
  'LABOR',
  'ASSEMBLY',
  'QUALITY_CONTROL',
]);
export type WorkCenterType = z.infer<typeof WorkCenterTypeEnum>;

export const ScrapTypeEnum = z.enum(['NORMAL', 'ABNORMAL']);
export type ScrapType = z.infer<typeof ScrapTypeEnum>;

export const VarianceTypeEnum = z.enum(['FAVORABLE', 'UNFAVORABLE', 'NONE']);
export type VarianceType = z.infer<typeof VarianceTypeEnum>;

// مرکز کاری تولید (Work Center)
export const WorkCenterCreateSchema = z.object({
  code: z.string().min(1, 'کد مرکز کاری الزامی است'),
  title: z.string().min(2, 'عنوان مرکز کاری الزامی است'),
  type: WorkCenterTypeEnum.default('MACHINE'),
  hourlyLaborRate: z.number().nonnegative('نرخ دستمزد نمی‌تواند منفی باشد').default(0),
  hourlyMachineRate: z.number().nonnegative('نرخ سربار و استهلاک ماشین نمی‌تواند منفی باشد').default(0),
  capacityHoursPerDay: z.number().positive('ظرفیت کاری روزانه باید مثبت باشد').default(8),
  isActive: z.boolean().default(true),
});
export type WorkCenterCreateInput = z.infer<typeof WorkCenterCreateSchema>;

// قلم فرمول ساخت محصول (BOM Item)
export const BomItemSchema = z.object({
  productId: z.string().min(1, 'شناسه ماده اولیه الزامی است'),
  productName: z.string().min(1, 'نام کالا الزامی است'),
  itemType: BomItemTypeEnum.default('RAW_MATERIAL'),
  quantityPerUnit: z.number().positive('مقدار مصرف در واحد محصول باید مثبت باشد'),
  unit: z.string().min(1, 'واحد سنجش الزامی است').default('عدد'),
  unitCost: z.number().nonnegative().default(0),
  scrapPercentage: z.number().min(0).max(100).default(0), // درصد ضایعات استاندارد
});
export type BomItemInput = z.infer<typeof BomItemSchema>;

// عملیات روتینگ تولید (Routing Operation)
export const RoutingOperationSchema = z.object({
  operationNumber: z.number().int().positive(),
  title: z.string().min(2, 'عنوان عملیات الزامی است'),
  workCenterId: z.string().min(1, 'مرکز کاری الزامی است'),
  setupTimeHours: z.number().nonnegative().default(0),
  runTimeHoursPerUnit: z.number().positive('زمان ساخت هر واحد باید مثبت باشد'),
});
export type RoutingOperationInput = z.infer<typeof RoutingOperationSchema>;

// تعریف ساختار محصول (BOM Definition)
export const BomCreateSchema = z.object({
  productId: z.string().min(1, 'شناسه محصول ساخته‌شده الزامی است'),
  productName: z.string().min(1, 'نام محصول الزامی است'),
  version: z.string().min(1, 'نسخه فرمولاسیون الزامی است').default('v1.0'),
  title: z.string().min(2, 'عنوان فرمول ساخت الزامی است'),
  yieldQuantity: z.number().positive('تعداد خروجی فرمول باید مثبت باشد').default(1),
  status: BomStatusEnum.default('ACTIVE'),
  items: z.array(BomItemSchema).min(1, 'فرمول ساخت باید حداقل دارای یک ماده اولیه باشد'),
  operations: z.array(RoutingOperationSchema).optional(),
});
export type BomCreateInput = z.infer<typeof BomCreateSchema>;

// دستور کار و سفارش تولید (Production Order)
export const ProductionOrderCreateSchema = z.object({
  bomId: z.string().min(1, 'شناسه فرمول ساخت (BOM) الزامی است'),
  productId: z.string().min(1, 'شناسه محصول الزامی است'),
  plannedQuantity: z.number().positive('تعداد برنامه‌ریزی تولید باید بزرگتر از صفر باشد'),
  plannedStartDate: z.string().regex(/^\d{4}\/\d{2}\/\d{2}$/, 'فرمت تاریخ باید YYYY/MM/DD باشد'),
  plannedEndDate: z.string().regex(/^\d{4}\/\d{2}\/\d{2}$/, 'فرمت تاریخ باید YYYY/MM/DD باشد'),
  notes: z.string().optional(),
});
export type ProductionOrderCreateInput = z.infer<typeof ProductionOrderCreateSchema>;

// صدور حواله مصرف مواد به کالای در جریان ساخت (WIP)
export const MaterialIssueSchema = z.object({
  orderId: z.string().min(1, 'شناسه سفارش تولید الزامی است'),
  warehouseId: z.string().min(1, 'انبار مبدا مواد الزامی است'),
  materials: z
    .array(
      z.object({
        productId: z.string().min(1),
        quantity: z.number().positive(),
        unitCost: z.number().nonnegative(),
      })
    )
    .min(1, 'حداقل یک قلم ماده اولیه باید صادر شود'),
});
export type MaterialIssueInput = z.infer<typeof MaterialIssueSchema>;

// ثبت ضایعات تولید
export const ScrapRecordSchema = z.object({
  orderId: z.string().min(1),
  scrapType: ScrapTypeEnum.default('NORMAL'),
  quantity: z.number().positive('تعداد ضایعات باید مثبت باشد'),
  reason: z.string().min(2, 'دلیل بروز ضایعات الزامی است'),
});
export type ScrapRecordInput = z.infer<typeof ScrapRecordSchema>;

// تکمیل سفارش و رسید محصول ساخته‌شده به انبار
export const ProductionOrderCompleteSchema = z.object({
  orderId: z.string().min(1),
  completedQuantity: z.number().positive('تعداد محصول تکمیل‌شده باید مثبت باشد'),
  destinationWarehouseId: z.string().min(1, 'انبار مقصد کالای ساخته‌شده الزامی است'),
  notes: z.string().optional(),
});
export type ProductionOrderCompleteInput = z.infer<typeof ProductionOrderCompleteSchema>;
