/**
 * تایپ‌های مدیریت کالا، انبار، کاردکس مقداری-ریالی، خرید و فروش
 */

export enum ProductType {
  GOODS = 'GOODS',       // کالای فیزیکی (دارای موجودی و کاردکس انبار)
  SERVICE = 'SERVICE'    // خدمت (فاقد انبار فیزیکی، فقط درآمد و هزینه)
}

export enum ValuationMethod {
  MOVING_AVERAGE = 'MOVING_AVERAGE', // میانگین موزون متحرک (روش پیش‌فرض و استاندارد ممیزی مالیاتی ایران)
  FIFO = 'FIFO'                      // اولین صادره از اولین وارده (First In, First Out)
}

export enum StockDocumentType {
  RECEIPT = 'RECEIPT',                     // رسید خرید کالا
  ISSUE = 'ISSUE',                         // حواله خروج انبار (فروش)
  TRANSFER_IN = 'TRANSFER_IN',             // انتقال به انبار (وارده)
  TRANSFER_OUT = 'TRANSFER_OUT',           // انتقال از انبار (صادره)
  RETURN_PURCHASE = 'RETURN_PURCHASE',     // برگشت از خرید
  RETURN_SALES = 'RETURN_SALES',           // برگشت از فروش
  COUNT_DISCREPANCY = 'COUNT_DISCREPANCY'  // تعدیل کسری یا فزونی انبارگردانی
}

export interface FifoLayer {
  layerId: string;
  receiptDateShamsi: string;
  originalQuantity: string;
  remainingQuantity: string;
  unitCost: string; // بهای تمام شده واحد این لایه
}

export interface StockLedgerState {
  productId: string;
  variantId?: string;
  warehouseId: string;
  currentQuantity: string;      // موجودی مقداری فعلی
  averageCost: string;          // بهای واحد میانگین متحرک فعلی
  totalValue: string;           // ارزش کل ریالی مانده انبار
  fifoLayers: FifoLayer[];      // لایه‌های خرید فعال FIFO
}

export interface LandedCostItem {
  productId: string;
  quantity: string | number;
  purchaseAmount: string | number;
}

export interface AllocatedLandedCostResult {
  productId: string;
  originalUnitCost: string;
  allocatedFreightPerUnit: string;
  finalLandedUnitCost: string;
  totalLandedCost: string;
}

export interface CogsCalculationResult {
  consumedQuantity: string;
  totalCogsAmount: string;
  unitCost: string;
  valuationMethodUsed: ValuationMethod;
  updatedFifoLayers?: FifoLayer[];
}
