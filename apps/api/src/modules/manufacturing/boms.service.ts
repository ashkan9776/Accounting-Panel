import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { DatabaseService } from '../../database/database.service';
import {
  BomEngine,
  BomDefinition,
  BomItemType,
  RoutingOperation
} from '@accounting/core';
import Decimal from 'decimal.js';

Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

@Injectable()
export class BomsService {
  constructor(private readonly db: DatabaseService) {}

  // ۱. ایجاد یا ثبت فرمول ساخت (BOM) به همراه اقلام و روتینگ
  async createBom(
    tenantId: string,
    companyId: string,
    data: {
      id?: string;
      productId: string;
      bomCode: string;
      bomName: string;
      version?: string;
      baseQuantity?: string | number;
      isDefault?: boolean;
      description?: string;
      items: Array<{
        id?: string;
        componentProductId: string;
        quantity: string | number;
        scrapPercentage?: string | number;
        isSubAssembly?: boolean;
        subBomId?: string;
        substituteProductId?: string;
        lineOrder?: number;
      }>;
      routings?: Array<{
        id?: string;
        workCenterId: string;
        stepNumber: number;
        operationName: string;
        setupTimeHours?: string | number;
        runTimeHoursPerUnit?: string | number;
        laborHoursPerUnit?: string | number;
        machineHoursPerUnit?: string | number;
      }>;
    }
  ) {
    if (!data.productId || !data.bomCode || !data.bomName) {
      throw new BadRequestException('شناسه محصول، کد و نام فرمول ساخت الزامی است.');
    }
    if (!data.items || data.items.length === 0) {
      throw new BadRequestException('فرمول ساخت باید حداقل دارای یک قلم ماده اولیه یا قطعه باشد.');
    }

    const bomId = data.id || randomUUID();
    const now = new Date().toISOString();

    // غیرفعال کردن پیش‌فرض‌های قبلی محصول در صورت تعیین به عنوان پیش‌فرض
    if (data.isDefault) {
      await this.db.run(
        `UPDATE manufacturing_boms SET is_default = false WHERE tenant_id = ? AND company_id = ? AND product_id = ?`,
        [tenantId, companyId, data.productId]
      );
    }

    await this.db.run(
      `INSERT INTO manufacturing_boms (
        id, tenant_id, company_id, product_id, bom_code, bom_name, version,
        base_quantity, is_default, is_active,
        standard_material_cost, standard_labor_cost, standard_overhead_cost, standard_total_cost,
        description, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, true, '0', '0', '0', '0', ?, ?, ?)`,
      [
        bomId,
        tenantId,
        companyId,
        data.productId,
        data.bomCode,
        data.bomName,
        data.version || '1.0',
        data.baseQuantity ? data.baseQuantity.toString() : '1',
        Boolean(data.isDefault),
        data.description || null,
        now,
        now
      ]
    );

    // ثبت اقلام مواد اولیه
    let lineOrder = 1;
    for (const item of data.items) {
      const itemId = item.id || randomUUID();
      await this.db.run(
        `INSERT INTO manufacturing_bom_items (
          id, bom_id, component_product_id, quantity, scrap_percentage,
          is_sub_assembly, sub_bom_id, substitute_product_id, line_order, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          itemId,
          bomId,
          item.componentProductId,
          item.quantity.toString(),
          item.scrapPercentage ? item.scrapPercentage.toString() : '0',
          item.isSubAssembly ? 1 : 0,
          item.subBomId || null,
          item.substituteProductId || null,
          item.lineOrder || lineOrder++,
          now
        ]
      );
    }

    // ثبت روتینگ و مراحل عملیات در صورت وجود
    if (data.routings && data.routings.length > 0) {
      for (const r of data.routings) {
        const routeId = r.id || randomUUID();
        await this.db.run(
          `INSERT INTO manufacturing_routings (
            id, bom_id, work_center_id, step_number, operation_name,
            setup_time_hours, run_time_hours_per_unit, labor_hours_per_unit, machine_hours_per_unit, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            routeId,
            bomId,
            r.workCenterId,
            r.stepNumber,
            r.operationName,
            r.setupTimeHours ? r.setupTimeHours.toString() : '0',
            r.runTimeHoursPerUnit ? r.runTimeHoursPerUnit.toString() : '0',
            r.laborHoursPerUnit ? r.laborHoursPerUnit.toString() : '0',
            r.machineHoursPerUnit ? r.machineHoursPerUnit.toString() : '0',
            now
          ]
        );
      }
    }

    // محاسبه خودکار بهای استاندارد
    await this.calculateStandardCost(tenantId, companyId, bomId);

