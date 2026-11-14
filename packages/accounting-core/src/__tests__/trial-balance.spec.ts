import { TrialBalanceEngine } from '../reports/trial-balance';
import { GeneralLedgerEngine } from '../reports/general-ledger';
import { JournalEngine } from '../journal/journal-engine';
import {
  STANDARD_IRANIAN_SUBSIDIARIES,
  STANDARD_IRANIAN_HEADS,
  STANDARD_IRANIAN_GROUPS
} from '../chart-of-accounts/standard-iranian-chart';
import { AccountSubsidiary } from '../chart-of-accounts/types';

describe('Trial Balance & General Ledger Engine (تراز آزمایشی و دفاتر)', () => {
  const subMap = new Map<string, AccountSubsidiary>(
    STANDARD_IRANIAN_SUBSIDIARIES.map((s) => [s.id, s])
  );
  let id = 1;
  const mockIdGen = () => `id-${id++}`;

  it('should generate a balanced 8-column trial balance from approved journal entries', () => {
    // سند ۱: فروش کالا با پوز (۱۰,۰۰۰,۰۰۰ ریال)
    const e1 = JournalEngine.createEntry(
      {
        tenantId: 't1',
        companyId: 'c1',
        branchId: 'b1',
        fiscalYearId: 'fy1',
        entryDateShamsi: '1403/08/20',
        description: 'فروش روزانه',
        createdByUserId: 'u1',
        lines: [
          { subsidiaryAccountId: 'sub-1104', floatingDimension1Id: 'pos-1', debit: 10000000, credit: 0, description: 'پوز' },
          { subsidiaryAccountId: 'sub-6101', debit: 0, credit: 10000000, description: 'درآمد فروش' }
        ]
      },
      1,
      1,
      mockIdGen,
      subMap
    );

    // سند ۲: شناسایی بهای تمام شده (۶,۰۰۰,۰۰۰ ریال)
    const e2 = JournalEngine.createEntry(
      {
        tenantId: 't1',
        companyId: 'c1',
        branchId: 'b1',
        fiscalYearId: 'fy1',
        entryDateShamsi: '1403/08/20',
        description: 'بهای تمام شده',
        createdByUserId: 'u1',
        lines: [
          { subsidiaryAccountId: 'sub-7101', debit: 6000000, credit: 0, description: 'COGS' },
          { subsidiaryAccountId: 'sub-1501', debit: 0, credit: 6000000, description: 'خروج کالا' }
        ]
      },
      2,
      2,
      mockIdGen,
      subMap
    );

    // سند ۳: پرداخت هزینه اجاره نقدی (۲,۰۰۰,۰۰۰ ریال)
    const e3 = JournalEngine.createEntry(
      {
        tenantId: 't1',
        companyId: 'c1',
        branchId: 'b1',
        fiscalYearId: 'fy1',
        entryDateShamsi: '1403/08/21',
        description: 'اجاره محل',
        createdByUserId: 'u1',
        lines: [
          { subsidiaryAccountId: 'sub-8103', floatingDimension2Id: 'cc-office', debit: 2000000, credit: 0, description: 'هزینه اجاره' },
          { subsidiaryAccountId: 'sub-1104', floatingDimension1Id: 'pos-1', debit: 0, credit: 2000000, description: 'برداشت از کارتخوان' }
        ]
      },
      3,
      1,
      mockIdGen,
      subMap
    );

    // تایید همه اسناد
    const app1 = JournalEngine.approveEntry(e1, 'mgr');
    const app2 = JournalEngine.approveEntry(e2, 'mgr');
    const app3 = JournalEngine.approveEntry(e3, 'mgr');

    const tb = TrialBalanceEngine.generateTrialBalance(
      [app1, app2, app3],
      STANDARD_IRANIAN_SUBSIDIARIES,
      STANDARD_IRANIAN_HEADS,
      STANDARD_IRANIAN_GROUPS,
      'SUBSIDIARY'
    );

    expect(tb.isBalanced).toBe(true);
    // جمع گردش دوره: ۱۰م + ۶م + ۲م = ۱۸,۰۰۰,۰۰۰ ریال بدهکار و ۱۸,۰۰۰,۰۰۰ ریال بستانکار
    expect(tb.totalPeriodDebit).toBe('18000000');
    expect(tb.totalPeriodCredit).toBe('18000000');
    // مانده پایان دوره نیز باید متوازن باشد:
    // وجوه در راه: ۱۰م بدهکار - ۲م بستانکار = ۸م بدهکار
    // فروش: ۱۰م بستانکار
    // بهای تمام شده: ۶م بدهکار
    // موجودی کالا: ۶م بستانکار
    // هزینه اجاره: ۲م بدهکار
    // جمع مانده‌های بدهکار = ۸م + ۶م + ۲م = ۱۶,۰۰۰,۰۰۰ ریال
    // جمع مانده‌های بستانکار = ۱۰م + ۶م = ۱۶,۰۰۰,۰۰۰ ریال
    expect(tb.totalClosingDebit).toBe('16000000');
    expect(tb.totalClosingCredit).toBe('16000000');

    // بررسی استخراج دفتر معین حساب وجوه در راه (sub-1104)
    const sub1104 = subMap.get('sub-1104')!;
    const ledger = GeneralLedgerEngine.extractSubsidiaryLedger(sub1104, [app1, app2, app3]);
    expect(ledger.transactions.length).toBe(2);
    expect(ledger.closingBalanceDebit).toBe('8000000');
    expect(ledger.closingBalanceCredit).toBe('0');
  });
});
