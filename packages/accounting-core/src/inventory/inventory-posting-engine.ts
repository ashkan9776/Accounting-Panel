import Decimal from 'decimal.js';
import { JournalLineInput } from '../journal/types';

Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

export interface PurchasePostingContext {
  supplierPartyDimensionId: string;
  inventoryAmount: string | number; // بهای خرید خالص کالاها
  freightAmount?: string | number;   // کرایه حمل و هزینه‌های اضافه شده به بهای تمام شده
  freightPayeePartyDimensionId?: string; // تفصیلی طرف حساب باربری (در صورت تفکیک از تامین کننده کالا)
  vatAmount?: string | number;       // مالیات بر ارزش افزوده خرید (اعتبار مالیاتی)
  invoiceNumber: string;
  descriptionSuffix?: string;
}

export interface SalesPostingContext {
  customerPartyDimensionId: string;
  grossSalesAmount: string | number; // مبلغ کل ناخالص فروش
  discountAmount?: string | number;   // تخفیف فروش
  vatAmount?: string | number;        // مالیات و عوارض ارزش افزوده (۱۰٪)
  costCenterDimensionId?: string;     // مرکز هزینه اختیاری
  invoiceNumber: string;
  descriptionSuffix?: string;
}

export interface CogsPostingContext {
  cogsAmount: string | number;        // مبلغ کل بهای تمام‌شده کالای فروش‌رفته محاسبه‌شده در کاردکس
  costCenterDimensionId?: string;     // مرکز هزینه اختیاری
  documentNumber: string;
  descriptionSuffix?: string;
}

export interface SalesReturnPostingContext {
  customerPartyDimensionId: string;
  returnedSalesAmount: string | number; // مبلغ ناخالص کالای برگشتی
  returnedVatAmount?: string | number;  // مالیات بر ارزش افزوده برگشتی
  returnedCogsAmount: string | number;  // بهای تمام شده کالای برگشت داده شده به انبار
  documentNumber: string;
  descriptionSuffix?: string;
}

export interface InventoryCountAdjustmentContext {
  isDeficit: boolean;                  // آیا کسری است (true) یا فزونی (false)
  discrepancyValue: string | number;   // مبلغ ریالی مغایرت انبارگردانی
  countNumber: string;
  costCenterDimensionId?: string;
  descriptionSuffix?: string;
}

export class InventoryPostingEngine {
  /**
   * ۱. صدور سطور سند فاکتور خرید با تسهیم کرایه حمل و اعتبار ارزش افزوده
   * بدهکار: موجودی کالای تجاری (۱۵۰۱) به مبلغ (بهای کالا + کرایه حمل)
   * بدهکار: مالیات بر ارزش افزوده خرید (۱۴۰۳) - اعتبار مالیاتی
   * بستانکار: بستانکاران تجاری (۳۲۰۱) - تامین‌کننده (و در صورت تفکیک باربری)
   */
  public static buildPurchaseInvoiceLines(ctx: PurchasePostingContext): JournalLineInput[] {
    const netGoods = new Decimal(ctx.inventoryAmount);
    const freight = new Decimal(ctx.freightAmount || 0);
    const vat = new Decimal(ctx.vatAmount || 0);
    const totalInventoryLanded = netGoods.plus(freight);

    if (totalInventoryLanded.lessThanOrEqualTo(0)) {
      throw new Error('مبلغ بهای تمام‌شده خرید کالا باید بزرگتر از صفر باشد.');
    }

    const lines: JournalLineInput[] = [];
    const desc = `فاکتور خرید کالا شماره ${ctx.invoiceNumber}${ctx.descriptionSuffix ? ` - ${ctx.descriptionSuffix}` : ''}`;

    // سطر بدهکار: موجودی کالا
    lines.push({
      subsidiaryAccountId: 'sub-1501', // موجودی کالای تجاری
      debit: totalInventoryLanded.toFixed(0),
      credit: 0,
      description: desc
    });

    // سطر بدهکار: مالیات بر ارزش افزوده خرید (اعتبار مالیاتی) در صورت وجود
    if (vat.greaterThan(0)) {
      lines.push({
        subsidiaryAccountId: 'sub-1403', // مالیات بر ارزش افزوده خرید
        debit: vat.toFixed(0),
        credit: 0,
        description: `اعتبار ارزش افزوده خرید فاکتور ${ctx.invoiceNumber}`
      });
    }

    // سطور بستانکار: طرف حساب تامین‌کننده و باربری
    if (freight.greaterThan(0) && ctx.freightPayeePartyDimensionId && ctx.freightPayeePartyDimensionId !== ctx.supplierPartyDimensionId) {
      // تفکیک باربری و تامین‌کننده
      const supplierPayable = netGoods.plus(vat);
      lines.push({
        subsidiaryAccountId: 'sub-3201', // بستانکاران تجاری
        floatingDimension1Id: ctx.supplierPartyDimensionId,
        debit: 0,
        credit: supplierPayable.toFixed(0),
        description: desc
      });
      lines.push({
        subsidiaryAccountId: 'sub-3201', // بستانکاران تجاری - کرایه حمل باربری
        floatingDimension1Id: ctx.freightPayeePartyDimensionId,
        debit: 0,
        credit: freight.toFixed(0),
        description: `کرایه حمل فاکتور خرید ${ctx.invoiceNumber}`
      });
    } else {
      // کل مبلغ به حساب تامین‌کننده منظور می‌شود
      const totalPayable = totalInventoryLanded.plus(vat);
      lines.push({
        subsidiaryAccountId: 'sub-3201', // بستانکاران تجاری
        floatingDimension1Id: ctx.supplierPartyDimensionId,
        debit: 0,
        credit: totalPayable.toFixed(0),
        description: desc
      });
    }

    return lines;
  }

