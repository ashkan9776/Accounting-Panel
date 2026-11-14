import Decimal from 'decimal.js';
import { JournalLineInput } from '../journal/types';
import { ConsolidatedShiftPostingContext } from './types';

Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

export class PosPostingEngine {
  /**
   * ۱. صدور سند دوبل تجمیعی روزانه / پایان شیفت (Daily Consolidated Journal Entry)
   * مطابق با ماده ۱۴ قانون تجارت و استانداردهای فروشگاهی ایران:
   * بدهکار: صندوق نقدی (۱۱۰۱) - مجموع دریافت‌های نقدی
   * بدهکار: وجوه در راه کارتخوان‌های POS (۱۱۰۴) - مجموع دریافت‌های کارتی
   * بدهکار: تخفیفات نقدی فروش (۶۲۰۱) - در صورت وجود تخفیف
   * بستانکار: فروش کالا و محصولات (۶۱۰۱) - مجموع ناخالص فروش
   * بستانکار: مالیات بر ارزش افزوده فروش (۳۳۰۶) - مجموع مالیات ۱۰٪
   */
  public static buildConsolidatedShiftLines(ctx: ConsolidatedShiftPostingContext): JournalLineInput[] {
    const cash = new Decimal(ctx.totalCashSales || 0);
    const pos = new Decimal(ctx.totalPosCardSales || 0);
    const disc = new Decimal(ctx.totalDiscount || 0);
    const gross = new Decimal(ctx.totalGrossSales || 0);
    const vat = new Decimal(ctx.totalVat || 0);

    const lines: JournalLineInput[] = [];
    const desc = `سند تجمیعی فروش‌های شیفت شماره ${ctx.shiftNumber} مورخ ${ctx.dateShamsi}`;

    // سطر بدهکار: دریافت‌های نقدی صندوق
    if (cash.greaterThan(0)) {
      lines.push({
        subsidiaryAccountId: 'sub-1101', // صندوق‌ها
        floatingDimension1Id: ctx.cashDeskDimensionId,
        debit: cash.toFixed(0),
        credit: 0,
        description: `${desc} - تسویه نقدی صندوق`
      });
    }

    // سطر بدهکار: دریافت‌های کارتخوان‌های POS
    if (pos.greaterThan(0)) {
      lines.push({
        subsidiaryAccountId: 'sub-1104', // وجوه در راه کارتخوان‌ها
        floatingDimension1Id: ctx.posTerminalDimensionId,
        debit: pos.toFixed(0),
        credit: 0,
        description: `${desc} - تسویه کارتخوان POS`
      });
    }

    // سطر بدهکار: تخفیفات اعطایی شیفت
    if (disc.greaterThan(0)) {
      lines.push({
        subsidiaryAccountId: 'sub-6201', // تخفیفات نقدی فروش
        debit: disc.toFixed(0),
        credit: 0,
        description: `${desc} - تخفیفات اعطایی صندوق`
      });
    }

    // سطر بستانکار: درآمد فروش کالا و محصولات
    lines.push({
      subsidiaryAccountId: 'sub-6101', // فروش کالا و محصولات
      floatingDimension2Id: ctx.costCenterDimensionId,
      debit: 0,
      credit: gross.toFixed(0),
      description: `${desc} - ناخالص فروش کالا و خدمات`
    });

    // سطر بستانکار: مالیات بر ارزش افزوده فروش
    if (vat.greaterThan(0)) {
      lines.push({
        subsidiaryAccountId: 'sub-3306', // مالیات بر ارزش افزوده فروش
        debit: 0,
        credit: vat.toFixed(0),
        description: `${desc} - ارزش افزوده فروش`
      });
    }

    return lines;
  }

  /**
   * ۲. صدور سند تجمیعی شناسایی بهای تمام‌شده کالای فروش‌رفته (COGS) شیفت
   * بدهکار: بهای تمام‌شده کالای فروش‌رفته (۷۱۰۱)
   * بستانکار: موجودی کالای تجاری (۱۵۰۱)
   */
  public static buildConsolidatedCogsLines(
    shiftNumber: string,
    dateShamsi: string,
    totalCogsAmount: string | number,
    costCenterDimensionId?: string
  ): JournalLineInput[] {
    const cogs = new Decimal(totalCogsAmount);
    if (cogs.lessThanOrEqualTo(0)) {
      return [];
    }

    const desc = `سند بهای تمام‌شده کالای فروش‌رفته تجمیعی شیفت ${shiftNumber} مورخ ${dateShamsi}`;

    return [
      {
        subsidiaryAccountId: 'sub-7101', // بهای تمام‌شده کالای فروش‌رفته (COGS)
        floatingDimension2Id: costCenterDimensionId,
        debit: cogs.toFixed(0),
        credit: 0,
        description: desc
      },
      {
        subsidiaryAccountId: 'sub-1501', // موجودی کالای تجاری
        debit: 0,
        credit: cogs.toFixed(0),
        description: desc
      }
    ];
  }

  /**
   * ۳. صدور سند تعدیل کسری یا فزونی شمارش نقدینگی صندوق در پایان شیفت
   */
  public static buildCashDiscrepancyLines(
    shiftNumber: string,
    dateShamsi: string,
    cashDeskDimensionId: string,
    discrepancyAmount: string | number,
    costCenterDimensionId?: string
  ): JournalLineInput[] {
    const disc = new Decimal(discrepancyAmount);
    if (disc.isZero()) {
      return [];
    }

    const absDisc = disc.abs().toFixed(0);

    if (disc.isNegative()) {
      // کسری نقد صندوق (Cash Deficit): بدهکار هزینه کسری (۸۱۰۸) / بستانکار صندوق (۱۱۰۱)
      const desc = `کسری نقدینگی صندوق در پایان شیفت شماره ${shiftNumber} مورخ ${dateShamsi}`;
      return [
        {
          subsidiaryAccountId: 'sub-8108', // هزینه کسری صندوق و انبار
          floatingDimension2Id: costCenterDimensionId,
          debit: absDisc,
          credit: 0,
          description: desc
        },
        {
          subsidiaryAccountId: 'sub-1101', // صندوق‌ها
          floatingDimension1Id: cashDeskDimensionId,
          debit: 0,
          credit: absDisc,
          description: desc
        }
      ];
    } else {
      // فزونی نقد صندوق (Cash Surplus): بدهکار صندوق (۱۱۰۱) / بستانکار سایر درآمدها (۶۱۰۵)
      const desc = `فزونی نقدینگی صندوق در پایان شیفت شماره ${shiftNumber} مورخ ${dateShamsi}`;
      return [
        {
          subsidiaryAccountId: 'sub-1101', // صندوق‌ها
          floatingDimension1Id: cashDeskDimensionId,
          debit: absDisc,
          credit: 0,
          description: desc
        },
        {
          subsidiaryAccountId: 'sub-6105', // سایر درآمدهای عملیاتی
          debit: 0,
          credit: absDisc,
          description: desc
        }
      ];
    }
  }
}
