import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { JournalEntriesService } from '../accounting/journal-entries.service';
import { InventoryService } from '../inventory/inventory.service';
import { BomsService } from './boms.service';
import { WorkCentersService } from './work-centers.service';
import {
  ManufacturingPostingEngine,
  CostingEngine,
  ValuationEngine,
  ProductionOrderStatus,
  StockDocumentType,
  ValuationMethod,
  JournalEntryType
} from '@accounting/core';
import Decimal from 'decimal.js';

Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

@Injectable()
export class ProductionOrdersService {
  constructor(
    private readonly db: DatabaseService,
    private readonly journalService: JournalEntriesService,
    private readonly inventoryService: InventoryService,
    private readonly bomsService: BomsService,
    private readonly workCentersService: WorkCentersService
  ) {}

  // ۱. ایجاد و صدور سفارش تولید (Production Order / Work Order)
  async createOrder(
    tenantId: string,
    companyId: string,
    branchId: string,
    userId: string,
    data: {
      productId: string;
      bomId?: string;
      rawMaterialWarehouseId: string;
      finishedGoodsWarehouseId: string;
      plannedQuantity: string | number;
      dateShamsi: string;
      costingMethod?: 'JOB_ORDER' | 'PROCESS_COSTING';
      notes?: string;
      customMaterials?: Array<{
        productId: string;
        plannedQuantity: string | number;
      }>;
    }
  ) {
    if (!data.productId || !data.plannedQuantity || !data.dateShamsi) {
      throw new BadRequestException('شناسه محصول، مقدار برنامه‌ریزی‌شده و تاریخ شمسی الزامی است.');
    }

    const plannedQty = new Decimal(data.plannedQuantity);
    if (plannedQty.lessThanOrEqualTo(0)) {
      throw new BadRequestException('مقدار برنامه‌ریزی‌شده تولید باید بزرگتر از صفر باشد.');
    }

    // تعیین BOM پیش‌فرض در صورت عدم ارسال
    let targetBomId = data.bomId;
    if (!targetBomId) {
      const defaultBom = await this.db.queryOne(
        `SELECT id FROM manufacturing_boms
         WHERE tenant_id = ? AND company_id = ? AND product_id = ? AND is_default = 1 AND is_active = 1`,
        [tenantId, companyId, data.productId]
      );
      if (!defaultBom) {
        throw new BadRequestException('هیچ فرمول ساخت فعالی برای این محصول یافت نشد.');
      }
      targetBomId = defaultBom.id;
    }

    if (!targetBomId) {
      throw new BadRequestException('شناسه فرمول ساخت (BOM) مشخص نیست.');
    }

    const bom = await this.bomsService.getBom(tenantId, companyId, targetBomId);

    // شماره‌گذاری سریال سفارش تولید
    const countRow = await this.db.queryOne(
      `SELECT COUNT(*) as cnt FROM manufacturing_production_orders WHERE tenant_id = ? AND company_id = ?`,
      [tenantId, companyId]
    );
    const orderIndex = ((countRow?.cnt || 0) + 1).toString().padStart(4, '0');
    const orderNumber = `MO-${data.dateShamsi.substring(0, 4)}-${orderIndex}`;

    const orderId = `mfo-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    await this.db.run(
      `INSERT INTO manufacturing_production_orders (
        id, tenant_id, company_id, branch_id, order_number, date_shamsi,
        product_id, bom_id, raw_material_warehouse_id, finished_goods_warehouse_id,
        planned_quantity, produced_quantity, rejected_quantity, normal_scrap_quantity, abnormal_scrap_quantity,
        status, costing_method, actual_material_cost, actual_labor_cost, actual_overhead_cost, actual_total_cost,
        unit_cost, notes, start_date_shamsi, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '0', '0', '0', '0', 'RELEASED', ?, '0', '0', '0', '0', '0', ?, ?, ?, ?)`,
      [
        orderId,
        tenantId,
        companyId,
        branchId,
        orderNumber,
        data.dateShamsi,
        data.productId,
        targetBomId,
        data.rawMaterialWarehouseId,
        data.finishedGoodsWarehouseId,
        plannedQty.toString(),
        data.costingMethod || 'JOB_ORDER',
        data.notes || null,
        data.dateShamsi,
        now,
        now
      ]
    );

    // محاسبه اقلام مورد نیاز مواد اولیه (از انفجار BOM یا اقلام دستی)
    if (data.customMaterials && data.customMaterials.length > 0) {
      for (const mat of data.customMaterials) {
        const matId = `mom-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        await this.db.run(
          `INSERT INTO manufacturing_order_materials (
            id, production_order_id, product_id, planned_quantity, actual_issued_quantity,
            unit_cost, total_cost, created_at
          ) VALUES (?, ?, ?, ?, '0', '0', '0', ?)`,
          [matId, orderId, mat.productId, mat.plannedQuantity.toString(), now]
        );
      }
    } else {
      const explosion = await this.bomsService.explodeBom(tenantId, companyId, targetBomId, plannedQty.toString());
      for (const item of explosion.materials) {
        const matId = `mom-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        await this.db.run(
          `INSERT INTO manufacturing_order_materials (
            id, production_order_id, product_id, planned_quantity, actual_issued_quantity,
            unit_cost, total_cost, created_at
          ) VALUES (?, ?, ?, ?, '0', '0', '0', ?)`,
          [matId, orderId, item.productId, item.requiredQuantity, now]
        );
      }
    }

    return this.getOrder(tenantId, companyId, orderId);
  }

  // ۲. استعلام جزئیات کامل سفارش تولید
  async getOrder(tenantId: string, companyId: string, id: string) {
    const order = await this.db.queryOne(
      `SELECT o.*,
              p.name as product_name, p.code as product_code, u.title as unit_name,
              b.bom_code, b.bom_name,
              rw.name as raw_material_warehouse_name,
              fw.name as finished_goods_warehouse_name
       FROM manufacturing_production_orders o
       JOIN products p ON o.product_id = p.id
       JOIN product_units u ON p.unit_id = u.id
       JOIN manufacturing_boms b ON o.bom_id = b.id
       JOIN warehouses rw ON o.raw_material_warehouse_id = rw.id
       JOIN warehouses fw ON o.finished_goods_warehouse_id = fw.id
       WHERE o.tenant_id = ? AND o.company_id = ? AND o.id = ?`,
      [tenantId, companyId, id]
    );
    if (!order) {
      throw new NotFoundException(`سفارش تولید با شناسه ${id} یافت نشد.`);
    }

    const materials = await this.db.query(
      `SELECT om.*, p.name as product_name, p.code as product_code, u.title as unit_name
       FROM manufacturing_order_materials om
       JOIN products p ON om.product_id = p.id
       JOIN product_units u ON p.unit_id = u.id
       WHERE om.production_order_id = ?`,
      [id]
    );

    const operations = await this.db.query(
      `SELECT oo.*, wc.code as work_center_code, wc.name as work_center_name
       FROM manufacturing_order_operations oo
       JOIN manufacturing_work_centers wc ON oo.work_center_id = wc.id
       WHERE oo.production_order_id = ?
       ORDER BY oo.recorded_date_shamsi ASC, oo.rowid ASC`,
      [id]
    );

    const scraps = await this.db.query(
      `SELECT s.*, p.name as product_name, p.code as product_code
       FROM manufacturing_scraps s
       JOIN products p ON s.product_id = p.id
       WHERE s.production_order_id = ?`,
      [id]
    );

    return { ...order, materials, operations, scraps };
  }

  // ۳. استعلام لیست سفارشات تولید
  async listOrders(tenantId: string, companyId: string, filters?: { status?: string; productId?: string }) {
    let sql = `
      SELECT o.*, p.name as product_name, p.code as product_code, b.bom_code
      FROM manufacturing_production_orders o
      JOIN products p ON o.product_id = p.id
      JOIN manufacturing_boms b ON o.bom_id = b.id
      WHERE o.tenant_id = ? AND o.company_id = ?
    `;
    const params: any[] = [tenantId, companyId];

    if (filters?.status) {
      sql += ' AND o.status = ?';
      params.push(filters.status);
    }
    if (filters?.productId) {
      sql += ' AND o.product_id = ?';
      params.push(filters.productId);
    }
    sql += ' ORDER BY o.created_at DESC';

    return this.db.query(sql, params);
  }

  // ۴. صدور حواله خروج مواد اولیه به خط تولید (حساب در جریان ساخت WIP - ۱۵۰۳)
  async issueMaterialsToWip(
    tenantId: string,
    companyId: string,
    branchId: string,
    fiscalYearId: string,
    userId: string,
    orderId: string,
    data: {
      dateShamsi: string;
      costCenterDimensionId?: string;
      items?: Array<{
        productId: string;
        quantity: string | number;
      }>;
    }
  ) {
    const order = await this.getOrder(tenantId, companyId, orderId);
    if (order.status === ProductionOrderStatus.CLOSED || order.status === ProductionOrderStatus.CANCELLED) {
      throw new BadRequestException('امکان خروج مواد برای سفارش بسته شده یا لغو شده وجود ندارد.');
    }

    const itemsToIssue = data.items && data.items.length > 0
      ? data.items
      : order.materials.map((m: any) => ({
          productId: m.product_id,
          quantity: m.planned_quantity
        }));

    let totalMaterialCost = new Decimal(0);
    const now = new Date().toISOString();

    for (const item of itemsToIssue) {
      const issueQty = new Decimal(item.quantity);
      if (issueQty.lessThanOrEqualTo(0)) continue;

      const state = await this.inventoryService.getStockState(
        tenantId,
        companyId,
        order.raw_material_warehouse_id,
        item.productId
      );

      if (new Decimal(state.currentQuantity).lessThan(issueQty)) {
        throw new BadRequestException(
          `موجودی انبار مواد برای کالای ${item.productId} ناکافی است (موجودی: ${state.currentQuantity}، درخواست: ${issueQty.toString()}).`
        );
      }

      // محاسبه بهای خروج بر مبنای میانگین موزون متحرک (Moving Average)
      const issueResult = ValuationEngine.processIssue(state, issueQty.toString(), ValuationMethod.MOVING_AVERAGE);

      // ثبت در کاردکس انبار
      const stockEntryId = await this.inventoryService.recordStockEntry(tenantId, companyId, {
        warehouseId: order.raw_material_warehouse_id,
        productId: item.productId,
        documentType: StockDocumentType.ISSUE,
        documentId: orderId,
        documentNumber: order.order_number,
        dateShamsi: data.dateShamsi,
        outQuantity: issueQty.toString(),
        outUnitCost: issueResult.cogs.unitCost,
        outTotalCost: issueResult.cogs.totalCogsAmount,
        balanceQuantity: issueResult.newQuantity,
        balanceUnitCost: issueResult.newAverageCost,
        balanceTotalCost: issueResult.newTotalValue,
        description: `حواله خروج به خط تولید - سفارش شماره ${order.order_number}`
      });

      // به‌روزرسانی یا درج در مواد مصرفی سفارش
      await this.db.run(
        `UPDATE manufacturing_order_materials SET
          actual_issued_quantity = actual_issued_quantity + ?,
          unit_cost = ?,
          total_cost = total_cost + ?,
          stock_issue_id = ?
         WHERE production_order_id = ? AND product_id = ?`,
        [issueQty.toString(), issueResult.cogs.unitCost, issueResult.cogs.totalCogsAmount, stockEntryId, orderId, item.productId]
      );

      totalMaterialCost = totalMaterialCost.plus(issueResult.cogs.totalCogsAmount);
    }

    // صدور سند دوبل خروج مواد: بدهکار ۱۵۰۳ (در جریان ساخت) / بستانکار ۱۵۰۲ (مواد اولیه)
    const journalLines = ManufacturingPostingEngine.buildMaterialIssueLines({
      productionOrderNumber: order.order_number,
      dateShamsi: data.dateShamsi,
      totalMaterialCost: totalMaterialCost.toString(),
      costCenterDimensionId: data.costCenterDimensionId
    });

    let journalEntry: any = null;
    if (journalLines.length > 0) {
      journalEntry = await this.journalService.createEntry(tenantId, companyId, branchId, fiscalYearId, userId, {
        entryDateShamsi: data.dateShamsi,
        entryType: JournalEntryType.NORMAL,
        description: `سند خروج مواد اولیه به خط تولید - سفارش شماره ${order.order_number}`,
        sourceModule: 'MANUFACTURING',
        sourceDocumentId: orderId,
        lines: journalLines
      });
    }

    const newActualMaterialCost = new Decimal(order.actual_material_cost).plus(totalMaterialCost).toFixed(0);

    await this.db.run(
      `UPDATE manufacturing_production_orders SET
        actual_material_cost = ?,
        material_issue_journal_entry_id = COALESCE(material_issue_journal_entry_id, ?),
        status = 'IN_PROGRESS',
        updated_at = ?
       WHERE id = ?`,
      [newActualMaterialCost, journalEntry?.id || null, now, orderId]
    );

    return {
      orderId,
      orderNumber: order.order_number,
      totalMaterialCost: totalMaterialCost.toFixed(0),
      journalEntry
    };
  }

  // ۵. ثبت کارکرد، دستمزد مستقیم و سربار جذب‌شده ساخت
  async recordOperationWork(
    tenantId: string,
    companyId: string,
    branchId: string,
    fiscalYearId: string,
    userId: string,
    orderId: string,
    data: {
      operations: Array<{
        workCenterId: string;
        operationName: string;
        actualLaborHours: string | number;
        actualMachineHours: string | number;
        laborHourlyRate?: string | number;
        overheadHourlyRate?: string | number;
        recordedDateShamsi: string;
      }>;
      costCenterDimensionId?: string;
    }
  ) {
    const order = await this.getOrder(tenantId, companyId, orderId);
    if (!data.operations || data.operations.length === 0) {
      throw new BadRequestException('حداقل یک عملیات برای ثبت کارکرد الزامی است.');
    }

    let batchLaborCost = new Decimal(0);
    let batchOverheadCost = new Decimal(0);
    const now = new Date().toISOString();
    let opDateShamsi = order.date_shamsi;

    for (const op of data.operations) {
      const wc = await this.workCentersService.getWorkCenter(tenantId, companyId, op.workCenterId);
      const laborRate = new Decimal(op.laborHourlyRate !== undefined ? op.laborHourlyRate : wc.labor_hourly_rate);
      const overheadRate = new Decimal(op.overheadHourlyRate !== undefined ? op.overheadHourlyRate : wc.overhead_hourly_rate);

      const laborHours = new Decimal(op.actualLaborHours || 0);
      const machineHours = new Decimal(op.actualMachineHours || 0);

      const laborCost = laborHours.times(laborRate);
      const overheadCost = machineHours.times(overheadRate);

      batchLaborCost = batchLaborCost.plus(laborCost);
      batchOverheadCost = batchOverheadCost.plus(overheadCost);
      opDateShamsi = op.recordedDateShamsi;

      const opId = `mfo-op-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      await this.db.run(
        `INSERT INTO manufacturing_order_operations (
          id, production_order_id, work_center_id, operation_name,
          actual_labor_hours, labor_hourly_rate, actual_labor_cost,
          actual_machine_hours, overhead_hourly_rate, actual_overhead_cost,
          recorded_date_shamsi, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          opId,
          orderId,
          op.workCenterId,
          op.operationName,
          laborHours.toString(),
          laborRate.toString(),
          laborCost.toFixed(0),
          machineHours.toString(),
          overheadRate.toString(),
          overheadCost.toFixed(0),
          op.recordedDateShamsi,
          now
        ]
      );
    }

    // صدور سند دوبل جذب دستمزد و سربار: بدهکار ۱۵۰۳ (در جریان ساخت) / بستانکار ۷۱۰۲ (دستمزد جذب‌شده) و ۷۱۰۳ (سربار جذب‌شده)
    const journalLines = ManufacturingPostingEngine.buildLaborAndOverheadAbsorptionLines({
      productionOrderNumber: order.order_number,
      dateShamsi: opDateShamsi,
      directLaborCost: batchLaborCost.toFixed(0),
      appliedOverheadCost: batchOverheadCost.toFixed(0),
      costCenterDimensionId: data.costCenterDimensionId
    });

    let journalEntry: any = null;
    if (journalLines.length > 0) {
      journalEntry = await this.journalService.createEntry(tenantId, companyId, branchId, fiscalYearId, userId, {
        entryDateShamsi: opDateShamsi,
        entryType: JournalEntryType.NORMAL,
        description: `سند جذب دستمزد و سربار ساخت - سفارش شماره ${order.order_number}`,
        sourceModule: 'MANUFACTURING',
        sourceDocumentId: orderId,
        lines: journalLines
      });
    }

    const newActualLaborCost = new Decimal(order.actual_labor_cost).plus(batchLaborCost).toFixed(0);
    const newActualOverheadCost = new Decimal(order.actual_overhead_cost).plus(batchOverheadCost).toFixed(0);

    await this.db.run(
      `UPDATE manufacturing_production_orders SET
        actual_labor_cost = ?,
        actual_overhead_cost = ?,
        labor_overhead_journal_entry_id = COALESCE(labor_overhead_journal_entry_id, ?),
        status = 'IN_PROGRESS',
        updated_at = ?
       WHERE id = ?`,
      [newActualLaborCost, newActualOverheadCost, journalEntry?.id || null, now, orderId]
    );

    return {
      orderId,
      orderNumber: order.order_number,
      laborCost: batchLaborCost.toFixed(0),
      overheadCost: batchOverheadCost.toFixed(0),
      journalEntry
    };
  }

  // ۶. ثبت ضایعات عادی و غیرعادی تولید
  async recordScrap(
    tenantId: string,
    companyId: string,
    branchId: string,
    fiscalYearId: string,
    userId: string,
    orderId: string,
    data: {
      productId: string;
      scrapType: 'NORMAL' | 'ABNORMAL';
      quantity: string | number;
      estimatedCost?: string | number;
      reason?: string;
      dateShamsi: string;
      costCenterDimensionId?: string;
    }
  ) {
    const order = await this.getOrder(tenantId, companyId, orderId);
    const scrapQty = new Decimal(data.quantity);
    if (scrapQty.lessThanOrEqualTo(0)) {
      throw new BadRequestException('مقدار ضایعات باید بزرگتر از صفر باشد.');
    }

    let scrapCost = new Decimal(data.estimatedCost || 0);
    if (scrapCost.isZero()) {
      const comp = await this.db.queryOne('SELECT purchase_price FROM products WHERE id = ?', [data.productId]);
      if (comp && comp.purchase_price) {
        scrapCost = scrapQty.times(comp.purchase_price);
      }
    }

    const scrapId = `scrap-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    await this.db.run(
      `INSERT INTO manufacturing_scraps (
        id, production_order_id, product_id, scrap_type, quantity, estimated_cost, reason, date_shamsi, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        scrapId,
        orderId,
        data.productId,
        data.scrapType,
        scrapQty.toString(),
        scrapCost.toFixed(0),
        data.reason || null,
        data.dateShamsi,
        now
      ]
    );

    let journalEntry: any = null;

    if (data.scrapType === 'ABNORMAL') {
      // ضایعات غیرعادی هزینه دوره شناسایی شده و از حساب در جریان ساخت (WIP) کسر می‌شود:
      // بدهکار: ۸۱۰۸ (هزینه کسری و ضایعات غیرعادی) / بستانکار: ۱۵۰۳ (در جریان ساخت)
      const journalLines = ManufacturingPostingEngine.buildAbnormalScrapLines({
        productionOrderNumber: order.order_number,
        dateShamsi: data.dateShamsi,
        scrapAmount: scrapCost.toFixed(0),
        reason: data.reason || 'ضایعات غیرعادی ناشی از نقص خط تولید',
        costCenterDimensionId: data.costCenterDimensionId
      });

      if (journalLines.length > 0) {
        journalEntry = await this.journalService.createEntry(tenantId, companyId, branchId, fiscalYearId, userId, {
          entryDateShamsi: data.dateShamsi,
          entryType: JournalEntryType.NORMAL,
          description: `سند ضایعات غیرعادی سفارش شماره ${order.order_number}`,
          sourceModule: 'MANUFACTURING',
          sourceDocumentId: orderId,
          lines: journalLines
        });
      }

      await this.db.run(
        `UPDATE manufacturing_production_orders SET
          abnormal_scrap_quantity = abnormal_scrap_quantity + ?,
          abnormal_scrap_journal_entry_id = COALESCE(abnormal_scrap_journal_entry_id, ?),
          updated_at = ?
         WHERE id = ?`,
        [scrapQty.toString(), journalEntry?.id || null, now, orderId]
      );
    } else {
      // ضایعات عادی در بهای محصولات جذب می‌شود
      await this.db.run(
        `UPDATE manufacturing_production_orders SET
          normal_scrap_quantity = normal_scrap_quantity + ?,
          updated_at = ?
         WHERE id = ?`,
        [scrapQty.toString(), now, orderId]
      );
    }

    return {
      scrapId,
      orderNumber: order.order_number,
      scrapType: data.scrapType,
      quantity: scrapQty.toString(),
      cost: scrapCost.toFixed(0),
      journalEntry
    };
  }

  // ۷. تکمیل سفارش و رسید محصول نهایی به انبار محصولات (تسویه حساب در جریان ساخت WIP)
  async completeOrderAndReceipt(
    tenantId: string,
    companyId: string,
    branchId: string,
    fiscalYearId: string,
    userId: string,
    orderId: string,
    data: {
      producedQuantity: string | number;
      rejectedQuantity?: string | number;
      dateShamsi: string;
      costCenterDimensionId?: string;
    }
  ) {
    const order = await this.getOrder(tenantId, companyId, orderId);
    const producedQty = new Decimal(data.producedQuantity);
    if (producedQty.lessThanOrEqualTo(0)) {
      throw new BadRequestException('مقدار محصول تولیدشده باید بزرگتر از صفر باشد.');
    }

    // مجموع هزینه‌های انباشته در حساب در جریان ساخت (WIP)
    const matCost = new Decimal(order.actual_material_cost);
    const laborCost = new Decimal(order.actual_labor_cost);
    const overheadCost = new Decimal(order.actual_overhead_cost);

    // کسر ضایعات غیرعادی که قبلاً با سند ۸۱۰۸ از WIP خارج شده‌اند
    const abnormalScrapRows = await this.db.query(
      `SELECT estimated_cost FROM manufacturing_scraps WHERE production_order_id = ? AND scrap_type = 'ABNORMAL'`,
      [orderId]
    );
    let abnormalScrapTotal = new Decimal(0);
    for (const r of abnormalScrapRows) {
      abnormalScrapTotal = abnormalScrapTotal.plus(r.estimated_cost || 0);
    }

    const netWipCost = matCost.plus(laborCost).plus(overheadCost).minus(abnormalScrapTotal);
    if (netWipCost.lessThanOrEqualTo(0)) {
      throw new BadRequestException('بهای تمام‌شده کالای در جریان ساخت باید بزرگتر از صفر باشد. ابتدا خروج مواد و کارکرد را ثبت کنید.');
    }

    // محاسبه بهای تمام‌شده هر واحد محصول نهایی
    const unitCost = netWipCost.dividedBy(producedQty).floor();

    // ثبت رسید انبار کالای ساخته‌شده در کاردکس انبار محصولات
    const currentState = await this.inventoryService.getStockState(
      tenantId,
      companyId,
      order.finished_goods_warehouse_id,
      order.product_id
    );

    const layerId = `layer-mfg-${orderId}`;
    const receiptResult = ValuationEngine.processReceipt(
      currentState,
      producedQty.toString(),
      unitCost.toString(),
      ValuationMethod.MOVING_AVERAGE,
      data.dateShamsi,
      layerId
    );

    const stockReceiptId = await this.inventoryService.recordStockEntry(tenantId, companyId, {
      warehouseId: order.finished_goods_warehouse_id,
      productId: order.product_id,
      documentType: StockDocumentType.RECEIPT,
      documentId: orderId,
      documentNumber: order.order_number,
      dateShamsi: data.dateShamsi,
      inQuantity: producedQty.toString(),
      inUnitCost: unitCost.toString(),
      inTotalCost: netWipCost.toFixed(0),
      balanceQuantity: receiptResult.newQuantity,
      balanceUnitCost: receiptResult.newAverageCost,
      balanceTotalCost: receiptResult.newTotalValue,
      description: `رسید انبار تولید محصول نهایی - سفارش شماره ${order.order_number}`
    });

    // صدور سند دوبل رسید انبار محصول: بدهکار ۱۵۰۴ (موجودی محصولات) / بستانکار ۱۵۰۳ (در جریان ساخت)
    const journalLines = ManufacturingPostingEngine.buildFinishedGoodsReceiptLines({
      productionOrderNumber: order.order_number,
      dateShamsi: data.dateShamsi,
      productTitle: order.product_name,
      completedQuantity: producedQty.toString(),
      totalFinishedGoodCost: netWipCost.toFixed(0),
      costCenterDimensionId: data.costCenterDimensionId
    });

    const journalEntry = await this.journalService.createEntry(tenantId, companyId, branchId, fiscalYearId, userId, {
      entryDateShamsi: data.dateShamsi,
      entryType: JournalEntryType.NORMAL,
      description: `سند رسید محصول ساخته‌شده به انبار - سفارش شماره ${order.order_number}`,
      sourceModule: 'MANUFACTURING',
      sourceDocumentId: orderId,
      lines: journalLines
    });

    const now = new Date().toISOString();
    await this.db.run(
      `UPDATE manufacturing_production_orders SET
        produced_quantity = ?,
        rejected_quantity = ?,
        actual_total_cost = ?,
        unit_cost = ?,
        stock_receipt_document_id = ?,
        completion_journal_entry_id = ?,
        completion_date_shamsi = ?,
        status = 'COMPLETED',
        updated_at = ?
       WHERE id = ?`,
      [
        producedQty.toString(),
        data.rejectedQuantity ? data.rejectedQuantity.toString() : '0',
        netWipCost.toFixed(0),
        unitCost.toFixed(0),
        stockReceiptId,
        journalEntry.id,
        data.dateShamsi,
        now,
        orderId
      ]
    );

    return {
      orderId,
      orderNumber: order.order_number,
      producedQuantity: producedQty.toString(),
      unitCost: unitCost.toFixed(0),
      totalCost: netWipCost.toFixed(0),
      stockReceiptId,
      journalEntry
    };
  }

  // ۸. بستن سفارش و ثبت انحرافات بهای تمام‌شده (Cost Variance Recognition & Closing)
  async closeOrderAndPostVariances(
    tenantId: string,
    companyId: string,
    branchId: string,
    fiscalYearId: string,
    userId: string,
    orderId: string,
    data: {
      dateShamsi: string;
      costCenterDimensionId?: string;
    }
  ) {
    const order = await this.getOrder(tenantId, companyId, orderId);
    if (order.status !== 'COMPLETED') {
      throw new BadRequestException('فقط سفارش‌های تکمیل‌شده قابل بستن و محاسبه انحرافات هستند.');
    }

    const bom = await this.bomsService.getBom(tenantId, companyId, order.bom_id);
    const producedQty = new Decimal(order.produced_quantity || 1);

    const standardMatCost = new Decimal(bom.standard_material_cost || 0).times(producedQty).toFixed(0);
    const standardLabCost = new Decimal(bom.standard_labor_cost || 0).times(producedQty).toFixed(0);
    const standardOvhCost = new Decimal(bom.standard_overhead_cost || 0).times(producedQty).toFixed(0);

    const standardTotalCost = new Decimal(bom.standard_total_cost || 0).times(producedQty);
    const actualTotalCost = new Decimal(order.actual_total_cost);

    // محاسبه تفکیکی انحرافات (مواد، دستمزد، سربار و کل)
    const varianceResult = CostingEngine.analyzeCostVariances({
      materialStandardCost: standardMatCost,
      materialActualCost: order.actual_material_cost,
      laborStandardCost: standardLabCost,
      laborActualCost: order.actual_labor_cost,
      overheadStandardCost: standardOvhCost,
      overheadActualCost: order.actual_overhead_cost
    });

    let journalEntry: any = null;
    const netVariance = new Decimal(varianceResult.totalNetVariance);

    if (!netVariance.isZero()) {
      // صدور سند حسابداری انحرافات بهای تمام‌شده به حساب ۷۱۰۴
      const journalLines = ManufacturingPostingEngine.buildCostVarianceLines({
        productionOrderNumber: order.order_number,
        dateShamsi: data.dateShamsi,
        varianceAmount: netVariance.toString(),
        costCenterDimensionId: data.costCenterDimensionId
      });

      if (journalLines.length > 0) {
        journalEntry = await this.journalService.createEntry(tenantId, companyId, branchId, fiscalYearId, userId, {
          entryDateShamsi: data.dateShamsi,
          entryType: JournalEntryType.NORMAL,
          description: `سند شناسایی انحرافات بهای تمام‌شده ساخت - سفارش شماره ${order.order_number}`,
          sourceModule: 'MANUFACTURING',
          sourceDocumentId: orderId,
          lines: journalLines
        });
      }
    }

    const now = new Date().toISOString();
    await this.db.run(
      `UPDATE manufacturing_production_orders SET
        status = 'CLOSED',
        variance_journal_entry_id = ?,
        updated_at = ?
       WHERE id = ?`,
      [journalEntry?.id || null, now, orderId]
    );

    return {
      orderId,
      orderNumber: order.order_number,
      status: 'CLOSED',
      standardTotalCost: standardTotalCost.toFixed(0),
      actualTotalCost: actualTotalCost.toFixed(0),
      varianceAnalysis: varianceResult,
      journalEntry
    };
  }
}
