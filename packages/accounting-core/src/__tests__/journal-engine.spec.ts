import { JournalEngine } from '../journal/journal-engine';
import { JournalEntryStatus, JournalEntryType, JournalLineInput } from '../journal/types';
import { STANDARD_IRANIAN_SUBSIDIARIES } from '../chart-of-accounts/standard-iranian-chart';
import { AccountSubsidiary } from '../chart-of-accounts/types';

describe('Journal Engine (موتور اسناد دوبل حسابداری)', () => {
  const subMap = new Map<string, AccountSubsidiary>(
    STANDARD_IRANIAN_SUBSIDIARIES.map((s) => [s.id, s])
  );
  let idCounter = 1;
  const mockIdGen = () => `mock-id-${idCounter++}`;

  beforeEach(() => {
    idCounter = 1;
  });

  it('should successfully create a balanced journal entry', () => {
    // فروش ۱۰,۰۰۰,۰۰۰ ریال نقد با کارتخوان
    const lines: JournalLineInput[] = [
      {
        subsidiaryAccountId: 'sub-1104', // وجوه در راه کارتخوان (نیازمند تفصیلی بعد ۱)
        floatingDimension1Id: 'dim-pos-01',
        debit: 10000000,
        credit: 0,
        description: 'دریافت وجه فروش از طریق پوز'
      },
      {
        subsidiaryAccountId: 'sub-6101', // فروش کالا
        debit: 0,
        credit: 10000000,
        description: 'فروش کالای تجاری'
      }
    ];

    const entry = JournalEngine.createEntry(
      {
        tenantId: 'tenant-1',
        companyId: 'company-1',
        branchId: 'branch-1',
        fiscalYearId: 'fy-1403',
        entryDateShamsi: '1403/08/24',
        description: 'ثبت فاکتور فروش روزانه',
        createdByUserId: 'user-1',
        lines
      },
      1,
      1,
      mockIdGen,
      subMap
    );

    expect(entry.status).toBe(JournalEntryStatus.DRAFT);
    expect(entry.totalDebit).toBe('10000000');
    expect(entry.totalCredit).toBe('10000000');
    expect(entry.lines.length).toBe(2);
  });

  it('should reject an unbalanced journal entry with clear error message', () => {
    const unbalancedLines: JournalLineInput[] = [
      {
        subsidiaryAccountId: 'sub-1104',
        floatingDimension1Id: 'dim-pos-01',
        debit: 10000000,
        credit: 0,
        description: 'بدهکار'
      },
      {
        subsidiaryAccountId: 'sub-6101',
        debit: 0,
        credit: 9500000, // اختلاف ۵۰۰,۰۰۰ ریال
        description: 'بستانکار'
      }
    ];

    expect(() => {
      JournalEngine.createEntry(
        {
          tenantId: 'tenant-1',
          companyId: 'company-1',
          branchId: 'branch-1',
          fiscalYearId: 'fy-1403',
          entryDateShamsi: '1403/08/24',
          description: 'تست سند نامتوازن',
          createdByUserId: 'user-1',
          lines: unbalancedLines
        },
        1,
        1,
        mockIdGen,
        subMap
      );
    }).toThrow(/عدم توازن در سند حسابداری.*اختلاف: 500000 ریال/);
  });

  it('should reject negative amounts in journal lines', () => {
    const negativeLines: JournalLineInput[] = [
      {
        subsidiaryAccountId: 'sub-1104',
        floatingDimension1Id: 'dim-pos-01',
        debit: -500000,
        credit: 0,
        description: 'منفی'
      },
      {
        subsidiaryAccountId: 'sub-6101',
        debit: 0,
        credit: 500000,
        description: 'بستانکار'
      }
    ];

    expect(() => {
      JournalEngine.createEntry(
        {
          tenantId: 'tenant-1',
          companyId: 'company-1',
          branchId: 'branch-1',
          fiscalYearId: 'fy-1403',
          entryDateShamsi: '1403/08/24',
          description: 'تست رقم منفی',
          createdByUserId: 'user-1',
          lines: negativeLines
        },
        1,
        1,
        mockIdGen,
        subMap
      );
    }).toThrow(/ارقام منفی در سند حسابداری مجاز نیست/);
  });

  it('should enforce required floating dimension on subsidiary accounts', () => {
    const missingDimensionLines: JournalLineInput[] = [
      {
        subsidiaryAccountId: 'sub-1301', // بدهکاران تجاری (نیازمند تفصیلی شخص)
        // فاقد floatingDimension1Id
        debit: 5000000,
        credit: 0,
        description: 'بدهی مشتری'
      },
      {
        subsidiaryAccountId: 'sub-6101',
        debit: 0,
        credit: 5000000,
        description: 'فروش'
      }
    ];

    expect(() => {
      JournalEngine.createEntry(
        {
          tenantId: 'tenant-1',
          companyId: 'company-1',
          branchId: 'branch-1',
          fiscalYearId: 'fy-1403',
          entryDateShamsi: '1403/08/24',
          description: 'تست تفصیلی مفقود',
          createdByUserId: 'user-1',
          lines: missingDimensionLines
        },
        1,
        1,
        mockIdGen,
        subMap
      );
    }).toThrow(/نیازمند تفصیلی شناور بعد ۱/);
  });

  it('should enforce state transition: Draft -> Approved -> Finalized (Immutable)', () => {
    const lines: JournalLineInput[] = [
      {
        subsidiaryAccountId: 'sub-1104',
        floatingDimension1Id: 'dim-pos-01',
        debit: 1000000,
        credit: 0,
        description: 'دریافت'
      },
      {
        subsidiaryAccountId: 'sub-6101',
        debit: 0,
        credit: 1000000,
        description: 'فروش'
      }
    ];

    const draft = JournalEngine.createEntry(
      {
        tenantId: 'tenant-1',
        companyId: 'company-1',
        branchId: 'branch-1',
        fiscalYearId: 'fy-1403',
        entryDateShamsi: '1403/08/24',
        description: 'تست چرخه عمر سند',
        createdByUserId: 'user-1',
        lines
      },
      1,
      1,
      mockIdGen,
      subMap
    );

    expect(draft.status).toBe(JournalEntryStatus.DRAFT);

    // نمی‌توان مستقیم از پیش‌نویس قطعی کرد
    expect(() => JournalEngine.finalizeEntry(draft, 101)).toThrow(/سند ابتدا باید به تایید حسابدار برسد/);

    // تایید توسط حسابدار
    const approved = JournalEngine.approveEntry(draft, 'accountant-user-id');
    expect(approved.status).toBe(JournalEntryStatus.APPROVED);
    expect(approved.approvedByUserId).toBe('accountant-user-id');

    // قطعی‌سازی و ثبت در دفاتر
    const finalized = JournalEngine.finalizeEntry(approved, 101);
    expect(finalized.status).toBe(JournalEntryStatus.FINALIZED);
    expect(finalized.permanentNumber).toBe(101);

    // سند قطعی نمی‌تواند مجدداً تغییر کند یا قطعی شود
    expect(() => JournalEngine.finalizeEntry(finalized, 102)).toThrow(/این سند قبلاً قطعی و در دفاتر ثبت شده است/);
  });

  it('should generate an exact reversal / correction entry for finalized entries', () => {
    const lines: JournalLineInput[] = [
      {
        subsidiaryAccountId: 'sub-1104',
        floatingDimension1Id: 'dim-pos-01',
        debit: 2000000,
        credit: 0,
        description: 'شارژ صندوق'
      },
      {
        subsidiaryAccountId: 'sub-6101',
        debit: 0,
        credit: 2000000,
        description: 'درآمد'
      }
    ];

    const draft = JournalEngine.createEntry(
      {
        tenantId: 'tenant-1',
        companyId: 'company-1',
        branchId: 'branch-1',
        fiscalYearId: 'fy-1403',
        entryDateShamsi: '1403/08/24',
        description: 'سند اشتباه نیازمند معکوس‌سازی',
        createdByUserId: 'user-1',
        lines
      },
      5,
      2,
      mockIdGen,
      subMap
    );

    const approved = JournalEngine.approveEntry(draft, 'user-mgr');
    const finalized = JournalEngine.finalizeEntry(approved, 501);

    // صدور سند معکوس (Reversal)
    const { reversalEntry, updatedOriginalEntry } = JournalEngine.createReversalEntry(
      finalized,
      '1403/08/25',
      6,
      1,
      'user-mgr',
      mockIdGen,
      'اصلاح اشتباه در شماره حساب'
    );

    expect(updatedOriginalEntry.status).toBe(JournalEntryStatus.REVERSED);
    expect(updatedOriginalEntry.reversalEntryId).toBe(reversalEntry.id);

    expect(reversalEntry.entryType).toBe(JournalEntryType.REVERSAL);
    expect(reversalEntry.reversedEntryId).toBe(finalized.id);
    // بررسی جابجایی دقیق بدهکار و بستانکار در خطوط معکوس
    expect(reversalEntry.lines[0].debit).toBe('0');
    expect(reversalEntry.lines[0].credit).toBe('2000000');
    expect(reversalEntry.lines[1].debit).toBe('2000000');
    expect(reversalEntry.lines[1].credit).toBe('0');
  });
});
