import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { DatabaseService } from '../../database/database.service';
import {
  HardwareDriverEngine,
  RawAttendanceLogItem,
  AttendanceLogType
} from '@accounting/core';

@Injectable()
export class HardwareService {
  constructor(private readonly db: DatabaseService) {}

  // ۱. لیست پایانه‌های سخت‌افزاری فعال
  async getTerminals(tenantId: string, companyId: string, branchId?: string) {
    let sql = 'SELECT * FROM hardware_terminals WHERE tenant_id = ? AND company_id = ? AND is_active = 1';
    const params: any[] = [tenantId, companyId];
    if (branchId) {
      sql += ' AND branch_id = ?';
      params.push(branchId);
    }
    return this.db.query(sql, params);
  }

  // ۲. تولید فرامین باینری ESC/POS برای چاپ رسید با پرینتر حرارتی
  async generateReceiptEscPos(tenantId: string, companyId: string, orderId: string) {
    const order = await this.db.queryOne(
      'SELECT * FROM online_orders WHERE id = ? AND tenant_id = ? AND company_id = ?',
      [orderId, tenantId, companyId]
    );
    if (!order) {
      throw new NotFoundException('سفارش مورد نظر یافت نشد.');
    }

    const company = await this.db.queryOne('SELECT * FROM companies WHERE id = ?', [companyId]);
    const items = await this.db.query(
      `SELECT ooi.*, p.name as product_name
       FROM online_order_items ooi
       JOIN products p ON ooi.product_id = p.id
       WHERE ooi.online_order_id = ?`,
      [orderId]
    );

    const receiptBuf = HardwareDriverEngine.generateEscPosReceipt({
      companyName: company?.legal_name || 'شرکت پیشرو پارس',
      branchTitle: 'شعبه مرکزی آنلاین',
      orderNumber: order.order_number,
      dateShamsi: '1403/12/29',
      customerName: order.customer_name,
      items: items.map((i: any) => ({
        title: i.product_name,
        qty: i.quantity,
        unitPrice: i.unit_price,
        totalPrice: i.net_amount
      })),
      subtotal: order.total_goods_amount,
      discount: order.discount_amount,
      vat: order.vat_amount,
      shippingFee: order.shipping_fee,
      grandTotal: order.grand_total,
      qrPayload: `https://pay.pishro.ir/invoice/${order.order_number}`,
      openCashDrawer: true
    });

    return {
      orderId: order.id,
      orderNumber: order.order_number,
      bufferLengthBytes: receiptBuf.length,
      hexCommands: receiptBuf.toString('hex'),
      base64Commands: receiptBuf.toString('base64')
    };
  }

  // ۳. ارسال درخواست تراکنش به کارتخوان فروشگاهی (PC-POS)
  async sendPcPosTransaction(
    tenantId: string,
    companyId: string,
    terminalId: string,
    amount: string,
    orderId: string
  ) {
    const term = await this.db.queryOne(
      'SELECT * FROM hardware_terminals WHERE id = ? AND tenant_id = ? AND company_id = ?',
      [terminalId, tenantId, companyId]
    );
    if (!term) {
      throw new NotFoundException('پایانه کارتخوان مورد نظر یافت نشد.');
    }

    const requestPacket = HardwareDriverEngine.buildPcPosSaleRequest({
      terminalId: term.serial_number || 'POS-01',
      amount,
      orderId
    });

    // شبیه‌سازی تراکنش موفق بانکی با کارت مشتری
    const simulatedRawBankResp = `\x0200|${term.serial_number || 'POS-01'}|${amount.padStart(12, '0')}|748291038472|654321|603799******1234|1403/12/29 16:30:00\x03\x15`;
    const parsedResponse = HardwareDriverEngine.parsePcPosResponse(simulatedRawBankResp);

    return {
      terminalId,
      deviceTitle: term.title,
      requestPacketHex: requestPacket.commandHex,
      response: parsedResponse
    };
  }

  // ۴. خواندن وزن لحظه‌ای ترازوی دیجیتال
  async readScaleWeight(terminalId: string, rawScaleStream?: string) {
    const raw = rawScaleStream || 'ST,GS,+002.450KG';
    return HardwareDriverEngine.parseScaleReading(raw);
  }

  // ۵. ثبت لاگ‌های تردد دستگاه حضور و غیاب
  async importAttendanceLogs(
    tenantId: string,
    companyId: string,
    logs: RawAttendanceLogItem[]
  ) {
    const now = new Date().toISOString();
    let count = 0;

    for (const l of logs) {
      const id = randomUUID();
      await this.db.run(
        `INSERT INTO attendance_logs (
          id, tenant_id, company_id, employee_id, terminal_id, log_date_shamsi,
          log_time, log_type, is_processed, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
        [id, tenantId, companyId, l.employeeId, l.terminalId, l.dateShamsi, l.timeString, l.type, now]
      );
    }

    return {
      success: true,
      importedCount: logs.length
    };
  }

  // ۶. استعلام کارکرد و خلاصه ساعات حضور و اضافه‌کاری پرسنل در یک روز
  async getEmployeeAttendanceSummary(
    tenantId: string,
    companyId: string,
    employeeId: string,
    dateShamsi: string
  ) {
    const rawLogs = await this.db.query(
      `SELECT * FROM attendance_logs
       WHERE tenant_id = ? AND company_id = ? AND employee_id = ? AND log_date_shamsi = ?
       ORDER BY log_time ASC`,
      [tenantId, companyId, employeeId, dateShamsi]
    );

    const logItems: RawAttendanceLogItem[] = rawLogs.map((r: any) => ({
      employeeId: r.employee_id,
      terminalId: r.terminal_id,
      dateShamsi: r.log_date_shamsi,
      timeString: r.log_time,
      type: r.log_type as AttendanceLogType
    }));

    return HardwareDriverEngine.processDailyAttendance(employeeId, dateShamsi, logItems, 480);
  }
}