  /**
   * ۲. صدور سطور سند فاکتور فروش رسمی کالا و خدمات
   * بدهکار: بدهکاران تجاری (۱۳۰۱) - مشتری به مبلغ (فروش ناخالص - تخفیف + ارزش افزوده)
   * بدهکار: تخفیفات نقدی فروش (۶۲۰۱) در صورت وجود تخفیف
   * بستانکار: درآمد فروش کالا و محصولات (۶۱۰۱) به مبلغ ناخالص
   * بستانکار: مالیات بر ارزش افزوده فروش (۳۳۰۶) به مبلغ ۱۰٪
   */
  public static buildSalesInvoiceLines(ctx: SalesPostingContext): JournalLineInput[] {
    const gross = new Decimal(ctx.grossSalesAmount);
    const discount = new Decimal(ctx.discountAmount || 0);
    const vat = new Decimal(ctx.vatAmount || 0);

    if (gross.lessThanOrEqualTo(0)) {
      throw new Error('مبلغ ناخالص فروش باید بزرگتر از صفر باشد.');
    }
    if (discount.greaterThan(gross)) {
      throw new Error('مبلغ تخفیف نمی‌تواند از مبلغ کل فروش بیشتر باشد.');
    }

    const netReceivable = gross.minus(discount).plus(vat);
    const lines: JournalLineInput[] = [];
    const desc = `فاکتور فروش کالا شماره ${ctx.invoiceNumber}${ctx.descriptionSuffix ? ` - ${ctx.descriptionSuffix}` : ''}`;

    // سطر بدهکار: بدهکاران تجاری (مشتری)
    lines.push({
      subsidiaryAccountId: 'sub-1301', // بدهکاران تجاری
      floatingDimension1Id: ctx.customerPartyDimensionId,
      debit: netReceivable.toFixed(0),
      credit: 0,
      description: desc
    });

    // سطر بدهکار: تخفیف در صورت وجود
    if (discount.greaterThan(0)) {
      lines.push({
        subsidiaryAccountId: 'sub-6201', // تخفیفات نقدی فروش
        debit: discount.toFixed(0),
        credit: 0,
        description: `تخفیف فاکتور فروش ${ctx.invoiceNumber}`
      });
    }

    // سطر بستانکار: فروش کالا و خدمات
    lines.push({
      subsidiaryAccountId: 'sub-6101', // فروش کالا و محصولات
      floatingDimension2Id: ctx.costCenterDimensionId,
      debit: 0,
      credit: gross.toFixed(0),
      description: desc
    });

    // سطر بستانکار: ارزش افزوده فروش در صورت وجود
    if (vat.greaterThan(0)) {
      lines.push({
        subsidiaryAccountId: 'sub-3306', // مالیات بر ارزش افزوده فروش
        debit: 0,
        credit: vat.toFixed(0),
        description: `ارزش افزوده فاکتور فروش ${ctx.invoiceNumber}`
      });
    }

    return lines;
  }

