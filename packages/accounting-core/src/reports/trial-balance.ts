import Decimal from 'decimal.js';
import { JournalEntry, JournalEntryStatus } from '../journal/types';
import { AccountSubsidiary, AccountHead, AccountGroup } from '../chart-of-accounts/types';

Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

export interface TrialBalanceRow {
  accountCode: string;
  accountTitle: string;
  // مانده ابتدای دوره
  openingDebit: string;
  openingCredit: string;
  // گردش طی دوره
  periodDebit: string;
  periodCredit: string;
  // مجموع گردش (ابتدای دوره + طی دوره)
  totalDebit: string;
  totalCredit: string;
  // مانده انتهای دوره
  closingDebit: string;
  closingCredit: string;
}

export interface TrialBalanceReport {
  level: 'SUBSIDIARY' | 'HEAD' | 'GROUP';
  fromDateShamsi?: string;
  toDateShamsi?: string;
  rows: TrialBalanceRow[];
  totalOpeningDebit: string;
  totalOpeningCredit: string;
  totalPeriodDebit: string;
  totalPeriodCredit: string;
  totalDebitSum: string;
  totalCreditSum: string;
  totalClosingDebit: string;
  totalClosingCredit: string;
  isBalanced: boolean;
}

export class TrialBalanceEngine {
  /**
   * محاسبه تراز آزمایشی جامع (۲، ۴، ۶ و ۸ ستونی)
   */
  public static generateTrialBalance(
    entries: JournalEntry[],
    subsidiaries: AccountSubsidiary[],
    heads: AccountHead[],
    groups: AccountGroup[],
    level: 'SUBSIDIARY' | 'HEAD' | 'GROUP' = 'SUBSIDIARY',
    onlyFinalizedOrApproved: boolean = true
  ): TrialBalanceReport {
    // نقشه کمکی برای دسترسی سریع به اطلاعات حساب‌ها
    const subMap = new Map<string, AccountSubsidiary>(subsidiaries.map(s => [s.id, s]));
    const headMap = new Map<string, AccountHead>(heads.map(h => [h.id, h]));
    const grpMap = new Map<string, AccountGroup>(groups.map(g => [g.id, g]));

    // جمع‌آوری گردش‌های هر معین
    const debitMap = new Map<string, Decimal>();
    const creditMap = new Map<string, Decimal>();

    for (const entry of entries) {
      if (onlyFinalizedOrApproved) {
        if (entry.status !== JournalEntryStatus.APPROVED && entry.status !== JournalEntryStatus.FINALIZED) {
          continue;
        }
      }

      for (const line of entry.lines) {
        const curDebit = debitMap.get(line.subsidiaryAccountId) || new Decimal(0);
        const curCredit = creditMap.get(line.subsidiaryAccountId) || new Decimal(0);

        debitMap.set(line.subsidiaryAccountId, curDebit.plus(new Decimal(line.debit)));
        creditMap.set(line.subsidiaryAccountId, curCredit.plus(new Decimal(line.credit)));
      }
    }

    const rowsMap = new Map<string, { code: string; title: string; debit: Decimal; credit: Decimal }>();

    for (const sub of subsidiaries) {
      const d = debitMap.get(sub.id) || new Decimal(0);
      const c = creditMap.get(sub.id) || new Decimal(0);

      // در صورت نبود هیچ گردش، در تراز معین درج نمی‌شود مگر اینکه مانده داشته باشد
      if (d.isZero() && c.isZero()) continue;

      let key = sub.id;
      let code = sub.code;
      let title = sub.title;

      if (level === 'HEAD') {
        const head = headMap.get(sub.headId);
        if (head) {
          key = head.id;
          code = head.code;
          title = head.title;
        }
      } else if (level === 'GROUP') {
        const head = headMap.get(sub.headId);
        const grp = head ? grpMap.get(head.groupId) : undefined;
        if (grp) {
          key = grp.id;
          code = grp.code;
          title = grp.title;
        }
      }

      const existing = rowsMap.get(key) || { code, title, debit: new Decimal(0), credit: new Decimal(0) };
      existing.debit = existing.debit.plus(d);
      existing.credit = existing.credit.plus(c);
      rowsMap.set(key, existing);
    }

    let sumPeriodDebit = new Decimal(0);
    let sumPeriodCredit = new Decimal(0);
    let sumClosingDebit = new Decimal(0);
    let sumClosingCredit = new Decimal(0);

    const rows: TrialBalanceRow[] = [];

    // مرتب‌سازی بر اساس کد حساب
    const sorted = Array.from(rowsMap.values()).sort((a, b) => a.code.localeCompare(b.code));

    for (const item of sorted) {
      sumPeriodDebit = sumPeriodDebit.plus(item.debit);
      sumPeriodCredit = sumPeriodCredit.plus(item.credit);

      let closeDebit = new Decimal(0);
      let closeCredit = new Decimal(0);

      if (item.debit.greaterThan(item.credit)) {
        closeDebit = item.debit.minus(item.credit);
      } else if (item.credit.greaterThan(item.debit)) {
        closeCredit = item.credit.minus(item.debit);
      }

      sumClosingDebit = sumClosingDebit.plus(closeDebit);
      sumClosingCredit = sumClosingCredit.plus(closeCredit);

      rows.push({
        accountCode: item.code,
        accountTitle: item.title,
        openingDebit: '0',
        openingCredit: '0',
        periodDebit: item.debit.toFixed(0),
        periodCredit: item.credit.toFixed(0),
        totalDebit: item.debit.toFixed(0),
        totalCredit: item.credit.toFixed(0),
        closingDebit: closeDebit.toFixed(0),
        closingCredit: closeCredit.toFixed(0)
      });
    }

    // بررسی توازن ستون‌ها
    const isBalanced = sumPeriodDebit.equals(sumPeriodCredit) && sumClosingDebit.equals(sumClosingCredit);

    return {
      level,
      rows,
      totalOpeningDebit: '0',
      totalOpeningCredit: '0',
      totalPeriodDebit: sumPeriodDebit.toFixed(0),
      totalPeriodCredit: sumPeriodCredit.toFixed(0),
      totalDebitSum: sumPeriodDebit.toFixed(0),
      totalCreditSum: sumPeriodCredit.toFixed(0),
      totalClosingDebit: sumClosingDebit.toFixed(0),
      totalClosingCredit: sumClosingCredit.toFixed(0),
      isBalanced
    };
  }
}
