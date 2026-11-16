import Decimal from 'decimal.js';
import { JournalEntry, JournalEntryStatus } from '../journal/types';
import { AccountSubsidiary, AccountHead } from '../chart-of-accounts/types';

Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

export interface LedgerTransactionRow {
  entryDateShamsi: string;
  sequenceNumber: number;
  permanentNumber?: number;
  description: string;
  floatingDimension1Title?: string;
  floatingDimension2Title?: string;
  debit: string;
  credit: string;
  balanceDebit: string;
  balanceCredit: string;
}

export interface AccountLedgerReport {
  accountCode: string;
  accountTitle: string;
  openingBalanceDebit: string;
  openingBalanceCredit: string;
  transactions: LedgerTransactionRow[];
  totalDebit: string;
  totalCredit: string;
  closingBalanceDebit: string;
  closingBalanceCredit: string;
}

export class GeneralLedgerEngine {
  /**
   * استخراج دفتر روزنامه رسمی (General Journal) با ردیف‌های پیوسته
   */
  public static extractGeneralJournal(
    entries: JournalEntry[],
    subsidiaries?: AccountSubsidiary[]
  ): {
    rows: {
      sequenceNumber: number;
      permanentNumber?: number;
      entryDateShamsi: string;
      description: string;
      subsidiaryCode: string;
      subsidiaryTitle: string;
      subsidiaryAccountId?: string;
      debit: string;
      credit: string;
    }[];
    totalDebit: string;
    totalCredit: string;
  } {
    const sortedEntries = [...entries].sort((a, b) => a.sequenceNumber - b.sequenceNumber);
    const subMap = subsidiaries ? new Map(subsidiaries.map(s => [s.id, s])) : null;
    let totalDebit = new Decimal(0);
    let totalCredit = new Decimal(0);
    const rows: any[] = [];

    for (const entry of sortedEntries) {
      if (
        entry.status !== JournalEntryStatus.APPROVED &&
        entry.status !== JournalEntryStatus.FINALIZED &&
        entry.status !== JournalEntryStatus.REVERSED
      ) {
        continue;
      }

      for (const line of entry.lines) {
        const d = new Decimal(line.debit);
        const c = new Decimal(line.credit);
        totalDebit = totalDebit.plus(d);
        totalCredit = totalCredit.plus(c);

        const sub = subMap?.get(line.subsidiaryAccountId);
        const code = (line as any).subsidiaryCode || sub?.code || line.subsidiaryAccountId;
        const title = (line as any).subsidiaryTitle || sub?.title || '';

        rows.push({
          sequenceNumber: entry.sequenceNumber,
          permanentNumber: entry.permanentNumber,
          entryDateShamsi: entry.entryDateShamsi,
          description: line.description || entry.description,
          subsidiaryCode: code,
          subsidiaryTitle: title,
          subsidiaryAccountId: line.subsidiaryAccountId,
          debit: line.debit,
          credit: line.credit
        });
      }
    }

    return {
      rows,
      totalDebit: totalDebit.toFixed(0),
      totalCredit: totalCredit.toFixed(0)
    };
  }

  /**
   * استخراج دفتر معین (Subsidiary Ledger) برای یک حساب معین با محاسبه لحظه‌ای مانده
   */
  public static extractSubsidiaryLedger(
    subsidiary: AccountSubsidiary,
    entries: JournalEntry[],
    filterFloatingDimensionId?: string
  ): AccountLedgerReport {
    const transactions: LedgerTransactionRow[] = [];
    let runningBalance = new Decimal(0); // مثبت: بدهکار، منفی: بستانکار
    let sumDebit = new Decimal(0);
    let sumCredit = new Decimal(0);

    // مرتب‌سازی اسناد بر اساس شماره عطف/تاریخ
    const sortedEntries = [...entries].sort((a, b) => a.sequenceNumber - b.sequenceNumber);

    for (const entry of sortedEntries) {
      if (
        entry.status !== JournalEntryStatus.APPROVED &&
        entry.status !== JournalEntryStatus.FINALIZED &&
        entry.status !== JournalEntryStatus.REVERSED
      ) {
        continue;
      }

      for (const line of entry.lines) {
        if (line.subsidiaryAccountId !== subsidiary.id) continue;

        if (filterFloatingDimensionId && line.floatingDimension1Id !== filterFloatingDimensionId) {
          continue;
        }

        const d = new Decimal(line.debit);
        const c = new Decimal(line.credit);

        sumDebit = sumDebit.plus(d);
        sumCredit = sumCredit.plus(c);

        runningBalance = runningBalance.plus(d).minus(c);

        const balDebit = runningBalance.isPositive() && !runningBalance.isZero() ? runningBalance.toFixed(0) : '0';
        const balCredit = runningBalance.isNegative() ? runningBalance.abs().toFixed(0) : '0';

        transactions.push({
          entryDateShamsi: entry.entryDateShamsi,
          sequenceNumber: entry.sequenceNumber,
          permanentNumber: entry.permanentNumber,
          description: line.description || entry.description,
          debit: line.debit,
          credit: line.credit,
          balanceDebit: balDebit,
          balanceCredit: balCredit
        });
      }
    }

    const closeDebit = runningBalance.isPositive() && !runningBalance.isZero() ? runningBalance.toFixed(0) : '0';
    const closeCredit = runningBalance.isNegative() ? runningBalance.abs().toFixed(0) : '0';

    return {
      accountCode: subsidiary.code,
      accountTitle: subsidiary.title,
      openingBalanceDebit: '0',
      openingBalanceCredit: '0',
      transactions,
      totalDebit: sumDebit.toFixed(0),
      totalCredit: sumCredit.toFixed(0),
      closingBalanceDebit: closeDebit,
      closingBalanceCredit: closeCredit
    };
  }
}
