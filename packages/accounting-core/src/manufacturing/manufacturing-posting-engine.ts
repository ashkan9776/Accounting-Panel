import Decimal from 'decimal.js';
import { JournalLineInput } from '../journal/types';

Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

export class ManufacturingPostingEngine {
  /**
   * ۱. صدور سند خروج مواد اولیه به خط تولید (حواله مصرف در جریان ساخت)
   * طبق استاندارد حسابداری شماره ۸ ایران:
   * بدهکار: موجودی کالای در جریان ساخت (۱۵۰۳)
   * بستانکار: موجودی مواد اولیه و مصرفی (۱۵۰۲)
   */
  public static buildMaterialIssueLines(params: {
    productionOrderNumber: string;
    dateShamsi: string;
    totalMaterialCost: string | number;
    costCenterDimensionId?: string;
  }): JournalLineInput[] {
    const cost = new Decimal(params.totalMaterialCost);
    if (cost.lessThanOrEqualTo(0)) {
      return [];
    }

    const desc = `خروج مواد اولیه به خط تولید بابت سفارش ساخت شماره ${params.productionOrderNumber} مورخ ${params.dateShamsi}`;

    return [
      {
        subsidiaryAccountId: 'sub-1503', // کالای در جریان ساخت (WIP)
        floatingDimension2Id: params.costCenterDimensionId,
        debit: cost.toFixed(0),
        credit: 0,
        description: `${desc} - انتقال به در جریان ساخت`
      },
      {
        subsidiaryAccountId: 'sub-1502', // موجودی مواد اولیه
        debit: 0,
        credit: cost.toFixed(0),
        description: `${desc} - کسر از انبار مواد`
      }
    ];
  }

  /**
   * ۲. صدور سند جذب دستمزد مستقیم و سربار ساخت به سفارش تولید
   * بدهکار: موجودی کالای در جریان ساخت (۱۵۰۳) [مجموع دستمزد و سربار]
   * بستانکار: دستمزد مستقیم جذب‌شده تولید (۷۱۰۲)
   * بستانکار: سربار ساخت جذب‌شده تولید (۷۱۰۳)
   */
  public static buildLaborAndOverheadAbsorptionLines(params: {
    productionOrderNumber: string;
    dateShamsi: string;
    directLaborCost: string | number;
    appliedOverheadCost: string | number;
    costCenterDimensionId?: string;
  }): JournalLineInput[] {
    const labor = new Decimal(params.directLaborCost || 0);
    const overhead = new Decimal(params.appliedOverheadCost || 0);
    const totalAbsorption = labor.plus(overhead);

    if (totalAbsorption.lessThanOrEqualTo(0)) {
      return [];
    }

    const desc = `جذب دستمزد مستقیم و سربار ساخت سفارش تولید شماره ${params.productionOrderNumber} مورخ ${params.dateShamsi}`;
    const lines: JournalLineInput[] = [];

    // سطر بدهکار: شارژ حساب کالای در جریان ساخت
    lines.push({
      subsidiaryAccountId: 'sub-1503', // کالای در جریان ساخت
      floatingDimension2Id: params.costCenterDimensionId,
      debit: totalAbsorption.toFixed(0),
      credit: 0,
      description: `${desc} - شارژ دستمزد و سربار به WIP`
    });

    // سطر بستانکار: دستمزد مستقیم جذب‌شده
    if (labor.greaterThan(0)) {
      lines.push({
        subsidiaryAccountId: 'sub-7102', // دستمزد مستقیم جذب‌شده
        floatingDimension2Id: params.costCenterDimensionId,
        debit: 0,
        credit: labor.toFixed(0),
        description: `${desc} - دستمزد جذب‌شده`
      });
    }

    // سطر بستانکار: سربار جذب‌شده ساخت
    if (overhead.greaterThan(0)) {
      lines.push({
        subsidiaryAccountId: 'sub-7103', // سربار ساخت جذب‌شده
        floatingDimension2Id: params.costCenterDimensionId,
        debit: 0,
        credit: overhead.toFixed(0),
        description: `${desc} - سربار جذب‌شده`
      });
    }

    return lines;
  }

