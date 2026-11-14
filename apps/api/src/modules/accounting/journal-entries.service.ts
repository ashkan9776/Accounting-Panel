import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import {
  JournalEngine,
  JournalEntryStatus,
  JournalEntryType,
  JournalLineInput,
  AccountSubsidiary,
  AuditHashChain
} from '@accounting/core';

@Injectable()
export class JournalEntriesService {
  constructor(private readonly db: DatabaseService) {}

  private async getSubsidiariesMap(tenantId: string, companyId: string): Promise<Map<string, AccountSubsidiary>> {
    const rows = await this.db.query(
      'SELECT * FROM account_subsidiaries WHERE tenant_id = ? AND company_id = ?',
      [tenantId, companyId]
    );
    const map = new Map<string, AccountSubsidiary>();
    for (const r of rows) {
      map.set(r.id, {
        id: r.id,
        headId: r.head_id,
        code: r.code,
        title: r.title,
        nature: r.nature,
        requiresFloatingDimension1: Boolean(r.requires_floating_dimension_1),
        allowedDimension1Type: r.allowed_dimension_1_type,
        requiresFloatingDimension2: Boolean(r.requires_floating_dimension_2),
        allowedDimension2Type: r.allowed_dimension_2_type,
        requiresFloatingDimension3: Boolean(r.requires_floating_dimension_3),
        allowedDimension3Type: r.allowed_dimension_3_type,
        isCurrencyDependent: Boolean(r.is_currency_dependent),
        isActive: Boolean(r.is_active)
      });
    }
    return map;
  }

  private async getLatestAuditHash(tenantId: string): Promise<string> {
    const latest = await this.db.queryOne(
      'SELECT current_hash FROM audit_logs WHERE tenant_id = ? ORDER BY rowid DESC LIMIT 1',
      [tenantId]
    );
    return latest?.current_hash || AuditHashChain.GENESIS_HASH;
  }

