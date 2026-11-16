import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { DatabaseService } from '../../database/database.service';
import { JournalEntriesService } from '../accounting/journal-entries.service';
import { RecipesService } from './recipes.service';
import { KdsService } from './kds.service';
import { TablesService } from './tables.service';
import {
  OrderChannel,
  RestaurantOrderStatus,
  TableStatus,
  KitchenStation,
  SplitBillMethod,
  RestaurantPostingEngine,
  JournalEntryType
} from '@accounting/core';
import Decimal from 'decimal.js';

Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

@Injectable()
export class RestaurantOrdersService {
  constructor(
    private readonly db: DatabaseService,
    private readonly journalService: JournalEntriesService,
    private readonly recipesService: RecipesService,
    private readonly kdsService: KdsService,
    private readonly tablesService: TablesService
  ) {}

  // ۱. ثبت سفارش رستوران (سالن، بیرون‌بر، پیک یا اسنپ‌فود)
  async createOrder(
    tenantId: string,
    companyId: string,
    branchId: string,
    userId: string,
    data: {
      channel?: OrderChannel;
      tableId?: string;
      guestCount?: number;
      customerPartyId?: string;
      notes?: string;
      shiftId?: string;
      warehouseId?: string;
      items: Array<{
        productId: string;
        quantity: string | number;
        unitPrice?: string | number;
        discountAmount?: string | number;
        modifiersJson?: any;
        kitchenStation?: KitchenStation;
      }>;
    }
  ) {
    if (!data.items || data.items.length === 0) {
      throw new BadRequestException('سفارش باید حداقل شامل یک قلم غذا یا نوشیدنی باشد.');
    }

    const channel = data.channel || OrderChannel.DINE_IN;
    let table: any = null;

    if (channel === OrderChannel.DINE_IN) {
      if (!data.tableId) {
        throw new BadRequestException('در سفارش‌های سالن، انتخاب شماره میز الزامی است.');
      }
      table = await this.tablesService.getTable(tenantId, companyId, data.tableId);
    }

    const orderId = randomUUID();
    const now = new Date().toISOString();
    const countRow = await this.db.queryOne(
      'SELECT COUNT(*) as count FROM restaurant_orders WHERE tenant_id = ? AND company_id = ?',
      [tenantId, companyId]
    );
    const orderNumber = `REST-${(countRow?.count || 0) + 1}`;
    const dateShamsi = '1403/11/15'; // پیش‌فرض سال جاری مالی

    let totalGross = new Decimal(0);
    let totalDiscount = new Decimal(0);
    let totalVat = new Decimal(0);

    const processedItems: any[] = [];

    for (const it of data.items) {
      const product = await this.db.queryOne(
        'SELECT * FROM products WHERE tenant_id = ? AND company_id = ? AND id = ?',
        [tenantId, companyId, it.productId]
      );
      if (!product) {
        throw new NotFoundException(`کالای منو با شناسه ${it.productId} یافت نشد.`);
      }

      const qty = new Decimal(it.quantity);
      const unitPrice = new Decimal(it.unitPrice || product.sell_price);
      const lineTotal = qty.times(unitPrice);
      const lineDisc = new Decimal(it.discountAmount || 0);
      const netLine = lineTotal.minus(lineDisc);

      // ارزش افزوده ۱۰٪ در صورت غیرمعاف بودن
      let lineVat = new Decimal(0);
      if (!product.tax_exempt) {
        const vatRate = new Decimal(product.vat_rate || '0.10');
        lineVat = netLine.times(vatRate).round();
      }

      totalGross = totalGross.plus(lineTotal);
      totalDiscount = totalDiscount.plus(lineDisc);
      totalVat = totalVat.plus(lineVat);

      // تشخیص ایستگاه آشپزخانه بر اساس دسته‌بندی منو
      let station = it.kitchenStation || KitchenStation.HOT_KITCHEN;
      if (product.code && product.code.includes('102')) {
        station = KitchenStation.BAR_CAFE;
      }

      processedItems.push({
        id: randomUUID(),
        productId: product.id,
        quantity: qty.toFixed(0),
        unitPrice: unitPrice.toFixed(0),
        totalPrice: lineTotal.toFixed(0),
        discountAmount: lineDisc.toFixed(0),
        netAmount: netLine.toFixed(0),
        vatAmount: lineVat.toFixed(0),
        modifiersJson: it.modifiersJson ? JSON.stringify(it.modifiersJson) : null,
        kitchenStation: station
      });
    }

    // حق سرویس سالن (در صورتی که سفارش سالن باشد - مثلاً ۵٪)
    let serviceCharge = new Decimal(0);
    if (channel === OrderChannel.DINE_IN) {
      serviceCharge = totalGross.minus(totalDiscount).times('0.05').round();
    }

    const grandTotal = totalGross.minus(totalDiscount).plus(serviceCharge).plus(totalVat);

    // ثبت سفارش در جدول restaurant_orders
    await this.db.run(
      `INSERT INTO restaurant_orders (
        id, tenant_id, company_id, branch_id, shift_id, order_number,
        date_shamsi, channel, status, table_id, guest_count, waiter_user_id,
        customer_party_id, notes, gross_amount, discount_amount,
        service_charge_amount, vat_amount, grand_total, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'OPEN', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        orderId,
        tenantId,
        companyId,
        branchId,
        data.shiftId || null,
        orderNumber,
        dateShamsi,
        channel,
        data.tableId || null,
        data.guestCount || 1,
        userId,
        data.customerPartyId || null,
        data.notes || null,
        totalGross.toFixed(0),
        totalDiscount.toFixed(0),
        serviceCharge.toFixed(0),
        totalVat.toFixed(0),
        grandTotal.toFixed(0),
        now,
        now
      ]
    );

    // درج اقلام سفارش
    for (const pit of processedItems) {
      await this.db.run(
        `INSERT INTO restaurant_order_items (
          id, restaurant_order_id, product_id, quantity, unit_price,
          total_price, discount_amount, net_amount, vat_amount,
          modifiers_json, kitchen_station, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
          pit.modifiersJson,
          pit.kitchenStation,
          now
        ]
      );
    }

