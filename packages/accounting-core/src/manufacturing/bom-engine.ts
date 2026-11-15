import Decimal from 'decimal.js';
import { BomDefinition, MaterialRequirement, RoutingOperation } from './types';

Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

export class BomEngine {
  /**
   * ۱. انفجار فرمول ساخت (BOM Explosion) و محاسبه مواد اولیه مورد نیاز
   * با احتساب درصد ضایعات مجاز فرآیند ساخت:
   * مقدار ناخالص مورد نیاز = تعداد سفارش * مقدار مصرف استاندارد * (۱ + درصد ضایعات / ۱۰۰)
   */
  public static calculateMaterialRequirements(
    bom: BomDefinition,
    targetQuantity: string | number,
    priceMap: Record<string, string | number> = {}
  ): MaterialRequirement[] {
    const targetQty = new Decimal(targetQuantity);
    const yieldQty = new Decimal(bom.yieldQuantity || 1);
    const batchFactor = targetQty.dividedBy(yieldQty);

    return bom.items.map((item) => {
      const baseQty = new Decimal(item.quantityPerUnit);
      const scrapPct = new Decimal(item.scrapPercentage || 0);
      const scrapFactor = new Decimal(1).plus(scrapPct.dividedBy(100));

      const requiredQty = baseQty.times(batchFactor).times(scrapFactor);
      const unitCost = new Decimal(priceMap[item.productId] || 0);
      const totalCost = requiredQty.times(unitCost).round();

      return {
        productId: item.productId,
        unitCost: unitCost.toFixed(0),
        requiredQuantity: requiredQty.toFixed(3),
        totalCost: totalCost.toFixed(0)
      };
    });
  }

  /**
   * ۲. محاسبه زمان و بهای استاندارد دستمزد مستقیم و سربار ساخت بر مبنای مسیر تولید (Routing)
   */
  public static calculateStandardLaborAndOverhead(
    operations: RoutingOperation[],
    targetQuantity: string | number
  ): {
    totalLaborHours: string;
    totalLaborCost: string;
    totalMachineHours: string;
    totalOverheadCost: string;
    operationsBreakdown: Array<{
      operationNumber: number;
      title: string;
      laborHours: string;
      laborCost: string;
      machineHours: string;
      overheadCost: string;
    }>;
  } {
    const targetQty = new Decimal(targetQuantity);
    let totalLaborHours = new Decimal(0);
    let totalLaborCost = new Decimal(0);
    let totalMachineHours = new Decimal(0);
    let totalOverheadCost = new Decimal(0);

    const breakdown = operations.map((op) => {
      const setupTime = new Decimal(op.setupTimeHours || 0);
      const runTimePerUnit = new Decimal(op.runTimeHoursPerUnit || 0);
      const totalOpTime = setupTime.plus(runTimePerUnit.times(targetQty));

      const laborRate = new Decimal(op.laborRatePerHour || 0);
      const machineRate = new Decimal(op.machineRatePerHour || 0);

      const opLaborCost = totalOpTime.times(laborRate).round();
      const opOverheadCost = totalOpTime.times(machineRate).round();

      totalLaborHours = totalLaborHours.plus(totalOpTime);
      totalLaborCost = totalLaborCost.plus(opLaborCost);
      totalMachineHours = totalMachineHours.plus(totalOpTime);
      totalOverheadCost = totalOverheadCost.plus(opOverheadCost);

      return {
        operationNumber: op.operationNumber,
        title: op.title,
        laborHours: totalOpTime.toFixed(2),
        laborCost: opLaborCost.toFixed(0),
        machineHours: totalOpTime.toFixed(2),
        overheadCost: opOverheadCost.toFixed(0)
      };
    });

    return {
      totalLaborHours: totalLaborHours.toFixed(2),
      totalLaborCost: totalLaborCost.toFixed(0),
      totalMachineHours: totalMachineHours.toFixed(2),
      totalOverheadCost: totalOverheadCost.toFixed(0),
      operationsBreakdown: breakdown
    };
  }

  /**
   * ۳. محاسبه بهای تمام‌شده استاندارد کل یک واحد محصول صنعتی
   */
  public static calculateStandardCost(
    bom: BomDefinition,
    operations: RoutingOperation[],
    priceMap: Record<string, string | number>
  ): {
    unitStandardMaterialCost: string;
    unitStandardLaborCost: string;
    unitStandardOverheadCost: string;
    unitTotalStandardCost: string;
  } {
    const materials = this.calculateMaterialRequirements(bom, 1, priceMap);
    let totalMat = new Decimal(0);
    for (const m of materials) {
      totalMat = totalMat.plus(new Decimal(m.totalCost));
    }

    const routingCost = this.calculateStandardLaborAndOverhead(operations, 1);
    const labor = new Decimal(routingCost.totalLaborCost);
    const overhead = new Decimal(routingCost.totalOverheadCost);
    const total = totalMat.plus(labor).plus(overhead);

    return {
      unitStandardMaterialCost: totalMat.toFixed(0),
      unitStandardLaborCost: labor.toFixed(0),
      unitStandardOverheadCost: overhead.toFixed(0),
      unitTotalStandardCost: total.toFixed(0)
    };
  }
}