    return this.getBom(tenantId, companyId, bomId);
  }

  // ۲. استعلام جزئیات کامل فرمول ساخت
  async getBom(tenantId: string, companyId: string, id: string) {
    const bom = await this.db.queryOne(
      `SELECT b.*, p.name as product_name, p.code as product_code, u.title as unit_name
       FROM manufacturing_boms b
       JOIN products p ON b.product_id = p.id
       JOIN product_units u ON p.unit_id = u.id
       WHERE b.tenant_id = ? AND b.company_id = ? AND b.id = ?`,
      [tenantId, companyId, id]
    );
    if (!bom) {
      throw new NotFoundException(`فرمول ساخت (BOM) با شناسه ${id} یافت نشد.`);
    }

    const items = await this.db.query(
      `SELECT bi.*, p.name as component_product_name, p.code as component_product_code,
              p.purchase_price as current_purchase_price, u.title as unit_name
       FROM manufacturing_bom_items bi
       JOIN products p ON bi.component_product_id = p.id
       JOIN product_units u ON p.unit_id = u.id
       WHERE bi.bom_id = ?
       ORDER BY bi.line_order ASC`,
      [id]
    );

    const routings = await this.db.query(
      `SELECT r.*, wc.code as work_center_code, wc.name as work_center_name,
              wc.labor_hourly_rate, wc.overhead_hourly_rate
       FROM manufacturing_routings r
       JOIN manufacturing_work_centers wc ON r.work_center_id = wc.id
       WHERE r.bom_id = ?
       ORDER BY r.step_number ASC`,
      [id]
    );

    return { ...bom, items, routings };
  }

  // ۳. استعلام لیست فرمول‌های ساخت
  async listBoms(tenantId: string, companyId: string, productId?: string) {
    let sql = `
      SELECT b.*, p.name as product_name, p.code as product_code
      FROM manufacturing_boms b
      JOIN products p ON b.product_id = p.id
      WHERE b.tenant_id = ? AND b.company_id = ? AND b.is_active = true
    `;
    const params: any[] = [tenantId, companyId];

    if (productId) {
      sql += ' AND b.product_id = ?';
      params.push(productId);
    }
    sql += ' ORDER BY b.created_at DESC';

    return this.db.query(sql, params);
  }

  // ۴. انفجار فرمول ساخت (BOM Explosion) با اعمال درصد ضایعات مجاز
  async explodeBom(tenantId: string, companyId: string, bomId: string, orderQuantity: string | number) {
    const fullBom = await this.getBom(tenantId, companyId, bomId);

    const priceMap: Record<string, string | number> = {};
    for (const item of fullBom.items) {
      priceMap[item.component_product_id] = item.current_purchase_price || '0';
    }

    const bomDef: BomDefinition = {
      id: fullBom.id,
      productId: fullBom.product_id,
      version: fullBom.version,
      title: fullBom.bom_name,
      yieldQuantity: fullBom.base_quantity || '1',
      items: fullBom.items.map((i: any) => ({
        productId: i.component_product_id,
        itemType: BomItemType.RAW_MATERIAL,
        quantityPerUnit: i.quantity,
        scrapPercentage: i.scrap_percentage,
        substituteProductId: i.substitute_product_id
      }))
    };

    const materials = BomEngine.calculateMaterialRequirements(bomDef, orderQuantity, priceMap);

    const routingOps: RoutingOperation[] = fullBom.routings.map((r: any) => ({
      operationNumber: r.step_number,
      title: r.operation_name,
      workCenterId: r.work_center_id,
      setupTimeHours: r.setup_time_hours,
      runTimeHoursPerUnit: r.run_time_hours_per_unit,
      laborRatePerHour: r.labor_hourly_rate,
      machineRatePerHour: r.overhead_hourly_rate
    }));

    const routingCost = BomEngine.calculateStandardLaborAndOverhead(routingOps, orderQuantity);

    return {
      bomId,
      productId: fullBom.product_id,
      orderQuantity: orderQuantity.toString(),
      materials,
      laborAndOverhead: routingCost
    };
  }

  // ۵. محاسبه و به‌روزرسانی بهای تمام‌شده استاندارد بر مبنای نرخ‌های پایه
  async calculateStandardCost(
    tenantId: string,
    companyId: string,
    bomId: string,
    baseQuantity?: string | number
  ) {
    const fullBom = await this.getBom(tenantId, companyId, bomId);

    const priceMap: Record<string, string | number> = {};
    for (const item of fullBom.items) {
      priceMap[item.component_product_id] = item.current_purchase_price || '0';
    }

    const bomDef: BomDefinition = {
      id: fullBom.id,
      productId: fullBom.product_id,
      version: fullBom.version,
      title: fullBom.bom_name,
      yieldQuantity: baseQuantity ? baseQuantity.toString() : fullBom.base_quantity || '1',
      items: fullBom.items.map((i: any) => ({
        productId: i.component_product_id,
        itemType: BomItemType.RAW_MATERIAL,
        quantityPerUnit: i.quantity,
        scrapPercentage: i.scrap_percentage,
        substituteProductId: i.substitute_product_id
      }))
    };

    const routingOps: RoutingOperation[] = fullBom.routings.map((r: any) => ({
      operationNumber: r.step_number,
      title: r.operation_name,
      workCenterId: r.work_center_id,
      setupTimeHours: r.setup_time_hours,
      runTimeHoursPerUnit: r.run_time_hours_per_unit,
      laborRatePerHour: r.labor_hourly_rate,
      machineRatePerHour: r.overhead_hourly_rate
    }));

    const standardCost = BomEngine.calculateStandardCost(bomDef, routingOps, priceMap);

    const now = new Date().toISOString();
    await this.db.run(
      `UPDATE manufacturing_boms SET
        standard_material_cost = ?,
        standard_labor_cost = ?,
        standard_overhead_cost = ?,
        standard_total_cost = ?,
        updated_at = ?
       WHERE id = ? AND tenant_id = ? AND company_id = ?`,
      [
        standardCost.unitStandardMaterialCost,
        standardCost.unitStandardLaborCost,
        standardCost.unitStandardOverheadCost,
        standardCost.unitTotalStandardCost,
        now,
        bomId,
        tenantId,
        companyId
      ]
    );

    return standardCost;
  }
}
