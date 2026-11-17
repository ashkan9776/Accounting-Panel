import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { DatabaseService } from '../../database/database.service';
import { JournalEntriesService } from '../accounting/journal-entries.service';
import { AccountMappingService } from '../accounting/account-mapping.service';
import {
  ChequeDirection,
  ChequeStatus,
  PostingPolicy,
  MockSayadAdapter,
  ChequePostingEngine,
  AuditHashChain
} from '@accounting/core';

@Injectable()
export class ChequesService {
  private sayadAdapter = new MockSayadAdapter();

  constructor(
    private readonly db: DatabaseService,
    private readonly journalService: JournalEntriesService,
    private readonly accountMapping: AccountMappingService
  ) {}

  async inquireSayad(sayadId: string) {
    return this.sayadAdapter.inquireCheque(sayadId);
  }

  async registerCheque(
    tenantId: string,
    companyId: string,
    branchId: string,
    fiscalYearId: string,
    userId: string,
    data: {
      chequeDirection: ChequeDirection;
      sayadId: string;
      chequeSerialNumber: string;
      bankName: string;
      bankBranchName?: string;
      drawerIban?: string;
      drawerPartyId?: string;
      payeePartyId?: string;
      amount: string | number;
      issueDateShamsi: string;
      dueDateShamsi: string;
      postingPolicy?: PostingPolicy;
      isGuarantee?: boolean;
      description?: string;
      bankDimensionId?: string; // برای چک پرداختی
    }
  ) {
    // ۱. استعلام و اعتبارسنجی اولیه شناسه صیاد
    const inquiry = await this.sayadAdapter.inquireCheque(data.sayadId);
    if (!inquiry.isValid) {
      throw new BadRequestException(inquiry.message);
    }

    const chequeId = randomUUID();
    const now = new Date().toISOString();
    const policy = data.postingPolicy || PostingPolicy.AUTO_POST;
    const initialStatus = data.chequeDirection === ChequeDirection.RECEIVABLE ? ChequeStatus.AT_HAND : 'ISSUED';

    let journalEntryId: string | undefined;

    // ۲. واکشی اطلاعات تفصیلی طرف‌های حساب
    let drawerDimId: string | undefined;
    let payeeDimId: string | undefined;

    if (data.drawerPartyId) {
      const p = await this.db.queryOne('SELECT floating_dimension_id FROM parties WHERE id = ? AND tenant_id = ?', [data.drawerPartyId, tenantId]);
      drawerDimId = p?.floating_dimension_id;
    }
    if (data.payeePartyId) {
      const p = await this.db.queryOne('SELECT floating_dimension_id FROM parties WHERE id = ? AND tenant_id = ?', [data.payeePartyId, tenantId]);
      payeeDimId = p?.floating_dimension_id;
    }

    // ۳. صدور سند حسابداری در صورت فعال بودن policy
    if (policy !== PostingPolicy.MANUAL) {
      const [arId, apId, bankId] = await Promise.all([
        this.accountMapping.getAccount(tenantId, companyId, 'AR', 'sub-1301'),
        this.accountMapping.getAccount(tenantId, companyId, 'AP', 'sub-3201'),
        this.accountMapping.getAccount(tenantId, companyId, 'BANK', 'sub-1103'),
      ]);

      if (data.isGuarantee) {
        // چک ضمانتی (حساب‌های انتظامی)
        const lines = ChequePostingEngine.buildGuaranteeLines({
          amount: data.amount,
          chequeSerialNumber: data.chequeSerialNumber,
          drawerPartyDimensionId: drawerDimId || 'dim-cust-1'
        });

        const entry = await this.journalService.createEntry(tenantId, companyId, branchId, fiscalYearId, userId, {
          entryDateShamsi: data.issueDateShamsi,
          description: `ثبت چک ضمانتی شماره ${data.chequeSerialNumber}`,
          lines
        });
        journalEntryId = entry.id;
      } else if (data.chequeDirection === ChequeDirection.RECEIVABLE && drawerDimId) {
        // دریافت چک از مشتری (تسویه بدهکاران)
        const lines = ChequePostingEngine.buildReceivableReceiptLines({
          amount: data.amount,
          chequeSerialNumber: data.chequeSerialNumber,
          sayadId: data.sayadId,
          drawerPartyDimensionId: drawerDimId,
          accountsReceivableAccountId: arId
        });

        const entry = await this.journalService.createEntry(tenantId, companyId, branchId, fiscalYearId, userId, {
          entryDateShamsi: data.issueDateShamsi,
          description: `دریافت چک صیادی شماره ${data.chequeSerialNumber} از طرف حساب`,
          lines
        });
        journalEntryId = entry.id;
      } else if (data.chequeDirection === ChequeDirection.PAYABLE && payeeDimId && data.bankDimensionId) {
        // صدور چک پرداختی عهده بانک به تامین‌کننده
        const lines = ChequePostingEngine.buildIssuePayableLines({
          amount: data.amount,
          chequeSerialNumber: data.chequeSerialNumber,
          sayadId: data.sayadId,
          drawerPartyDimensionId: drawerDimId || '',
          payeePartyDimensionId: payeeDimId,
          bankDimensionId: data.bankDimensionId,
          accountsPayableAccountId: apId
        });

        const entry = await this.journalService.createEntry(tenantId, companyId, branchId, fiscalYearId, userId, {
          entryDateShamsi: data.issueDateShamsi,
          description: `صدور چک پرداختی شماره ${data.chequeSerialNumber} در وجه بستانکار`,
          lines
        });
        journalEntryId = entry.id;
      }

      // اگر سیاست AUTO_POST است، سند را تایید و قطعی می‌کنیم
      if (policy === PostingPolicy.AUTO_POST && journalEntryId) {
        await this.journalService.approveEntry(tenantId, journalEntryId, userId);
        await this.journalService.finalizeEntry(tenantId, journalEntryId, userId);
      }
    }

    // ۴. ذخیره رکورد چک
    await this.db.run(
      `INSERT INTO cheques (
        id, tenant_id, company_id, branch_id, cheque_direction, sayad_id, cheque_serial_number,
        bank_name, bank_branch_name, drawer_iban, drawer_party_id, payee_party_id,
        amount, issue_date_shamsi, due_date_shamsi, current_status,
        posting_policy, latest_journal_entry_id, sayad_status, sayad_color, is_guarantee,
        description, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        chequeId,
        tenantId,
        companyId,
        branchId,
        data.chequeDirection,
        data.sayadId,
        data.chequeSerialNumber,
        data.bankName,
        data.bankBranchName || null,
        data.drawerIban || null,
        data.drawerPartyId || null,
        data.payeePartyId || null,
        data.amount.toString(),
        data.issueDateShamsi,
        data.dueDateShamsi,
        initialStatus,
        policy,
        journalEntryId || null,
        'INQUIRED',
        inquiry.color,
        Boolean(data.isGuarantee),
        data.description || null,
        now,
        now
      ]
    );

    // ثبت در تاریخچه
    await this.db.run(
      `INSERT INTO cheque_status_history (id, cheque_id, from_status, to_status, action_date_shamsi, journal_entry_id, description, created_by_user_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        randomUUID(),
        chequeId,
        'NONE',
        initialStatus,
        data.issueDateShamsi,
        journalEntryId || null,
        'ثبت و دریافت اولیه چک',
        userId,
        now
      ]
    );

    return {
      id: chequeId,
      sayadId: data.sayadId,
      chequeSerialNumber: data.chequeSerialNumber,
      status: initialStatus,
      color: inquiry.color,
      journalEntryId
    };
  }

