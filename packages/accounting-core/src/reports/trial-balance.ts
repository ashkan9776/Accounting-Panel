import Decimal from 'decimal.js';
import { JournalEntry, JournalEntryStatus, JournalEntryType } from '../journal/types';
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
    onlyFinalizedOrApproved: boolean = true,
    options?: {
      fromDateShamsi?: string;
      toDateShamsi?: string;
    }
  ): TrialBalanceReport {
    // نقشه کمکی برای دسترسی سریع به اطلاعات حساب‌ها
    const subMap = new Map<string, AccountSubsidiary>(subsidiaries.map(s => [s.id, s]));
    const headMap = new Map<string, AccountHead>(heads.map(h => [h.id, h]));
    const grpMap = new Map<string, AccountGroup>(groups.map(g => [g.id, g]));

    // جمع‌آوری گردش‌های هر معین تفکیک شده به افتتاحیه و طی دوره
    const openDebitMap = new Map<string, Decimal>();
    const openCreditMap = new Map<string, Decimal>();
    const periodDebitMap = new Map<string, Decimal>();
    const periodCreditMap = new Map<string, Decimal>();

    for (const entry of entries) {
      if (onlyFinalizedOrApproved) {
        if (
          entry.status !== JournalEntryStatus.APPROVED &&
          entry.status !== JournalEntryStatus.FINALIZED &&
          entry.status !== JournalEntryStatus.REVERSED
        ) {
          continue;
        }
      }

      if (options?.toDateShamsi && entry.entryDateShamsi > options.toDateShamsi) {
        continue;
      }

      const isOpening =
        entry.entryType === JournalEntryType.OPENING ||
        Boolean(options?.fromDateShamsi && entry.entryDateShamsi < options.fromDateShamsi);

      for (const line of entry.lines) {
        const d = new Decimal(line.debit || 0);
        const c = new Decimal(line.credit || 0);

        if (isOpening) {
          const curD = openDebitMap.get(line.subsidiaryAccountId) || new Decimal(0);
          const curC = openCreditMap.get(line.subsidiaryAccountId) || new Decimal(0);
          openDebitMap.set(line.subsidiaryAccountId, curD.plus(d));
          openCreditMap.set(line.subsidiaryAccountId, curC.plus(c));
        } else {
          const curD = periodDebitMap.get(line.subsidiaryAccountId) || new Decimal(0);
          const curC = periodCreditMap.get(line.subsidiaryAccountId) || new Decimal(0);
          periodDebitMap.set(line.subsidiaryAccountId, curD.plus(d));
          periodCreditMap.set(line.subsidiaryAccountId, curC.plus(c));
        }
      }
    }

    const rowsMap = new Map<
      string,
      {
        code: string;
        title: string;
        openDebit: Decimal;
        openCredit: Decimal;
        periodDebit: Decimal;
        periodCredit: Decimal;
      }
    >();

    for (const sub of subsidiaries) {
      const od = openDebitMap.get(sub.id) || new Decimal(0);
      const oc = openCreditMap.get(sub.id) || new Decimal(0);
      const pd = periodDebitMap.get(sub.id) || new Decimal(0);
      const pc = periodCreditMap.get(sub.id) || new Decimal(0);

      // در صورت نبود هیچ گردش، در تراز درج نمی‌شود
      if (od.isZero() && oc.isZero() && pd.isZero() && pc.isZero()) continue;

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

      const existing = rowsMap.get(key) || {
        code,
        title,
        openDebit: new Decimal(0),
        openCredit: new Decimal(0),
        periodDebit: new Decimal(0),
        periodCredit: new Decimal(0)
      };
      existing.openDebit = existing.openDebit.plus(od);
      existing.openCredit = existing.openCredit.plus(oc);
      existing.periodDebit = existing.periodDebit.plus(pd);
      existing.periodCredit = existing.periodCredit.plus(pc);
      rowsMap.set(key, existing);
    }

    let sumOpenDebit = new Decimal(0);
    let sumOpenCredit = new Decimal(0);
    let sumPeriodDebit = new Decimal(0);
    let sumPeriodCredit = new Decimal(0);
    let sumTotalDebit = new Decimal(0);
    let sumTotalCredit = new Decimal(0);
    let sumClosingDebit = new Decimal(0);
    let sumClosingCredit = new Decimal(0);

    const rows: TrialBalanceRow[] = [];

    // مرتب‌سازی بر اساس کد حساب
    const sorted = Array.from(rowsMap.values()).sort((a, b) => a.code.localeCompare(b.code));

    for (const item of sorted) {
      let openDebit = new Decimal(0);
      let openCredit = new Decimal(0);
      if (item.openDebit.greaterThan(item.openCredit)) {
        openDebit = item.openDebit.minus(item.openCredit);
      } else if (item.openCredit.greaterThan(item.openDebit)) {
        openCredit = item.openCredit.minus(item.openDebit);
      }

      const pDebit = item.periodDebit;
      const pCredit = item.periodCredit;

      const totDebit = openDebit.plus(pDebit);
      const totCredit = openCredit.plus(pCredit);

      let closeDebit = new Decimal(0);
      let closeCredit = new Decimal(0);

      if (totDebit.greaterThan(totCredit)) {
        closeDebit = totDebit.minus(totCredit);
      } else if (totCredit.greaterThan(totDebit)) {
        closeCredit = totCredit.minus(totDebit);
      }

      sumOpenDebit = sumOpenDebit.plus(openDebit);
      sumOpenCredit = sumOpenCredit.plus(openCredit);
      sumPeriodDebit = sumPeriodDebit.plus(pDebit);
      sumPeriodCredit = sumPeriodCredit.plus(pCredit);
      sumTotalDebit = sumTotalDebit.plus(totDebit);
      sumTotalCredit = sumTotalCredit.plus(totCredit);
      sumClosingDebit = sumClosingDebit.plus(closeDebit);
      sumClosingCredit = sumClosingCredit.plus(closeCredit);

      rows.push({
        accountCode: item.code,
        accountTitle: item.title,
        openingDebit: openDebit.toFixed(0),
        openingCredit: openCredit.toFixed(0),
        periodDebit: pDebit.toFixed(0),
        periodCredit: pCredit.toFixed(0),
        totalDebit: totDebit.toFixed(0),
        totalCredit: totCredit.toFixed(0),
        closingDebit: closeDebit.toFixed(0),
        closingCredit: closeCredit.toFixed(0)
      });
    }

    // بررسی توازن ستون‌ها
    const isBalanced =
      sumOpenDebit.equals(sumOpenCredit) &&
      sumPeriodDebit.equals(sumPeriodCredit) &&
      sumTotalDebit.equals(sumTotalCredit) &&
      sumClosingDebit.equals(sumClosingCredit);

    return {
      level,
      fromDateShamsi: options?.fromDateShamsi,
      toDateShamsi: options?.toDateShamsi,
      rows,
      totalOpeningDebit: sumOpenDebit.toFixed(0),
      totalOpeningCredit: sumOpenCredit.toFixed(0),
      totalPeriodDebit: sumPeriodDebit.toFixed(0),
      totalPeriodCredit: sumPeriodCredit.toFixed(0),
      totalDebitSum: sumTotalDebit.toFixed(0),
      totalCreditSum: sumTotalCredit.toFixed(0),
      totalClosingDebit: sumClosingDebit.toFixed(0),
      totalClosingCredit: sumClosingCredit.toFixed(0),
      isBalanced
    };
  }
}
