import Decimal from 'decimal.js';
import { JournalLineInput } from '../journal/types';
import { AssetCategory, AssetDisposalResult } from './types';

Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

export class AssetPostingEngine {
  /**
   * دریافت کد حساب معین دارایی ثابت بر اساس طبقه
   */
  public static getAssetSubsidiaryId(category: AssetCategory): string {
    switch (category) {
      case AssetCategory.VEHICLES:
        return 'sub-2102'; // وسایط نقلیه
      case AssetCategory.MACHINERY_TECHNICAL:
        return 'sub-2103'; // ماشین‌آلات و تجهیزات فنی
      case AssetCategory.FURNITURE_OFFICE:
      default:
        return 'sub-2101'; // اثاثه و تجهیزات اداری و کامپیوتر
    }
  }

  /**
   * دریافت کد حساب معین استهلاک انباشته بر اساس طبقه دارایی
   */
  public static getAccumulatedDepreciationSubsidiaryId(category: AssetCategory): string {
    switch (category) {
      case AssetCategory.VEHICLES:
        return 'sub-2202'; // استهلاک انباشته وسایط نقلیه
      case AssetCategory.MACHINERY_TECHNICAL:
        return 'sub-2203'; // استهلاک انباشته ماشین‌آلات
      case AssetCategory.FURNITURE_OFFICE:
      default:
        return 'sub-2201'; // استهلاک انباشته اثاثه و تجهیزات
    }
  }

  /**
   * ۱. صدور سند خرید و تحصیل دارایی ثابت
   * بدهکار: دارایی ثابت (۲۱۰۱ یا ۲۱۰۲ یا ۲۱۰۳)
   * بستانکار: موجودی بانک (۱۱۰۲) یا بستانکاران تجاری (۳۲۰۱)
   */
  public static buildAcquisitionLines(params: {
    assetCode: string;
    assetTitle: string;
    category: AssetCategory;
    purchaseDateShamsi: string;
    cost: string | number;
    creditSubsidiaryId?: string; // پیش‌فرض sub-1102 (بانک)
    creditFloatingDimensionId?: string;
    costCenterDimensionId?: string;
  }): JournalLineInput[] {
    const cost = new Decimal(params.cost);
    if (cost.lessThanOrEqualTo(0)) return [];

    const assetSubId = this.getAssetSubsidiaryId(params.category);
    const desc = `خرید و تحصیل دارایی ثابت پلاک ${params.assetCode} (${params.assetTitle}) مورخ ${params.purchaseDateShamsi}`;

    return [
      {
        subsidiaryAccountId: assetSubId,
        floatingDimension2Id: params.costCenterDimensionId,
        debit: cost.toFixed(0),
        credit: 0,
        description: desc
      },
      {
        subsidiaryAccountId: params.creditSubsidiaryId || 'sub-1102',
        floatingDimension1Id: params.creditFloatingDimensionId,
        debit: 0,
        credit: cost.toFixed(0),
        description: desc
      }
    ];
  }

  /**
   * ۲. صدور سند استهلاک دوره‌ای دارایی‌های ثابت
   * بدهکار: هزینه استهلاک دارایی‌های ثابت (۸۱۰۴)
   * بستانکار: استهلاک انباشته دارایی (۲۲۰۱ / ۲۲۰۲ / ۲۲۰۳)
   */
  public static buildDepreciationLines(params: {
    periodTitle: string;
    dateShamsi: string;
    items: Array<{
      assetCode: string;
      assetTitle: string;
      category: AssetCategory;
      depreciationAmount: string | number;
      costCenterDimensionId?: string;
    }>;
  }): JournalLineInput[] {
    if (!params.items || params.items.length === 0) return [];

    const lines: JournalLineInput[] = [];

    for (const item of params.items) {
      const amt = new Decimal(item.depreciationAmount);
      if (amt.lessThanOrEqualTo(0)) continue;

      const accSubId = this.getAccumulatedDepreciationSubsidiaryId(item.category);
      const desc = `هزینه استهلاک ${params.periodTitle} دارایی پلاک ${item.assetCode} (${item.assetTitle})`;

      // سطر بدهکار: هزینه استهلاک
      lines.push({
        subsidiaryAccountId: 'sub-8104', // هزینه استهلاک
        floatingDimension2Id: item.costCenterDimensionId,
        debit: amt.toFixed(0),
        credit: 0,
        description: desc
      });

      // سطر بستانکار: استهلاک انباشته
      lines.push({
        subsidiaryAccountId: accSubId, // استهلاک انباشته
        floatingDimension2Id: item.costCenterDimensionId,
        debit: 0,
        credit: amt.toFixed(0),
        description: desc
      });
    }

    return lines;
  }

