import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { DatabaseService } from '../../database/database.service';
import { JournalEntriesService } from '../accounting/journal-entries.service';
import {
  ProductType,
  ValuationMethod,
  StockDocumentType,
  StockLedgerState,
  ValuationEngine,
  InventoryPostingEngine,
  JournalEntryType,
  JournalEntryStatus
} from '@accounting/core';
import Decimal from 'decimal.js';

Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

@Injectable()
export class InventoryService {
  constructor(
    private readonly db: DatabaseService,
    private readonly journalService: JournalEntriesService
  ) {}

  // ۱. مدیریت دسته‌بندی کالاها
  async listCategories(tenantId: string, companyId: string) {
    return this.db.query(
      'SELECT * FROM product_categories WHERE tenant_id = ? AND company_id = ? ORDER BY code ASC',
      [tenantId, companyId]
    );
  }

  async createCategory(tenantId: string, companyId: string, data: { code: string; title: string; parentId?: string }) {
    const id = randomUUID();
    const now = new Date().toISOString();
    await this.db.run(
      `INSERT INTO product_categories (id, tenant_id, company_id, code, title, parent_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, tenantId, companyId, data.code, data.title, data.parentId || null, now]
    );
    return { id, ...data };
  }

  // ۲. مدیریت واحدهای سنجش و تبدیل
  async listUnits(tenantId: string, companyId: string) {
    return this.db.query(
      'SELECT * FROM product_units WHERE tenant_id = ? AND company_id = ? ORDER BY code ASC',
      [tenantId, companyId]
    );
  }

  async createUnit(tenantId: string, companyId: string, data: { code: string; title: string; symbol?: string; isReference?: boolean }) {
    const id = randomUUID();
    const now = new Date().toISOString();
    await this.db.run(
      `INSERT INTO product_units (id, tenant_id, company_id, code, title, symbol, is_reference, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, tenantId, companyId, data.code, data.title, data.symbol || null, data.isReference ? 1 : 0, now]
    );
    return { id, ...data };
  }

