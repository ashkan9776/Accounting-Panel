import { JournalLineInput } from '../journal/types';

export enum OnlineOrderStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  PREPARING = 'PREPARING',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED'
}

export enum PaymentGatewayType {
  BEHPARDAKHT = 'BEHPARDAKHT', // به‌پرداخت ملت
  SADAD = 'SADAD', // سداد ملی
  SAMAN = 'SAMAN', // سامان کیش (سپ)
  ZARINPAL = 'ZARINPAL' // زرین‌پال
}

export enum PaymentTransactionStatus {
  INITIATED = 'INITIATED',
  VERIFIED = 'VERIFIED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED'
}

export enum CourierProvider {
  SNAPP_BOX = 'SNAPP_BOX', // اسنپ‌باکس
  ALOPEYK = 'ALOPEYK', // الوپیک
  MIARE = 'MIARE', // میاره
  INTERNAL = 'INTERNAL' // پیک اختصاصی شرکت
}

export enum HardwareDeviceType {
  PRINTER_ESC_POS = 'PRINTER_ESC_POS', // چاپگر حرارتی صدور فیش
  PC_POS = 'PC_POS', // پایانه کارتخوان متصل به رایانه
  DIGITAL_SCALE = 'DIGITAL_SCALE', // ترازوی دیجیتال
  CASH_DRAWER = 'CASH_DRAWER', // کشوی پول برقی
  ATTENDANCE_TERMINAL = 'ATTENDANCE_TERMINAL' // دستگاه حضور و غیاب
}

export enum AttendanceLogType {
  CLOCK_IN = 'CLOCK_IN', // ورود
  CLOCK_OUT = 'CLOCK_OUT' // خروج
}

export interface OnlineOrderItemInput {
  productId: string;
  productTitle: string;
  quantity: number;
  unitPrice: string | number;
  discountAmount?: string | number;
  vatRate?: string | number; // مثلا 0.10
  unitCogs?: string | number;
}

export interface OnlineOrderPricingSummary {
  totalGoodsAmount: string;
  totalDiscount: string;
  netGoodsAmount: string;
  totalVat: string;
  shippingFee: string;
  grandTotal: string;
  totalCogs: string;
}

export interface OnlineOrderPostingParams {
  orderNumber: string;
  pricing: OnlineOrderPricingSummary;
  customerPartyDimensionId?: string;
  gatewaySubsidiaryId?: string; // پیش‌فرض sub-1104 وجوه در راه
  gatewayDimensionId?: string;
  bankSubsidiaryId?: string; // پیش‌فرض sub-1103 موجودی نزد بانک‌ها
  bankDimensionId?: string;
  gatewayFeeAmount?: string | number;
  costCenterDimensionId?: string;
  warehouseDimensionId?: string;
}

export interface EscPosReceiptOptions {
  companyName: string;
  branchTitle?: string;
  orderNumber: string;
  dateShamsi: string;
  customerName?: string;
  items: Array<{
    title: string;
    qty: number;
    unitPrice: string;
    totalPrice: string;
  }>;
  subtotal: string;
  discount: string;
  vat: string;
  shippingFee?: string;
  grandTotal: string;
  footerNote?: string;
  qrPayload?: string;
  openCashDrawer?: boolean;
}

export interface PcPosRequestPayload {
  terminalId: string;
  amount: string;
  orderId: string;
  additionalData?: string;
}

export interface PcPosResponsePayload {
  isSuccess: boolean;
  responseCode: string; // "00" = موفق
  terminalId: string;
  amount: string;
  rrn: string; // Retrieval Reference Number ۱۲ رقمی
  traceNumber: string; // شماره پیگیری ۶ رقمی
  cardPanMasked: string; // شماره کارت ماسک شده (مثلا ۶۰۳۷۹۹******۱۲۳۴)
  transactionDateTimeShamsi: string;
  errorMessage?: string;
}

export interface ScaleReadingResult {
  isStable: boolean;
  netWeightGrams: number;
  tareWeightGrams: number;
  rawString: string;
}

export interface RawAttendanceLogItem {
  employeeId: string;
  terminalId: string;
  dateShamsi: string;
  timeString: string; // HH:mm:ss
  type: AttendanceLogType;
}

export interface EmployeeDailyAttendanceSummary {
  employeeId: string;
  dateShamsi: string;
  firstClockIn?: string;
  lastClockOut?: string;
  totalPresentMinutes: number;
  standardWorkMinutes: number;
  overtimeMinutes: number;
  undertimeMinutes: number;
}
