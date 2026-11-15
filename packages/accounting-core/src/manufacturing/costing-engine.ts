import Decimal from 'decimal.js';
import { ProductionCostBreakdown, VarianceAnalysisResult, VarianceType } from './types';

Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

export class CostingEngine {
  /**
   * ۱. محاسبه بهای تمام‌شده واقعی سفارش تولید بر اساس روش هزینه سفارش ساخت (Job Order Costing)
   * بهای تمام‌شده کل = مواد مستقیم مصرفی + دستمزد مستقیم کارکرد + سربار جذب‌شده ساخت
   * بهای تمام‌شده واحد = بهای تمام‌شده کل / تعداد محصول سالم تکمیل‌شده
   */
  public static calculateActualJobCost(params: {
    directMaterialsCost: string | number;
    directLaborCost: string | number;
    appliedOverheadCost: string | number;
    completedQuantity: string | number;
    normalScrapCost?: string | number;
  }): ProductionCostBreakdown {
    const mat = new Decimal(params.directMaterialsCost || 0);
    const lab = new Decimal(params.directLaborCost || 0);
    const ovh = new Decimal(params.appliedOverheadCost || 0);
    const scrap = new Decimal(params.normalScrapCost || 0);
    const completedQty = new Decimal(params.completedQuantity || 1);

    if (completedQty.lessThanOrEqualTo(0)) {
      throw new Error('تعداد محصول تکمیل‌شده باید بزرگتر از صفر باشد.');
    }

    const totalCost = mat.plus(lab).plus(ovh).plus(scrap);
    const unitCost = totalCost.dividedBy(completedQty).round();

    return {
      directMaterialsCost: mat.toFixed(0),
      directLaborCost: lab.toFixed(0),
      appliedOverheadCost: ovh.toFixed(0),
      normalScrapCost: scrap.toFixed(0),
      totalProductionCost: totalCost.toFixed(0),
      completedQuantity: completedQty.toFixed(0),
      unitProductionCost: unitCost.toFixed(0)
    };
  }

  /**
   * ۲. تحلیل انحرافات بهای تمام‌شده تولید (Variance Analysis)
   * مقایسه هزینه واقعی (Actual) با هزینه استاندارد (Standard) بر مبنای تعداد تولیدشده
   * - انحراف نامساعد (UNFAVORABLE): هزینه واقعی > هزینه استاندارد (اضافه هزینه)
   * - انحراف مساعد (FAVORABLE): هزینه واقعی < هزینه استاندارد (صرفه‌جویی)
   */
  public static analyzeCostVariances(params: {
    materialStandardCost: string | number;
    materialActualCost: string | number;
    laborStandardCost: string | number;
    laborActualCost: string | number;
    overheadStandardCost: string | number;
    overheadActualCost: string | number;
  }): VarianceAnalysisResult {
    const matStd = new Decimal(params.materialStandardCost || 0);
    const matAct = new Decimal(params.materialActualCost || 0);
    const matDiff = matAct.minus(matStd); // مثبت = نامساعد، منفی = مساعد

    const labStd = new Decimal(params.laborStandardCost || 0);
    const labAct = new Decimal(params.laborActualCost || 0);
    const labDiff = labAct.minus(labStd);

    const ovhStd = new Decimal(params.overheadStandardCost || 0);
    const ovhAct = new Decimal(params.overheadActualCost || 0);
    const ovhDiff = ovhAct.minus(ovhStd);

    const totalDiff = matDiff.plus(labDiff).plus(ovhDiff);

    const getVarianceType = (diff: Decimal): VarianceType => {
      if (diff.isZero()) return VarianceType.NONE;
      return diff.isPositive() ? VarianceType.UNFAVORABLE : VarianceType.FAVORABLE;
    };

    return {
      materialStandardCost: matStd.toFixed(0),
      materialActualCost: matAct.toFixed(0),
      materialUsageVariance: matDiff.toFixed(0),
      materialVarianceType: getVarianceType(matDiff),

      laborStandardCost: labStd.toFixed(0),
      laborActualCost: labAct.toFixed(0),
      laborVariance: labDiff.toFixed(0),
      laborVarianceType: getVarianceType(labDiff),

      overheadStandardCost: ovhStd.toFixed(0),
      overheadActualCost: ovhAct.toFixed(0),
      overheadVariance: ovhDiff.toFixed(0),
      overheadVarianceType: getVarianceType(ovhDiff),

      totalNetVariance: totalDiff.toFixed(0),
      netVarianceType: getVarianceType(totalDiff)
    };
  }
}
