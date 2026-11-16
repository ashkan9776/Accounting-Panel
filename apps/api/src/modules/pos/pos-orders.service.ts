import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { DatabaseService } from '../../database/database.service';
import { InventoryService } from '../inventory/inventory.service';
import {
  PosOrderStatus,
  PosPaymentMethod,
  BarcodeScaleParser,
  ValuationEngine,
  ValuationMethod,
  StockDocumentType,
  numberToPersianWords
} from '@accounting/core';
import Decimal from 'decimal.js';

Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

@Injectable()
export class PosOrdersService {
  constructor(
    private readonly db: DatabaseService,
    private readonly inventoryService: InventoryService
  ) {}

  // ۱. ثبت فوری سفارش / فاکتور فروش POS (همراه با پشتیبانی از Hold/Recall و بارکد ترازویی)
  async createOrder(
    tenantId: string,
    companyId: string,
    branchId: string,
    userId: string,
    data: {
      shiftId: string;
      warehouseId: string;
      status?: PosOrderStatus;
      customerPartyId?: string;
      holdReference?: string;
      paymentMethod?: PosPaymentMethod;
      cashAmount?: string | number;
      posCardAmount?: string | number;
      idempotencyKey?: string;
      isOfflineSynced?: boolean;
      offlineCreatedAt?: string;
      items: Array<{
        productId?: string;
        barcode?: string;
        quantity?: string | number;
        unitPrice?: string | number;
        discountAmount?: string | number;
      }>;
    }
  ) {
    // ۱. بررسی Idempotency جهت جلوگیری از ثبت تکراری در زمان قطع و وصل اینترنت
    if (data.idempotencyKey) {
      const existing = await this.db.queryOne(
        'SELECT * FROM pos_orders WHERE tenant_id = ? AND idempotency_key = ?',
        [tenantId, data.idempotencyKey]
      );
      if (existing) {
        return this.getOrder(tenantId, companyId, existing.id);
      }
    }

    const shift = await this.db.queryOne(
      "SELECT * FROM pos_shifts WHERE tenant_id = ? AND company_id = ? AND id = ? AND status = 'OPEN'",
      [tenantId, companyId, data.shiftId]
    );
    if (!shift) {
      throw new BadRequestException('شیفت صندوق انتخاب‌شده فعال یا باز نیست.');
    }

    if (!data.items || data.items.length === 0) {
      throw new BadRequestException('سفارش باید حداقل شامل یک ردیف کالا باشد.');
    }

    const orderId = randomUUID();
    const now = new Date().toISOString();
    const dateShamsi = shift.opened_at.split('T')[0]; // استفاده از تاریخ جاری شیفت
    const orderStatus = data.status || PosOrderStatus.COMPLETED;

    let totalGross = new Decimal(0);
    let totalDiscount = new Decimal(0);
    let totalVat = new Decimal(0);
    let totalCogs = new Decimal(0);

    const processedItems: any[] = [];

    // ۲. پردازش سطور کالا، خواندن بارکد ترازویی و محاسبه مبالغ
    for (let i = 0; i < data.items.length; i++) {
      const it = data.items[i];
      let product: any;
      let finalQty = new Decimal(it.quantity || 1);
      let isWeighted = false;
      let weightGrams: number | undefined;

      // بررسی بارکدخوان و ترازوی دیجیتال
      if (it.barcode) {
        const parsedBarcode = BarcodeScaleParser.parse(it.barcode);
        if (parsedBarcode.isWeightBarcode) {
          product = await this.db.queryOne(
            'SELECT * FROM products WHERE tenant_id = ? AND company_id = ? AND code = ?',
            [tenantId, companyId, parsedBarcode.productCode]
          );
          if (!product) {
            throw new NotFoundException(`کالای ترازویی با کد ${parsedBarcode.productCode} یافت نشد.`);
          }
          isWeighted = true;
          weightGrams = parsedBarcode.weightGrams;
          finalQty = new Decimal(parsedBarcode.weightKg!);
        } else {
          product = await this.db.queryOne(
            'SELECT * FROM products WHERE tenant_id = ? AND company_id = ? AND (barcode = ? OR id = ?)',
            [tenantId, companyId, it.barcode, it.productId]
          );
        }
      } else if (it.productId) {
        product = await this.db.queryOne(
          'SELECT * FROM products WHERE tenant_id = ? AND company_id = ? AND id = ?',
          [tenantId, companyId, it.productId]
        );
      }

      if (!product) {
        throw new NotFoundException(`کالای ردیف ${i + 1} یافت نشد.`);
      }

      const unitPrice = new Decimal(it.unitPrice || product.sell_price);
      const lineDisc = new Decimal(it.discountAmount || 0);
      const lineGross = finalQty.times(unitPrice).round();
      const lineNet = lineGross.minus(lineDisc);

      totalGross = totalGross.plus(lineGross);
      totalDiscount = totalDiscount.plus(lineDisc);

      // محاسبه مالیات بر ارزش افزوده (در صورت عدم معافیت)
      let lineVat = new Decimal(0);
      if (!product.tax_exempt) {
        const rate = new Decimal(product.vat_rate || '0.10');
        lineVat = lineNet.times(rate).round();
        totalVat = totalVat.plus(lineVat);
      }

      let lineUnitCogs = new Decimal(0);
      let lineTotalCogs = new Decimal(0);

      // کسر کاردکس انبار و محاسبه COGS در صورت تکمیل قطعی سفارش
      if (orderStatus === PosOrderStatus.COMPLETED) {
        const currentState = await this.inventoryService.getStockState(
          tenantId,
          companyId,
          data.warehouseId,
          product.id
        );

        const valuationMethod = (product.valuation_method as ValuationMethod) || ValuationMethod.MOVING_AVERAGE;
        const issueRes = ValuationEngine.processIssue(
          currentState,
          finalQty.toString(),
          valuationMethod
        );

        lineUnitCogs = new Decimal(issueRes.cogs.unitCost);
        lineTotalCogs = new Decimal(issueRes.cogs.totalCogsAmount);
        totalCogs = totalCogs.plus(lineTotalCogs);

        // ثبت در کاردکس خروج انبار
        await this.inventoryService.recordStockEntry(tenantId, companyId, {
          warehouseId: data.warehouseId,
          productId: product.id,
          documentType: StockDocumentType.ISSUE,
          documentId: orderId,
          documentNumber: `POS-${orderId}`,
          dateShamsi,
          outQuantity: finalQty.toString(),
          outUnitCost: issueRes.cogs.unitCost,
          outTotalCost: issueRes.cogs.totalCogsAmount,
          balanceQuantity: issueRes.newQuantity,
          balanceUnitCost: issueRes.newAverageCost,
          balanceTotalCost: issueRes.newTotalValue,
          description: `فروش صندوق POS شماره سفارش ${orderId}`
        });
      }

      processedItems.push({
        id: randomUUID(),
        productId: product.id,
        productName: product.name,
        quantity: finalQty.toFixed(3),
        unitPrice: unitPrice.toFixed(0),
        totalPrice: lineGross.toFixed(0),
        discountAmount: lineDisc.toFixed(0),
        netAmount: lineNet.toFixed(0),
        vatAmount: lineVat.toFixed(0),
        unitCogs: lineUnitCogs.toFixed(0),
        totalCogs: lineTotalCogs.toFixed(0),
        isWeighted: isWeighted,
        weightGrams: weightGrams || null,
        barcodeScanned: it.barcode || null
      });
    }

    const netAmount = totalGross.minus(totalDiscount);
    const grandTotal = netAmount.plus(totalVat);

    // تفکیک مبالغ پرداخت نقدی و کارتخوان
    const payMethod = data.paymentMethod || PosPaymentMethod.CASH;
    let cashPaid = new Decimal(0);
    let cardPaid = new Decimal(0);

    if (payMethod === PosPaymentMethod.CASH) {
      cashPaid = grandTotal;
    } else if (payMethod === PosPaymentMethod.POS_CARD) {
      cardPaid = grandTotal;
    } else if (payMethod === PosPaymentMethod.MIXED) {
      cashPaid = new Decimal(data.cashAmount || 0);
      cardPaid = new Decimal(data.posCardAmount || 0);
    }

    // ۳. درج سفارش در جدول pos_orders
    const orderNumber = `POS-${Date.now().toString().substring(5)}`;
    await this.db.run(
      `INSERT INTO pos_orders (
        id, tenant_id, company_id, branch_id, warehouse_id, shift_id, cashier_user_id,
        order_number, date_shamsi, status, customer_party_id, hold_reference,
        gross_amount, discount_amount, net_amount, vat_amount, grand_total, cogs_total,
        payment_method, cash_amount, pos_card_amount, idempotency_key,
        is_offline_synced, offline_created_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        orderId,
        tenantId,
        companyId,
        branchId,
        data.warehouseId,
        data.shiftId,
        userId,
        orderNumber,
        dateShamsi,
        orderStatus,
        data.customerPartyId || null,
        data.holdReference || null,
        totalGross.toFixed(0),
        totalDiscount.toFixed(0),
        netAmount.toFixed(0),
        totalVat.toFixed(0),
        grandTotal.toFixed(0),
        totalCogs.toFixed(0),
        payMethod,
        cashPaid.toFixed(0),
        cardPaid.toFixed(0),
        data.idempotencyKey || null,
        data.isOfflineSynced ? 1 : 0,
        data.offlineCreatedAt || null,
        now
      ]
    );

    for (const pit of processedItems) {
      await this.db.run(
        `INSERT INTO pos_order_items (
          id, pos_order_id, product_id, quantity, unit_price, total_price,
          discount_amount, net_amount, vat_amount, unit_cogs, total_cogs,
          is_weighted, weight_grams, barcode_scanned, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          pit.id,
          orderId,
          pit.productId,
          pit.quantity,
          pit.unitPrice,
          pit.totalPrice,
          pit.discountAmount,
          pit.netAmount,
          pit.vatAmount,
          pit.unitCogs,
          pit.totalCogs,
          pit.isWeighted,
          pit.weightGrams,
          pit.barcodeScanned,
          now
        ]
      );
    }

