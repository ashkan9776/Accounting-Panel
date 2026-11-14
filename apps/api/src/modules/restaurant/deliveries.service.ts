import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { DeliveryStatus } from '@accounting/core';
import Decimal from 'decimal.js';

Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

@Injectable()
export class DeliveriesService {
  constructor(private readonly db: DatabaseService) {}

  // ۱. ایجاد ماموریت ارسال با پیک
  async createDelivery(
    tenantId: string,
    companyId: string,
    branchId: string,
    orderId: string,
    data: {
      customerName: string;
      customerPhone: string;
      deliveryAddress: string;
      deliveryFee?: string | number;
      courierPartyId?: string;
    }
  ) {
    const order = await this.db.queryOne(
      'SELECT * FROM restaurant_orders WHERE tenant_id = ? AND company_id = ? AND id = ?',
      [tenantId, companyId, orderId]
    );
    if (!order) {
      throw new NotFoundException(`سفارش با شناسه ${orderId} یافت نشد.`);
    }

    const id = `del-${Date.now()}`;
    const now = new Date().toISOString();
    const fee = new Decimal(data.deliveryFee || 0);

    await this.db.run(
      `INSERT INTO restaurant_deliveries (
        id, tenant_id, company_id, branch_id, restaurant_order_id,
        courier_party_id, status, customer_name, customer_phone,
        delivery_address, delivery_fee, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        tenantId,
        companyId,
        branchId,
        orderId,
        data.courierPartyId || null,
        data.courierPartyId ? DeliveryStatus.DISPATCHED : DeliveryStatus.PENDING_ASSIGNMENT,
        data.customerName,
        data.customerPhone,
        data.deliveryAddress,
        fee.toFixed(0),
        now
      ]
    );

    return {
      id,
      orderId,
      status: data.courierPartyId ? DeliveryStatus.DISPATCHED : DeliveryStatus.PENDING_ASSIGNMENT,
      customerName: data.customerName,
      deliveryFee: fee.toFixed(0)
    };
  }

  // ۲. تخصیص پیک به سفارش ارسال
  async assignCourier(tenantId: string, companyId: string, deliveryId: string, courierPartyId: string) {
    const delivery = await this.db.queryOne(
      'SELECT * FROM restaurant_deliveries WHERE tenant_id = ? AND company_id = ? AND id = ?',
      [tenantId, companyId, deliveryId]
    );
    if (!delivery) {
      throw new NotFoundException(`ماموریت دلیوری با شناسه ${deliveryId} یافت نشد.`);
    }

    const now = new Date().toISOString();
    await this.db.run(
      `UPDATE restaurant_deliveries
       SET courier_party_id = ?, status = 'DISPATCHED', dispatched_at = ?
       WHERE id = ?`,
      [courierPartyId, now, deliveryId]
    );

    return { id: deliveryId, status: DeliveryStatus.DISPATCHED, courierPartyId, dispatchedAt: now };
  }

  // ۳. ثبت تحویل سفارش توسط پیک و ثبت وجوه دریافتی درب منزل
  async completeDelivery(
    tenantId: string,
    companyId: string,
    deliveryId: string,
    data: {
      cashCollected?: string | number;
      posCardCollected?: string | number;
    }
  ) {
    const delivery = await this.db.queryOne(
      'SELECT * FROM restaurant_deliveries WHERE tenant_id = ? AND company_id = ? AND id = ?',
      [tenantId, companyId, deliveryId]
    );
    if (!delivery) {
      throw new NotFoundException(`ماموریت دلیوری با شناسه ${deliveryId} یافت نشد.`);
    }

    const now = new Date().toISOString();
    const cash = new Decimal(data.cashCollected || 0);
    const card = new Decimal(data.posCardCollected || 0);

    await this.db.run(
      `UPDATE restaurant_deliveries
       SET status = 'DELIVERED', delivered_at = ?, cash_collected = ?, pos_card_collected = ?
       WHERE id = ?`,
      [now, cash.toFixed(0), card.toFixed(0), deliveryId]
    );

    return {
      id: deliveryId,
      status: DeliveryStatus.DELIVERED,
      cashCollected: cash.toFixed(0),
      posCardCollected: card.toFixed(0),
      deliveredAt: now
    };
  }

  // ۴. تسویه حساب پایان روز پیک موتوری با صندوق رستوران
  async settleCourier(
    tenantId: string,
    companyId: string,
    branchId: string,
    courierPartyId: string
  ) {
    const unsettled = await this.db.query(
      `SELECT * FROM restaurant_deliveries
       WHERE tenant_id = ? AND company_id = ? AND courier_party_id = ?
         AND status = 'DELIVERED' AND is_settled = 0`,
      [tenantId, companyId, courierPartyId]
    );

    let totalCash = new Decimal(0);
    let totalCard = new Decimal(0);

    for (const d of unsettled) {
      totalCash = totalCash.plus(new Decimal(d.cash_collected || 0));
      totalCard = totalCard.plus(new Decimal(d.pos_card_collected || 0));
    }

    const now = new Date().toISOString();
    await this.db.run(
      `UPDATE restaurant_deliveries
       SET is_settled = 1
       WHERE tenant_id = ? AND company_id = ? AND courier_party_id = ?
         AND status = 'DELIVERED' AND is_settled = 0`,
      [tenantId, companyId, courierPartyId]
    );

    return {
      courierPartyId,
      settledCount: unsettled.length,
      totalCashToHandover: totalCash.toFixed(0),
      totalPosTransactions: totalCard.toFixed(0),
      grandTotalCollected: totalCash.plus(totalCard).toFixed(0),
      settledAt: now
    };
  }
}
