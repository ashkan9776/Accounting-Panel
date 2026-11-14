import Decimal from 'decimal.js';
import { FoodCostAnalysisResult, MenuEngineeringCategory, RecipeDefinition } from './types';

Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

export class RecipeEngine {
  /**
   * محاسبه بهای تمام‌شده مواد اولیه یک پرس غذا بر مبنای BOM و درصد ضایعات (Scrap Factor)
   * ضایعات مواد به مقدار مصرف اضافه می‌شود:
   * مصرف موثر = مقدار ناخالص * (۱ + درصد ضایعات / ۱۰۰)
   */
  public static calculateRecipeCost(
    ingredients: Array<{
      unitCost: string | number;
      quantity: string | number;
      wastePercentage?: string | number;
    }>
  ): string {
    let totalCost = new Decimal(0);

    for (const ing of ingredients) {
      const unitCost = new Decimal(ing.unitCost || 0);
      const qty = new Decimal(ing.quantity || 0);
      const wastePct = new Decimal(ing.wastePercentage || 0);

      // ضریب ضایعات (مثلاً ۵٪ ضایعات پوست‌گیری پیاز یعنی هر کیلو پیاز به ۱.۰۵ کیلو نیاز دارد)
      const wasteFactor = new Decimal(1).plus(wastePct.dividedBy(100));
      const effectiveQty = qty.times(wasteFactor);
      const lineCost = effectiveQty.times(unitCost);

      totalCost = totalCost.plus(lineCost);
    }

    return totalCost.round().toFixed(0);
  }

  /**
   * تحلیل مهندسی منو و محاسبه Food Cost Percentage
   * Food Cost % = (بهای تمام‌شده مواد اولیه / قیمت فروش بدون ارزش افزوده) * ۱۰۰
   * طبق استانداردهای صنعت رستوران ایران:
   * - نرخ متعادل Food Cost معمولاً بین ۲۸٪ تا ۳۵٪ است.
   * ماتریس بوستون/کاساوانا و اسمیت (Menu Engineering Matrix):
   * ۱. Star (ستاره): محبوبیت بالا و سود ناخالص بالا
   * ۲. Plowhorse (اسب کاری): محبوبیت بالا اما سود ناخالص پایین (باید بهای مواد کاهش یابد یا قیمت بهینه‌سازی شود)
   * ۳. Puzzle (معما): سود ناخالص بالا اما محبوبیت پایین (نیاز به بازاریابی و پروموشن)
   * ۴. Dog (سگ): هم سود پایین و هم محبوبیت پایین (کاندیدای حذف از منو)
   */
  public static analyzeFoodCost(
    sellPrice: string | number,
    recipeCost: string | number,
    isPopular: boolean = true,
    benchmarkMargin: string | number = '65.0' // حاشیه سود ۶۵٪ به عنوان حد آستانه سودآوری
  ): FoodCostAnalysisResult {
    const price = new Decimal(sellPrice);
    const cost = new Decimal(recipeCost);

    if (price.isZero()) {
      throw new Error('قیمت فروش غذا نمی‌تواند صفر باشد.');
    }

    const grossMargin = price.minus(cost);
    const grossMarginPct = grossMargin.dividedBy(price).times(100);
    const foodCostPct = cost.dividedBy(price).times(100);

    const isHighProfit = grossMarginPct.greaterThanOrEqualTo(new Decimal(benchmarkMargin));

    let category: MenuEngineeringCategory;
    if (isPopular && isHighProfit) {
      category = MenuEngineeringCategory.STAR;
    } else if (isPopular && !isHighProfit) {
      category = MenuEngineeringCategory.PLOWHORSE;
    } else if (!isPopular && isHighProfit) {
      category = MenuEngineeringCategory.PUZZLE;
    } else {
      category = MenuEngineeringCategory.DOG;
    }

    return {
      recipeCostAmount: cost.toFixed(0),
      sellPriceAmount: price.toFixed(0),
      foodCostPercentage: foodCostPct.toFixed(2),
      grossMarginAmount: grossMargin.toFixed(0),
      grossMarginPercentage: grossMarginPct.toFixed(2),
      category
    };
  }

  /**
   * محاسبه مقادیر ناخالص مواد اولیه جهت کسر خودکار از کاردکس انبار آشپزخانه
   * متناسب با تعداد پرس سفارش‌داده‌شده
   */
  public static calculateDeductionQuantities(
    recipe: RecipeDefinition,
    orderQuantity: string | number
  ): Array<{ rawProductId: string; quantityToDeduct: string }> {
    const orderQty = new Decimal(orderQuantity);
    const yieldQty = new Decimal(recipe.yieldQuantity || 1);
    const factor = orderQty.dividedBy(yieldQty);

    return recipe.ingredients.map((ing) => {
      const baseQty = new Decimal(ing.quantity);
      const wastePct = new Decimal(ing.wastePercentage || 0);
      const wasteFactor = new Decimal(1).plus(wastePct.dividedBy(100));
      const totalRequired = baseQty.times(factor).times(wasteFactor);

      return {
        rawProductId: ing.rawProductId,
        quantityToDeduct: totalRequired.toFixed(3)
      };
    });
  }
}
