import Decimal from 'decimal.js';
import {
  FixedAssetDefinition,
  DepreciationMethod,
  PeriodicDepreciationResult,
  AssetDisposalResult
} from './types';

Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

export class DepreciationEngine {
  /**
   * محاسبه استهلاک دوره‌ای دارایی ثابت مطابق جدول استهلاکات ماده ۱۴۹ قانون مالیات‌های مستقیم
   * @param asset مشخصات دارایی ثابت
   * @param previousAccumulatedDepreciation استهلاک انباشته ابتدای دوره
   * @param monthsCount تعداد ماه‌های مشمول استهلاک (پیش‌فرض ۱ ماه)
   * @param periodDateShamsi تاریخ پایان دوره محاسباتی
   */
  public static calculatePeriodicDepreciation(params: {
    asset: FixedAssetDefinition;
    previousAccumulatedDepreciation: string | number;
    monthsCount?: number;
    periodDateShamsi: string;
  }): PeriodicDepreciationResult {
    const { asset, periodDateShamsi } = params;
    const months = params.monthsCount || 1;

    const cost = new Decimal(asset.historicalCost);
    const salvage = new Decimal(asset.salvageValue || 0);
    const prevAcc = new Decimal(params.previousAccumulatedDepreciation || 0);

    const depreciableBase = cost.minus(salvage);
    const openingBookValue = cost.minus(prevAcc);

    if (openingBookValue.lessThanOrEqualTo(salvage)) {
      // دارایی قبلاً کاملاً مستهلک شده است
      return {
        assetId: asset.id || '',
        assetCode: asset.assetCode,
        periodDateShamsi,
        monthsCount: months,
        openingBookValue: openingBookValue.toFixed(0),
        periodDepreciationAmount: '0',
        accumulatedDepreciationAfter: prevAcc.toFixed(0),
        closingBookValue: openingBookValue.toFixed(0),
        isFullyDepreciated: true
      };
    }

    let depAmount = new Decimal(0);

    if (asset.depreciationMethod === DepreciationMethod.STRAIGHT_LINE) {
      if (asset.annualRatePercentage) {
        // روش خط مستقیم بر مبنای نرخ درصد سالانه
        const annualRate = new Decimal(asset.annualRatePercentage).dividedBy(100);
        depAmount = depreciableBase.times(annualRate).times(months).dividedBy(12).round();
      } else if (asset.usefulLifeYears) {
        // روش خط مستقیم بر مبنای مدت عمر مفید (سال)
        const totalMonths = new Decimal(asset.usefulLifeYears * 12);
        depAmount = depreciableBase.times(months).dividedBy(totalMonths).round();
      }
    } else {
      // روش مانده نزولی بر مبنای ارزش دفتری ابتدای دوره
      const annualRate = new Decimal(asset.annualRatePercentage || 25).dividedBy(100);
      depAmount = openingBookValue.times(annualRate).times(months).dividedBy(12).round();
    }

    // کنترل عدم عبور استهلاک از سقف ارزش اسقاط
    const maxAllowedDepreciation = openingBookValue.minus(salvage);
    if (depAmount.greaterThan(maxAllowedDepreciation)) {
      depAmount = maxAllowedDepreciation;
    }

    const newAccumulated = prevAcc.plus(depAmount);
    const closingBookValue = cost.minus(newAccumulated);
    const isFullyDepreciated = closingBookValue.lessThanOrEqualTo(salvage);

    return {
      assetId: asset.id || '',
      assetCode: asset.assetCode,
      periodDateShamsi,
      monthsCount: months,
      openingBookValue: openingBookValue.toFixed(0),
      periodDepreciationAmount: depAmount.toFixed(0),
      accumulatedDepreciationAfter: newAccumulated.toFixed(0),
      closingBookValue: closingBookValue.toFixed(0),
      isFullyDepreciated
    };
  }

  /**
   * محاسبه سود یا زیان ناشی از واگذاری و فروش دارایی ثابت
   * سود/زیان = مبلغ فروش - ارزش دفتری در تاریخ واگذاری (بهای تمام‌شده منهای استهلاک انباشته)
   */
  public static calculateDisposal(params: {
    assetId: string;
    assetCode: string;
    disposalDateShamsi: string;
    historicalCost: string | number;
    accumulatedDepreciation: string | number;
    salePrice: string | number;
  }): AssetDisposalResult {
    const cost = new Decimal(params.historicalCost);
    const accDep = new Decimal(params.accumulatedDepreciation || 0);
    const sale = new Decimal(params.salePrice || 0);

    const bookValue = cost.minus(accDep);
    const diff = sale.minus(bookValue);

    const isGain = diff.greaterThanOrEqualTo(0);
    const gainOrLossAmount = diff.abs().round().toFixed(0);

    return {
      assetId: params.assetId,
      assetCode: params.assetCode,
      disposalDateShamsi: params.disposalDateShamsi,
      historicalCost: cost.toFixed(0),
      accumulatedDepreciation: accDep.toFixed(0),
      bookValueAtDisposal: bookValue.toFixed(0),
      salePrice: sale.toFixed(0),
      gainOrLossAmount,
      isGain
    };
  }
}
