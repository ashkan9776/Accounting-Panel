import fc from 'fast-check';
import Decimal from 'decimal.js';
import { JournalEngine } from '../journal/journal-engine';
import { JournalLineInput } from '../journal/types';

describe('Property-Based Accounting Invariance Tests (آزمون‌های تغییرناپذیری حسابی)', () => {
  it('Property 1: Sum(Debits) === Sum(Credits) must hold for 100% of valid entries', () => {
    // تولید آرایه‌ای تصادفی از مبالغ مثبت
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 1, max: 100000000 }), { minLength: 1, maxLength: 10 }),
        fc.array(fc.integer({ min: 1, max: 100000000 }), { minLength: 1, maxLength: 10 }),
        (debits, credits) => {
          // محاسبه مجموع‌ها
          const totalD = debits.reduce((acc, v) => acc.plus(v), new Decimal(0));
          const totalC = credits.reduce((acc, v) => acc.plus(v), new Decimal(0));

          // تراز کردن با سطر جبرانی
          const lines: JournalLineInput[] = [];

          debits.forEach((d, idx) => {
            lines.push({
              subsidiaryAccountId: `sub-d-${idx}`,
              debit: d,
              credit: 0,
              description: `سطر بدهکار ${idx}`
            });
          });

          credits.forEach((c, idx) => {
            lines.push({
              subsidiaryAccountId: `sub-c-${idx}`,
              debit: 0,
              credit: c,
              description: `سطر بستانکار ${idx}`
            });
          });

          // اضافه کردن سطر بالانس‌کننده دقیق
          if (totalD.greaterThan(totalC)) {
            lines.push({
              subsidiaryAccountId: 'sub-balancing',
              debit: 0,
              credit: totalD.minus(totalC).toFixed(0),
              description: 'سطر ترازکننده بستانکار'
            });
          } else if (totalC.greaterThan(totalD)) {
            lines.push({
              subsidiaryAccountId: 'sub-balancing',
              debit: totalC.minus(totalD).toFixed(0),
              credit: 0,
              description: 'سطر ترازکننده بدهکار'
            });
          }

          const res = JournalEngine.validateLines(lines);
          expect(res.totalDebit.equals(res.totalCredit)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 2: Unbalancing by even 1 Rial must ALWAYS be rejected', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 10, max: 10000000 }),
        fc.integer({ min: 1, max: 100 }), // اختلاف عمدی
        (amount, delta) => {
          const lines: JournalLineInput[] = [
            {
              subsidiaryAccountId: 'sub-1',
              debit: amount,
              credit: 0,
              description: 'بدهکار'
            },
            {
              subsidiaryAccountId: 'sub-2',
              debit: 0,
              credit: amount + delta, // نامتوازن
              description: 'بستانکار با اختلاف'
            }
          ];

          expect(() => JournalEngine.validateLines(lines)).toThrow(/عدم توازن در سند حسابداری/);
        }
      ),
      { numRuns: 100 }
    );
  });
});
