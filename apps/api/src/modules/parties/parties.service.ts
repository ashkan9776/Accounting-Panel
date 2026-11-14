import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import Decimal from 'decimal.js';
import {
  PartyType,
  FloatingDimensionType,
  isValidNationalCode,
  isValidCompanyNationalId,
  PartyAgingEngine,
  OpenInvoiceItem
} from '@accounting/core';

@Injectable()
export class PartiesService {
  constructor(private readonly db: DatabaseService) {}

  async createParty(
    tenantId: string,
    companyId: string,
    data: {
      partyType: PartyType;
      name: string;
      firstName?: string;
      lastName?: string;
      nationalId?: string;
      economicCode?: string;
      registrationNumber?: string;
      mobile?: string;
      phone?: string;
      email?: string;
      postalCode?: string;
      address?: string;
      creditLimit?: string | number;
      creditTermsDays?: number;
      isCustomer?: boolean;
      isSupplier?: boolean;
      isEmployee?: boolean;
      isShareholder?: boolean;
    }
  ) {
    // ۱. اعتبارسنجی هویتی
    if (data.nationalId) {
      const cleanId = data.nationalId.trim();
      if (data.partyType === PartyType.INDIVIDUAL_IRANIAN) {
        if (!isValidNationalCode(cleanId)) {
          throw new BadRequestException('کد ملی شخص حقیقی ۱۰ رقمی نامعتبر است.');
        }
      } else if (data.partyType === PartyType.LEGAL_ENTITY) {
        if (!isValidCompanyNationalId(cleanId)) {
          throw new BadRequestException('شناسه ملی شخص حقوقی ۱۱ رقمی نامعتبر است.');
        }
      }
    }

    const partyId = `party-${Date.now()}`;
    const now = new Date().toISOString();

    // ۲. ایجاد خودکار تفصیلی شناور در جدول floating_dimensions
    const maxCodeRow = await this.db.queryOne(
      "SELECT MAX(CAST(code AS INTEGER)) as max_code FROM floating_dimensions WHERE tenant_id = ? AND dimension_type = 'PARTY'",
      [tenantId]
    );
    const nextDimCode = ((maxCodeRow?.max_code || 100000) + 1).toString();
    const floatingDimId = `dim-party-${Date.now()}`;

    await this.db.transaction(async (tx) => {
      // ایجاد تفصیلی شناور
      await tx.run(
        `INSERT INTO floating_dimensions (id, tenant_id, company_id, dimension_type, code, title, reference_id, is_active, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)`,
        [floatingDimId, tenantId, companyId, FloatingDimensionType.PARTY, nextDimCode, data.name, partyId, now]
      );

      // ایجاد شخص
      await tx.run(
        `INSERT INTO parties (
          id, tenant_id, company_id, party_type, name, first_name, last_name,
          national_id, economic_code, registration_number, mobile, phone, email,
          postal_code, address, credit_limit, credit_terms_days,
          is_customer, is_supplier, is_employee, is_shareholder,
          floating_dimension_id, is_active, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
        [
          partyId,
          tenantId,
          companyId,
          data.partyType,
          data.name,
          data.firstName || null,
          data.lastName || null,
          data.nationalId ? data.nationalId.trim() : null,
          data.economicCode ? data.economicCode.trim() : null,
          data.registrationNumber || null,
          data.mobile || null,
          data.phone || null,
          data.email || null,
          data.postalCode || null,
          data.address || null,
          data.creditLimit ? data.creditLimit.toString() : '0',
          data.creditTermsDays || 0,
          data.isCustomer !== undefined ? (data.isCustomer ? 1 : 0) : 1,
          data.isSupplier ? 1 : 0,
          data.isEmployee ? 1 : 0,
          data.isShareholder ? 1 : 0,
          floatingDimId,
          now
        ]
      );
    });

    return {
      id: partyId,
      name: data.name,
      partyType: data.partyType,
      floatingDimensionId: floatingDimId,
      code: nextDimCode
    };
  }

  async listParties(
    tenantId: string,
    companyId: string,
    filters: {
      type?: 'customer' | 'supplier' | 'employee';
      search?: string;
      limit?: number;
      offset?: number;
    }
  ) {
    let sql = `
      SELECT p.*, fd.code as dimension_code
      FROM parties p
      LEFT JOIN floating_dimensions fd ON fd.id = p.floating_dimension_id
      WHERE p.tenant_id = ? AND p.company_id = ? AND p.is_active = 1
    `;
    const params: any[] = [tenantId, companyId];

    if (filters.type === 'customer') {
      sql += ' AND p.is_customer = 1';
    } else if (filters.type === 'supplier') {
      sql += ' AND p.is_supplier = 1';
    } else if (filters.type === 'employee') {
      sql += ' AND p.is_employee = 1';
    }

    if (filters.search) {
      sql += ' AND (p.name LIKE ? OR p.national_id LIKE ? OR p.mobile LIKE ?)';
      const s = `%${filters.search.trim()}%`;
      params.push(s, s, s);
    }

    sql += ' ORDER BY p.name ASC LIMIT ? OFFSET ?';
    params.push(filters.limit || 50, filters.offset || 0);

    return this.db.query(sql, params);
  }

  async getPartyById(tenantId: string, id: string) {
    const party = await this.db.queryOne(
      `SELECT p.*, fd.code as dimension_code
       FROM parties p
       LEFT JOIN floating_dimensions fd ON fd.id = p.floating_dimension_id
       WHERE p.tenant_id = ? AND p.id = ?`,
      [tenantId, id]
    );
    if (!party) {
      throw new NotFoundException('شخص مورد نظر یافت نشد.');
    }
    return party;
  }

  /**
   * صورت‌حساب مالی شخص با مانده لحظه‌ای بر اساس اسناد حسابداری
   */
  async getPartyStatement(tenantId: string, companyId: string, partyId: string) {
    const party = await this.getPartyById(tenantId, partyId);
    if (!party.floating_dimension_id) {
      return { party, transactions: [], balanceDebit: '0', balanceCredit: '0' };
    }

    const rows = await this.db.query(
      `SELECT jl.debit, jl.credit, jl.description, je.entry_date_shamsi,
              je.sequence_number, je.permanent_number, je.entry_type, sa.code as subsidiary_code, sa.title as subsidiary_title
       FROM journal_lines jl
       JOIN journal_entries je ON je.id = jl.journal_entry_id
       JOIN account_subsidiaries sa ON sa.id = jl.subsidiary_account_id
       WHERE je.tenant_id = ? AND je.company_id = ?
         AND jl.floating_dimension_1_id = ?
         AND je.status IN ('APPROVED', 'FINALIZED')
       ORDER BY je.sequence_number ASC, jl.row_number ASC`,
      [tenantId, companyId, party.floating_dimension_id]
    );

    let runningBalance = new Decimal(0);
    const transactions = rows.map((r: any) => {
      const d = new Decimal(r.debit);
      const c = new Decimal(r.credit);
      runningBalance = runningBalance.plus(d).minus(c);

      return {
        ...r,
        balanceDebit: runningBalance.isPositive() && !runningBalance.isZero() ? runningBalance.toFixed(0) : '0',
        balanceCredit: runningBalance.isNegative() ? runningBalance.abs().toFixed(0) : '0'
      };
    });

    return {
      party: {
        id: party.id,
        name: party.name,
        partyType: party.party_type,
        nationalId: party.national_id,
        mobile: party.mobile,
        creditLimit: party.credit_limit
      },
      transactions,
      closingBalanceDebit: runningBalance.isPositive() && !runningBalance.isZero() ? runningBalance.toFixed(0) : '0',
      closingBalanceCredit: runningBalance.isNegative() ? runningBalance.abs().toFixed(0) : '0'
    };
  }

  /**
   * گزارش سن مطالبات اشخاص (Aging Report)
   */
  async getPartyAgingReport(tenantId: string, companyId: string, currentDateShamsi: string) {
    // واکشی مانده‌های فاکتورهای دریافتنی یا سطرهای بدهکاران
    const customers = await this.listParties(tenantId, companyId, { type: 'customer' });
    const invoices: OpenInvoiceItem[] = [];

    // شبیه‌سازی اقلام باز فاکتورها بر اساس تفصیلی‌های دارای مانده بدهکار
    for (const c of customers) {
      if (!c.floating_dimension_id) continue;
      const statement = await this.getPartyStatement(tenantId, companyId, c.id);
      const balDebit = new Decimal(statement.closingBalanceDebit || '0');
      if (balDebit.greaterThan(0)) {
        invoices.push({
          partyId: c.id,
          partyName: c.name,
          invoiceId: `bal-${c.id}`,
          invoiceNumber: `مانده جاری-${c.dimension_code}`,
          dueDateShamsi: currentDateShamsi, // مبنای پیش‌فرض
          remainingAmount: balDebit.toFixed(0)
        });
      }
    }

    return PartyAgingEngine.calculateAging(currentDateShamsi, invoices);
  }
}
