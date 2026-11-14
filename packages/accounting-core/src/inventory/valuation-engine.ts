import Decimal from 'decimal.js';
import {
  ValuationMethod,
  FifoLayer,
  StockLedgerState,
  LandedCostItem,
  AllocatedLandedCostResult,
  CogsCalculationResult
} from './types';

Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

export class ValuationEngine {
  /**
   * ۱. ثبت ورود کالا به انبار و محاسبه مجدد نرخ میانگین یا ثبت لایه جدید FIFO
   */
  public static processReceipt(
    currentState: StockLedgerState,
    inQuantityInput: string | number,
    inLandedUnitCostInput: string | number,
    valuationMethod: ValuationMethod,
    receiptDateShamsi: string,
    layerId: string
  ): {
    newQuantity: string;
    newAverageCost: string;
    newTotalValue: string;
    updatedFifoLayers: FifoLayer[];
  } {
    const prevQty = new Decimal(currentState.currentQuantity || 0);
    const prevVal = new Decimal(currentState.totalValue || 0);
    const inQty = new Decimal(inQuantityInput);
    const inCost = new Decimal(inLandedUnitCostInput);

    if (inQty.lessThanOrEqualTo(0)) {
      throw new Error('مقدار ورودی به انبار باید بزرگتر از صفر باشد.');
    }
    if (inCost.isNegative()) {
      throw new Error('بهای واحد ورودی نمی‌تواند منفی باشد.');
    }

    const inTotalValue = inQty.times(inCost);
    const newQty = prevQty.plus(inQty);
    const newTotalValue = prevVal.plus(inTotalValue);

    // محاسبه نرخ میانگین موزون متحرک لحظه‌ای
    const newAvgCost = newQty.greaterThan(0)
      ? newTotalValue.dividedBy(newQty).round()
      : inCost;

    // ثبت لایه FIFO جدید
    const updatedFifoLayers: FifoLayer[] = [...(currentState.fifoLayers || [])];
    if (valuationMethod === ValuationMethod.FIFO) {
      updatedFifoLayers.push({
        layerId,
        receiptDateShamsi,
        originalQuantity: inQty.toFixed(0),
        remainingQuantity: inQty.toFixed(0),
        unitCost: inCost.toFixed(0)
      });
    }

    return {
      newQuantity: newQty.toFixed(0),
      newAverageCost: newAvgCost.toFixed(0),
      newTotalValue: newTotalValue.toFixed(0),
      updatedFifoLayers
    };
  }

  /**
   * ۲. محاسبه بهای تمام‌شده کالای فروش‌رفته (COGS) و کسر از موجودی انبار
   */
  public static processIssue(
    currentState: StockLedgerState,
    outQuantityInput: string | number,
    valuationMethod: ValuationMethod
  ): {
    cogs: CogsCalculationResult;
    newQuantity: string;
    newAverageCost: string;
    newTotalValue: string;
    updatedFifoLayers: FifoLayer[];
  } {
    const prevQty = new Decimal(currentState.currentQuantity || 0);
    const outQty = new Decimal(outQuantityInput);

    if (outQty.lessThanOrEqualTo(0)) {
      throw new Error('مقدار خروج از انبار باید بزرگتر از صفر باشد.');
    }

    if (prevQty.lessThan(outQty)) {
      // توجه: طبق قوانین POS در حالت آفلاین، سیستم اجازه ثبت با هشدار کسری می‌دهد،
      // اما در محاسبات انبارداری پایه، موجودی نباید کمتر از میزان درخواستی باشد
      // در صورت وقوع، با آخرین بهای میانگین محاسبه می‌شود.
    }

    if (valuationMethod === ValuationMethod.MOVING_AVERAGE) {
      const avgCost = new Decimal(currentState.averageCost || 0);
      const totalCogs = outQty.times(avgCost).round();
      const newQty = prevQty.minus(outQty);
      const newTotalValue = Decimal.max(0, newQty.times(avgCost).round());

      return {
        cogs: {
          consumedQuantity: outQty.toFixed(0),
          totalCogsAmount: totalCogs.toFixed(0),
          unitCost: avgCost.toFixed(0),
          valuationMethodUsed: ValuationMethod.MOVING_AVERAGE
        },
        newQuantity: newQty.toFixed(0),
        newAverageCost: avgCost.toFixed(0),
        newTotalValue: newTotalValue.toFixed(0),
        updatedFifoLayers: currentState.fifoLayers || []
      };
    } else {
      // محاسبه با روش FIFO (مصرف لایه‌ها به ترتیب زمانی از قدیمی‌ترین به جدیدترین)
      let remainingToConsume = outQty;
      let totalCogs = new Decimal(0);
      const updatedLayers: FifoLayer[] = [];

      for (const layer of currentState.fifoLayers || []) {
        const layerRemaining = new Decimal(layer.remainingQuantity);
        if (layerRemaining.isZero() || remainingToConsume.isZero()) {
          updatedLayers.push(layer);
          continue;
        }

        const consumeFromLayer = Decimal.min(layerRemaining, remainingToConsume);
        const layerCost = new Decimal(layer.unitCost);
        totalCogs = totalCogs.plus(consumeFromLayer.times(layerCost));

        remainingToConsume = remainingToConsume.minus(consumeFromLayer);
        const newLayerRemaining = layerRemaining.minus(consumeFromLayer);

        if (newLayerRemaining.greaterThan(0)) {
          updatedLayers.push({
            ...layer,
            remainingQuantity: newLayerRemaining.toFixed(0)
          });
        }
      }

      // اگر مقداری بیش از لایه‌های موجود بود، با بهای آخرین لایه یا میانگین محاسبه می‌شود
      if (remainingToConsume.greaterThan(0)) {
        const fallbackCost = new Decimal(currentState.averageCost || 0);
        totalCogs = totalCogs.plus(remainingToConsume.times(fallbackCost));
      }

      const newQty = prevQty.minus(outQty);
      const avgEffectiveCost = outQty.greaterThan(0) ? totalCogs.dividedBy(outQty).round() : new Decimal(0);
      const newTotalVal = Decimal.max(0, new Decimal(currentState.totalValue || 0).minus(totalCogs));

      return {
        cogs: {
          consumedQuantity: outQty.toFixed(0),
          totalCogsAmount: totalCogs.toFixed(0),
          unitCost: avgEffectiveCost.toFixed(0),
          valuationMethodUsed: ValuationMethod.FIFO,
          updatedFifoLayers: updatedLayers
        },
        newQuantity: newQty.toFixed(0),
        newAverageCost: avgEffectiveCost.toFixed(0),
        newTotalValue: newTotalVal.toFixed(0),
        updatedFifoLayers: updatedLayers
      };
    }
  }