    // ۴. به‌روزرسانی تجمیعی آمار شیفت در صورت تکمیل سفارش
    if (orderStatus === PosOrderStatus.COMPLETED) {
      await this.db.run(
        `UPDATE pos_shifts
         SET total_sales_count = total_sales_count + 1,
             total_sales_amount = (COALESCE(total_sales_amount::NUMERIC, 0) + ?::NUMERIC)::TEXT,
             total_cash_sales = (COALESCE(total_cash_sales::NUMERIC, 0) + ?::NUMERIC)::TEXT,
             total_pos_card_sales = (COALESCE(total_pos_card_sales::NUMERIC, 0) + ?::NUMERIC)::TEXT,
             total_discount_amount = (COALESCE(total_discount_amount::NUMERIC, 0) + ?::NUMERIC)::TEXT,
             total_vat_amount = (COALESCE(total_vat_amount::NUMERIC, 0) + ?::NUMERIC)::TEXT,
             total_cogs_amount = (COALESCE(total_cogs_amount::NUMERIC, 0) + ?::NUMERIC)::TEXT,
             expected_cash_balance = (COALESCE(expected_cash_balance::NUMERIC, 0) + ?::NUMERIC)::TEXT,
             updated_at = ?
         WHERE id = ?`,
        [
          grandTotal.toFixed(0),
          cashPaid.toFixed(0),
          cardPaid.toFixed(0),
          totalDiscount.toFixed(0),
          totalVat.toFixed(0),
          totalCogs.toFixed(0),
          cashPaid.toFixed(0),
          now,
          data.shiftId
        ]
      );
    }

