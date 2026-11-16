import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { InventoryService } from '../inventory/inventory.service';
import {
  RecipeEngine,
  RecipeDefinition,
  ValuationEngine,
  ValuationMethod,
  StockDocumentType
} from '@accounting/core';
import Decimal from 'decimal.js';

Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

@Injectable()
export class RecipesService {
  constructor(
    private readonly db: DatabaseService,
    private readonly inventoryService: InventoryService
  ) {}

  // ۰. دریافت فهرست کلیه دستور پخت‌ها
  async listRecipes(tenantId: string, companyId: string) {
    const recipes = await this.db.query(
      `SELECT r.*, p.name as menu_product_name, p.sell_price as menu_sell_price
       FROM restaurant_recipes r
       JOIN products p ON r.menu_product_id = p.id
       WHERE r.tenant_id = ? AND r.company_id = ? AND r.is_active = true`,
      [tenantId, companyId]
    );

    const result = [];
    for (const r of recipes) {
      const items = await this.db.query(
        `SELECT ri.*, p.name as raw_product_name, p.code as raw_product_code, p.purchase_price as raw_unit_cost
         FROM restaurant_recipe_items ri
         JOIN products p ON ri.raw_product_id = p.id
         WHERE ri.recipe_id = ?`,
        [r.id]
      );
      const ingredients = items.map((it: any) => ({
        unitCost: it.raw_unit_cost,
        quantity: it.quantity,
        wastePercentage: it.waste_percentage,
      }));
      const recipeCost = RecipeEngine.calculateRecipeCost(ingredients);
      const sellPrice = new Decimal(r.menu_sell_price || 0);
      const foodCostPct = sellPrice.greaterThan(0)
        ? new Decimal(recipeCost).dividedBy(sellPrice).times(100).toNumber()
        : 0;

      result.push({
        id: r.id,
        menuProductId: r.menu_product_id,
        name: r.menu_product_name,
        category: 'غذای اصلی و کباب',
        sellingPrice: sellPrice.toNumber(),
        recipeCost: new Decimal(recipeCost).toNumber(),
        foodCostPercentage: Math.round(foodCostPct * 10) / 10,
        grossMarginAmount: sellPrice.minus(new Decimal(recipeCost)).toNumber(),
        grossMarginPercentage: Math.round((100 - foodCostPct) * 10) / 10,
        menuEngineeringCategory: foodCostPct <= 30 ? 'STAR' : 'PLOWHORSE',
        ingredients: items.map((it: any) => ({
          rawProductName: it.raw_product_name,
          quantity: it.quantity,
          unit: 'گرم',
          unitCost: Number(it.raw_unit_cost),
          wastePercentage: Number(it.waste_percentage),
          totalCost: Number(it.raw_unit_cost) * Number(it.quantity) * (1 + Number(it.waste_percentage) / 100),
        })),
      });
    }
    return result;
  }

  // ۱. دریافت دستور پخت کامل یک غذا همراه با اقلام مواد اولیه
  async getRecipe(tenantId: string, companyId: string, menuProductId: string) {
    const recipe = await this.db.queryOne(
      `SELECT r.*, p.name as menu_product_name, p.sell_price as menu_sell_price
       FROM restaurant_recipes r
       JOIN products p ON r.menu_product_id = p.id
       WHERE r.tenant_id = ? AND r.company_id = ? AND r.menu_product_id = ? AND r.is_active = true`,
      [tenantId, companyId, menuProductId]
    );

    if (!recipe) {
      return null;
    }

    const items = await this.db.query(
      `SELECT ri.*, p.name as raw_product_name, p.code as raw_product_code, p.purchase_price as raw_unit_cost
       FROM restaurant_recipe_items ri
       JOIN products p ON ri.raw_product_id = p.id
       WHERE ri.recipe_id = ?`,
      [recipe.id]
    );

    return { ...recipe, items };
  }

  // ۲. محاسبه بهای تمام‌شده و Food Cost یک غذا
  async calculateRecipeFoodCost(tenantId: string, companyId: string, menuProductId: string) {
    const recipe = await this.getRecipe(tenantId, companyId, menuProductId);
    if (!recipe) {
      throw new NotFoundException(`دستور پختی برای کالای منو با شناسه ${menuProductId} تعریف نشده است.`);
    }

    const ingredientsForCalc = recipe.items.map((it: any) => ({
      unitCost: it.raw_unit_cost,
      quantity: it.quantity,
      wastePercentage: it.waste_percentage
    }));

    const foodCostAmount = RecipeEngine.calculateRecipeCost(ingredientsForCalc);
    return {
      menuProductId,
      menuProductName: recipe.menu_product_name,
      sellPrice: recipe.menu_sell_price,
      foodCostAmount,
      yieldQuantity: recipe.yield_quantity,
      items: recipe.items
    };
  }

