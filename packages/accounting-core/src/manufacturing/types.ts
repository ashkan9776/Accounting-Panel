import Decimal from 'decimal.js';

export enum BomStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  OBSOLETE = 'OBSOLETE'
}

export enum BomItemType {
  RAW_MATERIAL = 'RAW_MATERIAL',
  SEMI_FINISHED = 'SEMI_FINISHED',
  PACKAGING = 'PACKAGING'
}

export enum ProductionOrderStatus {
  DRAFT = 'DRAFT',
  RELEASED = 'RELEASED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CLOSED = 'CLOSED',
  CANCELLED = 'CANCELLED'
}

export enum WorkCenterType {
  MACHINE = 'MACHINE',
  LABOR = 'LABOR',
  ASSEMBLY = 'ASSEMBLY',
  QUALITY_CONTROL = 'QUALITY_CONTROL'
}

export enum ScrapType {
  NORMAL = 'NORMAL',     // ضایعات عادی (جذب در بهای محصول سالم)
  ABNORMAL = 'ABNORMAL'  // ضایعات غیرعادی (شناسایی به عنوان زیان ضایعات دوره)
}

export enum VarianceType {
  FAVORABLE = 'FAVORABLE',     // مساعد (هزینه واقعی کمتر از استاندارد)
  UNFAVORABLE = 'UNFAVORABLE', // نامساعد (هزینه واقعی بیشتر از استاندارد)
  NONE = 'NONE'                // منطبق بر استاندارد
}

export interface BomItemInput {
  productId: string;
  itemType: BomItemType;
  quantityPerUnit: string | number; // مقدار مصرف به ازای یک واحد محصول
  scrapPercentage?: string | number; // درصد ضایعات مجاز فرآیند
  substituteProductId?: string; // کالای جایگزین در صورت کسری موجودی
}

export interface BomDefinition {
  id?: string;
  productId: string;
  version: string;
  title: string;
  yieldQuantity: string | number; // تعداد خروجی فرمول (معمولاً ۱)
  items: BomItemInput[];
}

export interface RoutingOperation {
  operationNumber: number; // مثلاً ۱۰، ۲۰، ۳۰
  title: string;
  workCenterId: string;
  setupTimeHours: string | number; // زمان آماده‌سازی خط تولید
  runTimeHoursPerUnit: string | number; // زمان کارکرد به ازای هر واحد محصول
  laborRatePerHour: string | number; // نرخ جذب ساعتی دستمزد مستقیم
  machineRatePerHour: string | number; // نرخ جذب ساعتی سربار ساخت و استهلاک ماشین
}

export interface MaterialRequirement {
  productId: string;
  productCode?: string;
  productName?: string;
  unitCost: string;
  requiredQuantity: string;
  totalCost: string;
}

export interface ProductionCostBreakdown {
  directMaterialsCost: string;
  directLaborCost: string;
  appliedOverheadCost: string;
  normalScrapCost: string;
  totalProductionCost: string;
  completedQuantity: string;
  unitProductionCost: string;
}

export interface VarianceAnalysisResult {
  materialStandardCost: string;
  materialActualCost: string;
  materialUsageVariance: string;
  materialVarianceType: VarianceType;

  laborStandardCost: string;
  laborActualCost: string;
  laborVariance: string;
  laborVarianceType: VarianceType;

  overheadStandardCost: string;
  overheadActualCost: string;
  overheadVariance: string;
  overheadVarianceType: VarianceType;

  totalNetVariance: string;
  netVarianceType: VarianceType;
}