    return {
      id: orderId,
      orderNumber,
      shiftId: data.shiftId,
      status: orderStatus,
      grossAmount: totalGross.toFixed(0),
      discountAmount: totalDiscount.toFixed(0),
      netAmount: netAmount.toFixed(0),
      vatAmount: totalVat.toFixed(0),
      grandTotal: grandTotal.toFixed(0),
      cogsTotal: totalCogs.toFixed(0),
      cashAmount: cashPaid.toFixed(0),
      posCardAmount: cardPaid.toFixed(0),
      items: processedItems
    };
  }

  // ۲. استعلام سبدهای خرید معلق (Hold / Suspended Orders)
  async getHoldOrders(tenantId: string, companyId: string, branchId: string) {
    return this.db.query(
      `SELECT * FROM pos_orders
       WHERE tenant_id = ? AND company_id = ? AND branch_id = ? AND status = 'HOLD'
       ORDER BY created_at DESC`,
      [tenantId, companyId, branchId]
    );
  }

  // تکمیل و تسویه سبد خرید معلق (Recall & Complete Held Order)
  async recallAndCompleteOrder(
    tenantId: string,
    companyId: string,
    branchId: string,
    userId: string,
    orderId: string,
    payment: {
      paymentMethod?: PosPaymentMethod;
      cashAmount?: string | number;
      posCardAmount?: string | number;
    }
  ) {
    const order = await this.getOrder(tenantId, companyId, orderId);
    if (order.status !== PosOrderStatus.HOLD) {
      throw new BadRequestException('این سفارش در وضعیت معلق (HOLD) قرار ندارد.');
    }

    const payMethod = payment.paymentMethod || PosPaymentMethod.CASH;
    const grandTotal = new Decimal(order.grand_total);
    let cashPaid = new Decimal(0);
    let cardPaid = new Decimal(0);

    if (payMethod === PosPaymentMethod.CASH) {
      cashPaid = grandTotal;
    } else if (payMethod === PosPaymentMethod.POS_CARD) {
      cardPaid = grandTotal;
    } else if (payMethod === PosPaymentMethod.MIXED) {
      cashPaid = new Decimal(payment.cashAmount || 0);
      cardPaid = new Decimal(payment.posCardAmount || 0);
    }

    let totalCogs = new Decimal(0);
    const now = new Date().toISOString();

    // کسر از انبار برای هر سطر
    for (const item of order.items) {
      const product = await this.db.queryOne(
        'SELECT * FROM products WHERE tenant_id = ? AND company_id = ? AND id = ?',
        [tenantId, companyId, item.product_id]
      );
      if (product && product.type === 'GOODS') {
        const itemQty = new Decimal(item.quantity);
        const currentState = await this.inventoryService.getStockState(
          tenantId,
          companyId,
          order.warehouse_id,
          product.id
        );

        const valuationMethod = (product.valuation_method as ValuationMethod) || ValuationMethod.MOVING_AVERAGE;
        const issueRes = ValuationEngine.processIssue(
          currentState,
          itemQty.toString(),
          valuationMethod
        );

        const lineUnitCogs = new Decimal(issueRes.cogs.unitCost);
        const lineTotalCogs = new Decimal(issueRes.cogs.totalCogsAmount);
        totalCogs = totalCogs.plus(lineTotalCogs);

        await this.inventoryService.recordStockEntry(tenantId, companyId, {
          warehouseId: order.warehouse_id,
          productId: product.id,
          documentType: StockDocumentType.ISSUE,
          documentId: orderId,
          documentNumber: `POS-${orderId}`,
          dateShamsi: order.date_shamsi,
          outQuantity: itemQty.toString(),
          outUnitCost: issueRes.cogs.unitCost,
          outTotalCost: issueRes.cogs.totalCogsAmount,
          balanceQuantity: issueRes.newQuantity,
          balanceUnitCost: issueRes.newAverageCost,
          balanceTotalCost: issueRes.newTotalValue
        });

        await this.db.run(
          `UPDATE pos_order_items
           SET unit_cogs = ?, total_cogs = ?
           WHERE id = ?`,
          [lineUnitCogs.toFixed(0), lineTotalCogs.toFixed(0), item.id]
        );
      }
    }

    // به‌روزرسانی سفارش
    await this.db.run(
      `UPDATE pos_orders
       SET status = 'COMPLETED',
           payment_method = ?,
           cash_amount = ?,
           pos_card_amount = ?,
           cogs_total = ?
       WHERE id = ?`,
      [
        payMethod,
        cashPaid.toFixed(0),
        cardPaid.toFixed(0),
        totalCogs.toFixed(0),
        orderId
      ]
    );

    // به‌روزرسانی آمار شیفت
    await this.db.run(
      `UPDATE pos_shifts
       SET total_sales_count = total_sales_count + 1,
           total_sales_amount = (COALESCE(total_sales_amount::NUMERIC, 0) + ?::NUMERIC)::TEXT,
           total_cash_sales = (COALESCE(total_cash_sales::NUMERIC, 0) + ?::NUMERIC)::TEXT,
           total_pos_card_sales = (COALESCE(total_pos_card_sales::NUMERIC, 0) + ?::NUMERIC)::TEXT,
           total_discount_amount = (COALESCE(total_discount_amount::NUMERIC, 0) + ?::NUMERIC)::TEXT,
           total_vat_amount = (COALESCE(total_vat_amount::NUMERIC, 0) + ?::NUMERIC)::TEXT,
           total_cogs_amount = (COALESCE(total_cogs_amount::NUMERIC, 0) + ?::NUMERIC)::TEXT,
           expected_cash_balance = (COALESCE(expected_cash_balance::NUMERIC, 0) + ?::NUMERIC)::TEXT,
           updated_at = ?
       WHERE id = ?`,
      [
        grandTotal.toFixed(0),
        cashPaid.toFixed(0),
        cardPaid.toFixed(0),
        order.discount_amount,
        order.vat_amount,
        totalCogs.toFixed(0),
        cashPaid.toFixed(0),
        now,
        order.shift_id
      ]
    );

    return this.getOrder(tenantId, companyId, orderId);
  }

  // ۳. همگام‌سازی دسته‌ای سفارش‌های ثبت‌شده در زمان قطع اینترنت (Offline Sync)
  async syncOfflineOrders(
    tenantId: string,
    companyId: string,
    branchId: string,
    userId: string,
    orders: any[]
  ) {
    const results: any[] = [];
    for (const orderData of orders) {
      const res = await this.createOrder(tenantId, companyId, branchId, userId, {
        ...orderData,
        isOfflineSynced: true
      });
      results.push(res);
    }
    return {
      syncedCount: results.length,
      orders: results
    };
  }

  // ۴. تولید رسید چاپی حرارتی ۸۰ میلی‌متر استاندارد با حروف فارسی
  async generateReceipt(tenantId: string, companyId: string, orderId: string) {
    const order = await this.getOrder(tenantId, companyId, orderId);
    const company = await this.db.queryOne('SELECT * FROM companies WHERE id = ?', [companyId]);

    const grandWords = numberToPersianWords(order.grand_total);

    return {
      storeName: company.trade_name || company.legal_name,
      phone: company.phone,
      address: company.address,
      orderNumber: order.order_number,
      dateShamsi: order.date_shamsi,
      createdAt: order.created_at,
      paymentMethod: order.payment_method,
      items: order.items.map((it: any) => ({
        name: it.product_name,
        quantity: it.quantity,
        unitPrice: it.unit_price,
        totalPrice: it.total_price
      })),
      grossAmount: order.gross_amount,
      discountAmount: order.discount_amount,
      vatAmount: order.vat_amount,
      grandTotal: order.grand_total,
      grandTotalWords: `${grandWords} ریال`,
      footerMessage: 'از خرید شما سپاسگزاریم - ارائه فاکتور جهت تعویض تا ۴۸ ساعت الزامی است.'
    };
  }

  async getOrder(tenantId: string, companyId: string, id: string) {
    const order = await this.db.queryOne(
      'SELECT * FROM pos_orders WHERE tenant_id = ? AND company_id = ? AND id = ?',
      [tenantId, companyId, id]
    );
    if (!order) {
      throw new NotFoundException(`سفارش صندوق با شناسه ${id} یافت نشد.`);
    }

    const items = await this.db.query(
      `SELECT pi.*, p.name as product_name
       FROM pos_order_items pi
       JOIN products p ON pi.product_id = p.id
       WHERE pi.pos_order_id = ?`,
      [id]
    );

    return { ...order, items };
  }
}
