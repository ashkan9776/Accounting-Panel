import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { JournalEntriesService } from '../accounting/journal-entries.service';
import {
  PosShiftStatus,
  CashMovementType,
  PosPostingEngine,
  JournalEntryType
} from '@accounting/core';
import Decimal from 'decimal.js';

Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

@Injectable()
export class PosShiftsService {
  constructor(
    private readonly db: DatabaseService,
    private readonly journalService: JournalEntriesService
  ) {}

  // ۱. باز کردن شیفت صندوق
  async openShift(
    tenantId: string,
    companyId: string,
    branchId: string,
    userId: string,
    data: {
      cashDeskId: string;
      posTerminalId?: string;
      openingCashBalance?: string | number;
      cashBreakdownOpening?: any;
    }
  ) {
    // بررسی عدم وجود شیفت باز برای این صندوق‌دار در این شعبه
    const activeShift = await this.db.queryOne(
      `SELECT * FROM pos_shifts
       WHERE tenant_id = ? AND company_id = ? AND cashier_user_id = ? AND status = 'OPEN'`,
      [tenantId, companyId, userId]
    );
    if (activeShift) {
      return activeShift;
    }

    const maxShiftRow = await this.db.queryOne(
      'SELECT COUNT(*) as count FROM pos_shifts WHERE tenant_id = ? AND company_id = ?',
      [tenantId, companyId]
    );
    const shiftNumber = `SHF-${Date.now().toString().substring(6)}-${(maxShiftRow?.count || 0) + 1}`;
    const id = `shift-${Date.now()}`;
    const now = new Date().toISOString();
    const openingBal = new Decimal(data.openingCashBalance || 0);

    await this.db.run(
      `INSERT INTO pos_shifts (
        id, tenant_id, company_id, branch_id, cash_desk_id, pos_terminal_id,
        cashier_user_id, shift_number, opened_at, status,
        opening_cash_balance, cash_breakdown_opening_json,
        expected_cash_balance, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'OPEN', ?, ?, ?, ?, ?)`,
      [
        id,
        tenantId,
        companyId,
        branchId,
        data.cashDeskId,
        data.posTerminalId || null,
        userId,
        shiftNumber,
        now,
        openingBal.toFixed(0),
        data.cashBreakdownOpening ? JSON.stringify(data.cashBreakdownOpening) : null,
        openingBal.toFixed(0),
        now,
        now
      ]
    );

    return this.getShift(tenantId, companyId, id);
  }

  // ۲. استعلام شیفت باز کاربر
  async getActiveShift(tenantId: string, companyId: string, userId: string) {
    const shift = await this.db.queryOne(
      `SELECT ps.*, cd.title as cash_desk_title, pt.title as pos_terminal_title
       FROM pos_shifts ps
       LEFT JOIN cash_desks cd ON ps.cash_desk_id = cd.id
       LEFT JOIN pos_terminals pt ON ps.pos_terminal_id = pt.id
       WHERE ps.tenant_id = ? AND ps.company_id = ? AND ps.cashier_user_id = ? AND ps.status = 'OPEN'`,
      [tenantId, companyId, userId]
    );
    return shift || null;
  }

