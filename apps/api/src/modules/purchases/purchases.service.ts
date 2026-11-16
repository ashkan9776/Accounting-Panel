import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { DatabaseService } from '../../database/database.service';
import { JournalEntriesService } from '../accounting/journal-entries.service';
import { InventoryService } from '../inventory/inventory.service';
import { AccountMappingService } from '../accounting/account-mapping.service';
import {
  ValuationEngine,
  InventoryPostingEngine,
  StockDocumentType,
  ValuationMethod,
  JournalEntryType,
  JournalEntryStatus
} from '@accounting/core';
import Decimal from 'decimal.js';

Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

@Injectable()
export class PurchasesService {
  constructor(
    private readonly db: DatabaseService,
    private readonly journalService: JournalEntriesService,
    private readonly inventoryService: InventoryService,
    private readonly accountMapping: AccountMappingService
  ) {}

  async createPurchase(
    tenantId: string,
    companyId: string,
    branchId: string,
    fiscalYearId: string,
    userId: string,
    data: {
      warehouseId: string;
      supplierPartyId: string;
      freightPartyId?: string;
      documentNumber: string;
      dateShamsi: string;
      freightAmount?: string | number;
      discountAmount?: string | number;
      description?: string;
      items: Array<{
        productId: string;
        variantId?: string;
        quantity: string | number;
        unitCost: string | number;
        discountAmount?: string | number;
        vatRate?: string | number;
        taxExempt?: boolean;
      }>;
    }
  ) {
    if (!data.items || data.items.length === 0) {
      throw new BadRequestException('فاکتور خرید باید حداقل شامل یک قلم کالا باشد.');
    }

    // ۱. استعلام تامین‌کننده و طرف حساب باربری جهت استخراج ابعاد تفصیلی شناور
    const supplier = await this.db.queryOne(
      'SELECT id, name, floating_dimension_id FROM parties WHERE tenant_id = ? AND company_id = ? AND id = ?',
      [tenantId, companyId, data.supplierPartyId]
    );
    if (!supplier) {
      throw new NotFoundException(`تامین‌کننده‌ای با شناسه ${data.supplierPartyId} یافت نشد.`);
    }

    let freightPayeeDimId = supplier.floating_dimension_id;
    if (data.freightPartyId && data.freightPartyId !== data.supplierPartyId) {
      const freightParty = await this.db.queryOne(
        'SELECT id, name, floating_dimension_id FROM parties WHERE tenant_id = ? AND company_id = ? AND id = ?',
        [tenantId, companyId, data.freightPartyId]
      );
      if (freightParty) {
        freightPayeeDimId = freightParty.floating_dimension_id;
      }
    }

    // ۲. محاسبه بهای اولیه اقلام و تسهیم کرایه حمل در بهای تمام‌شده (Landed Cost)
    const rawItemsForAllocation = data.items.map((item) => {
      const qty = new Decimal(item.quantity);
      const cost = new Decimal(item.unitCost);
      const disc = new Decimal(item.discountAmount || 0);
      const itemNetPurchase = qty.times(cost).minus(disc);
      return {
        productId: item.productId,
        quantity: qty.toFixed(0),
        purchaseAmount: itemNetPurchase.toFixed(0)
      };
    });

    const allocatedLandedCosts = ValuationEngine.allocateLandedCosts(
      rawItemsForAllocation,
      data.freightAmount || 0
    );

    let totalGoodsAmount = new Decimal(0);
    let totalDiscount = new Decimal(data.discountAmount || 0);
    let totalVat = new Decimal(0);
    const purchaseId = randomUUID();
    const now = new Date().toISOString();

    const processedItems: any[] = [];

    // ۳. پردازش اقلام، ورود به انبار و کاردکس مقداری-ریالی
    for (let i = 0; i < data.items.length; i++) {
      const item = data.items[i];
      const landedRes = allocatedLandedCosts[i];
      const product = await this.inventoryService.getProduct(tenantId, companyId, item.productId);

      const qty = new Decimal(item.quantity);
      const cost = new Decimal(item.unitCost);
      const itemDisc = new Decimal(item.discountAmount || 0);
      const itemTotal = qty.times(cost);
      totalGoodsAmount = totalGoodsAmount.plus(itemTotal);

      // محاسبه مالیات بر ارزش افزوده خرید
      let itemVat = new Decimal(0);
      if (!product.tax_exempt && !item.taxExempt) {
        const rate = new Decimal(item.vatRate || product.vat_rate || '0.10');
        const netAfterDisc = itemTotal.minus(itemDisc);
        itemVat = netAfterDisc.times(rate).round();
        totalVat = totalVat.plus(itemVat);
      }

      // ورود به کاردکس انبار با بهای تمام‌شده نهایی شامل کرایه حمل
      const currentState = await this.inventoryService.getStockState(
        tenantId,
        companyId,
        data.warehouseId,
        item.productId
      );

      const valuationMethod = (product.valuation_method as ValuationMethod) || ValuationMethod.MOVING_AVERAGE;
      const receiptRes = ValuationEngine.processReceipt(
        currentState,
        qty.toFixed(0),
        landedRes.finalLandedUnitCost,
        valuationMethod,
        data.dateShamsi,
        `layer-${purchaseId}-${i + 1}`
      );

      // ثبت در کاردکس انبار
      await this.inventoryService.recordStockEntry(tenantId, companyId, {
        warehouseId: data.warehouseId,
        productId: item.productId,
        variantId: item.variantId,
        documentType: StockDocumentType.RECEIPT,
        documentId: purchaseId,
        documentNumber: data.documentNumber,
        dateShamsi: data.dateShamsi,
        inQuantity: qty.toFixed(0),
        inUnitCost: landedRes.finalLandedUnitCost,
        inTotalCost: landedRes.totalLandedCost,
        balanceQuantity: receiptRes.newQuantity,
        balanceUnitCost: receiptRes.newAverageCost,
        balanceTotalCost: receiptRes.newTotalValue,
        fifoLayers: receiptRes.updatedFifoLayers,
        description: `خرید کالا از ${supplier.name} - فاکتور ${data.documentNumber}`
      });

      processedItems.push({
        id: `pur-item-${purchaseId}-${i + 1}`,
        productId: item.productId,
        productName: product.name,
        variantId: item.variantId,
        quantity: qty.toFixed(0),
        unitCost: cost.toFixed(0),
        totalAmount: itemTotal.toFixed(0),
        discountAmount: itemDisc.toFixed(0),
        vatAmount: itemVat.toFixed(0),
        allocatedFreightCost: landedRes.allocatedFreightPerUnit,
        finalUnitCost: landedRes.finalLandedUnitCost
      });
    }

    const freightAmt = new Decimal(data.freightAmount || 0);
    const grandTotal = totalGoodsAmount.minus(totalDiscount).plus(freightAmt).plus(totalVat);

    // ۴. صدور خودکار سند دوبل حسابداری خرید کالا با کرایه حمل و ارزش افزوده
    const [inventoryAccountId, vatInputAccountId, apAccountId] = await Promise.all([
      this.accountMapping.getAccount(tenantId, companyId, 'INVENTORY'),
      this.accountMapping.getAccount(tenantId, companyId, 'VAT_INPUT'),
      this.accountMapping.getAccount(tenantId, companyId, 'AP'),
    ]);

    const journalLines = InventoryPostingEngine.buildPurchaseInvoiceLines({
      supplierPartyDimensionId: supplier.floating_dimension_id,
      inventoryAmount: totalGoodsAmount.minus(totalDiscount).toFixed(0),
      freightAmount: freightAmt.toFixed(0),
      freightPayeePartyDimensionId: freightPayeeDimId,
      vatAmount: totalVat.toFixed(0),
      invoiceNumber: data.documentNumber,
      descriptionSuffix: `خرید از ${supplier.name}`,
      inventoryAccountId,
      vatInputAccountId,
      apAccountId
    });

    const journalEntry = await this.journalService.createEntry(
      tenantId,
      companyId,
      branchId,
      fiscalYearId,
      userId,
      {
        entryDateShamsi: data.dateShamsi,
        entryType: JournalEntryType.NORMAL,
        description: `فاکتور خرید کالا شماره ${data.documentNumber} - تامین‌کننده: ${supplier.name}`,
        sourceModule: 'PURCHASE',
        sourceDocumentId: purchaseId,
        lines: journalLines
      }
    );

    // ۵. درج سربرگ و اقلام فاکتور خرید در پایگاه‌داده در قالب تراکنش اتمیک
    await this.db.transaction(async (tx) => {
      await tx.run(
        `INSERT INTO purchase_documents (
          id, tenant_id, company_id, branch_id, warehouse_id,
          supplier_party_id, freight_party_id, document_number, date_shamsi,
          total_goods_amount, freight_amount, total_discount, total_vat, grand_total,
          status, journal_entry_id, description, created_by_user_id, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'APPROVED', ?, ?, ?, ?)`,
        [
          purchaseId,
          tenantId,
          companyId,
          branchId,
          data.warehouseId,
          data.supplierPartyId,
          data.freightPartyId || null,
          data.documentNumber,
          data.dateShamsi,
          totalGoodsAmount.toFixed(0),
          freightAmt.toFixed(0),
          totalDiscount.toFixed(0),
          totalVat.toFixed(0),
          grandTotal.toFixed(0),
          journalEntry.id,
          data.description || null,
          userId,
          now
        ]
      );

      for (const item of processedItems) {
        await tx.run(
          `INSERT INTO purchase_document_items (
            id, purchase_document_id, product_id, variant_id, quantity, unit_cost,
            total_amount, discount_amount, vat_amount, allocated_freight_cost, final_unit_cost, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            item.id,
            purchaseId,
            item.productId,
            item.variantId || null,
            item.quantity,
            item.unitCost,
            item.totalAmount,
            item.discountAmount,
            item.vatAmount,
            item.allocatedFreightCost,
            item.finalUnitCost,
            now
          ]
        );
      }
    });

    return {
      id: purchaseId,
      documentNumber: data.documentNumber,
      dateShamsi: data.dateShamsi,
      supplierId: data.supplierPartyId,
      supplierName: supplier.name,
      warehouseId: data.warehouseId,
      totalGoodsAmount: totalGoodsAmount.toFixed(0),
      freightAmount: freightAmt.toFixed(0),
      totalDiscount: totalDiscount.toFixed(0),
      totalVat: totalVat.toFixed(0),
      grandTotal: grandTotal.toFixed(0),
      journalEntryId: journalEntry.id,
      items: processedItems
    };
  }

  async listPurchases(tenantId: string, companyId: string) {
    return this.db.query(
      `SELECT p.*, s.name as supplier_name, w.name as warehouse_name
       FROM purchase_documents p
       LEFT JOIN parties s ON p.supplier_party_id = s.id
       LEFT JOIN warehouses w ON p.warehouse_id = w.id
       WHERE p.tenant_id = ? AND p.company_id = ?
       ORDER BY p.date_shamsi DESC, p.created_at DESC`,
      [tenantId, companyId]
    );
  }

  async getPurchase(tenantId: string, companyId: string, id: string) {
    const doc = await this.db.queryOne(
      `SELECT p.*, s.name as supplier_name, w.name as warehouse_name
       FROM purchase_documents p
       LEFT JOIN parties s ON p.supplier_party_id = s.id
       LEFT JOIN warehouses w ON p.warehouse_id = w.id
       WHERE p.tenant_id = ? AND p.company_id = ? AND p.id = ?`,
      [tenantId, companyId, id]
    );
    if (!doc) {
      throw new NotFoundException(`فاکتور خرید با شناسه ${id} یافت نشد.`);
    }

    const items = await this.db.query(
      `SELECT pi.*, pr.name as product_name, pr.code as product_code
       FROM purchase_document_items pi
       LEFT JOIN products pr ON pi.product_id = pr.id
       WHERE pi.purchase_document_id = ?`,
      [id]
    );

    return { ...doc, items };
  }
}
