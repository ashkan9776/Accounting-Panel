import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { VisitorSalesEngine } from '@accounting/core';
import Decimal from 'decimal.js';

Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

@Injectable()
export class VisitorService {
  constructor(private readonly db: DatabaseService) {}

  // ۱. کنترل سقف اعتبار و مطالبات معوق مشتری جهت اپ ویزیتور
  async checkCustomerCredit(
    tenantId: string,
    companyId: string,
    customerPartyId: string,
    newOrderAmount: string | number
  ) {
    const party = await this.db.queryOne(
      'SELECT * FROM parties WHERE id = ? AND tenant_id = ? AND company_id = ?',
      [customerPartyId, tenantId, companyId]
    );
    if (!party) {
      throw new NotFoundException('طرف حساب مشتری یافت نشد.');
    }

    // استعلام مانده بدهی مشتری از روی دفاتر و اسناد
    const balanceQuery = await this.db.queryOne(
      `SELECT SUM(CAST(grand_total AS REAL)) as total_invoices
       FROM sales_documents
       WHERE tenant_id = ? AND company_id = ? AND customer_party_id = ?
         AND status != 'CANCELLED' AND payment_method = 'CREDIT'`,
      [tenantId, companyId, customerPartyId]
    );

    const openBalance = balanceQuery?.total_invoices || '0';
    const creditLimit = party.credit_limit || '50000000';

    return VisitorSalesEngine.validateCustomerCredit({
      partyId: party.id,
      partyName: party.name,
      creditLimit,
      currentOpenBalance: openBalance,
      newOrderAmount,
      hasOverdueInvoices: false
    });
  }

  // ۲. ثبت ویزیت حضوری بازاریاب با کنترل موقعیت مکانی GPS (Geofencing)
  async recordVisitorVisit(
    tenantId: string,
    companyId: string,
    visitorUserId: string,
    data: {
      customerPartyId: string;
      visitDateShamsi: string;
      latitude: number;
      longitude: number;
      visitNotes?: string;
      salesDocumentId?: string;
    }
  ) {
    const party = await this.db.queryOne(
      'SELECT * FROM parties WHERE id = ? AND tenant_id = ? AND company_id = ?',
      [data.customerPartyId, tenantId, companyId]
    );
    if (!party) {
      throw new NotFoundException('مشتری مورد نظر یافت نشد.');
    }

    // مختصات فروشگاه مشتری (در صورت نبود، پیش‌فرض همان نزدیکی ویزیتور)
    const storeLat = party.latitude ? parseFloat(party.latitude) : data.latitude;
    const storeLon = party.longitude ? parseFloat(party.longitude) : data.longitude;

    const geofence = VisitorSalesEngine.validateGeofence(
      data.latitude,
      data.longitude,
      storeLat,
      storeLon,
      200 // شعاع مجاز ۲۰۰ متر
    );

    const visitId = `visit-${Date.now()}`;
    const now = new Date().toISOString();

    await this.db.run(
      `INSERT INTO visitor_visits (
        id, tenant_id, company_id, visitor_user_id, customer_party_id,
        visit_date_shamsi, latitude, longitude, is_within_geofence,
        visit_notes, sales_document_id, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        visitId,
        tenantId,
        companyId,
        visitorUserId,
        data.customerPartyId,
        data.visitDateShamsi,
        data.latitude,
        data.longitude,
        geofence.isWithinGeofence ? 1 : 0,
        data.visitNotes || null,
        data.salesDocumentId || null,
        now
      ]
    );

    return {
      visitId,
      customerPartyId: data.customerPartyId,
      customerName: party.name,
      geofence,
      recordedAt: now
    };
  }

  // ۳. استعلام گزارش ویزیت‌های بازاریاب در یک تاریخ
  async getVisitorVisits(
    tenantId: string,
    companyId: string,
    visitorUserId: string,
    visitDateShamsi?: string
  ) {
    let sql = `
      SELECT vv.*, p.name as customer_name
      FROM visitor_visits vv
      JOIN parties p ON vv.customer_party_id = p.id
      WHERE vv.tenant_id = ? AND vv.company_id = ? AND vv.visitor_user_id = ?
    `;
    const params: any[] = [tenantId, companyId, visitorUserId];

    if (visitDateShamsi) {
      sql += ' AND vv.visit_date_shamsi = ?';
      params.push(visitDateShamsi);
    }
    sql += ' ORDER BY vv.created_at DESC';

    return this.db.query(sql, params);
  }
}