  // ۳. ثبت ورود و خروج نقدی صندوق (Cash In / Cash Drop)
  async addCashMovement(
    tenantId: string,
    shiftId: string,
    userId: string,
    data: {
      movementType: CashMovementType;
      amount: string | number;
      dateShamsi: string;
      description?: string;
    }
  ) {
    const shift = await this.db.queryOne(
      'SELECT * FROM pos_shifts WHERE tenant_id = ? AND id = ? AND status = "OPEN"',
      [tenantId, shiftId]
    );
    if (!shift) {
      throw new BadRequestException('شیفت معتبر و باز برای این عملیات یافت نشد.');
    }

    const amt = new Decimal(data.amount);
    if (amt.lessThanOrEqualTo(0)) {
      throw new BadRequestException('مبلغ واریز یا برداشت صندوق باید بزرگتر از صفر باشد.');
    }

    const id = `csh-mov-${Date.now()}`;
    const now = new Date().toISOString();
    const dateShamsi = data.dateShamsi || '1403/11/15';

    await this.db.run(
      `INSERT INTO pos_cash_movements (
        id, tenant_id, shift_id, movement_type, amount, date_shamsi,
        description, created_by_user_id, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, tenantId, shiftId, data.movementType, amt.toFixed(0), dateShamsi, data.description || null, userId, now]
    );

    // محاسبه مانده انتظاری جدید
    let expectedDelta = new Decimal(0);
    if (data.movementType === CashMovementType.CASH_IN) {
      expectedDelta = amt;
    } else {
      expectedDelta = amt.negated();
    }

    const newExpected = new Decimal(shift.expected_cash_balance).plus(expectedDelta);
    await this.db.run(
      'UPDATE pos_shifts SET expected_cash_balance = ?, updated_at = ? WHERE id = ?',
      [newExpected.toFixed(0), now, shiftId]
    );

    return {
      id,
      shiftId,
      movementType: data.movementType,
      amount: amt.toFixed(0),
      expectedCashBalance: newExpected.toFixed(0)
    };
  }

  // ۴. گزارش میانی شیفت بدون بستن (X-Report)
  async getXReport(tenantId: string, companyId: string, shiftId: string) {
    const shift = await this.getShift(tenantId, companyId, shiftId);
    const cashMovements = await this.db.query(
      'SELECT * FROM pos_cash_movements WHERE shift_id = ? ORDER BY created_at ASC',
      [shiftId]
    );

    return {
      reportType: 'X_REPORT',
      shiftNumber: shift.shift_number,
      openedAt: shift.opened_at,
      status: shift.status,
      cashDeskTitle: shift.cash_desk_title,
      posTerminalTitle: shift.pos_terminal_title,
      openingCash: shift.opening_cash_balance,
      totalSalesCount: shift.total_sales_count,
      totalSalesAmount: shift.total_sales_amount,
      totalCashSales: shift.total_cash_sales,
      totalPosCardSales: shift.total_pos_card_sales,
      totalDiscount: shift.total_discount_amount,
      totalVat: shift.total_vat_amount,
      expectedCashInDrawer: shift.expected_cash_balance,
      cashMovements
    };
  }

  // ۵. بستن شیفت، گزارش Z و صدور سند دوبل تجمیعی روزانه (Daily Consolidated Journal Entry)
  async closeShift(
    tenantId: string,
    companyId: string,
    branchId: string,
    fiscalYearId: string,
    userId: string,
    shiftId: string,
    data: {
      dateShamsi: string;
      actualCashBalance: string | number;
      cashBreakdownClosing?: any;
    }
  ) {
    const shift = await this.getShift(tenantId, companyId, shiftId);
    if (shift.status === PosShiftStatus.CLOSED) {
      throw new BadRequestException('این شیفت پیش از این بسته شده است.');
    }

    const now = new Date().toISOString();
    const dateShamsi = data.dateShamsi || '1403/11/15';
    const actualCash = new Decimal(data.actualCashBalance);
    const expectedCash = new Decimal(shift.expected_cash_balance);
    const discrepancy = actualCash.minus(expectedCash); // منفی: کسری صندوق / مثبت: فزونی صندوق

    // استعلام تفصیلی‌های شناور صندوق و کارتخوان
    const cashDesk = await this.db.queryOne('SELECT floating_dimension_id FROM cash_desks WHERE id = ?', [shift.cash_desk_id]);
    const posTerminal = shift.pos_terminal_id
      ? await this.db.queryOne('SELECT floating_dimension_id FROM pos_terminals WHERE id = ?', [shift.pos_terminal_id])
      : null;

    const cashDimId = cashDesk?.floating_dimension_id || 'dim-cash-1';
    const posDimId = posTerminal?.floating_dimension_id || 'dim-pos-1';

    // صدور سند تجمیعی شیفت در صورتی که فروشی ثبت شده باشد
    let dailyJournalEntryId: string | undefined;
    let cogsJournalEntryId: string | undefined;
    let discrepancyJournalEntryId: string | undefined;

    const totalSalesAmt = new Decimal(shift.total_sales_amount);
    if (totalSalesAmt.greaterThan(0)) {
      // الف) سند تجمیعی فروش روزانه
      const shiftLines = PosPostingEngine.buildConsolidatedShiftLines({
        shiftNumber: shift.shift_number,
        dateShamsi,
        cashDeskDimensionId: cashDimId,
        posTerminalDimensionId: posDimId,
        totalCashSales: shift.total_cash_sales,
        totalPosCardSales: shift.total_pos_card_sales,
        totalDiscount: shift.total_discount_amount,
        totalGrossSales: new Decimal(shift.total_sales_amount).plus(new Decimal(shift.total_discount_amount)).minus(new Decimal(shift.total_vat_amount)).toFixed(0),
        totalVat: shift.total_vat_amount
      });

      const entry = await this.journalService.createEntry(
        tenantId,
        companyId,
        branchId,
        fiscalYearId,
        userId,
        {
          entryDateShamsi: dateShamsi,
          entryType: JournalEntryType.NORMAL,
          description: `سند تجمیعی فروش روزانه شیفت صندوق شماره ${shift.shift_number}`,
          sourceModule: 'POS_DAILY_SHIFT',
          sourceDocumentId: shift.id,
          lines: shiftLines
        }
      );
      dailyJournalEntryId = entry.id;

      // ب) سند بهای تمام‌شده تجمیعی شیفت (COGS)
      const cogsAmt = new Decimal(shift.total_cogs_amount || 0);
      if (cogsAmt.greaterThan(0)) {
        const cogsLines = PosPostingEngine.buildConsolidatedCogsLines(
          shift.shift_number,
          dateShamsi,
          cogsAmt.toFixed(0)
        );

        const cogsEntry = await this.journalService.createEntry(
          tenantId,
          companyId,
          branchId,
          fiscalYearId,
          userId,
          {
            entryDateShamsi: dateShamsi,
            entryType: JournalEntryType.NORMAL,
            description: `سند تجمیعی بهای تمام‌شده کالای فروش‌رفته شیفت شماره ${shift.shift_number}`,
            sourceModule: 'POS_COGS',
            sourceDocumentId: shift.id,
            lines: cogsLines
          }
        );
        cogsJournalEntryId = cogsEntry.id;
      }
    }

    // ج) سند تعدیل کسری یا فزونی نقدینگی صندوق در پایان شیفت
    if (!discrepancy.isZero()) {
      const discLines = PosPostingEngine.buildCashDiscrepancyLines(
        shift.shift_number,
        dateShamsi,
        cashDimId,
        discrepancy.toFixed(0)
      );

      const discEntry = await this.journalService.createEntry(
        tenantId,
        companyId,
        branchId,
        fiscalYearId,
        userId,
        {
          entryDateShamsi: dateShamsi,
          entryType: JournalEntryType.NORMAL,
          description: `سند تعدیل ${discrepancy.isNegative() ? 'کسری' : 'فزونی'} نقدینگی صندوق شیفت شماره ${shift.shift_number}`,
          sourceModule: 'POS_CASH_DISCREPANCY',
          sourceDocumentId: shift.id,
          lines: discLines
        }
      );
      discrepancyJournalEntryId = discEntry.id;
    }

    // بستن قطعی شیفت در دیتابیس
    await this.db.run(
      `UPDATE pos_shifts
       SET status = 'CLOSED',
           closed_at = ?,
           actual_cash_balance = ?,
           cash_discrepancy = ?,
           cash_breakdown_closing_json = ?,
           daily_journal_entry_id = ?,
           cogs_journal_entry_id = ?,
           discrepancy_journal_entry_id = ?,
           updated_at = ?
       WHERE id = ?`,
      [
        now,
        actualCash.toFixed(0),
        discrepancy.toFixed(0),
        data.cashBreakdownClosing ? JSON.stringify(data.cashBreakdownClosing) : null,
        dailyJournalEntryId || null,
        cogsJournalEntryId || null,
        discrepancyJournalEntryId || null,
        now,
        shiftId
      ]
    );

    return {
      reportType: 'Z_REPORT',
      shiftNumber: shift.shift_number,
      openedAt: shift.opened_at,
      closedAt: now,
      status: 'CLOSED',
      totalSalesCount: shift.total_sales_count,
      totalSalesAmount: shift.total_sales_amount,
      totalCashSales: shift.total_cash_sales,
      totalPosCardSales: shift.total_pos_card_sales,
      totalDiscountAmount: shift.total_discount_amount,
      totalVatAmount: shift.total_vat_amount,
      totalCogsAmount: shift.total_cogs_amount,
      expectedCashBalance: expectedCash.toFixed(0),
      actualCashBalance: actualCash.toFixed(0),
      cashDiscrepancy: discrepancy.toFixed(0),
      dailyJournalEntryId,
      cogsJournalEntryId,
      discrepancyJournalEntryId
    };
  }

  async getShift(tenantId: string, companyId: string, id: string) {
    const shift = await this.db.queryOne(
      `SELECT ps.*, cd.title as cash_desk_title, pt.title as pos_terminal_title
       FROM pos_shifts ps
       LEFT JOIN cash_desks cd ON ps.cash_desk_id = cd.id
       LEFT JOIN pos_terminals pt ON ps.pos_terminal_id = pt.id
       WHERE ps.tenant_id = ? AND ps.company_id = ? AND ps.id = ?`,
      [tenantId, companyId, id]
    );
    if (!shift) {
      throw new NotFoundException(`شیفت صندوق با شناسه ${id} یافت نشد.`);
    }
    return shift;
  }
}
