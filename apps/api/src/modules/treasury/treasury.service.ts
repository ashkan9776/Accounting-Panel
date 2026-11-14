import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { JournalEntriesService } from '../accounting/journal-entries.service';
import { FloatingDimensionType, ChequePostingEngine } from '@accounting/core';

@Injectable()
export class TreasuryService {
  constructor(
    private readonly db: DatabaseService,
    private readonly journalService: JournalEntriesService
  ) {}

  // ۱. حساب‌های بانکی
  async createBankAccount(
    tenantId: string,
    companyId: string,
    data: {
      bankName: string;
      branchName?: string;
      branchCode?: string;
      accountNumber: string;
      iban?: string;
      cardNumber?: string;
      initialBalance?: string | number;
    }
  ) {
    const id = `bank-${Date.now()}`;
    const now = new Date().toISOString();

    // ایجاد تفصیلی شناور بانکی
    const maxCodeRow = await this.db.queryOne(
      "SELECT MAX(CAST(code AS INTEGER)) as max_code FROM floating_dimensions WHERE tenant_id = ? AND dimension_type = 'BANK_ACCOUNT'",
      [tenantId]
    );
    const nextCode = ((maxCodeRow?.max_code || 300000) + 1).toString();
    const floatingDimId = `dim-bank-${Date.now()}`;

    await this.db.transaction(async (tx) => {
      await tx.run(
        `INSERT INTO floating_dimensions (id, tenant_id, company_id, dimension_type, code, title, reference_id, is_active, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)`,
        [floatingDimId, tenantId, companyId, FloatingDimensionType.BANK_ACCOUNT, nextCode, `${data.bankName} - ${data.accountNumber}`, id, now]
      );

      await tx.run(
        `INSERT INTO bank_accounts (
          id, tenant_id, company_id, bank_name, branch_name, branch_code,
          account_number, iban, card_number, floating_dimension_id, initial_balance, is_active, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
        [
          id,
          tenantId,
          companyId,
          data.bankName,
          data.branchName || null,
          data.branchCode || null,
          data.accountNumber,
          data.iban || null,
          data.cardNumber || null,
          floatingDimId,
          data.initialBalance ? data.initialBalance.toString() : '0',
          now
        ]
      );
    });

    return { id, bankName: data.bankName, accountNumber: data.accountNumber, floatingDimensionId: floatingDimId };
  }

  async listBankAccounts(tenantId: string, companyId: string) {
    return this.db.query(
      `SELECT ba.*, fd.code as dimension_code
       FROM bank_accounts ba
       LEFT JOIN floating_dimensions fd ON fd.id = ba.floating_dimension_id
       WHERE ba.tenant_id = ? AND ba.company_id = ? AND ba.is_active = 1`,
      [tenantId, companyId]
    );
  }

  // ۲. صندوق‌ها
  async createCashDesk(
    tenantId: string,
    companyId: string,
    branchId: string,
    data: {
      code: string;
      title: string;
      initialBalance?: string | number;
    }
  ) {
    const id = `cash-${Date.now()}`;
    const now = new Date().toISOString();
    const floatingDimId = `dim-cash-${Date.now()}`;

    await this.db.transaction(async (tx) => {
      await tx.run(
        `INSERT INTO floating_dimensions (id, tenant_id, company_id, dimension_type, code, title, reference_id, is_active, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)`,
        [floatingDimId, tenantId, companyId, FloatingDimensionType.CASH_DESK, data.code, data.title, id, now]
      );

      await tx.run(
        `INSERT INTO cash_desks (id, tenant_id, company_id, branch_id, code, title, floating_dimension_id, initial_balance, is_active, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
        [id, tenantId, companyId, branchId, data.code, data.title, floatingDimId, data.initialBalance ? data.initialBalance.toString() : '0', now]
      );
    });

    return { id, code: data.code, title: data.title, floatingDimensionId: floatingDimId };
  }

  async listCashDesks(tenantId: string, companyId: string) {
    return this.db.query(
      `SELECT cd.*, fd.code as dimension_code
       FROM cash_desks cd
       LEFT JOIN floating_dimensions fd ON fd.id = cd.floating_dimension_id
       WHERE cd.tenant_id = ? AND cd.company_id = ? AND cd.is_active = 1`,
      [tenantId, companyId]
    );
  }

  // ۳. تنخواه‌گردان‌ها
  async createPettyCashFund(
    tenantId: string,
    companyId: string,
    branchId: string,
    data: {
      code: string;
      title: string;
      custodianPartyId: string;
      ceilingAmount: string | number;
    }
  ) {
    const id = `petty-${Date.now()}`;
    const now = new Date().toISOString();

    const custodian = await this.db.queryOne('SELECT floating_dimension_id FROM parties WHERE id = ?', [data.custodianPartyId]);
    if (!custodian) {
      throw new BadRequestException('شخص تنخواه‌دار یافت نشد.');
    }

    await this.db.run(
      `INSERT INTO petty_cash_funds (id, tenant_id, company_id, branch_id, code, title, custodian_party_id, ceiling_amount, floating_dimension_id, is_active, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
      [id, tenantId, companyId, branchId, data.code, data.title, data.custodianPartyId, data.ceilingAmount.toString(), custodian.floating_dimension_id, now]
    );

    return { id, code: data.code, title: data.title, custodianPartyId: data.custodianPartyId };
  }

  async listPettyCashFunds(tenantId: string, companyId: string) {
    return this.db.query(
      `SELECT pcf.*, p.name as custodian_name
       FROM petty_cash_funds pcf
       JOIN parties p ON p.id = pcf.custodian_party_id
       WHERE pcf.tenant_id = ? AND pcf.company_id = ? AND pcf.is_active = 1`,
      [tenantId, companyId]
    );
  }

  // ۴. انتقال وجه بین حساب‌ها (بانک به صندوق، صندوق به بانک و ...)
  async transferMoney(
    tenantId: string,
    companyId: string,
    branchId: string,
    fiscalYearId: string,
    userId: string,
    data: {
      sourceType: 'BANK' | 'CASH' | 'PETTY';
      sourceId: string;
      destType: 'BANK' | 'CASH' | 'PETTY';
      destId: string;
      amount: string | number;
      transferDateShamsi: string;
      trackingCode?: string;
      description?: string;
    }
  ) {
    // تعیین معین‌ها و تفصیلی‌های مبدا و مقصد
    let sourceSub = 'sub-1103'; // بانک
    let destSub = 'sub-1101';   // صندوق
    let sourceDimId = data.sourceId;
    let destDimId = data.destId;

    if (data.sourceType === 'CASH') sourceSub = 'sub-1101';
    if (data.sourceType === 'PETTY') sourceSub = 'sub-1102';

    if (data.destType === 'BANK') destSub = 'sub-1103';
    if (data.destType === 'PETTY') destSub = 'sub-1102';

    // صدور سند حسابداری انتقال وجه
    const lines = ChequePostingEngine.buildMoneyTransferLines(
      sourceSub,
      sourceDimId,
      destSub,
      destDimId,
      data.amount,
      data.description || 'انتقال وجه بین حساب‌ها'
    );

    const entry = await this.journalService.createEntry(tenantId, companyId, branchId, fiscalYearId, userId, {
      entryDateShamsi: data.transferDateShamsi,
      description: `انتقال وجه از ${data.sourceType} به ${data.destType}: ${data.description || ''}`,
      lines
    });

    // تایید و قطعی‌سازی سند انتقال
    await this.journalService.approveEntry(tenantId, entry.id, userId);
    await this.journalService.finalizeEntry(tenantId, entry.id, userId);

    const transferId = `trans-${Date.now()}`;
    const now = new Date().toISOString();

    await this.db.run(
      `INSERT INTO money_transfers (id, tenant_id, company_id, branch_id, source_type, source_dimension_id, dest_type, dest_dimension_id, amount, transfer_date_shamsi, tracking_code, journal_entry_id, description, created_by_user_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        transferId,
        tenantId,
        companyId,
        branchId,
        data.sourceType,
        sourceDimId,
        data.destType,
        destDimId,
        data.amount.toString(),
        data.transferDateShamsi,
        data.trackingCode || null,
        entry.id,
        data.description || null,
        userId,
        now
      ]
    );

    return {
      transferId,
      journalEntryId: entry.id,
      amount: data.amount,
      sourceType: data.sourceType,
      destType: data.destType
    };
  }

  // ۵. تطبیق بانکی (Bank Statement Reconciliation)
  async importBankStatement(
    tenantId: string,
    companyId: string,
    bankAccountId: string,
    rows: {
      statementDateShamsi: string;
      referenceNumber?: string;
      debit?: string | number;
      credit?: string | number;
      balance?: string | number;
      description?: string;
    }[]
  ) {
    const now = new Date().toISOString();
    let imported = 0;

    for (const r of rows) {
      const id = `stmt-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      await this.db.run(
        `INSERT INTO bank_statements (id, tenant_id, company_id, bank_account_id, statement_date_shamsi, reference_number, debit, credit, balance, description, is_reconciled, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
        [
          id,
          tenantId,
          companyId,
          bankAccountId,
          r.statementDateShamsi,
          r.referenceNumber || null,
          r.debit ? r.debit.toString() : '0',
          r.credit ? r.credit.toString() : '0',
          r.balance ? r.balance.toString() : '0',
          r.description || null,
          now
        ]
      );
      imported++;
    }

    return { importedCount: imported };
  }

  async getBankStatement(tenantId: string, bankAccountId: string) {
    return this.db.query(
      'SELECT * FROM bank_statements WHERE tenant_id = ? AND bank_account_id = ? ORDER BY statement_date_shamsi DESC',
      [tenantId, bankAccountId]
    );
  }
}
