import Decimal from 'decimal.js';
import {
  STANDARD_IRANIAN_GROUPS,
  STANDARD_IRANIAN_SUBSIDIARIES,
  JournalEngine,
  JournalLineInput,
  AccountSubsidiary,
} from '../index';

describe('Domain Pure Accounting and Tax Rules', () => {
  const subMap = new Map<string, AccountSubsidiary>(
    STANDARD_IRANIAN_SUBSIDIARIES.map((s) => [s.id, s])
  );
  let idCounter = 1;
  const mockIdGen = () => `mock-id-${idCounter++}`;

  beforeEach(() => {
    idCounter = 1;
  });

  it('should verify standard Iranian chart of accounts groups are defined', () => {
    expect(STANDARD_IRANIAN_GROUPS).toBeDefined();
    expect(STANDARD_IRANIAN_GROUPS.length).toBeGreaterThanOrEqual(9);

    const assetGroup = STANDARD_IRANIAN_GROUPS.find((g) => g.code === '1');
    expect(assetGroup).toBeDefined();
    expect(assetGroup?.title).toContain('دارایی');
  });

  it('should calculate monetary values with 28-digit precision without binary float errors', () => {
    // 0.1 + 0.2 in standard IEEE 754 float gives 0.30000000000000004
    const a = new Decimal('0.1');
    const b = new Decimal('0.2');
    const sum = a.plus(b);
    expect(sum.toString()).toBe('0.3');

    // 10% VAT calculation
    const base = new Decimal('125000000'); // ۱۲۵ میلیون ریال
    const vatRate = new Decimal('0.10');
    const vat = base.times(vatRate);
    expect(vat.toString()).toBe('12500000'); // ۱۲.۵ میلیون ریال
    expect(base.plus(vat).toString()).toBe('137500000');
  });

  it('should create and balance double-entry journal entry (Debit == Credit)', () => {
    const lines: JournalLineInput[] = [
      {
        subsidiaryAccountId: 'sub-1102', // موجودی نزد بانک‌ها
        floatingDimension1Id: 'dim-bank-01',
        debit: 110000000,
        credit: 0,
        description: 'واریز به بانک سامان',
      },
      {
        subsidiaryAccountId: 'sub-6101', // فروش کالا
        debit: 0,
        credit: 100000000,
        description: 'فروش خالص کالا',
      },
      {
        subsidiaryAccountId: 'sub-3303', // مالیات و عوارض ارزش افزوده
        floatingDimension1Id: 'dim-tax-office-1',
        debit: 0,
        credit: 10000000,
        description: '۱۰٪ ارزش افزوده قانونی',
      },
    ];

    const entry = JournalEngine.createEntry(
      {
        tenantId: 'tenant-1',
        companyId: 'company-1',
        branchId: 'branch-1',
        fiscalYearId: 'fy-1403',
        entryDateShamsi: '1403/08/26',
        description: 'ثبت سند فروش نقدی',
        createdByUserId: 'user-1',
        lines,
      },
      1,
      1,
      mockIdGen,
      subMap
    );

    expect(entry).toBeDefined();
    expect(entry.totalDebit.toString()).toBe('110000000');
    expect(entry.totalCredit.toString()).toBe('110000000');
  });

  it('should reject unbalanced journal entry lines', () => {
    const unbalancedLines: JournalLineInput[] = [
      {
        subsidiaryAccountId: 'sub-1102',
        floatingDimension1Id: 'dim-bank-01',
        debit: 100000000,
        credit: 0,
        description: 'واریز به بانک',
      },
      {
        subsidiaryAccountId: 'sub-6101',
        debit: 0,
        credit: 90000000, // ۱۰ میلیون ریال اختلاف
        description: 'فروش ناخالص',
      },
    ];

    expect(() => {
      JournalEngine.createEntry(
        {
          tenantId: 'tenant-1',
          companyId: 'company-1',
          branchId: 'branch-1',
          fiscalYearId: 'fy-1403',
          entryDateShamsi: '1403/08/26',
          description: 'سند نامتعادل تستی',
          createdByUserId: 'user-1',
          lines: unbalancedLines,
        },
        1,
        1,
        mockIdGen,
        subMap
      );
    }).toThrow(/عدم توازن در سند حسابداری/);
  });
});