  /**
   * ۳. صدور سند رسید محصول ساخته‌شده به انبار محصولات نهایی (اتمام فرآیند تولید)
   * بدهکار: موجودی کالای ساخته‌شده و محصولات (۱۵۰۴)
   * بستانکار: موجودی کالای در جریان ساخت (۱۵۰۳)
   */
  public static buildFinishedGoodsReceiptLines(params: {
    productionOrderNumber: string;
    dateShamsi: string;
    productTitle: string;
    completedQuantity: string | number;
    totalFinishedGoodCost: string | number;
    costCenterDimensionId?: string;
  }): JournalLineInput[] {
    const cost = new Decimal(params.totalFinishedGoodCost);
    if (cost.lessThanOrEqualTo(0)) {
      return [];
    }

    const desc = `رسید تولید ${params.completedQuantity} واحد محصول ${params.productTitle} سفارش ${params.productionOrderNumber} مورخ ${params.dateShamsi}`;

    return [
      {
        subsidiaryAccountId: 'sub-1504', // موجودی کالای ساخته‌شده
        debit: cost.toFixed(0),
        credit: 0,
        description: `${desc} - ورود محصول نهایی به انبار`
      },
      {
        subsidiaryAccountId: 'sub-1503', // کالای در جریان ساخت
        floatingDimension2Id: params.costCenterDimensionId,
        debit: 0,
        credit: cost.toFixed(0),
        description: `${desc} - تسویه حساب کالای در جریان ساخت`
      }
    ];
  }

  /**
   * ۴. صدور سند ضایعات غیرعادی تولید (Abnormal Production Scrap)
   * ضایعات غیرعادی به عنوان زیان و هزینه دوره شناسایی شده و نباید در بهای تمام‌شده کالای سالم جذب شود
   * بدهکار: هزینه کسری و انبارگردانی / ضایعات غیرعادی (۸۱۰۸)
   * بستانکار: موجودی کالای در جریان ساخت (۱۵۰۳)
   */
  public static buildAbnormalScrapLines(params: {
    productionOrderNumber: string;
    dateShamsi: string;
    scrapAmount: string | number;
    reason: string;
    costCenterDimensionId?: string;
  }): JournalLineInput[] {
    const amt = new Decimal(params.scrapAmount);
    if (amt.lessThanOrEqualTo(0)) {
      return [];
    }

    const desc = `ضایعات غیرعادی سفارش تولید ${params.productionOrderNumber} (${params.reason}) مورخ ${params.dateShamsi}`;

    return [
      {
        subsidiaryAccountId: 'sub-8108', // هزینه کسری و ضایعات
        floatingDimension2Id: params.costCenterDimensionId,
        debit: amt.toFixed(0),
        credit: 0,
        description: desc
      },
      {
        subsidiaryAccountId: 'sub-1503', // کالای در جریان ساخت
        floatingDimension2Id: params.costCenterDimensionId,
        debit: 0,
        credit: amt.toFixed(0),
        description: desc
      }
    ];
  }

  /**
   * ۵. صدور سند بستن انحرافات بهای تمام‌شده تولید (Cost Variance Recognition)
   * انحراف نامساعد (هزینه واقعی > استاندارد): بدهکار انحرافات بهای تمام‌شده (۷۱۰۴) / بستانکار WIP (۱۵۰۳)
   * انحراف مساعد (هزینه واقعی < استاندارد): بدهکار WIP (۱۵۰۳) / بستانکار انحرافات بهای تمام‌شده (۷۱۰۴)
   */
  public static buildCostVarianceLines(params: {
    productionOrderNumber: string;
    dateShamsi: string;
    varianceAmount: string | number; // مثبت = نامساعد، منفی = مساعد
    costCenterDimensionId?: string;
  }): JournalLineInput[] {
    const diff = new Decimal(params.varianceAmount);
    if (diff.isZero()) {
      return [];
    }

    const absAmt = diff.abs().toFixed(0);

    if (diff.isPositive()) {
      // انحراف نامساعد (اضافه هزینه نسبت به استاندارد)
      const desc = `انحراف نامساعد بهای تمام‌شده سفارش تولید ${params.productionOrderNumber} مورخ ${params.dateShamsi}`;
      return [
        {
          subsidiaryAccountId: 'sub-7104', // انحرافات بهای تمام‌شده
          floatingDimension2Id: params.costCenterDimensionId,
          debit: absAmt,
          credit: 0,
          description: desc
        },
        {
          subsidiaryAccountId: 'sub-1503', // کالای در جریان ساخت
          floatingDimension2Id: params.costCenterDimensionId,
          debit: 0,
          credit: absAmt,
          description: desc
        }
      ];
    } else {
      // انحراف مساعد (صرفه‌جویی هزینه نسبت به استاندارد)
      const desc = `انحراف مساعد بهای تمام‌شده سفارش تولید ${params.productionOrderNumber} مورخ ${params.dateShamsi}`;
      return [
        {
          subsidiaryAccountId: 'sub-1503', // کالای در جریان ساخت
          floatingDimension2Id: params.costCenterDimensionId,
          debit: absAmt,
          credit: 0,
          description: desc
        },
        {
          subsidiaryAccountId: 'sub-7104', // انحرافات بهای تمام‌شده
          floatingDimension2Id: params.costCenterDimensionId,
          debit: 0,
          credit: absAmt,
          description: desc
        }
      ];
    }
  }
}