  async changeStatus(
    tenantId: string,
    companyId: string,
    branchId: string,
    fiscalYearId: string,
    userId: string,
    chequeId: string,
    data: {
      toStatus: ChequeStatus;
      actionDateShamsi: string;
      bankDimensionId?: string; // برای واگذاری یا وصول
      payeePartyDimensionId?: string; // برای خرج چک
      description?: string;
    }
  ) {
    const cheque = await this.db.queryOne('SELECT * FROM cheques WHERE tenant_id = ? AND id = ?', [tenantId, chequeId]);
    if (!cheque) {
      throw new NotFoundException('چک مورد نظر یافت نشد.');
    }

    const fromStatus = cheque.current_status;
    const policy = cheque.posting_policy as PostingPolicy;
    let journalEntryId: string | undefined;

    // واکشی تفصیلی صادرکننده
    let drawerDimId: string | undefined;
    if (cheque.drawer_party_id) {
      const p = await this.db.queryOne('SELECT floating_dimension_id FROM parties WHERE id = ? AND tenant_id = ?', [cheque.drawer_party_id, tenantId]);
      drawerDimId = p?.floating_dimension_id;
    }

    // تولید آرتیکل‌های سند حسابداری متناسب با تغییر وضعیت
    if (policy !== PostingPolicy.MANUAL) {
      const [bankId, apId] = await Promise.all([
        this.accountMapping.getAccount(tenantId, companyId, 'BANK', 'sub-1103'),
        this.accountMapping.getAccount(tenantId, companyId, 'AP', 'sub-3201'),
      ]);

      let lines;

      if (data.toStatus === ChequeStatus.IN_CLEARING) {
        // واگذاری به بانک (خواباندن چک)
        lines = ChequePostingEngine.buildDepositToBankLines({
          amount: cheque.amount,
          chequeSerialNumber: cheque.cheque_serial_number,
          drawerPartyDimensionId: drawerDimId || 'dim-cust-1',
          bankDimensionId: data.bankDimensionId || 'dim-bank-1'
        });
      } else if (data.toStatus === ChequeStatus.CLEARED) {
        if (cheque.cheque_direction === ChequeDirection.RECEIVABLE) {
          // وصول چک دریافتی
          lines = ChequePostingEngine.buildClearReceivableLines({
            amount: cheque.amount,
            chequeSerialNumber: cheque.cheque_serial_number,
            drawerPartyDimensionId: drawerDimId || 'dim-cust-1',
            bankDimensionId: data.bankDimensionId || 'dim-bank-1',
            bankAccountId: bankId
          });
        } else {
          // پاس شدن چک پرداختی
          lines = ChequePostingEngine.buildClearPayableLines({
            amount: cheque.amount,
            chequeSerialNumber: cheque.cheque_serial_number,
            drawerPartyDimensionId: drawerDimId || '',
            bankDimensionId: data.bankDimensionId || 'dim-bank-1',
            bankAccountId: bankId
          });
        }
      } else if (data.toStatus === ChequeStatus.BOUNCED) {
        // برگشت چک
        lines = ChequePostingEngine.buildBounceReceivableLines({
          amount: cheque.amount,
          chequeSerialNumber: cheque.cheque_serial_number,
          drawerPartyDimensionId: drawerDimId || 'dim-cust-1',
          bankDimensionId: data.bankDimensionId || 'dim-bank-1'
        });
      } else if (data.toStatus === ChequeStatus.TRANSFERRED) {
        // خرج چک به شخص ثالث
        lines = ChequePostingEngine.buildTransferOutLines({
          amount: cheque.amount,
          chequeSerialNumber: cheque.cheque_serial_number,
          drawerPartyDimensionId: drawerDimId || 'dim-cust-1',
          payeePartyDimensionId: data.payeePartyDimensionId || 'dim-supp-1',
          accountsPayableAccountId: apId
        });
      }

      if (lines) {
        const entry = await this.journalService.createEntry(tenantId, companyId, branchId, fiscalYearId, userId, {
          entryDateShamsi: data.actionDateShamsi,
          description: `تغییر وضعیت چک ${cheque.cheque_serial_number} از ${fromStatus} به ${data.toStatus}`,
          lines
        });
        journalEntryId = entry.id;

        if (policy === PostingPolicy.AUTO_POST) {
          await this.journalService.approveEntry(tenantId, journalEntryId, userId);
          await this.journalService.finalizeEntry(tenantId, journalEntryId, userId);
        }
      }
    }

    const now = new Date().toISOString();

    // به‌روزرسانی وضعیت چک
    await this.db.run(
      `UPDATE cheques SET current_status = ?, latest_journal_entry_id = ?, updated_at = ? WHERE id = ? AND tenant_id = ?`,
      [data.toStatus, journalEntryId || cheque.latest_journal_entry_id, now, chequeId, tenantId]
    );

    // ثبت تاریخچه
    await this.db.run(
      `INSERT INTO cheque_status_history (id, cheque_id, from_status, to_status, action_date_shamsi, journal_entry_id, description, created_by_user_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        randomUUID(),
        chequeId,
        fromStatus,
        data.toStatus,
        data.actionDateShamsi,
        journalEntryId || null,
        data.description || `تغییر وضعیت به ${data.toStatus}`,
        userId,
        now
      ]
    );

    return {
      chequeId,
      fromStatus,
      toStatus: data.toStatus,
      journalEntryId
    };
  }

  async listCheques(
    tenantId: string,
    companyId: string,
    filters: {
      direction?: ChequeDirection;
      status?: ChequeStatus;
      dueFromDate?: string;
      dueToDate?: string;
      limit?: number;
      offset?: number;
    }
  ) {
    let sql = `
      SELECT c.*, dp.name as drawer_name, pp.name as payee_name
      FROM cheques c
      LEFT JOIN parties dp ON dp.id = c.drawer_party_id
      LEFT JOIN parties pp ON pp.id = c.payee_party_id
      WHERE c.tenant_id = ? AND c.company_id = ?
    `;
    const params: any[] = [tenantId, companyId];

    if (filters.direction) {
      sql += ' AND c.cheque_direction = ?';
      params.push(filters.direction);
    }
    if (filters.status) {
      sql += ' AND c.current_status = ?';
      params.push(filters.status);
    }
    if (filters.dueFromDate) {
      sql += ' AND c.due_date_shamsi >= ?';
      params.push(filters.dueFromDate);
    }
    if (filters.dueToDate) {
      sql += ' AND c.due_date_shamsi <= ?';
      params.push(filters.dueToDate);
    }

    sql += ' ORDER BY c.due_date_shamsi ASC LIMIT ? OFFSET ?';
    params.push(filters.limit || 50, filters.offset || 0);

    return this.db.query(sql, params);
  }

  async getChequeById(tenantId: string, id: string) {
    const cheque = await this.db.queryOne(
      `SELECT c.*, dp.name as drawer_name, pp.name as payee_name
       FROM cheques c
       LEFT JOIN parties dp ON dp.id = c.drawer_party_id
       LEFT JOIN parties pp ON pp.id = c.payee_party_id
       WHERE c.tenant_id = ? AND c.id = ?`,
      [tenantId, id]
    );
    if (!cheque) {
      throw new NotFoundException('چک مورد نظر یافت نشد.');
    }

    const history = await this.db.query(
      'SELECT * FROM cheque_status_history WHERE cheque_id = ? ORDER BY created_at ASC',
      [id]
    );

    return { ...cheque, history };
  }
}
