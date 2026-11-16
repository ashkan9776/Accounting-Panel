import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import {
  TrialBalanceEngine,
  GeneralLedgerEngine,
  JournalEntry,
  AccountSubsidiary,
  AccountHead,
  AccountGroup
} from '@accounting/core';

@Injectable()
export class ReportsService {
  constructor(private readonly db: DatabaseService) {}

  private async fetchAllEntriesWithLines(tenantId: string, companyId: string, fiscalYearId?: string): Promise<JournalEntry[]> {
    let sql = 'SELECT * FROM journal_entries WHERE tenant_id = ? AND company_id = ?';
    const params: any[] = [tenantId, companyId];
    if (fiscalYearId) {
      sql += ' AND fiscal_year_id = ?';
      params.push(fiscalYearId);
    }
    sql += ' ORDER BY sequence_number ASC';

    const entries = await this.db.query(sql, params);
    if (entries.length === 0) return [];

    const ids = entries.map((e: any) => e.id);
    const allLines = await this.db.query(
      `SELECT * FROM journal_lines WHERE journal_entry_id = ANY($1::text[]) ORDER BY row_number ASC`,
      [ids]
    );

    const linesByEntry = new Map<string, any[]>();
    for (const l of allLines) {
      const list = linesByEntry.get(l.journal_entry_id) || [];
      list.push({
        id: l.id,
        journalEntryId: l.journal_entry_id,
        rowNumber: l.row_number,
        subsidiaryAccountId: l.subsidiary_account_id,
        floatingDimension1Id: l.floating_dimension_1_id,
        floatingDimension2Id: l.floating_dimension_2_id,
        floatingDimension3Id: l.floating_dimension_3_id,
        debit: l.debit,
        credit: l.credit,
        description: l.description,
        currencyCode: l.currency_code,
        currencyRate: l.currency_rate
      });
      linesByEntry.set(l.journal_entry_id, list);
    }

    return entries.map((e: any) => ({
      id: e.id,
      tenantId: e.tenant_id,
      companyId: e.company_id,
      branchId: e.branch_id,
      fiscalYearId: e.fiscal_year_id,
      sequenceNumber: e.sequence_number,
      dailyNumber: e.daily_number,
      permanentNumber: e.permanent_number,
      entryDateShamsi: e.entry_date_shamsi,
      entryDateGregorian: new Date(e.entry_date_gregorian),
      entryType: e.entry_type,
      status: e.status,
      description: e.description,
      totalDebit: e.total_debit,
      totalCredit: e.total_credit,
      createdByUserId: e.created_by_user_id,
      createdAt: new Date(e.created_at),
      updatedAt: new Date(e.updated_at),
      lines: linesByEntry.get(e.id) || []
    }));
  }

  async getTrialBalance(
    tenantId: string,
    companyId: string,
    fiscalYearId?: string,
    level: 'SUBSIDIARY' | 'HEAD' | 'GROUP' = 'SUBSIDIARY',
    fromDateShamsi?: string,
    toDateShamsi?: string
  ) {
    const [entries, rawSubs, rawHeads, rawGroups] = await Promise.all([
      this.fetchAllEntriesWithLines(tenantId, companyId, fiscalYearId),
      this.db.query('SELECT * FROM account_subsidiaries WHERE tenant_id = ? AND company_id = ?', [tenantId, companyId]),
      this.db.query('SELECT * FROM account_heads WHERE tenant_id = ? AND company_id = ?', [tenantId, companyId]),
      this.db.query('SELECT * FROM account_groups WHERE tenant_id = ? AND company_id = ?', [tenantId, companyId])
    ]);

    const subsidiaries: AccountSubsidiary[] = rawSubs.map((r: any) => ({
      id: r.id,
      headId: r.head_id,
      code: r.code,
      title: r.title,
      nature: r.nature,
      requiresFloatingDimension1: Boolean(r.requires_floating_dimension_1),
      requiresFloatingDimension2: Boolean(r.requires_floating_dimension_2),
      requiresFloatingDimension3: Boolean(r.requires_floating_dimension_3),
      isCurrencyDependent: Boolean(r.is_currency_dependent),
      isActive: Boolean(r.is_active)
    }));

    const heads: AccountHead[] = rawHeads.map((r: any) => ({
      id: r.id,
      groupId: r.group_id,
      code: r.code,
      title: r.title,
      nature: r.nature
    }));

    const groups: AccountGroup[] = rawGroups.map((r: any) => ({
      id: r.id,
      code: r.code,
      title: r.title,
      nature: r.nature
    }));

    return TrialBalanceEngine.generateTrialBalance(
      entries,
      subsidiaries,
      heads,
      groups,
      level,
      true,
      { fromDateShamsi, toDateShamsi }
    );
  }

  async getGeneralJournal(tenantId: string, companyId: string, fiscalYearId?: string) {
    const [entries, rawSubs] = await Promise.all([
      this.fetchAllEntriesWithLines(tenantId, companyId, fiscalYearId),
      this.db.query('SELECT * FROM account_subsidiaries WHERE tenant_id = ? AND company_id = ?', [tenantId, companyId])
    ]);
    const subsidiaries: AccountSubsidiary[] = rawSubs.map((r: any) => ({
      id: r.id,
      headId: r.head_id,
      code: r.code,
      title: r.title,
      nature: r.nature,
      requiresFloatingDimension1: Boolean(r.requires_floating_dimension_1),
      requiresFloatingDimension2: Boolean(r.requires_floating_dimension_2),
      requiresFloatingDimension3: Boolean(r.requires_floating_dimension_3),
      isCurrencyDependent: Boolean(r.is_currency_dependent),
      isActive: Boolean(r.is_active)
    }));
    return GeneralLedgerEngine.extractGeneralJournal(entries, subsidiaries);
  }

  async getSubsidiaryLedger(
    tenantId: string,
    companyId: string,
    subsidiaryId: string,
    fiscalYearId?: string,
    floatingDimensionId?: string
  ) {
    const sub = await this.db.queryOne(
      'SELECT * FROM account_subsidiaries WHERE id = ? AND tenant_id = ? AND company_id = ?',
      [subsidiaryId, tenantId, companyId]
    );
    if (!sub) {
      throw new NotFoundException('حساب معین مورد نظر یافت نشد.');
    }

    const entries = await this.fetchAllEntriesWithLines(tenantId, companyId, fiscalYearId);

    const subsidiaryObj: AccountSubsidiary = {
      id: sub.id,
      headId: sub.head_id,
      code: sub.code,
      title: sub.title,
      nature: sub.nature,
      requiresFloatingDimension1: Boolean(sub.requires_floating_dimension_1),
      requiresFloatingDimension2: Boolean(sub.requires_floating_dimension_2),
      requiresFloatingDimension3: Boolean(sub.requires_floating_dimension_3),
      isCurrencyDependent: Boolean(sub.is_currency_dependent),
      isActive: Boolean(sub.is_active)
    };

    return GeneralLedgerEngine.extractSubsidiaryLedger(subsidiaryObj, entries, floatingDimensionId);
  }
}