  async createEntry(
    tenantId: string,
    companyId: string,
    branchId: string,
    fiscalYearId: string,
    userId: string,
    data: {
      entryDateShamsi: string;
      entryType?: JournalEntryType;
      description: string;
      sourceModule?: string;
      sourceDocumentId?: string;
      lines: JournalLineInput[];
    }
  ) {
    // ۱. بررسی سال مالی و عدم قفل بودن آن
    const fy = await this.db.queryOne(
      'SELECT * FROM fiscal_years WHERE id = ? AND tenant_id = ? AND company_id = ?',
      [fiscalYearId, tenantId, companyId]
    );
    if (!fy) {
      throw new BadRequestException('سال مالی نامعتبر است.');
    }
    if (fy.is_closed || fy.is_locked) {
      throw new BadRequestException('سال مالی انتخاب شده بسته یا قفل است و امکان ثبت سند وجود ندارد.');
    }

    const subMap = await this.getSubsidiariesMap(tenantId, companyId);

    // ۲. محاسبه شماره عطف و شماره روزانه بعدی
    const maxSeqRow = await this.db.queryOne(
      'SELECT MAX(sequence_number) as max_seq FROM journal_entries WHERE tenant_id = ? AND fiscal_year_id = ?',
      [tenantId, fiscalYearId]
    );
    const nextSeq = (maxSeqRow?.max_seq || 0) + 1;

    const maxDailyRow = await this.db.queryOne(
      'SELECT MAX(daily_number) as max_daily FROM journal_entries WHERE tenant_id = ? AND fiscal_year_id = ? AND entry_date_shamsi = ?',
      [tenantId, fiscalYearId, data.entryDateShamsi]
    );
    const nextDaily = (maxDailyRow?.max_daily || 0) + 1;

    let idCounter = 1;
    const idGen = () => `entry-${Date.now()}-${idCounter++}`;

    // ۳. اعتبارسنجی حسابی و تولید مدل سند
    let domainEntry;
    try {
      domainEntry = JournalEngine.createEntry(
        {
          tenantId,
          companyId,
          branchId,
          fiscalYearId,
          entryDateShamsi: data.entryDateShamsi,
          entryType: data.entryType || JournalEntryType.NORMAL,
          description: data.description,
          sourceModule: data.sourceModule,
          sourceDocumentId: data.sourceDocumentId,
          createdByUserId: userId,
          lines: data.lines
        },
        nextSeq,
        nextDaily,
        idGen,
        subMap
      );
    } catch (err: any) {
      throw new BadRequestException(err.message);
    }

    // ۴. ثبت در پایگاه داده در قالب تراکنش ACID
    await this.db.transaction(async (tx) => {
      await tx.run(
        `INSERT INTO journal_entries (
          id, tenant_id, company_id, branch_id, fiscal_year_id,
          sequence_number, daily_number, entry_date_shamsi, entry_date_gregorian,
          entry_type, status, description, total_debit, total_credit,
          source_module, source_document_id, created_by_user_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          domainEntry.id,
          domainEntry.tenantId,
          domainEntry.companyId,
          domainEntry.branchId,
          domainEntry.fiscalYearId,
          domainEntry.sequenceNumber,
          domainEntry.dailyNumber,
          domainEntry.entryDateShamsi,
          domainEntry.entryDateGregorian.toISOString(),
          domainEntry.entryType,
          domainEntry.status,
          domainEntry.description,
          domainEntry.totalDebit,
          domainEntry.totalCredit,
          domainEntry.sourceModule || null,
          domainEntry.sourceDocumentId || null,
          domainEntry.createdByUserId,
          domainEntry.createdAt.toISOString(),
          domainEntry.updatedAt.toISOString()
        ]
      );

      for (const line of domainEntry.lines) {
        await tx.run(
          `INSERT INTO journal_lines (
            id, journal_entry_id, row_number, subsidiary_account_id,
            floating_dimension_1_id, floating_dimension_2_id, floating_dimension_3_id,
            debit, credit, description, currency_code, currency_rate
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            line.id,
            line.journalEntryId,
            line.rowNumber,
            line.subsidiaryAccountId,
            line.floatingDimension1Id || null,
            line.floatingDimension2Id || null,
            line.floatingDimension3Id || null,
            line.debit,
            line.credit,
            line.description,
            line.currencyCode,
            line.currencyRate
          ]
        );
      }

      // درج در زنجیره ممیزی
      const prevHash = await this.getLatestAuditHash(tenantId);
      const auditLog = AuditHashChain.createLogEntry(
        `audit-${Date.now()}`,
        tenantId,
        userId,
        'INSERT',
        'journal_entries',
        domainEntry.id,
        { sequenceNumber: domainEntry.sequenceNumber, totalDebit: domainEntry.totalDebit, description: domainEntry.description },
        prevHash
      );

      await tx.run(
        `INSERT INTO audit_logs (id, tenant_id, user_id, action, table_name, record_id, timestamp, previous_hash, current_hash, payload_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          auditLog.id,
          auditLog.tenantId,
          auditLog.userId,
          auditLog.action,
          auditLog.tableName,
          auditLog.recordId,
          auditLog.timestamp,
          auditLog.previousHash,
          auditLog.currentHash,
          JSON.stringify(auditLog.payload)
        ]
      );
    });

    return domainEntry;
  }

  async listEntries(
    tenantId: string,
    companyId: string,
    filters: {
      fiscalYearId?: string;
      status?: JournalEntryStatus;
      fromDateShamsi?: string;
      toDateShamsi?: string;
      limit?: number;
      offset?: number;
    }
  ) {
    let sql = 'SELECT * FROM journal_entries WHERE tenant_id = ? AND company_id = ?';
    const params: any[] = [tenantId, companyId];

    if (filters.fiscalYearId) {
      sql += ' AND fiscal_year_id = ?';
      params.push(filters.fiscalYearId);
    }
    if (filters.status) {
      sql += ' AND status = ?';
      params.push(filters.status);
    }
    if (filters.fromDateShamsi) {
      sql += ' AND entry_date_shamsi >= ?';
      params.push(filters.fromDateShamsi);
    }
    if (filters.toDateShamsi) {
      sql += ' AND entry_date_shamsi <= ?';
      params.push(filters.toDateShamsi);
    }

    sql += ' ORDER BY sequence_number DESC LIMIT ? OFFSET ?';
    params.push(filters.limit || 50, filters.offset || 0);

    const entries = await this.db.query(sql, params);
    return entries;
  }

  async getEntryById(tenantId: string, id: string) {
    const entry = await this.db.queryOne(
      'SELECT * FROM journal_entries WHERE tenant_id = ? AND id = ?',
      [tenantId, id]
    );
    if (!entry) {
      throw new NotFoundException('سند حسابداری مورد نظر یافت نشد.');
    }

    const lines = await this.db.query(
      `SELECT jl.*, sa.title as subsidiary_title, sa.code as subsidiary_code,
              fd1.title as floating_1_title, fd2.title as floating_2_title
       FROM journal_lines jl
       JOIN account_subsidiaries sa ON sa.id = jl.subsidiary_account_id
       LEFT JOIN floating_dimensions fd1 ON fd1.id = jl.floating_dimension_1_id
       LEFT JOIN floating_dimensions fd2 ON fd2.id = jl.floating_dimension_2_id
       WHERE jl.journal_entry_id = ?
       ORDER BY jl.row_number ASC`,
      [id]
    );

    return { ...entry, lines };
  }

  async approveEntry(tenantId: string, id: string, userId: string) {
    const entry = await this.getEntryById(tenantId, id);
    if (entry.status !== JournalEntryStatus.DRAFT) {
      throw new BadRequestException(`فقط اسناد در وضعیت پیش‌نویس قابل تایید هستند. وضعیت فعلی: ${entry.status}`);
    }

    const now = new Date().toISOString();
    await this.db.run(
      'UPDATE journal_entries SET status = ?, approved_by_user_id = ?, updated_at = ? WHERE id = ? AND tenant_id = ?',
      [JournalEntryStatus.APPROVED, userId, now, id, tenantId]
    );

    return { ...entry, status: JournalEntryStatus.APPROVED, approvedByUserId: userId };
  }

  async finalizeEntry(tenantId: string, id: string, userId: string) {
    const entry = await this.getEntryById(tenantId, id);
    if (entry.status !== JournalEntryStatus.APPROVED) {
      throw new BadRequestException('برای قطعی‌سازی و ثبت در دفاتر، سند باید ابتدا به تایید حسابدار برسد.');
    }

    // شماره قطعی بعدی دفتر روزنامه
    const maxPerm = await this.db.queryOne(
      'SELECT MAX(permanent_number) as max_p FROM journal_entries WHERE tenant_id = ? AND fiscal_year_id = ?',
      [tenantId, entry.fiscal_year_id]
    );
    const permanentNumber = (maxPerm?.max_p || 0) + 1;
    const now = new Date().toISOString();

    await this.db.transaction(async (tx) => {
      await tx.run(
        'UPDATE journal_entries SET status = ?, permanent_number = ?, updated_at = ? WHERE id = ? AND tenant_id = ?',
        [JournalEntryStatus.FINALIZED, permanentNumber, now, id, tenantId]
      );

      const prevHash = await this.getLatestAuditHash(tenantId);
      const auditLog = AuditHashChain.createLogEntry(
        `audit-${Date.now()}`,
        tenantId,
        userId,
        'FINALIZE',
        'journal_entries',
        id,
        { permanentNumber, sequenceNumber: entry.sequence_number },
        prevHash
      );

      await tx.run(
        `INSERT INTO audit_logs (id, tenant_id, user_id, action, table_name, record_id, timestamp, previous_hash, current_hash, payload_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          auditLog.id,
          auditLog.tenantId,
          auditLog.userId,
          auditLog.action,
          auditLog.tableName,
          auditLog.recordId,
          auditLog.timestamp,
          auditLog.previousHash,
          auditLog.currentHash,
          JSON.stringify(auditLog.payload)
        ]
      );
    });