  async createConversion(tenantId: string, data: { fromUnitId: string; toUnitId: string; conversionRate: string | number }) {
    const id = randomUUID();
    const now = new Date().toISOString();
    await this.db.run(
      `INSERT INTO unit_conversions (id, tenant_id, from_unit_id, to_unit_id, conversion_rate, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, tenantId, data.fromUnitId, data.toUnitId, data.conversionRate.toString(), now]
    );
    return { id, ...data };
  }

  // ۳. مدیریت انبارها
  async listWarehouses(tenantId: string, companyId: string) {
    return this.db.query(
      'SELECT * FROM warehouses WHERE tenant_id = ? AND company_id = ? ORDER BY code ASC',
      [tenantId, companyId]
    );
  }

  async createWarehouse(
    tenantId: string,
    companyId: string,
    branchId: string,
    data: { code: string; name: string; address?: string; phone?: string; keeperName?: string }
  ) {
    const id = randomUUID();
    const now = new Date().toISOString();
    await this.db.run(
      `INSERT INTO warehouses (id, tenant_id, company_id, branch_id, code, name, address, phone, keeper_name, is_active, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, true, ?)`,
      [id, tenantId, companyId, branchId, data.code, data.name, data.address || null, data.phone || null, data.keeperName || null, now]
    );
    return { id, ...data };
  }

  // ۴. مدیریت کالاها و خدمات
  async listProducts(tenantId: string, companyId: string) {
    return this.db.query(
      `SELECT p.*, c.title as category_title, u.title as unit_title, u.symbol as unit_symbol
       FROM products p
       LEFT JOIN product_categories c ON p.category_id = c.id
       LEFT JOIN product_units u ON p.unit_id = u.id
       WHERE p.tenant_id = ? AND p.company_id = ?
       ORDER BY p.code ASC`,
      [tenantId, companyId]
    );
  }

  async getProduct(tenantId: string, companyId: string, id: string) {
    const prod = await this.db.queryOne(
      `SELECT p.*, c.title as category_title, u.title as unit_title
       FROM products p
       LEFT JOIN product_categories c ON p.category_id = c.id
       LEFT JOIN product_units u ON p.unit_id = u.id
       WHERE p.tenant_id = ? AND p.company_id = ? AND p.id = ?`,
      [tenantId, companyId, id]
    );
    if (!prod) {
      throw new NotFoundException(`کالایی با شناسه ${id} یافت نشد.`);
    }
    return prod;
  }

  async createProduct(
    tenantId: string,
    companyId: string,
    data: {
      categoryId?: string;
      unitId: string;
      code: string;
      name: string;
      type: ProductType;
      barcode?: string;
      taxExempt?: boolean;
      vatRate?: string | number;
      valuationMethod?: ValuationMethod;
      minStockAlert?: string | number;
      maxStockAlert?: string | number;
      sellPrice?: string | number;
      purchasePrice?: string | number;
    }
  ) {
    const id = randomUUID();
    const now = new Date().toISOString();

    if (!data.name || !data.name.trim()) {
      throw new BadRequestException('نام کالا الزامی است.');
    }
    if (!data.code || !data.code.trim()) {
      throw new BadRequestException('کد کالا الزامی است.');
    }

    // بررسی یکتایی کد کالا در سطح سازمان
    const existingProd = await this.db.queryOne(
      'SELECT id FROM products WHERE tenant_id = ? AND company_id = ? AND code = ?',
      [tenantId, companyId, data.code.trim()]
    );
    if (existingProd) {
      throw new BadRequestException(`کد کالای «${data.code}» قبلاً در این سازمان ثبت شده است.`);
    }

    // اعتبارسنجی و تطبیق خودکار واحد سنجش کالا جهت جلوگیری از نقض کلید خارجی
    let resolvedUnitId = data.unitId;
    let existingUnit: any = null;
    if (resolvedUnitId) {
      existingUnit = await this.db.queryOne('SELECT id FROM product_units WHERE id = ?', [resolvedUnitId]);
    }
    if (!existingUnit) {
      existingUnit = await this.db.queryOne(
        'SELECT id FROM product_units WHERE tenant_id = ? AND company_id = ? LIMIT 1',
        [tenantId, companyId]
      );
    }
    if (!existingUnit) {
      existingUnit = await this.db.queryOne('SELECT id FROM product_units LIMIT 1');
    }
    if (!existingUnit) {
      resolvedUnitId = `unit-piece-${tenantId}`;
      await this.db.run(
        `INSERT INTO product_units (id, tenant_id, company_id, code, title, symbol, is_reference, created_at)
         VALUES (?, ?, ?, 'PCS', 'دستگاه / عدد', 'عدد', true, ?) ON CONFLICT DO NOTHING`,
        [resolvedUnitId, tenantId, companyId, now]
      );
    } else {
      resolvedUnitId = existingUnit.id;
    }

    await this.db.run(
      `INSERT INTO products (
        id, tenant_id, company_id, category_id, unit_id, code, name, type,
        barcode, tax_exempt, vat_rate, valuation_method, min_stock_alert, max_stock_alert,
        sell_price, purchase_price, is_active, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, true, ?)`,
      [
        id,
        tenantId,
        companyId,
        data.categoryId || null,
        resolvedUnitId,
        data.code,
        data.name,
        data.type || ProductType.GOODS,
        data.barcode || null,
        Boolean(data.taxExempt),
        data.vatRate ? data.vatRate.toString() : '0.10',
        data.valuationMethod || ValuationMethod.MOVING_AVERAGE,
        data.minStockAlert ? data.minStockAlert.toString() : '0',
        data.maxStockAlert ? data.maxStockAlert.toString() : '0',
        data.sellPrice ? data.sellPrice.toString() : '0',
        data.purchasePrice ? data.purchasePrice.toString() : '0',
        now
      ]
    );
    return { id, ...data, unitId: resolvedUnitId };
  }

  // ۵. کاردکس مقداری - ریالی و موجودی انبار
  async getStockState(
    tenantId: string,
    companyId: string,
    warehouseId: string,
    productId: string
  ): Promise<StockLedgerState> {
    const latest = await this.db.queryOne(
      `SELECT * FROM stock_ledger_entries
       WHERE tenant_id = ? AND company_id = ? AND warehouse_id = ? AND product_id = ?
       ORDER BY seq_no DESC LIMIT 1`,
      [tenantId, companyId, warehouseId, productId]
    );

    if (!latest) {
      return {
        productId,
        warehouseId,
        currentQuantity: '0',
        averageCost: '0',
        totalValue: '0',
        fifoLayers: []
      };
    }

    return {
      productId,
      warehouseId,
      currentQuantity: latest.balance_quantity,
      averageCost: latest.balance_unit_cost,
      totalValue: latest.balance_total_cost,
      fifoLayers: latest.fifo_layers_json ? JSON.parse(latest.fifo_layers_json) : []
    };
  }

  async recordStockEntry(
    tenantId: string,
    companyId: string,
    data: {
      warehouseId: string;
      productId: string;
      variantId?: string;
      documentType: StockDocumentType;
      documentId: string;
      documentNumber: string;
      dateShamsi: string;
      inQuantity?: string | number;
      inUnitCost?: string | number;
      inTotalCost?: string | number;
      outQuantity?: string | number;
      outUnitCost?: string | number;
      outTotalCost?: string | number;
      balanceQuantity: string | number;
      balanceUnitCost: string | number;
      balanceTotalCost: string | number;
      fifoLayers?: any[];
      journalEntryId?: string;
      description?: string;
    }
  ) {
    const id = randomUUID();
    const now = new Date().toISOString();
    return await this.db.transaction(async (tx) => {
      await tx.run('SELECT pg_advisory_xact_lock(hashtext($1))', [
        `stock:${tenantId}:${data.warehouseId}:${data.productId}`
      ]);
      await tx.run(
        `INSERT INTO stock_ledger_entries (
          id, tenant_id, company_id, warehouse_id, product_id, variant_id,
          document_type, document_id, document_number, date_shamsi,
          in_quantity, in_unit_cost, in_total_cost,
          out_quantity, out_unit_cost, out_total_cost,
          balance_quantity, balance_unit_cost, balance_total_cost,
          fifo_layers_json, journal_entry_id, description, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          tenantId,
          companyId,
          data.warehouseId,
          data.productId,
          data.variantId || null,
          data.documentType,
          data.documentId,
          data.documentNumber,
          data.dateShamsi,
          data.inQuantity ? data.inQuantity.toString() : '0',
          data.inUnitCost ? data.inUnitCost.toString() : '0',
          data.inTotalCost ? data.inTotalCost.toString() : '0',
          data.outQuantity ? data.outQuantity.toString() : '0',
          data.outUnitCost ? data.outUnitCost.toString() : '0',
          data.outTotalCost ? data.outTotalCost.toString() : '0',
          data.balanceQuantity.toString(),
          data.balanceUnitCost.toString(),
          data.balanceTotalCost.toString(),
          data.fifoLayers ? JSON.stringify(data.fifoLayers) : null,
          data.journalEntryId || null,
          data.description || null,
          now
        ]
      );
      return { id };
    });
    return id;
  }

  async getKardex(tenantId: string, companyId: string, warehouseId: string, productId: string) {
    return this.db.query(
      `SELECT * FROM stock_ledger_entries
       WHERE tenant_id = ? AND company_id = ? AND warehouse_id = ? AND product_id = ?
       ORDER BY date_shamsi ASC, seq_no ASC`,
      [tenantId, companyId, warehouseId, productId]
    );
  }

  async getStockSummary(tenantId: string, companyId: string, warehouseId?: string) {
    let sql = `
      SELECT p.id as product_id, p.code, p.name, p.unit_id, u.title as unit_title,
             w.id as warehouse_id, w.name as warehouse_name,
             sle.balance_quantity, sle.balance_unit_cost, sle.balance_total_cost
      FROM products p
      CROSS JOIN warehouses w
      LEFT JOIN (
        SELECT s1.* FROM stock_ledger_entries s1
        JOIN (
          SELECT warehouse_id, product_id, MAX(seq_no) as max_seq_no
          FROM stock_ledger_entries
          WHERE tenant_id = ? AND company_id = ?
          GROUP BY warehouse_id, product_id
        ) s2 ON s1.seq_no = s2.max_seq_no
      ) sle ON sle.product_id = p.id AND sle.warehouse_id = w.id
      LEFT JOIN product_units u ON p.unit_id = u.id
      WHERE p.tenant_id = ? AND p.company_id = ? AND p.type = 'GOODS'
    `;
    const params: any[] = [tenantId, companyId, tenantId, companyId];
    if (warehouseId) {
      sql += ' AND w.id = ?';
      params.push(warehouseId);
    }
    sql += ' ORDER BY p.code ASC, w.code ASC';
    return this.db.query(sql, params);
  }

  // ۶. انبارگردانی و مغایرت‌ها (Counting & Adjustments)
  async createInventoryCount(
    tenantId: string,
    companyId: string,
    warehouseId: string,
    userId: string,
    data: {
      countNumber: string;
      countDateShamsi: string;
      description?: string;
      items: Array<{ productId: string; physicalQuantity: string | number }>;
    }
  ) {
    const countId = randomUUID();
    const now = new Date().toISOString();

    await this.db.run(
      `INSERT INTO inventory_counts (
        id, tenant_id, company_id, warehouse_id, count_number, count_date_shamsi,
        status, description, created_by_user_id, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'IN_PROGRESS', ?, ?, ?)`,
      [countId, tenantId, companyId, warehouseId, data.countNumber, data.countDateShamsi, data.description || null, userId, now]
    );

    const processedItems: any[] = [];
    for (const item of data.items) {
      const state = await this.getStockState(tenantId, companyId, warehouseId, item.productId);
      const disc = ValuationEngine.calculateInventoryDiscrepancy(
        state.currentQuantity,
        item.physicalQuantity,
        state.averageCost
      );

      const itemId = randomUUID();
      const discType = disc.isDeficit ? 'DEFICIT' : disc.isSurplus ? 'SURPLUS' : 'NONE';

      await this.db.run(
        `INSERT INTO inventory_count_items (
          id, inventory_count_id, product_id, system_quantity, physical_quantity,
          discrepancy_quantity, unit_cost, total_discrepancy_value, discrepancy_type, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          itemId,
          countId,
          item.productId,
          state.currentQuantity,
          item.physicalQuantity.toString(),
          disc.discrepancyQuantity,
          state.averageCost,
          disc.totalDiscrepancyValue,
          discType,
          now
        ]
      );

      processedItems.push({
        id: itemId,
        productId: item.productId,
        systemQuantity: state.currentQuantity,
        physicalQuantity: item.physicalQuantity.toString(),
        discrepancyQuantity: disc.discrepancyQuantity,
        unitCost: state.averageCost,
        totalDiscrepancyValue: disc.totalDiscrepancyValue,
        discrepancyType: discType
      });
    }

    return {
      id: countId,
      warehouseId,
      countNumber: data.countNumber,
      countDateShamsi: data.countDateShamsi,
      status: 'IN_PROGRESS',
      items: processedItems
    };
  }

  async adjustInventoryCount(
    tenantId: string,
    companyId: string,
    branchId: string,
    fiscalYearId: string,
    userId: string,
    countId: string
  ) {
    const count = await this.db.queryOne(
      'SELECT * FROM inventory_counts WHERE tenant_id = ? AND company_id = ? AND id = ?',
      [tenantId, companyId, countId]
    );
    if (!count) {
      throw new NotFoundException(`شمارش انبارگردانی با شناسه ${countId} یافت نشد.`);
    }
    if (count.status === 'ADJUSTED') {
      throw new BadRequestException('این شمارش انبارگردانی پیش از این تعدیل و اعمال شده است.');
    }

    const items = await this.db.query(
      'SELECT * FROM inventory_count_items WHERE inventory_count_id = ?',
      [countId]
    );

    let totalDeficitValue = new Decimal(0);
    let totalSurplusValue = new Decimal(0);

    for (const item of items) {
      const discQty = new Decimal(item.discrepancy_quantity);
      if (discQty.isZero()) continue;

      const state = await this.getStockState(tenantId, companyId, count.warehouse_id, item.product_id);
      const newQty = new Decimal(item.physical_quantity);
      const avgCost = new Decimal(state.averageCost);
      const newTotalValue = newQty.times(avgCost).round();

      if (discQty.isNegative()) {
        totalDeficitValue = totalDeficitValue.plus(new Decimal(item.total_discrepancy_value));
        await this.recordStockEntry(tenantId, companyId, {
          warehouseId: count.warehouse_id,
          productId: item.product_id,
          documentType: StockDocumentType.COUNT_DISCREPANCY,
          documentId: count.id,
          documentNumber: count.count_number,
          dateShamsi: count.count_date_shamsi,
          outQuantity: discQty.abs().toFixed(0),
          outUnitCost: state.averageCost,
          outTotalCost: item.total_discrepancy_value,
          balanceQuantity: newQty.toFixed(0),
          balanceUnitCost: state.averageCost,
          balanceTotalCost: newTotalValue.toFixed(0),
          description: `کسری انبارگردانی شمارش ${count.count_number}`
        });
      } else {
        totalSurplusValue = totalSurplusValue.plus(new Decimal(item.total_discrepancy_value));
        await this.recordStockEntry(tenantId, companyId, {
          warehouseId: count.warehouse_id,
          productId: item.product_id,
          documentType: StockDocumentType.COUNT_DISCREPANCY,
          documentId: count.id,
          documentNumber: count.count_number,
          dateShamsi: count.count_date_shamsi,
          inQuantity: discQty.toFixed(0),
          inUnitCost: state.averageCost,
          inTotalCost: item.total_discrepancy_value,
          balanceQuantity: newQty.toFixed(0),
          balanceUnitCost: state.averageCost,
          balanceTotalCost: newTotalValue.toFixed(0),
          description: `فزونی انبارگردانی شمارش ${count.count_number}`
        });
      }
    }

    // صدور سند دوبل تعدیل انبارگردانی
    let journalEntryId: string | undefined;
    const lines: any[] = [];

    if (totalDeficitValue.greaterThan(0)) {
      const defLines = InventoryPostingEngine.buildInventoryCountAdjustmentLines({
        isDeficit: true,
        discrepancyValue: totalDeficitValue.toFixed(0),
        countNumber: count.count_number
      });
      lines.push(...defLines);
    }

    if (totalSurplusValue.greaterThan(0)) {
      const surLines = InventoryPostingEngine.buildInventoryCountAdjustmentLines({
        isDeficit: false,
        discrepancyValue: totalSurplusValue.toFixed(0),
        countNumber: count.count_number
      });
      lines.push(...surLines);
    }

    if (lines.length > 0) {
      const entry = await this.journalService.createEntry(
        tenantId,
        companyId,
        branchId,
        fiscalYearId,
        userId,
        {
          entryDateShamsi: count.count_date_shamsi,
          entryType: JournalEntryType.NORMAL,
          description: `سند تعدیل مغایرت‌های انبارگردانی شماره ${count.count_number}`,
          sourceModule: 'INVENTORY_COUNT',
          sourceDocumentId: count.id,
          lines
        }
      );
      journalEntryId = entry.id;
    }

    await this.db.run(
      'UPDATE inventory_counts SET status = ?, journal_entry_id = ? WHERE id = ?',
      ['ADJUSTED', journalEntryId || null, countId]
    );

    return {
      countId,
      status: 'ADJUSTED',
      totalDeficitValue: totalDeficitValue.toFixed(0),
      totalSurplusValue: totalSurplusValue.toFixed(0),
      journalEntryId
    };
  }
}