    // تولید خودکار تیکت‌های آشپزخانه KDS
    const tickets = await this.kdsService.createTicketsForOrder(
      tenantId,
      companyId,
      branchId,
      orderId,
      table?.table_number,
      processedItems
    );

    // به‌روزرسانی میز به وضعیت اشغال (OCCUPIED)
    if (data.tableId) {
      await this.db.run(
        `UPDATE restaurant_tables
         SET status = 'OCCUPIED', current_order_id = ?, updated_at = ?
         WHERE id = ?`,
        [orderId, now, data.tableId]
      );
    }

    return {
      id: orderId,
      orderNumber,
      channel,
      status: RestaurantOrderStatus.OPEN,
      tableNumber: table?.table_number,
      grossAmount: totalGross.toFixed(0),
      discountAmount: totalDiscount.toFixed(0),
      serviceChargeAmount: serviceCharge.toFixed(0),
      vatAmount: totalVat.toFixed(0),
      grandTotal: grandTotal.toFixed(0),
      items: processedItems,
      kdsTickets: tickets
    };
  }

  // ۲. استعلام جزئیات کامل سفارش
  async getOrder(tenantId: string, companyId: string, id: string) {
    const order = await this.db.queryOne(
      `SELECT ro.*, t.table_number, t.title as table_title, p.name as customer_name
       FROM restaurant_orders ro
       LEFT JOIN restaurant_tables t ON ro.table_id = t.id
       LEFT JOIN parties p ON ro.customer_party_id = p.id
       WHERE ro.tenant_id = ? AND ro.company_id = ? AND ro.id = ?`,
      [tenantId, companyId, id]
    );
    if (!order) {
      throw new NotFoundException(`سفارش رستوران با شناسه ${id} یافت نشد.`);
    }

    const items = await this.db.query(
      `SELECT oi.*, p.name as product_name
       FROM restaurant_order_items oi
       JOIN products p ON oi.product_id = p.id
       WHERE oi.restaurant_order_id = ?`,
      [id]
    );

    return { ...order, items };
  }

  // ۳. تسهیم و تقسیم صورتحساب (Split Bill)
  async splitBill(
    tenantId: string,
    companyId: string,
    orderId: string,
    method: SplitBillMethod,
    parts: number = 2
  ) {
    const order = await this.getOrder(tenantId, companyId, orderId);
    const grandTotal = new Decimal(order.grand_total);

    if (method === SplitBillMethod.EQUAL_PARTS) {
      if (parts <= 1) {
        throw new BadRequestException('تعداد سهم‌های تقسیم باید حداقل ۲ باشد.');
      }

      const baseShare = grandTotal.dividedBy(parts).floor();
      let remainder = grandTotal.minus(baseShare.times(parts));
      const shares: any[] = [];

      for (let i = 1; i <= parts; i++) {
        let amount = baseShare;
        if (remainder.greaterThan(0)) {
          amount = amount.plus(1);
          remainder = remainder.minus(1);
        }
        shares.push({
          shareNumber: i,
          amount: amount.toFixed(0)
        });
      }

      return {
        orderId,
        orderNumber: order.order_number,
        grandTotal: order.grand_total,
        splitMethod: SplitBillMethod.EQUAL_PARTS,
        partsCount: parts,
        shares
      };
    }

    return {
      orderId,
      orderNumber: order.order_number,
      grandTotal: order.grand_total,
      splitMethod: method,
      message: 'تقسیم صورتحساب بر مبنای اقلام سفارشی'
    };
  }

  // ۴. تسویه حساب نهایی سفارش، کسر انبار مواد اولیه و صدور اسناد دوبل حسابداری
  async settleOrder(
    tenantId: string,
    companyId: string,
    branchId: string,
    fiscalYearId: string,
    userId: string,
    orderId: string,
    payment: {
      settlementMethod: 'CASH' | 'POS_CARD' | 'MIXED' | 'ONLINE_AGGREGATOR';
      cashAmount?: string | number;
      posCardAmount?: string | number;
      aggregatorReceivableAmount?: string | number;
      warehouseId?: string;
      costCenterDimensionId?: string;
    }
  ) {
    const order = await this.getOrder(tenantId, companyId, orderId);
    if (order.status === RestaurantOrderStatus.PAID) {
      throw new BadRequestException('این سفارش پیش از این تسویه شده است.');
    }

    const warehouseId = payment.warehouseId || 'wh-main';
    const now = new Date().toISOString();

    // الف) کسر مواد اولیه دستور پخت از کاردکس انبار و محاسبه بهای تمام شده
    const deductionResult = await this.recipesService.deductRecipeInventory(
      tenantId,
      companyId,
      warehouseId,
      orderId,
      order.date_shamsi,
      order.items.map((it: any) => ({
        productId: it.product_id,
        quantity: it.quantity
      }))
    );

    const totalFoodCost = deductionResult.totalFoodCost;

    // تفکیک دریافت‌ها
    const grandTotal = new Decimal(order.grand_total);
    let cashPaid = new Decimal(0);
    let cardPaid = new Decimal(0);
    let aggReceivable = new Decimal(0);

    if (payment.settlementMethod === 'CASH') {
      cashPaid = grandTotal;
    } else if (payment.settlementMethod === 'POS_CARD') {
      cardPaid = grandTotal;
    } else if (payment.settlementMethod === 'ONLINE_AGGREGATOR') {
      aggReceivable = grandTotal;
    } else if (payment.settlementMethod === 'MIXED') {
      cashPaid = new Decimal(payment.cashAmount || 0);
      cardPaid = new Decimal(payment.posCardAmount || 0);
      aggReceivable = new Decimal(payment.aggregatorReceivableAmount || 0);
    }

    // ب) صدور سند دوبل فروش غذا
    const salesLines = RestaurantPostingEngine.buildSalesOrderLines({
      orderNumber: order.order_number,
      dateShamsi: order.date_shamsi,
      channel: order.channel,
      tableNumber: order.table_number,
      settlementMethod: payment.settlementMethod,
      cashDeskDimensionId: 'dim-cash-1',
      posTerminalDimensionId: 'dim-pos-1',
      aggregatorPartyDimensionId: 'dim-cust-2', // اسنپ‌فود / پلتفرم آنلاین
      costCenterDimensionId: payment.costCenterDimensionId || 'dim-cc-2',
      netFoodSalesAmount: new Decimal(order.gross_amount).minus(new Decimal(order.discount_amount)).toFixed(0),
      discountAmount: order.discount_amount,
      serviceChargeAmount: order.service_charge_amount,
      vatAmount: order.vat_amount,
      cashPaidAmount: cashPaid.toFixed(0),
      cardPaidAmount: cardPaid.toFixed(0),
      aggregatorReceivableAmount: aggReceivable.toFixed(0)
    });

    const salesEntry = await this.journalService.createEntry(
      tenantId,
      companyId,
      branchId,
      fiscalYearId,
      userId,
      {
        entryDateShamsi: order.date_shamsi,
        entryType: JournalEntryType.NORMAL,
        description: `فروش سفارش رستوران شماره ${order.order_number} (${order.channel})`,
        sourceModule: 'RESTAURANT_SALES',
        sourceDocumentId: order.id,
        lines: salesLines
      }
    );

    // ج) صدور سند دوبل بهای تمام‌شده غذا (Food Cost)
    let cogsEntryId: string | undefined;
    if (new Decimal(totalFoodCost).greaterThan(0)) {
      const cogsLines = RestaurantPostingEngine.buildFoodCostLines(
        order.order_number,
        order.date_shamsi,
        totalFoodCost,
        payment.costCenterDimensionId || 'dim-cc-2'
      );

      const cogsEntry = await this.journalService.createEntry(
        tenantId,
        companyId,
        branchId,
        fiscalYearId,
        userId,
        {
          entryDateShamsi: order.date_shamsi,
          entryType: JournalEntryType.NORMAL,
          description: `بهای تمام‌شده مواد اولیه سفارش رستوران شماره ${order.order_number}`,
          sourceModule: 'RESTAURANT_COGS',
          sourceDocumentId: order.id,
          lines: cogsLines
        }
      );
      cogsEntryId = cogsEntry.id;
    }

    // به‌روزرسانی سفارش به وضعیت تسویه‌شده (PAID)
    await this.db.run(
      `UPDATE restaurant_orders
       SET status = 'PAID',
           settlement_method = ?,
           cash_amount = ?,
           pos_card_amount = ?,
           aggregator_receivable_amount = ?,
           food_cost_total = ?,
           journal_entry_id = ?,
           cogs_journal_entry_id = ?,
           updated_at = ?
       WHERE id = ?`,
      [
        payment.settlementMethod,
        cashPaid.toFixed(0),
        cardPaid.toFixed(0),
        aggReceivable.toFixed(0),
        totalFoodCost,
        salesEntry.id,
        cogsEntryId || null,
        now,
        orderId
      ]
    );

    // آزادسازی میز سالن
    if (order.table_id) {
      await this.db.run(
        `UPDATE restaurant_tables
         SET status = 'CLEANING', current_order_id = NULL, updated_at = ?
         WHERE id = ?`,
        [now, order.table_id]
      );
    }

    return {
      orderId,
      orderNumber: order.order_number,
      status: RestaurantOrderStatus.PAID,
      grandTotal: order.grand_total,
      foodCostTotal: totalFoodCost,
      journalEntryId: salesEntry.id,
      cogsJournalEntryId: cogsEntryId
    };
  }
}
