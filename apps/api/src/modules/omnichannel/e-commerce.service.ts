import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { DatabaseService } from '../../database/database.service';
import { JournalEntriesService } from '../accounting/journal-entries.service';
import { AccountMappingService } from '../accounting/account-mapping.service';
import {
  ECommerceEngine,
  OnlineOrderStatus,
  PaymentGatewayType,
  PaymentTransactionStatus,
  CourierProvider,
  JournalEntryType,
  JournalEntryStatus
} from '@accounting/core';
import Decimal from 'decimal.js';

Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

@Injectable()
export class ECommerceService {
  constructor(
    private readonly db: DatabaseService,
    private readonly journalService: JournalEntriesService,
    private readonly accountMapping: AccountMappingService
  ) {}

  // ۰. دریافت فهرست سفارشات آنلاین
  async listOnlineOrders(tenantId: string, companyId: string) {
    const orders = await this.db.query(
      `SELECT * FROM online_orders WHERE tenant_id = ? AND company_id = ? ORDER BY seq_no DESC`,
      [tenantId, companyId]
    );
    return orders;
  }

  // ۱. ثبت سفارش جدید در فروشگاه اینترنتی
  async createOnlineOrder(
    tenantId: string,
    companyId: string,
    branchId: string,
    data: {
      customerPartyId: string;
      customerName: string;
      customerMobile: string;
      shippingAddress: string;
      warehouseId?: string;
      items: Array<{
        productId: string;
        quantity: number;
        unitPrice?: string | number;
        discountAmount?: string | number;
      }>;
      couponDiscount?: string | number;
      shippingFee?: string | number;
    }
  ) {
    if (!data.items || data.items.length === 0) {
      throw new BadRequestException('اقلام سفارش آنلاین نمی‌تواند خالی باشد.');
    }

    // استعلام مشخصات کالاها و بهای تمام‌شده از سیستم انبار
    const enrichedItems: any[] = [];
    for (const item of data.items) {
      const prod = await this.db.queryOne(
        'SELECT * FROM products WHERE id = ? AND tenant_id = ? AND company_id = ?',
        [item.productId, tenantId, companyId]
      );
      if (!prod) {
        throw new NotFoundException(`کالای ${item.productId} در انبار یافت نشد.`);
      }

      const unitPrice = item.unitPrice || prod.sale_price;
      const unitCogs = prod.purchase_price || new Decimal(unitPrice).times(0.6).round().toFixed(0);

      enrichedItems.push({
        productId: prod.id,
        productTitle: prod.name,
        quantity: item.quantity,
        unitPrice,
        discountAmount: item.discountAmount || '0',
        vatRate: prod.vat_rate !== undefined ? prod.vat_rate : 0.1,
        unitCogs
      });
    }

    const pricing = ECommerceEngine.calculatePricing(
      enrichedItems,
      data.shippingFee || '1000000',
      data.couponDiscount || '0'
    );

    const orderId = randomUUID();
    const orderNumber = `ORD-1403-${Math.floor(1000 + Math.random() * 9000)}`;
    const now = new Date().toISOString();

    await this.db.transaction(async (tx) => {
      await tx.run(
        `INSERT INTO online_orders (
          id, tenant_id, company_id, branch_id, order_number, customer_party_id,
          customer_name, customer_mobile, shipping_address, total_goods_amount,
          discount_amount, vat_amount, shipping_fee, grand_total, status,
          payment_status, courier_provider, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', 'UNPAID', 'INTERNAL', ?, ?)`,
        [
          orderId,
          tenantId,
          companyId,
          branchId,
          orderNumber,
          data.customerPartyId,
          data.customerName,
          data.customerMobile,
          data.shippingAddress,
          pricing.summary.totalGoodsAmount,
          pricing.summary.totalDiscount,
          pricing.summary.totalVat,
          pricing.summary.shippingFee,
          pricing.summary.grandTotal,
          now,
          now
        ]
      );

      for (const item of pricing.itemsBreakdown) {
        const itemId = randomUUID();
        await tx.run(
          `INSERT INTO online_order_items (
            id, online_order_id, product_id, quantity, unit_price, discount_amount,
            net_amount, vat_amount, unit_cogs, total_cogs
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            itemId,
            orderId,
            item.productId,
            item.quantity,
            item.unitPrice,
            item.discountAmount || '0',
            item.lineNet,
            item.lineVat,
            item.unitCogs || '0',
            item.lineCogs
          ]
        );
      }
    });

    return this.getOnlineOrderById(tenantId, companyId, orderId);
  }

  // ۲. استعلام مشخصات سفارش آنلاین با اقلام
  async getOnlineOrderById(tenantId: string, companyId: string, orderId: string) {
    const order = await this.db.queryOne(
      'SELECT * FROM online_orders WHERE id = ? AND tenant_id = ? AND company_id = ?',
      [orderId, tenantId, companyId]
    );
    if (!order) {
      throw new NotFoundException('سفارش آنلاین مورد نظر یافت نشد.');
    }

    const items = await this.db.query(
      `SELECT ooi.*, p.name as product_name, p.code as product_code
       FROM online_order_items ooi
       JOIN products p ON ooi.product_id = p.id
       WHERE ooi.online_order_id = ?`,
      [orderId]
    );

    return {
      ...order,
      items
    };
  }

  // ۳. ایجاد توکن پرداخت اینترنتی درگاه شاپرک (IPG Initiate)
  async initiatePayment(
    tenantId: string,
    companyId: string,
    orderId: string,
    gatewayType: PaymentGatewayType = PaymentGatewayType.SAMAN
  ) {
    const order = await this.getOnlineOrderById(tenantId, companyId, orderId);
    if (order.status !== OnlineOrderStatus.PENDING) {
      throw new BadRequestException('این سفارش در وضعیت معلق قرار ندارد و امکان پرداخت مجدد ندارد.');
    }

    const txId = randomUUID();
    const token = `SHAPARAK-${Math.random().toString(36).substring(2, 12).toUpperCase()}`;
    const now = new Date().toISOString();

    await this.db.run(
      `INSERT INTO online_payment_transactions (
        id, tenant_id, company_id, online_order_id, gateway_type, amount,
        status, token, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'INITIATED', ?, ?)`,
      [txId, tenantId, companyId, orderId, gatewayType, order.grand_total, token, now]
    );

    return {
      transactionId: txId,
      gatewayType,
      amount: order.grand_total,
      token,
      redirectUrl: `https://sep.shaparak.ir/OnlinePayment/Payment?token=${token}`
    };
  }

  // ۴. وریفای پرداخت درگاه، تایید سفارش، صدور فاکتور فروش و ثبت سند حسابداری دوبل
  async verifyPaymentAndPost(
    tenantId: string,
    companyId: string,
    branchId: string,
    fiscalYearId: string,
    userId: string,
    data: {
      transactionId: string;
      token: string;
      rrn?: string;
      cardPanMasked?: string;
      gatewayFee?: string | number;
      gatewayDimensionId?: string;
      costCenterDimensionId?: string;
      warehouseDimensionId?: string;
    }
  ) {
    const tx = await this.db.queryOne(
      'SELECT * FROM online_payment_transactions WHERE id = ? AND tenant_id = ? AND company_id = ?',
      [data.transactionId, tenantId, companyId]
    );
    if (!tx) {
      throw new NotFoundException('تراکنش پرداخت اینترنتی یافت نشد.');
    }
    if (tx.status === PaymentTransactionStatus.VERIFIED) {
      throw new BadRequestException('این تراکنش قبلاً وریفای و تایید شده است.');
    }

    const order = await this.getOnlineOrderById(tenantId, companyId, tx.online_order_id);
    const rrn = data.rrn || `74829${Math.floor(1000000 + Math.random() * 9000000)}`;
    const cardPan = data.cardPanMasked || '603799******4321';
    const fee = data.gatewayFee || '40000';
    const now = new Date().toISOString();

    // محاسبه بهای تمام‌شده و مالیات
    let totalCogs = new Decimal(0);
    for (const it of order.items) {
      totalCogs = totalCogs.plus(new Decimal(it.total_cogs || 0));
    }

    const pricing = {
      totalGoodsAmount: order.total_goods_amount,
      totalDiscount: order.discount_amount,
      netGoodsAmount: new Decimal(order.total_goods_amount).minus(order.discount_amount).toFixed(0),
      totalVat: order.vat_amount,
      shippingFee: order.shipping_fee,
      grandTotal: order.grand_total,
      totalCogs: totalCogs.toFixed(0)
    };

    const gatewaySub = await this.accountMapping.getAccount(tenantId, companyId, 'POS_IN_TRANSIT', 'sub-1104');

    // صدور سند حسابداری دوبل فروش اینترنتی
    const postingLines = ECommerceEngine.buildOnlineOrderPostingLines({
      orderNumber: order.order_number,
      pricing,
      gatewaySubsidiaryId: gatewaySub,
      gatewayDimensionId: data.gatewayDimensionId || 'dim-bank-1',
      costCenterDimensionId: data.costCenterDimensionId || 'dim-cc-1',
      warehouseDimensionId: data.warehouseDimensionId || 'wh-central'
    });

    const journalEntry = await this.journalService.createEntry(tenantId, companyId, branchId, fiscalYearId, userId, {
      entryDateShamsi: '1403/12/29',
      entryType: JournalEntryType.NORMAL,
      description: `سند فروش اینترنتی و وصول وجه درگاه شاپرک سفارش ${order.order_number}`,
      sourceModule: 'ONLINE_ECOMMERCE',
      sourceDocumentId: order.id,
      lines: postingLines
    });

    await this.journalService.approveEntry(tenantId, journalEntry.id, userId);
    journalEntry.status = JournalEntryStatus.APPROVED;

    // ثبت فاکتور رسمی فروش در سیستم فروش
    const salesDocId = randomUUID();
    await this.db.run(
      `INSERT INTO sales_documents (
        id, tenant_id, company_id, branch_id, warehouse_id, customer_party_id,
        document_number, document_type, date_shamsi, gross_amount, discount_amount,
        net_amount, vat_amount, grand_total, cogs_total, status, sales_journal_entry_id,
        payment_method, description, created_by_user_id, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'INVOICE', '1403/12/29', ?, ?, ?, ?, ?, ?, 'APPROVED', ?, 'POS', ?, ?, ?)`,
      [
        salesDocId,
        tenantId,
        companyId,
        branchId,
        'wh-central',
        order.customer_party_id,
        order.order_number,
        order.total_goods_amount,
        order.discount_amount,
        pricing.netGoodsAmount,
        order.vat_amount,
        order.grand_total,
        pricing.totalCogs,
        journalEntry.id,
        `فاکتور فروش اینترنتی سفارش ${order.order_number} - رهگیری شاپرک: ${rrn}`,
        userId,
        now
      ]
    );

    // به‌روزرسانی وضعیت تراکنش و سفارش
    await this.db.run(
      `UPDATE online_payment_transactions
       SET status = 'VERIFIED', rrn = ?, card_pan_masked = ?, gateway_fee = ?, verified_at = ?
       WHERE id = ?`,
      [rrn, cardPan, fee, now, tx.id]
    );

    await this.db.run(
      `UPDATE online_orders
       SET status = 'PAID', payment_status = 'PAID', sales_document_id = ?, updated_at = ?
       WHERE id = ?`,
      [salesDocId, now, order.id]
    );

    return {
      success: true,
      orderId: order.id,
      orderNumber: order.order_number,
      rrn,
      cardPanMasked: cardPan,
      journalEntry,
      salesDocumentId: salesDocId
    };
  }

  // ۵. تسویه درگاه پرداخت با حساب بانکی شرکت (واریز شاپرک به بانک)
  async settleGatewayToBank(
    tenantId: string,
    companyId: string,
    branchId: string,
    fiscalYearId: string,
    userId: string,
    data: {
      orderNumber: string;
      settledAmount: string | number;
      gatewayFee: string | number;
      bankDimensionId?: string;
      costCenterDimensionId?: string;
    }
  ) {
    const [bankSub, gatewaySub] = await Promise.all([
      this.accountMapping.getAccount(tenantId, companyId, 'BANK', 'sub-1103'),
      this.accountMapping.getAccount(tenantId, companyId, 'POS_IN_TRANSIT', 'sub-1104'),
    ]);

    const lines = ECommerceEngine.buildGatewaySettlementLines({
      orderNumber: data.orderNumber,
      settledAmount: data.settledAmount,
      gatewayFee: data.gatewayFee,
      bankSubsidiaryId: bankSub,
      bankDimensionId: data.bankDimensionId || 'dim-bank-1',
      gatewaySubsidiaryId: gatewaySub,
      gatewayDimensionId: data.bankDimensionId || 'dim-bank-1',
      costCenterDimensionId: data.costCenterDimensionId || 'dim-cc-1'
    });

    const journalEntry = await this.journalService.createEntry(tenantId, companyId, branchId, fiscalYearId, userId, {
      entryDateShamsi: '1403/12/29',
      entryType: JournalEntryType.NORMAL,
      description: `سند تسویه و واریز شاپرک به حساب بانک بابت سفارش آنلاین ${data.orderNumber}`,
      sourceModule: 'GATEWAY_SETTLEMENT',
      lines
    });

    await this.journalService.approveEntry(tenantId, journalEntry.id, userId);
    journalEntry.status = JournalEntryStatus.APPROVED;

    return {
      success: true,
      journalEntry
    };
  }

  // ۶. تخصیص پیک و ارسال مرسوله (Courier Assignment)
  async assignCourier(
    tenantId: string,
    companyId: string,
    orderId: string,
    courierProvider: CourierProvider = CourierProvider.SNAPP_BOX,
    trackingCode?: string
  ) {
    const order = await this.getOnlineOrderById(tenantId, companyId, orderId);
    const tracking = trackingCode || `SNP-${Math.floor(100000 + Math.random() * 900000)}`;
    const now = new Date().toISOString();

    await this.db.run(
      `UPDATE online_orders
       SET status = 'SHIPPED', courier_provider = ?, courier_tracking_code = ?, updated_at = ?
       WHERE id = ? AND tenant_id = ? AND company_id = ?`,
      [courierProvider, tracking, now, orderId, tenantId, companyId]
    );

    return {
      success: true,
      orderId,
      status: OnlineOrderStatus.SHIPPED,
      courierProvider,
      trackingCode: tracking
    };
  }

  // ۷. همگام‌سازی کاتالوگ و موجودی با فروشگاه‌سازهای خارجی (WooCommerce / DigiKala Sync)
  async syncExternalCatalog(tenantId: string, companyId: string, platform: 'WOOCOMMERCE' | 'DIGIKALA') {
    const products = await this.db.query(
      `SELECT p.id, p.code, p.name, p.sell_price,
              COALESCE(SUM(sle.in_quantity::NUMERIC - sle.out_quantity::NUMERIC), 0) as stock_quantity
       FROM products p
       LEFT JOIN stock_ledger_entries sle ON p.id = sle.product_id
       WHERE p.tenant_id = ? AND p.company_id = ? AND p.is_active = true
       GROUP BY p.id, p.code, p.name, p.sell_price`,
      [tenantId, companyId]
    );

    const syncItems = products.map((p: any) => ({
      sku: p.code,
      title: p.name,
      price: p.sell_price,
      stockQuantity: p.stock_quantity || 0,
      inStock: (p.stock_quantity || 0) > 0
    }));

    return {
      platform,
      syncedAt: new Date().toISOString(),
      itemCount: syncItems.length,
      items: syncItems
    };
  }
}
