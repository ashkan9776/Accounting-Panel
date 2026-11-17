import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { DatabaseService } from '../../database/database.service';
import { KitchenStation, KdsTicketStatus, RestaurantOrderStatus } from '@accounting/core';

@Injectable()
export class KdsService {
  constructor(private readonly db: DatabaseService) {}

  // ۱. ایجاد خودکار تیکت‌های آشپزخانه بر اساس ایستگاه‌های کاری (Hot, Cold, Bar)
  async createTicketsForOrder(
    tenantId: string,
    companyId: string,
    branchId: string,
    orderId: string,
    tableNumber: string | undefined,
    items: Array<{ id: string; productId: string; kitchenStation?: KitchenStation }>
  ) {
    const stationMap: Record<string, string[]> = {};

    for (const it of items) {
      const station = it.kitchenStation || KitchenStation.HOT_KITCHEN;
      if (!stationMap[station]) {
        stationMap[station] = [];
      }
      stationMap[station].push(it.id);
    }

    const createdTickets: any[] = [];
    const now = new Date().toISOString();

    for (const [station, itemIds] of Object.entries(stationMap)) {
      const ticketId = randomUUID();
      const countRow = await this.db.queryOne<{ count: any }>(
        'SELECT COUNT(*)::int as count FROM restaurant_kds_tickets WHERE tenant_id = ? AND company_id = ?',
        [tenantId, companyId]
      );
      const ticketNumber = `TKT-${Number(countRow?.count ?? 0) + 1}`;

      await this.db.run(
        `INSERT INTO restaurant_kds_tickets (
          id, tenant_id, company_id, branch_id, restaurant_order_id,
          ticket_number, station, status, table_number, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'QUEUED', ?, ?)`,
        [ticketId, tenantId, companyId, branchId, orderId, ticketNumber, station, tableNumber || 'بیرون‌بر', now]
      );

      // اتصال اقلام به تیکت آشپزخانه
      for (const itId of itemIds) {
        await this.db.run(
          'UPDATE restaurant_order_items SET kds_ticket_id = ? WHERE id = ?',
          [ticketId, itId]
        );
      }

      createdTickets.push({
        id: ticketId,
        ticketNumber,
        station,
        status: KdsTicketStatus.QUEUED,
        itemCount: itemIds.length
      });
    }

    return createdTickets;
  }

  // ۲. استعلام زنده تیکت‌های ایستگاه‌های آشپزخانه KDS
  async listTickets(
    tenantId: string,
    companyId: string,
    branchId: string,
    station?: KitchenStation,
    status?: KdsTicketStatus
  ) {
    let sql = `
      SELECT t.*, ro.order_number, ro.channel, ro.guest_count
      FROM restaurant_kds_tickets t
      JOIN restaurant_orders ro ON t.restaurant_order_id = ro.id
      WHERE t.tenant_id = ? AND t.company_id = ? AND t.branch_id = ?
    `;
    const params: any[] = [tenantId, companyId, branchId];

    if (station) {
      sql += ' AND t.station = ?';
      params.push(station);
    }
    if (status) {
      sql += ' AND t.status = ?';
      params.push(status);
    }

    sql += ' ORDER BY t.created_at ASC';
    const tickets = await this.db.query(sql, params);

    for (const ticket of tickets) {
      ticket.items = await this.db.query(
        `SELECT oi.*, p.name as product_name
         FROM restaurant_order_items oi
         JOIN products p ON oi.product_id = p.id
         WHERE oi.kds_ticket_id = ?`,
        [ticket.id]
      );
    }

    return tickets;
  }

  // ۳. به‌روزرسانی وضعیت تیکت در مانیتور آشپزخانه (شروع پخت، آماده، تحویل)
  async updateTicketStatus(
    tenantId: string,
    companyId: string,
    ticketId: string,
    newStatus: KdsTicketStatus
  ) {
    const ticket = await this.db.queryOne(
      'SELECT * FROM restaurant_kds_tickets WHERE tenant_id = ? AND company_id = ? AND id = ?',
      [tenantId, companyId, ticketId]
    );
    if (!ticket) {
      throw new NotFoundException(`تیکت آشپزخانه با شناسه ${ticketId} یافت نشد.`);
    }

    const now = new Date().toISOString();
    let startedAt = ticket.started_at;
    let readyAt = ticket.ready_at;
    let servedAt = ticket.served_at;

    if (newStatus === KdsTicketStatus.PREPARING && !startedAt) {
      startedAt = now;
    } else if (newStatus === KdsTicketStatus.READY && !readyAt) {
      readyAt = now;
    } else if (newStatus === KdsTicketStatus.SERVED && !servedAt) {
      servedAt = now;
    }

    await this.db.run(
      `UPDATE restaurant_kds_tickets
       SET status = ?, started_at = ?, ready_at = ?, served_at = ?
       WHERE id = ?`,
      [newStatus, startedAt, readyAt, servedAt, ticketId]
    );

    // به‌روزرسانی اقلام متناظر
    await this.db.run(
      'UPDATE restaurant_order_items SET item_status = ? WHERE kds_ticket_id = ?',
      [newStatus, ticketId]
    );

    // بررسی اتمام تمام تیکت‌های سفارش جهت آماده‌سازی کل غذا
    if (newStatus === KdsTicketStatus.READY) {
      const remainingUnready = await this.db.queryOne<{ count: any }>(
        `SELECT COUNT(*)::int as count FROM restaurant_kds_tickets
         WHERE restaurant_order_id = ? AND status != 'READY' AND status != 'SERVED'`,
        [ticket.restaurant_order_id]
      );
      if (Number(remainingUnready?.count ?? 0) === 0) {
        await this.db.run(
          `UPDATE restaurant_orders
           SET status = 'READY_TO_SERVE', updated_at = ?
           WHERE id = ?`,
          [now, ticket.restaurant_order_id]
        );
      }
    }

    return {
      id: ticketId,
      status: newStatus,
      startedAt,
      readyAt,
      servedAt
    };
  }
}