  /**
   * ۳. صدور سند واگذاری، فروش یا اسقاط دارایی ثابت با شناسایی سود/زیان
   * بدهکار: بانک / دریافتنی‌ها (مبلغ فروش)
   * بدهکار: استهلاک انباشته دارایی (۲۲۰۱/۲۲۰۲/۲۲۰۳)
   * بستانکار: دارایی ثابت مشهود (۲۱۰۱/۲۱۰۲/۲۱۰۳)
   * و بستانکار سود واگذاری (۶۱۰۶) یا بدهکار زیان واگذاری (۸۱۱۰)
   */
  public static buildDisposalLines(params: {
    disposalResult: AssetDisposalResult;
    category: AssetCategory;
    paymentReceivableSubsidiaryId?: string; // پیش‌فرض sub-1102 (بانک)
    paymentFloatingDimensionId?: string;
    costCenterDimensionId?: string;
  }): JournalLineInput[] {
    const r = params.disposalResult;
    const salePrice = new Decimal(r.salePrice);
    const cost = new Decimal(r.historicalCost);
    const accDep = new Decimal(r.accumulatedDepreciation);
    const gainOrLoss = new Decimal(r.gainOrLossAmount);

    const assetSubId = this.getAssetSubsidiaryId(params.category);
    const accDepSubId = this.getAccumulatedDepreciationSubsidiaryId(params.category);
    const desc = `واگذاری و فروش دارایی ثابت پلاک ${r.assetCode} مورخ ${r.disposalDateShamsi}`;

    const lines: JournalLineInput[] = [];

    // ۱. سطر بدهکار: دریافت وجه فروش
    if (salePrice.greaterThan(0)) {
      lines.push({
        subsidiaryAccountId: params.paymentReceivableSubsidiaryId || 'sub-1102',
        floatingDimension1Id: params.paymentFloatingDimensionId,
        debit: salePrice.toFixed(0),
        credit: 0,
        description: `${desc} - دریافت وجه فروش`
      });
    }

    // ۲. سطر بدهکار: بستن استهلاک انباشته تا تاریخ واگذاری
    if (accDep.greaterThan(0)) {
      lines.push({
        subsidiaryAccountId: accDepSubId,
        floatingDimension2Id: params.costCenterDimensionId,
        debit: accDep.toFixed(0),
        credit: 0,
        description: `${desc} - بستن استهلاک انباشته`
      });
    }

    // ۳. سطر بستانکار: خروج دارایی با بهای تمام‌شده تاریخی
    lines.push({
      subsidiaryAccountId: assetSubId,
      floatingDimension2Id: params.costCenterDimensionId,
      debit: 0,
      credit: cost.toFixed(0),
      description: `${desc} - خروج بهای تمام‌شده دارایی`
    });

    // ۴. شناسایی سود یا زیان واگذاری
    if (gainOrLoss.greaterThan(0)) {
      if (r.isGain) {
        // سود ناشی از واگذاری دارایی‌های ثابت (۶۱۰۶ - بستانکار)
        lines.push({
          subsidiaryAccountId: 'sub-6106',
          floatingDimension2Id: params.costCenterDimensionId,
          debit: 0,
          credit: gainOrLoss.toFixed(0),
          description: `${desc} - سود ناشی از واگذاری دارایی ثابت`
        });
      } else {
        // زیان ناشی از واگذاری دارایی‌های ثابت (۸۱۱۰ - بدهکار)
        lines.push({
          subsidiaryAccountId: 'sub-8110',
          floatingDimension2Id: params.costCenterDimensionId,
          debit: gainOrLoss.toFixed(0),
          credit: 0,
          description: `${desc} - زیان ناشی از واگذاری دارایی ثابت`
        });
      }
    }

    return lines;
  }
}
