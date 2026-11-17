import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { DatabaseService } from '../../database/database.service';
import { JournalEntriesService } from '../accounting/journal-entries.service';
import { InventoryService } from '../inventory/inventory.service';
import { AccountMappingService } from '../accounting/account-mapping.service';
import {
  ProductType,
  ValuationMethod,
  ValuationEngine,
  InventoryPostingEngine,
  StockDocumentType,
  JournalEntryType,
  JournalEntryStatus
} from '@accounting/core';
import Decimal from 'decimal.js';

Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

@Injectable()
export class SalesService {
  constructor(
    private readonly db: DatabaseService,
    private readonly journalService: JournalEntriesService,
    private readonly inventoryService: InventoryService,
    private readonly accountMapping: AccountMappingService
  ) {}

  async createSalesInvoice(
    tenantId: string,
    companyId: string,
    branchId: string,
    fiscalYearId: string,
    userId: string,
    data: {
      warehouseId?: string;
      customerPartyId: string;
      documentNumber: string;
      documentType?: 'INVOICE' | 'PROFORMA';
      dateShamsi: string;
      discountAmount?: string | number;
      costCenterDimensionId?: string;
      paymentMethod?: string;
      description?: string;
      items: Array<{
        productId: string;
        variantId?: string;
        quantity: string | number;
        unitPrice: string | number;
        discountAmount?: string | number;
        taxExempt?: boolean;
      }>;
    }
  ) {
    if (!data.items || data.items.length === 0) {
      throw new BadRequestException('فاکتور فروش باید حداقل دارای یک سطر کالا یا خدمت باشد.');
    }

    return await this.db.transaction(async (tx) => {
      // ۱. استعلام خریدار و حساب تفصیلی شناور
      const customer = await tx.queryOne(
        'SELECT id, name, floating_dimension_id FROM parties WHERE tenant_id = ? AND company_id = ? AND id = ?',
        [tenantId, companyId, data.customerPartyId]
      );
      if (!customer) {
        throw new NotFoundException(`مشتری با شناسه ${data.customerPartyId} یافت نشد.`);
      }

    const salesId = randomUUID();
    const now = new Date().toISOString();
    const docType = data.documentType || 'INVOICE';

    const docLevelDiscount = new Decimal(data.discountAmount || 0);
    const totalRawGross = data.items.reduce(
      (sum, it) => sum.plus(new Decimal(it.quantity).times(new Decimal(it.unitPrice))),
      new Decimal(0)
    );

    let totalGrossAmount = new Decimal(0);
    let totalItemsDiscount = new Decimal(0);
    let totalVat = new Decimal(0);
    let totalCogs = new Decimal(0);

    const processedItems: any[] = [];

    // ۲. پردازش سطور فاکتور، کسر از انبار و محاسبه بهای تمام‌شده کالای فروش‌رفته (COGS)
    for (let i = 0; i < data.items.length; i++) {
      const item = data.items[i];
      const product = await this.inventoryService.getProduct(tenantId, companyId, item.productId);

      const qty = new Decimal(item.quantity);
      const price = new Decimal(item.unitPrice);
      const itemLineDisc = new Decimal(item.discountAmount || 0);
      const itemGross = qty.times(price);

      // تسهیم تخفیف کلی فاکتور به نسبت ارزش ناخالص سطر
      const allocatedDocDisc = totalRawGross.greaterThan(0)
        ? docLevelDiscount.times(itemGross.dividedBy(totalRawGross)).round()
        : new Decimal(0);
      const itemTotalDisc = itemLineDisc.plus(allocatedDocDisc);
      const itemNet = itemGross.minus(itemTotalDisc);

      totalGrossAmount = totalGrossAmount.plus(itemGross);
      totalItemsDiscount = totalItemsDiscount.plus(itemTotalDisc);

      // محاسبه مالیات بر ارزش افزوده فروش (۱۰٪ استاندارد ایران بر مبنای مبلغ خالص پس از تخفیف)
      let itemVat = new Decimal(0);
      if (!product.tax_exempt && !item.taxExempt) {
        const vatRate = new Decimal(product.vat_rate || '0.10');
        itemVat = itemNet.times(vatRate).round();
        totalVat = totalVat.plus(itemVat);
      }

      let unitCogs = new Decimal(0);
      let itemTotalCogs = new Decimal(0);

      // کسر از موجودی انبار فقط برای کالاهای فیزیکی (GOODS) در فاکتور قطعی
      if (product.type === ProductType.GOODS && docType === 'INVOICE') {
        const whId = data.warehouseId;
        if (!whId) {
          throw new BadRequestException(`برای فروش کالای فیزیکی (${product.name}) مشخص کردن انبار مبدا الزامی است.`);
        }

        const currentState = await this.inventoryService.getStockState(tenantId, companyId, whId, item.productId, tx);
        const valuationMethod = (product.valuation_method as ValuationMethod) || ValuationMethod.MOVING_AVERAGE;

        const issueRes = ValuationEngine.processIssue(currentState, qty.toFixed(0), valuationMethod);
        unitCogs = new Decimal(issueRes.cogs.unitCost);
        itemTotalCogs = new Decimal(issueRes.cogs.totalCogsAmount);
        totalCogs = totalCogs.plus(itemTotalCogs);

        // ثبت در کاردکس خروج انبار
        await this.inventoryService.recordStockEntry(tenantId, companyId, {
          warehouseId: whId,
          productId: item.productId,
          variantId: item.variantId,
          documentType: StockDocumentType.ISSUE,
          documentId: salesId,
          documentNumber: data.documentNumber,
          dateShamsi: data.dateShamsi,
          outQuantity: qty.toFixed(0),
          outUnitCost: issueRes.cogs.unitCost,
          outTotalCost: issueRes.cogs.totalCogsAmount,
          balanceQuantity: issueRes.newQuantity,
          balanceUnitCost: issueRes.newAverageCost,
          balanceTotalCost: issueRes.newTotalValue,
          fifoLayers: issueRes.updatedFifoLayers,
          description: `حواله خروج انبار فاکتور فروش ${data.documentNumber} به ${customer.name}`
        }, tx);
      }

      processedItems.push({
        id: `sal-item-${salesId}-${i + 1}`,
        productId: item.productId,
        productName: product.name,
        variantId: item.variantId,
        quantity: qty.toFixed(0),
        unitPrice: price.toFixed(0),
        totalPrice: itemGross.toFixed(0),
        discountAmount: itemTotalDisc.toFixed(0),
        netAmount: itemNet.toFixed(0),
        vatAmount: itemVat.toFixed(0),
        unitCogs: unitCogs.toFixed(0),
        totalCogs: itemTotalCogs.toFixed(0)
      });
    }

    const overallDiscount = totalItemsDiscount;
    const netAmount = totalGrossAmount.minus(overallDiscount);
    const grandTotal = netAmount.plus(totalVat);

    let salesJournalEntryId: string | undefined;
    let cogsJournalEntryId: string | undefined;

    // ۳. صدور سند دوبل فروش و سند بهای تمام‌شده فقط برای فاکتور قطعی (INVOICE)
    if (docType === 'INVOICE') {
      const [arAccountId, salesRevenueAccountId, discountAccountId, vatOutputAccountId] = await Promise.all([
        this.accountMapping.getAccount(tenantId, companyId, 'AR'),
        this.accountMapping.getAccount(tenantId, companyId, 'SALES_REVENUE'),
        this.accountMapping.getAccount(tenantId, companyId, 'SALES_DISCOUNT'),
        this.accountMapping.getAccount(tenantId, companyId, 'VAT_OUTPUT'),
      ]);

      // الف) سند شناسایی درآمد فروش، بدهکاران، تخفیفات و ارزش افزوده
      const salesLines = InventoryPostingEngine.buildSalesInvoiceLines({
        customerPartyDimensionId: customer.floating_dimension_id,
        grossSalesAmount: totalGrossAmount.toFixed(0),
        discountAmount: overallDiscount.toFixed(0),
        vatAmount: totalVat.toFixed(0),
        costCenterDimensionId: data.costCenterDimensionId,
        invoiceNumber: data.documentNumber,
        descriptionSuffix: `فروش به ${customer.name}`,
        arAccountId,
        salesRevenueAccountId,
        discountAccountId,
        vatOutputAccountId
      });

      const salesEntry = await this.journalService.createEntry(
        tenantId,
        companyId,
        branchId,
        fiscalYearId,
        userId,
        {
          entryDateShamsi: data.dateShamsi,
          entryType: JournalEntryType.NORMAL,
          description: `فاکتور فروش شماره ${data.documentNumber} - خریدار: ${customer.name}`,
          sourceModule: 'SALES_INVOICE',
          sourceDocumentId: salesId,
          lines: salesLines
        },
        tx
      );
      salesJournalEntryId = salesEntry.id;
      await this.journalService.approveEntry(tenantId, salesJournalEntryId, userId, tx);

      // ب) سند بهای تمام‌شده کالای فروش‌رفته (COGS: بدهکار ۷۱۰۱ / بستانکار ۱۵۰۱)
      if (totalCogs.greaterThan(0)) {
        const [cogsAccountId, inventoryAccountId] = await Promise.all([
          this.accountMapping.getAccount(tenantId, companyId, 'COGS'),
          this.accountMapping.getAccount(tenantId, companyId, 'INVENTORY'),
        ]);

        const cogsLines = InventoryPostingEngine.buildCogsLines({
          cogsAmount: totalCogs.toFixed(0),
          costCenterDimensionId: data.costCenterDimensionId,
          documentNumber: data.documentNumber,
          descriptionSuffix: `بهای تمام شده فاکتور ${data.documentNumber}`,
          cogsAccountId,
          inventoryAccountId
        });

        const cogsEntry = await this.journalService.createEntry(
          tenantId,
          companyId,
          branchId,
          fiscalYearId,
          userId,
          {
            entryDateShamsi: data.dateShamsi,
            entryType: JournalEntryType.NORMAL,
            description: `سند بهای تمام‌شده کالای فروش‌رفته (COGS) فاکتور ${data.documentNumber}`,
            sourceModule: 'SALES_COGS',
            sourceDocumentId: salesId,
            lines: cogsLines
          },
          tx
        );
        cogsJournalEntryId = cogsEntry.id;
        await this.journalService.approveEntry(tenantId, cogsJournalEntryId, userId, tx);
      }
    }

    // ۴. ثبت سربرگ و اقلام در دیتابیس در قالب تراکنش اتمیک
    await tx.run(
      `INSERT INTO sales_documents (
        id, tenant_id, company_id, branch_id, warehouse_id, customer_party_id,
        document_number, document_type, date_shamsi, gross_amount, discount_amount,
        net_amount, vat_amount, grand_total, cogs_total, status,
        sales_journal_entry_id, cogs_journal_entry_id, payment_method,
        description, created_by_user_id, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'APPROVED', ?, ?, ?, ?, ?, ?)`,
      [
        salesId,
        tenantId,
        companyId,
        branchId,
        data.warehouseId || null,
        data.customerPartyId,
        data.documentNumber,
        docType,
        data.dateShamsi,
        totalGrossAmount.toFixed(0),
        overallDiscount.toFixed(0),
        netAmount.toFixed(0),
        totalVat.toFixed(0),
        grandTotal.toFixed(0),
        totalCogs.toFixed(0),
        salesJournalEntryId || null,
        cogsJournalEntryId || null,
        data.paymentMethod || 'CREDIT',
        data.description || null,
        userId,
        now
      ]
    );

    for (const item of processedItems) {
      await tx.run(
        `INSERT INTO sales_document_items (
          id, sales_document_id, product_id, variant_id, quantity, unit_price,
          total_price, discount_amount, net_amount, vat_amount, unit_cogs, total_cogs, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          item.id,
          salesId,
          item.productId,
          item.variantId || null,
          item.quantity,
          item.unitPrice,
          item.totalPrice,
          item.discountAmount,
          item.netAmount,
          item.vatAmount,
          item.unitCogs,
          item.totalCogs,
          now
        ]
      );
    }

    return {
      id: salesId,
      documentNumber: data.documentNumber,
      documentType: docType,
      dateShamsi: data.dateShamsi,
      customerId: data.customerPartyId,
      customerName: customer.name,
      warehouseId: data.warehouseId,
      grossAmount: totalGrossAmount.toFixed(0),
      discountAmount: overallDiscount.toFixed(0),
      netAmount: netAmount.toFixed(0),
      vatAmount: totalVat.toFixed(0),
      grandTotal: grandTotal.toFixed(0),
      cogsTotal: totalCogs.toFixed(0),
      salesJournalEntryId,
      cogsJournalEntryId,
      items: processedItems
    };
  });
  }

  async createSalesReturn(
    tenantId: string,
    companyId: string,
    branchId: string,
    fiscalYearId: string,
    userId: string,
    salesId: string,
    data: {
      returnDocumentNumber: string;
      dateShamsi: string;
      description?: string;
      returnedItems: Array<{ productId: string; quantity: string | number }>;
    }
  ) {
    return await this.db.transaction(async (tx) => {
      const originalSales = await this.getSalesDocument(tenantId, companyId, salesId);
      if (!originalSales) {
        throw new NotFoundException(`فاکتور فروش مبدا با شناسه ${salesId} یافت نشد.`);
      }

      const customer = await tx.queryOne(
        'SELECT id, name, floating_dimension_id FROM parties WHERE id = ? AND tenant_id = ?',
        [originalSales.customer_party_id, tenantId]
      );

      let totalReturnedGross = new Decimal(0);
      let totalReturnedVat = new Decimal(0);
      let totalReturnedCogs = new Decimal(0);

      for (const retItem of data.returnedItems) {
        const origItem = originalSales.items.find((it: any) => it.product_id === retItem.productId);
        if (!origItem) {
          throw new BadRequestException(`کالای ${retItem.productId} در فاکتور فروش اصلی وجود ندارد.`);
        }

        const retQty = new Decimal(retItem.quantity);
        const unitPrice = new Decimal(origItem.unit_price);
        const unitCogs = new Decimal(origItem.unit_cogs);
        const origQty = new Decimal(origItem.quantity);

        const itemReturnedGross = retQty.times(unitPrice);
        totalReturnedGross = totalReturnedGross.plus(itemReturnedGross);

        // محاسبه نسبت مالیات ارزش افزوده برگشتی
        if (new Decimal(origItem.vat_amount).greaterThan(0)) {
          const itemReturnedVat = new Decimal(origItem.vat_amount).times(retQty.dividedBy(origQty)).round();
          totalReturnedVat = totalReturnedVat.plus(itemReturnedVat);
        }

        const itemReturnedCogs = retQty.times(unitCogs);
        totalReturnedCogs = totalReturnedCogs.plus(itemReturnedCogs);

        // ورود مجدد کالا به کاردکس انبار
        if (originalSales.warehouse_id) {
          const currentState = await this.inventoryService.getStockState(
            tenantId,
            companyId,
            originalSales.warehouse_id,
            retItem.productId,
            tx
          );

          const newQty = new Decimal(currentState.currentQuantity).plus(retQty);
          const newTotalVal = new Decimal(currentState.totalValue).plus(itemReturnedCogs);
          const newAvgCost = newQty.greaterThan(0) ? newTotalVal.dividedBy(newQty).round() : unitCogs;

          await this.inventoryService.recordStockEntry(tenantId, companyId, {
            warehouseId: originalSales.warehouse_id,
            productId: retItem.productId,
            documentType: StockDocumentType.RETURN_SALES,
            documentId: salesId,
            documentNumber: data.returnDocumentNumber,
            dateShamsi: data.dateShamsi,
            inQuantity: retQty.toFixed(0),
            inUnitCost: unitCogs.toFixed(0),
            inTotalCost: itemReturnedCogs.toFixed(0),
            balanceQuantity: newQty.toFixed(0),
            balanceUnitCost: newAvgCost.toFixed(0),
            balanceTotalCost: newTotalVal.toFixed(0),
            description: `برگشت از فروش فاکتور ${originalSales.document_number}`
          }, tx);
        }
      }

      // صدور اسناد حسابداری برگشت از فروش و اصلاح بهای تمام شده
      const postingLines = InventoryPostingEngine.buildSalesReturnLines({
        customerPartyDimensionId: customer.floating_dimension_id,
        returnedSalesAmount: totalReturnedGross.toFixed(0),
        returnedVatAmount: totalReturnedVat.toFixed(0),
        returnedCogsAmount: totalReturnedCogs.toFixed(0),
        documentNumber: data.returnDocumentNumber,
        descriptionSuffix: `برگشت از فاکتور ${originalSales.document_number}`
      });

      const finEntry = await this.journalService.createEntry(
        tenantId,
        companyId,
        branchId,
        fiscalYearId,
        userId,
        {
          entryDateShamsi: data.dateShamsi,
          entryType: JournalEntryType.NORMAL,
          description: `سند مالی برگشت از فروش فاکتور شماره ${originalSales.document_number}`,
          sourceModule: 'SALES_RETURN',
          sourceDocumentId: salesId,
          lines: postingLines.financialLines
        },
        tx
      );
      await this.journalService.approveEntry(tenantId, finEntry.id, userId, tx);

      let invEntryId: string | undefined;
      if (totalReturnedCogs.greaterThan(0)) {
        const invEntry = await this.journalService.createEntry(
          tenantId,
          companyId,
          branchId,
          fiscalYearId,
          userId,
          {
            entryDateShamsi: data.dateShamsi,
            entryType: JournalEntryType.NORMAL,
            description: `سند برگشت بهای تمام‌شده کالای فروش‌رفته عطف به فاکتور ${originalSales.document_number}`,
            sourceModule: 'SALES_RETURN_RESTOCK',
            sourceDocumentId: salesId,
            lines: postingLines.inventoryLines
          },
          tx
        );
        invEntryId = invEntry.id;
        await this.journalService.approveEntry(tenantId, invEntryId, userId, tx);
      }

      return {
        returnDocumentNumber: data.returnDocumentNumber,
        originalSalesNumber: originalSales.document_number,
        totalReturnedGross: totalReturnedGross.toFixed(0),
        totalReturnedVat: totalReturnedVat.toFixed(0),
        totalReturnedCogs: totalReturnedCogs.toFixed(0),
        financialJournalEntryId: finEntry.id,
        inventoryJournalEntryId: invEntryId
      };
    });
  }

  async listSalesDocuments(tenantId: string, companyId: string) {
    return this.db.query(
      `SELECT s.*, c.name as customer_name, w.name as warehouse_name
       FROM sales_documents s
       LEFT JOIN parties c ON s.customer_party_id = c.id
       LEFT JOIN warehouses w ON s.warehouse_id = w.id
       WHERE s.tenant_id = ? AND s.company_id = ?
       ORDER BY s.date_shamsi DESC, s.created_at DESC`,
      [tenantId, companyId]
    );
  }

  async getSalesDocument(tenantId: string, companyId: string, id: string) {
    const doc = await this.db.queryOne(
      `SELECT s.*, c.name as customer_name, w.name as warehouse_name
       FROM sales_documents s
       LEFT JOIN parties c ON s.customer_party_id = c.id
       LEFT JOIN warehouses w ON s.warehouse_id = w.id
       WHERE s.tenant_id = ? AND s.company_id = ? AND s.id = ?`,
      [tenantId, companyId, id]
    );
    if (!doc) {
      throw new NotFoundException(`سند فروش با شناسه ${id} یافت نشد.`);
    }

    const items = await this.db.query(
      `SELECT si.*, pr.name as product_name, pr.code as product_code
       FROM sales_document_items si
       LEFT JOIN products pr ON si.product_id = pr.id
       WHERE si.sales_document_id = ?`,
      [id]
    );

    return { ...doc, items };
  }
}