    return { ...entry, status: JournalEntryStatus.FINALIZED, permanentNumber };
  }

  async reverseEntry(tenantId: string, id: string, userId: string, reversalDateShamsi: string, reason?: string) {
    const entry = await this.getEntryById(tenantId, id);
    if (entry.status !== JournalEntryStatus.FINALIZED && entry.status !== JournalEntryStatus.APPROVED) {
      throw new BadRequestException('تنها اسناد تایید شده یا قطعی قابلیت برگشت دارند.');
    }
    if (entry.reversal_entry_id) {
      throw new BadRequestException(`این سند قبلاً توسط سند معکوس ${entry.reversal_entry_id} اصلاح شده است.`);
    }

    const reversalLines: JournalLineInput[] = entry.lines.map((l: any) => ({
      subsidiaryAccountId: l.subsidiary_account_id,
      floatingDimension1Id: l.floating_dimension_1_id,
      floatingDimension2Id: l.floating_dimension_2_id,
      floatingDimension3Id: l.floating_dimension_3_id,
      debit: l.credit, // معکوس
      credit: l.debit, // معکوس
      description: `[سند برگشتی] ${l.description}`
    }));

    const reversalEntry = await this.createEntry(
      tenantId,
      entry.company_id,
      entry.branch_id,
      entry.fiscal_year_id,
      userId,
      {
        entryDateShamsi: reversalDateShamsi,
        entryType: JournalEntryType.REVERSAL,
        description: `برگشت سند شماره ${entry.sequence_number}: ${reason || entry.description}`,
        sourceModule: entry.source_module,
        sourceDocumentId: entry.source_document_id,
        lines: reversalLines
      }
    );

    // علامت‌گذاری سند اصلی به عنوان REVERSED
    await this.db.run(
      'UPDATE journal_entries SET status = ?, reversal_entry_id = ?, updated_at = ? WHERE id = ?',
      [JournalEntryStatus.REVERSED, reversalEntry.id, new Date().toISOString(), id]
    );

    return {
      originalEntryId: id,
      reversalEntry
    };
  }
}