  /**
   * ۳. تسهیم هزینه‌های جانبی خرید (کرایه حمل، بیمه، بارگیری) در بهای تمام‌شده واحد کالاها
   */
  public static allocateLandedCosts(
    items: LandedCostItem[],
    totalAdditionalFreightCost: string | number
  ): AllocatedLandedCostResult[] {
    const totalFreight = new Decimal(totalAdditionalFreightCost || 0);
    const totalPurchaseValue = items.reduce(
      (sum, item) => sum.plus(new Decimal(item.purchaseAmount)),
      new Decimal(0)
    );

    if (totalPurchaseValue.isZero() || totalFreight.isZero()) {
      return items.map((item) => {
        const qty = new Decimal(item.quantity);
        const amt = new Decimal(item.purchaseAmount);
        const unit = qty.greaterThan(0) ? amt.dividedBy(qty).round() : new Decimal(0);
        return {
          productId: item.productId,
          originalUnitCost: unit.toFixed(0),
          allocatedFreightPerUnit: '0',
          finalLandedUnitCost: unit.toFixed(0),
          totalLandedCost: amt.toFixed(0)
        };
      });
    }

    return items.map((item) => {
      const qty = new Decimal(item.quantity);
      const amt = new Decimal(item.purchaseAmount);
      // سهم تناسبی از کل کرایه حمل بر اساس ارزش خرید
      const itemFreightShare = totalFreight.times(amt.dividedBy(totalPurchaseValue)).round();
      const totalItemLanded = amt.plus(itemFreightShare);
      const unitLanded = qty.greaterThan(0) ? totalItemLanded.dividedBy(qty).round() : new Decimal(0);
      const freightPerUnit = qty.greaterThan(0) ? itemFreightShare.dividedBy(qty).round() : new Decimal(0);
      const originalUnit = qty.greaterThan(0) ? amt.dividedBy(qty).round() : new Decimal(0);

      return {
        productId: item.productId,
        originalUnitCost: originalUnit.toFixed(0),
        allocatedFreightPerUnit: freightPerUnit.toFixed(0),
        finalLandedUnitCost: unitLanded.toFixed(0),
        totalLandedCost: totalItemLanded.toFixed(0)
      };
    });
  }

  /**
   * ۴. محاسبه ریالی مغایرت انبارگردانی (کسری یا فزونی انبار)
   */
  public static calculateInventoryDiscrepancy(
    systemQuantity: string | number,
    physicalCountQuantity: string | number,
    currentUnitCost: string | number
  ): {
    discrepancyQuantity: string;
    isDeficit: boolean; // کسری (منفی)
    isSurplus: boolean; // فزونی (مثبت)
    totalDiscrepancyValue: string;
  } {
    const sys = new Decimal(systemQuantity);
    const phys = new Decimal(physicalCountQuantity);
    const cost = new Decimal(currentUnitCost);

    const diff = phys.minus(sys);
    const totalVal = diff.abs().times(cost).round();

    return {
      discrepancyQuantity: diff.toFixed(0),
      isDeficit: diff.isNegative(),
      isSurplus: diff.isPositive(),
      totalDiscrepancyValue: totalVal.toFixed(0)
    };
  }
}