  // ۳. تحلیل مهندسی منو (Menu Engineering Matrix)
  async analyzeMenuEngineering(
    tenantId: string,
    companyId: string,
    menuProductId: string,
    isPopular: boolean = true
  ) {
    const fc = await this.calculateRecipeFoodCost(tenantId, companyId, menuProductId);
    const analysis = RecipeEngine.analyzeFoodCost(fc.sellPrice, fc.foodCostAmount, isPopular);
    return {
      ...fc,
      analysis
    };
  }

  // ۴. کسر خودکار مواد اولیه دستور پخت از انبار در زمان ثبت/تحویل سفارش
  async deductRecipeInventory(
    tenantId: string,
    companyId: string,
    warehouseId: string,
    orderId: string,
    dateShamsi: string,
    orderItems: Array<{ productId: string; quantity: string | number }>
  ): Promise<{ totalFoodCost: string; deductedIngredients: any[] }> {
    let orderTotalFoodCost = new Decimal(0);
    const deductedIngredients: any[] = [];

    for (const item of orderItems) {
      const recipe = await this.getRecipe(tenantId, companyId, item.productId);
      if (!recipe) {
        // در صورتی که آیتم منو فاقد دستور پخت باشد (نظیر قوطی نوشابه آماده)، مستقیم از انبار کسر می‌شود
        const product = await this.db.queryOne('SELECT * FROM products WHERE id = ?', [item.productId]);
        if (product && product.type === 'GOODS') {
          const currentState = await this.inventoryService.getStockState(tenantId, companyId, warehouseId, product.id);
          const valuationMethod = (product.valuation_method as ValuationMethod) || ValuationMethod.MOVING_AVERAGE;
          const issueRes = ValuationEngine.processIssue(currentState, item.quantity.toString(), valuationMethod);

          orderTotalFoodCost = orderTotalFoodCost.plus(new Decimal(issueRes.cogs.totalCogsAmount));

          await this.inventoryService.recordStockEntry(tenantId, companyId, {
            warehouseId,
            productId: product.id,
            documentType: StockDocumentType.ISSUE,
            documentId: orderId,
            documentNumber: `REST-${orderId}`,
            dateShamsi,
            outQuantity: item.quantity.toString(),
            outUnitCost: issueRes.cogs.unitCost,
            outTotalCost: issueRes.cogs.totalCogsAmount,
            balanceQuantity: issueRes.newQuantity,
            balanceUnitCost: issueRes.newAverageCost,
            balanceTotalCost: issueRes.newTotalValue,
            description: `فروش مستقیم رستوران سفارش ${orderId}`
          });
        }
        continue;
      }

      // محاسبه مقادیر مصرف مواد اولیه بر اساس تعداد پرس سفارش
      const recipeDef: RecipeDefinition = {
        menuProductId: recipe.menu_product_id,
        yieldQuantity: recipe.yield_quantity,
        ingredients: recipe.items.map((it: any) => ({
          rawProductId: it.raw_product_id,
          quantity: it.quantity,
          wastePercentage: it.waste_percentage
        }))
      };

      const deductions = RecipeEngine.calculateDeductionQuantities(recipeDef, item.quantity);

      for (const d of deductions) {
        const rawProduct = await this.db.queryOne('SELECT * FROM products WHERE id = ?', [d.rawProductId]);
        const currentState = await this.inventoryService.getStockState(tenantId, companyId, warehouseId, d.rawProductId);
        const valuationMethod = (rawProduct?.valuation_method as ValuationMethod) || ValuationMethod.MOVING_AVERAGE;
        const issueRes = ValuationEngine.processIssue(currentState, d.quantityToDeduct, valuationMethod);

        orderTotalFoodCost = orderTotalFoodCost.plus(new Decimal(issueRes.cogs.totalCogsAmount));

        await this.inventoryService.recordStockEntry(tenantId, companyId, {
          warehouseId,
          productId: d.rawProductId,
          documentType: StockDocumentType.ISSUE,
          documentId: orderId,
          documentNumber: `REST-${orderId}`,
          dateShamsi,
          outQuantity: d.quantityToDeduct,
          outUnitCost: issueRes.cogs.unitCost,
          outTotalCost: issueRes.cogs.totalCogsAmount,
          balanceQuantity: issueRes.newQuantity,
          balanceUnitCost: issueRes.newAverageCost,
          balanceTotalCost: issueRes.newTotalValue,
          description: `مصرف مواد اولیه دستور پخت پخت سفارش رستوران ${orderId}`
        });

        deductedIngredients.push({
          rawProductId: d.rawProductId,
          quantityDeducted: d.quantityToDeduct,
          cogsAmount: issueRes.cogs.totalCogsAmount
        });
      }
    }

    return {
      totalFoodCost: orderTotalFoodCost.round().toFixed(0),
      deductedIngredients
    };
  }
}