  /**
   * ۳. صدور سند شناسایی بهای تمام‌شده کالای فروش‌رفته (COGS)
   * بدهکار: بهای تمام‌شده کالای فروش‌رفته (۷۱۰۱)
   * بستانکار: موجودی کالای تجاری (۱۵۰۱)
   */
  public static buildCogsLines(ctx: CogsPostingContext): JournalLineInput[] {
    const cogs = new Decimal(ctx.cogsAmount);
    if (cogs.lessThanOrEqualTo(0)) {
      throw new Error('مبلغ بهای تمام‌شده باید بزرگتر از صفر باشد.');
    }

    const desc = `بهای تمام‌شده کالای فروش‌رفته حواله/فاکتور ${ctx.documentNumber}${ctx.descriptionSuffix ? ` - ${ctx.descriptionSuffix}` : ''}`;

    return [
      {
        subsidiaryAccountId: 'sub-7101', // بهای تمام‌شده کالای فروش‌رفته (COGS)
        floatingDimension2Id: ctx.costCenterDimensionId,
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
   * ۴. صدور سطور سند برگشت از فروش و ورود مجدد به انبار
   */
  public static buildSalesReturnLines(ctx: SalesReturnPostingContext): {
    financialLines: JournalLineInput[];
    inventoryLines: JournalLineInput[];
  } {
    const returnedGross = new Decimal(ctx.returnedSalesAmount);
    const returnedVat = new Decimal(ctx.returnedVatAmount || 0);
    const returnedCogs = new Decimal(ctx.returnedCogsAmount);

    const totalCustomerCredit = returnedGross.plus(returnedVat);
    const desc = `برگشت از فروش عطف به سند/فاکتور ${ctx.documentNumber}${ctx.descriptionSuffix ? ` - ${ctx.descriptionSuffix}` : ''}`;

    const financialLines: JournalLineInput[] = [
      {
        subsidiaryAccountId: 'sub-6202', // برگشت از فروش و تخفیفات تجاری
        debit: returnedGross.toFixed(0),
        credit: 0,
        description: desc
      }
    ];

    if (returnedVat.greaterThan(0)) {
      financialLines.push({
        subsidiaryAccountId: 'sub-3306', // بدهکار شدن مالیات ارزش افزوده فروش جهت تعدیل
        debit: returnedVat.toFixed(0),
        credit: 0,
        description: `تعدیل ارزش افزوده برگشت از فروش ${ctx.documentNumber}`
      });
    }

    financialLines.push({
      subsidiaryAccountId: 'sub-1301', // بدهکاران تجاری (کاهش مانده بدهی مشتری)
      floatingDimension1Id: ctx.customerPartyDimensionId,
      debit: 0,
      credit: totalCustomerCredit.toFixed(0),
      description: desc
    });

    // سند برگشت کالا به انبار و کاهش بهای تمام‌شده
    const inventoryLines: JournalLineInput[] = [
      {
        subsidiaryAccountId: 'sub-1501', // موجودی کالای تجاری
        debit: returnedCogs.toFixed(0),
        credit: 0,
        description: `ورود مجدد کالای برگشتی به انبار عطف به ${ctx.documentNumber}`
      },
      {
        subsidiaryAccountId: 'sub-7101', // بهای تمام‌شده کالای فروش‌رفته
        debit: 0,
        credit: returnedCogs.toFixed(0),
        description: `برگشت بهای تمام‌شده کالای فروش‌رفته ${ctx.documentNumber}`
      }
    ];

    return {
      financialLines,
      inventoryLines
    };
  }

  /**
   * ۵. صدور سطور سند تعدیل کسری یا فزونی انبارگردانی
   * در کسری انبار (Deficit):
   *   بدهکار: هزینه کسری و انبارگردانی کالا (۸۱۰۸)
   *   بستانکار: موجودی کالای تجاری (۱۵۰۱)
   * در فزونی انبار (Surplus):
   *   بدهکار: موجودی کالای تجاری (۱۵۰۱)
   *   بستانکار: سایر درآمدهای عملیاتی (۶۱۰۵)
   */
  public static buildInventoryCountAdjustmentLines(ctx: InventoryCountAdjustmentContext): JournalLineInput[] {
    const val = new Decimal(ctx.discrepancyValue);
    if (val.lessThanOrEqualTo(0)) {
      throw new Error('مبلغ مغایرت انبارگردانی باید بزرگتر از صفر باشد.');
    }

    if (ctx.isDeficit) {
      const desc = `ثبت کسری انبارگردانی شمارش شماره ${ctx.countNumber}${ctx.descriptionSuffix ? ` - ${ctx.descriptionSuffix}` : ''}`;
      return [
        {
          subsidiaryAccountId: 'sub-8108', // هزینه کسری انبارگردانی
          floatingDimension2Id: ctx.costCenterDimensionId,
          debit: val.toFixed(0),
          credit: 0,
          description: desc
        },
        {
          subsidiaryAccountId: 'sub-1501', // موجودی کالای تجاری
          debit: 0,
          credit: val.toFixed(0),
          description: desc
        }
      ];
    } else {
      const desc = `ثبت فزونی انبارگردانی شمارش شماره ${ctx.countNumber}${ctx.descriptionSuffix ? ` - ${ctx.descriptionSuffix}` : ''}`;
      return [
        {
          subsidiaryAccountId: 'sub-1501', // موجودی کالای تجاری
          debit: val.toFixed(0),
          credit: 0,
          description: desc
        },
        {
          subsidiaryAccountId: 'sub-6105', // سایر درآمدهای عملیاتی (فزونی انبار)
          debit: 0,
          credit: val.toFixed(0),
          description: desc
        }
      ];
    }
  }
}
