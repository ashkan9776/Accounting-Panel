import Decimal from 'decimal.js';
import {
  JournalEntry,
  JournalEntryInput,
  JournalEntryStatus,
  JournalEntryType,
  JournalLine,
  JournalLineInput
} from './types';
import { shamsiStringToDate, parseShamsiString } from '../localization/shamsi';
import { AccountSubsidiary } from '../chart-of-accounts/types';

Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

export class JournalEngine {
  /**
   * اعتبارسنجی انطباق خطوط سند با اصول دوطرفه حسابداری
   */
  public static validateLines(
    lines: JournalLineInput[],
    subsidiariesMap?: Map<string, AccountSubsidiary>
  ): { totalDebit: Decimal; totalCredit: Decimal; validatedLines: JournalLineInput[] } {
    if (!lines || lines.length < 2) {
      throw new Error('سند حسابداری باید حداقل دارای ۲ ردیف (آرتیکل) باشد.');
    }

    let totalDebit = new Decimal(0);
    let totalCredit = new Decimal(0);

    const validatedLines: JournalLineInput[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const rowNum = line.rowNumber ?? i + 1;

      if (!line.subsidiaryAccountId) {
        throw new Error(`ردیف ${rowNum}: حساب معین مشخص نشده است.`);
      }

      if (!line.description || line.description.trim().length === 0) {
        throw new Error(`ردیف ${rowNum}: شرح آرتیکل الزامی است.`);
      }

      const d = new Decimal(line.debit || 0);
      const c = new Decimal(line.credit || 0);

      if (d.isNegative() || c.isNegative()) {
        throw new Error(`ردیف ${rowNum}: ارقام منفی در سند حسابداری مجاز نیست.`);
      }

      if (d.isZero() && c.isZero()) {
        throw new Error(`ردیف ${rowNum}: مبلغ بدهکار یا بستانکار باید بزرگتر از صفر باشد.`);
      }

      if (!d.isZero() && !c.isZero()) {
        throw new Error(`ردیف ${rowNum}: یک آرتیکل نمی‌تواند هم‌زمان دارای مبلغ بدهکار و بستانکار باشد.`);
      }

      // بررسی تفصیلی اجباری معین
      if (subsidiariesMap && subsidiariesMap.has(line.subsidiaryAccountId)) {
        const sub = subsidiariesMap.get(line.subsidiaryAccountId)!;
        if (sub.requiresFloatingDimension1 && !line.floatingDimension1Id) {
          throw new Error(`ردیف ${rowNum}: حساب معین «${sub.title}» نیازمند تفصیلی شناور بعد ۱ می‌باشد.`);
        }
        if (sub.requiresFloatingDimension2 && !line.floatingDimension2Id) {
          throw new Error(`ردیف ${rowNum}: حساب معین «${sub.title}» نیازمند تفصیلی شناور بعد ۲ (مرکز هزینه/پروژه) می‌باشد.`);
        }
      }

      totalDebit = totalDebit.plus(d);
      totalCredit = totalCredit.plus(c);

      validatedLines.push({
        ...line,
        rowNumber: rowNum,
        debit: d.toFixed(0),
        credit: c.toFixed(0)
      });
    }

    // بررسی توازن اساسی سند (قانون دوطرفه حسابداری)
    if (!totalDebit.equals(totalCredit)) {
      const diff = totalDebit.minus(totalCredit).abs();
      throw new Error(
        `عدم توازن در سند حسابداری: جمع بدهکار (${totalDebit.toFixed(0)}) با جمع بستانکار (${totalCredit.toFixed(0)}) برابر نیست. اختلاف: ${diff.toFixed(0)} ریال`
      );
    }

    return { totalDebit, totalCredit, validatedLines };
  }

  /**
   * ایجاد یک سند حسابداری جدید با اعتبارسنجی کامل
   */
  public static createEntry(
    input: JournalEntryInput,
    sequenceNumber: number,
    dailyNumber: number,
    idGenerator: () => string,
    subsidiariesMap?: Map<string, AccountSubsidiary>
  ): JournalEntry {
    const { totalDebit, totalCredit, validatedLines } = this.validateLines(input.lines, subsidiariesMap);

    // اعتبارسنجی تاریخ شمسی
    parseShamsiString(input.entryDateShamsi);
    const dateGregorian = shamsiStringToDate(input.entryDateShamsi);

    const entryId = idGenerator();
    const now = new Date();

    const lines: JournalLine[] = validatedLines.map((vl) => ({
      id: idGenerator(),
      journalEntryId: entryId,
      rowNumber: vl.rowNumber!,
      subsidiaryAccountId: vl.subsidiaryAccountId,
      floatingDimension1Id: vl.floatingDimension1Id,
      floatingDimension2Id: vl.floatingDimension2Id,
      floatingDimension3Id: vl.floatingDimension3Id,
      debit: vl.debit.toString(),
      credit: vl.credit.toString(),
      description: vl.description,
      currencyCode: vl.currencyCode || 'IRR',
      currencyRate: vl.currencyRate ? vl.currencyRate.toString() : '1',
      foreignAmount: vl.foreignAmount ? vl.foreignAmount.toString() : undefined
    }));

    return {
      id: entryId,
      tenantId: input.tenantId,
      companyId: input.companyId,
      branchId: input.branchId,
      fiscalYearId: input.fiscalYearId,
      fiscalPeriodId: input.fiscalPeriodId,
      sequenceNumber,
      dailyNumber,
      entryDateShamsi: input.entryDateShamsi,
      entryDateGregorian: dateGregorian,
      entryType: input.entryType || JournalEntryType.NORMAL,
      status: JournalEntryStatus.DRAFT,
      description: input.description,
      totalDebit: totalDebit.toFixed(0),
      totalCredit: totalCredit.toFixed(0),
      sourceModule: input.sourceModule,
      sourceDocumentId: input.sourceDocumentId,
      createdByUserId: input.createdByUserId,
      createdAt: now,
      updatedAt: now,
      lines
    };
  }

