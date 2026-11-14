import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { TableStatus } from '@accounting/core';

@Injectable()
export class TablesService {
  constructor(private readonly db: DatabaseService) {}

  // ۱. فهرست بخش‌های سالن
  async listSections(tenantId: string, companyId: string, branchId: string) {
    return this.db.query(
      `SELECT * FROM restaurant_sections
       WHERE tenant_id = ? AND company_id = ? AND branch_id = ?
       ORDER BY code ASC`,
      [tenantId, companyId, branchId]
    );
  }

  // ۲. استعلام زنده وضعیت تمام میزهای سالن همراه با بخش و سفارش جاری
  async listTables(tenantId: string, companyId: string, branchId: string, sectionId?: string) {
    let sql = `
      SELECT t.*, s.title as section_title, ro.order_number as current_order_number, ro.grand_total as current_order_total
      FROM restaurant_tables t
      JOIN restaurant_sections s ON t.section_id = s.id
      LEFT JOIN restaurant_orders ro ON t.current_order_id = ro.id
      WHERE t.tenant_id = ? AND t.company_id = ? AND t.branch_id = ? AND t.is_active = 1
    `;
    const params: any[] = [tenantId, companyId, branchId];

    if (sectionId) {
      sql += ' AND t.section_id = ?';
      params.push(sectionId);
    }

    sql += ' ORDER BY t.table_number ASC';
    return this.db.query(sql, params);
  }

  async getTable(tenantId: string, companyId: string, tableId: string) {
    const table = await this.db.queryOne(
      'SELECT * FROM restaurant_tables WHERE tenant_id = ? AND company_id = ? AND id = ?',
      [tenantId, companyId, tableId]
    );
    if (!table) {
      throw new NotFoundException(`میز سالن با شناسه ${tableId} یافت نشد.`);
    }
    return table;
  }

  // ۳. تغییر وضعیت میز (خالی، اشغال، درخواست صورتحساب، تمیزکاری)
  async updateTableStatus(tenantId: string, companyId: string, tableId: string, status: TableStatus) {
    const table = await this.getTable(tenantId, companyId, tableId);
    const now = new Date().toISOString();
    await this.db.run(
      'UPDATE restaurant_tables SET status = ?, updated_at = ? WHERE id = ?',
      [status, now, tableId]
    );
    return { ...table, status, updated_at: now };
  }

  // ۴. ادغام دو میز (Merge Tables) برای مهمانی‌های بزرگ
  async mergeTables(
    tenantId: string,
    companyId: string,
    primaryTableId: string,
    secondaryTableId: string
  ) {
    const primary = await this.getTable(tenantId, companyId, primaryTableId);
    const secondary = await this.getTable(tenantId, companyId, secondaryTableId);

    if (secondary.status === TableStatus.OCCUPIED && secondary.current_order_id) {
      throw new BadRequestException('میز ثانویه در حال حاضر دارای سفارش فعال است و ابتدا باید سفارش آن تسویه یا منتقل شود.');
    }

    const now = new Date().toISOString();
    await this.db.run(
      `UPDATE restaurant_tables
       SET status = 'OCCUPIED', merged_with_table_id = ?, updated_at = ?
       WHERE id = ?`,
      [primaryTableId, now, secondaryTableId]
    );

    return {
      message: `میز ${secondary.table_number} با موفقیت به میز ${primary.table_number} ادغام گردید.`,
      primaryTableId,
      secondaryTableId
    };
  }

  // ۵. انتقال سفارش از یک میز به میز دیگر (Move / Transfer Table)
  async transferTable(
    tenantId: string,
    companyId: string,
    fromTableId: string,
    toTableId: string
  ) {
    const fromTable = await this.getTable(tenantId, companyId, fromTableId);
    const toTable = await this.getTable(tenantId, companyId, toTableId);

    if (!fromTable.current_order_id) {
      throw new BadRequestException('میز مبدا فاقد سفارش فعال جهت انتقال است.');
    }

    if (toTable.status === TableStatus.OCCUPIED && toTable.current_order_id) {
      throw new BadRequestException('میز مقصد در حال حاضر اشغال است.');
    }

    const orderId = fromTable.current_order_id;
    const now = new Date().toISOString();

    // به‌روزرسانی سفارش رستوران با میز جدید
    await this.db.run(
      'UPDATE restaurant_orders SET table_id = ?, updated_at = ? WHERE id = ?',
      [toTableId, now, orderId]
    );

    // به‌روزرسانی میز مبدا (خالی شدن)
    await this.db.run(
      `UPDATE restaurant_tables
       SET status = 'VACANT', current_order_id = NULL, updated_at = ?
       WHERE id = ?`,
      [now, fromTableId]
    );

    // به‌روزرسانی میز مقصد (اشغال با سفارش منتقل‌شده)
    await this.db.run(
      `UPDATE restaurant_tables
       SET status = 'OCCUPIED', current_order_id = ?, updated_at = ?
       WHERE id = ?`,
      [orderId, now, toTableId]
    );

    return {
      message: `سفارش میز ${fromTable.table_number} با موفقیت به میز ${toTable.table_number} منتقل شد.`,
      orderId,
      fromTableId,
      toTableId
    };
  }
}
