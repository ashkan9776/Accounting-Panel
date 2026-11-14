import Decimal from 'decimal.js';
import { JournalLineInput } from '../journal/types';

Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

export interface RestaurantOrderPostingContext {
  orderNumber: string;
  dateShamsi: string;
  channel: string;
  tableNumber?: string;
  settlementMethod: 'CASH' | 'POS_CARD' | 'MIXED' | 'ONLINE_AGGREGATOR';
  cashDeskDimensionId?: string;
  posTerminalDimensionId?: string;
  aggregatorPartyDimensionId?: string;
  costCenterDimensionId?: string;
  netFoodSalesAmount: string | number;
  serviceChargeAmount?: string | number;
  discountAmount?: string | number;
  vatAmount: string | number;
  cashPaidAmount?: string | number;
  cardPaidAmount?: string | number;
  aggregatorReceivableAmount?: string | number;
}

export class RestaurantPostingEngine {
  /**
   * ۱. صدور سند دوبل فروش غذا و نوشیدنی رستوران
   * بدهکار: صندوق نقدی (۱۱۰۱)
   * بدهکار: وجوه در راه کارتخوان (۱۱۰۴)
   * بدهکار: حساب‌های دریافتنی تجاری / پلتفرم آنلاین نظیر اسنپ‌فود (۱۲۰۱)
   * بدهکار: تخفیفات نقدی فروش (۶۲۰۱)
   * بستانکار: فروش غذا و محصولات (۶۱۰۱)
   * بستانکار: کارمزد و حق سرویس سالن (۶۱۰۴)
   * بستانکار: مالیات بر ارزش افزوده (۳۳۰۶)
   */
  public static buildSalesOrderLines(ctx: RestaurantOrderPostingContext): JournalLineInput[] {
    const netFood = new Decimal(ctx.netFoodSalesAmount || 0);
    const service = new Decimal(ctx.serviceChargeAmount || 0);
    const vat = new Decimal(ctx.vatAmount || 0);
    const disc = new Decimal(ctx.discountAmount || 0);
    const grossFood = netFood.plus(disc);

    const cash = new Decimal(ctx.cashPaidAmount || 0);
    const card = new Decimal(ctx.cardPaidAmount || 0);
    const agg = new Decimal(ctx.aggregatorReceivableAmount || 0);

    const lines: JournalLineInput[] = [];
    const desc = `فروش سفارش رستوران شماره ${ctx.orderNumber} کانال ${ctx.channel} مورخ ${ctx.dateShamsi}`;

    // دریافت نقدی
    if (cash.greaterThan(0)) {
      lines.push({
        subsidiaryAccountId: 'sub-1101',
        floatingDimension1Id: ctx.cashDeskDimensionId,
        debit: cash.toFixed(0),
        credit: 0,
        description: `${desc} - تسویه نقدی`
      });
    }

    // دریافت کارتخوان
    if (card.greaterThan(0)) {
      lines.push({
        subsidiaryAccountId: 'sub-1104',
        floatingDimension1Id: ctx.posTerminalDimensionId,
        debit: card.toFixed(0),
        credit: 0,
        description: `${desc} - کارتخوان سالن`
      });
    }

    // مطالبات از پلتفرم آنلاین (مثلاً اسنپ‌فود)
    if (agg.greaterThan(0)) {
      lines.push({
        subsidiaryAccountId: 'sub-1201',
        floatingDimension1Id: ctx.aggregatorPartyDimensionId,
        debit: agg.toFixed(0),
        credit: 0,
        description: `${desc} - مطالبات سفارش آنلاین`
      });
    }

    // تخفیفات نقدی
    if (disc.greaterThan(0)) {
      lines.push({
        subsidiaryAccountId: 'sub-6201',
        debit: disc.toFixed(0),
        credit: 0,
        description: `${desc} - تخفیف منو`
      });
    }

    // درآمد فروش غذا
    lines.push({
      subsidiaryAccountId: 'sub-6101',
      floatingDimension2Id: ctx.costCenterDimensionId,
      debit: 0,
      credit: grossFood.toFixed(0),
      description: `${desc} - درآمد فروش غذا`
    });

    // درآمد حق سرویس سالن
    if (service.greaterThan(0)) {
      lines.push({
        subsidiaryAccountId: 'sub-6105', // سایر درآمدهای عملیاتی / کارمزد سرویس
        floatingDimension2Id: ctx.costCenterDimensionId,
        debit: 0,
        credit: service.toFixed(0),
        description: `${desc} - حق سرویس سالن`
      });
    }

    // مالیات بر ارزش افزوده
    if (vat.greaterThan(0)) {
      lines.push({
        subsidiaryAccountId: 'sub-3306',
        debit: 0,
        credit: vat.toFixed(0),
        description: `${desc} - مالیات بر ارزش افزوده`
      });
    }

    return lines;
  }

  /**
   * ۲. صدور سند بهای تمام‌شده مواد اولیه مصرفی غذا (Food Cost)
   * بدهکار: بهای تمام‌شده کالای فروش‌رفته (۷۱۰۱)
   * بستانکار: موجودی مواد اولیه و بسته بندی (۱۵۰۲)
   */
  public static buildFoodCostLines(
    orderNumber: string,
    dateShamsi: string,
    totalFoodCost: string | number,
    costCenterDimensionId?: string
  ): JournalLineInput[] {
    const cost = new Decimal(totalFoodCost);
    if (cost.lessThanOrEqualTo(0)) {
      return [];
    }

    const desc = `بهای تمام‌شده مواد اولیه سفارش رستوران شماره ${orderNumber} مورخ ${dateShamsi}`;

    return [
      {
        subsidiaryAccountId: 'sub-7101', // بهای تمام‌شده
        floatingDimension2Id: costCenterDimensionId,
        debit: cost.toFixed(0),
        credit: 0,
        description: desc
      },
      {
        subsidiaryAccountId: 'sub-1502', // موجودی مواد اولیه و قطعات
        debit: 0,
        credit: cost.toFixed(0),
        description: desc
      }
    ];
  }

  /**
   * ۳. صدور سند هدررفت و فساد مواد اولیه آشپزخانه (Food Waste / Spoilage)
   * بدهکار: هزینه ضایعات و افت مواد (۸۱۰۸)
   * بستانکار: موجودی مواد اولیه و بسته بندی (۱۵۰۲)
   */
  public static buildFoodWasteLines(
    wasteNumber: string,
    dateShamsi: string,
    totalWasteCost: string | number,
    reason: string,
    costCenterDimensionId?: string
  ): JournalLineInput[] {
    const cost = new Decimal(totalWasteCost);
    if (cost.lessThanOrEqualTo(0)) {
      return [];
    }

    const desc = `ضایعات مواد اولیه آشپزخانه سند ${wasteNumber} (${reason}) مورخ ${dateShamsi}`;

    return [
      {
        subsidiaryAccountId: 'sub-8108', // هزینه کسری انبار و ضایعات
        floatingDimension2Id: costCenterDimensionId,
        debit: cost.toFixed(0),
        credit: 0,
        description: desc
      },
      {
        subsidiaryAccountId: 'sub-1502', // موجودی مواد اولیه
        debit: 0,
        credit: cost.toFixed(0),
        description: desc
      }
    ];
  }
}