  /**
   * تایید سند حسابداری
   */
  public static approveEntry(entry: JournalEntry, approvedByUserId: string): JournalEntry {
    if (entry.status !== JournalEntryStatus.DRAFT) {
      throw new Error(`تنها اسناد در وضعیت پیش‌نویس قابل تایید هستند. وضعیت فعلی: ${entry.status}`);
    }
    return {
      ...entry,
      status: JournalEntryStatus.APPROVED,
      approvedByUserId,
      updatedAt: new Date()
    };
  }

  /**
   * قطعی‌سازی و ثبت در دفاتر قانونی (تغییرناپذیری ابدی)
   */
  public static finalizeEntry(entry: JournalEntry, permanentNumber: number): JournalEntry {
    if (entry.status === JournalEntryStatus.FINALIZED) {
      throw new Error('این سند قبلاً قطعی و در دفاتر ثبت شده است.');
    }
    if (entry.status !== JournalEntryStatus.APPROVED) {
      throw new Error('برای قطعی‌سازی و ثبت دفاتر، سند ابتدا باید به تایید حسابدار برسد.');
    }
    return {
      ...entry,
      status: JournalEntryStatus.FINALIZED,
      permanentNumber,
      updatedAt: new Date()
    };
  }

  /**
   * ایجاد سند معکوس / اصلاحی (Reversal Entry) برای سند قطعی
   * طبق استاندارد، اسناد قطعی هرگز ویرایش یا حذف نمی‌شوند بلکه سند معکوس صادر می‌شود.
   */
  public static createReversalEntry(
    originalEntry: JournalEntry,
    reversalDateShamsi: string,
    sequenceNumber: number,
    dailyNumber: number,
    createdByUserId: string,
    idGenerator: () => string,
    reason?: string
  ): { reversalEntry: JournalEntry; updatedOriginalEntry: JournalEntry } {
    if (originalEntry.status !== JournalEntryStatus.FINALIZED && originalEntry.status !== JournalEntryStatus.APPROVED) {
      throw new Error('تنها اسناد تایید شده یا قطعی قابلیت برگشت با سند اصلاحی را دارند.');
    }

    if (originalEntry.reversalEntryId) {
      throw new Error(`این سند قبلاً توسط سند شماره ${originalEntry.reversalEntryId} معکوس شده است.`);
    }

    const reversalId = idGenerator();
    const now = new Date();
    parseShamsiString(reversalDateShamsi);
    const dateGregorian = shamsiStringToDate(reversalDateShamsi);

    // معکوس کردن خطوط: بدهکار به بستانکار و بستانکار به بدهکار
    const reversalLines: JournalLine[] = originalEntry.lines.map((orig) => ({
      id: idGenerator(),
      journalEntryId: reversalId,
      rowNumber: orig.rowNumber,
      subsidiaryAccountId: orig.subsidiaryAccountId,
      floatingDimension1Id: orig.floatingDimension1Id,
      floatingDimension2Id: orig.floatingDimension2Id,
      floatingDimension3Id: orig.floatingDimension3Id,
      debit: orig.credit, // جابجایی دقیق
      credit: orig.debit, // جابجایی دقیق
      description: `[سند برگشتی] ${orig.description}`,
      currencyCode: orig.currencyCode,
      currencyRate: orig.currencyRate,
      foreignAmount: orig.foreignAmount
    }));

    const reversalEntry: JournalEntry = {
      id: reversalId,
      tenantId: originalEntry.tenantId,
      companyId: originalEntry.companyId,
      branchId: originalEntry.branchId,
      fiscalYearId: originalEntry.fiscalYearId,
      fiscalPeriodId: originalEntry.fiscalPeriodId,
      sequenceNumber,
      dailyNumber,
      entryDateShamsi: reversalDateShamsi,
      entryDateGregorian: dateGregorian,
      entryType: JournalEntryType.REVERSAL,
      status: JournalEntryStatus.DRAFT,
      description: `برگشت سند شماره ${originalEntry.sequenceNumber}: ${reason || originalEntry.description}`,
      totalDebit: originalEntry.totalCredit,
      totalCredit: originalEntry.totalDebit,
      sourceModule: originalEntry.sourceModule,
      sourceDocumentId: originalEntry.sourceDocumentId,
      reversedEntryId: originalEntry.id,
      createdByUserId,
      createdAt: now,
      updatedAt: now,
      lines: reversalLines
    };

    const updatedOriginalEntry: JournalEntry = {
      ...originalEntry,
      status: JournalEntryStatus.REVERSED,
      reversalEntryId: reversalId,
      updatedAt: now
    };

    return { reversalEntry, updatedOriginalEntry };
  }
}
