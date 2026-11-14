/**
 * تایپ‌های موتور ثبت سند دوبل و دفاتر قانونی
 */

export enum JournalEntryStatus {
  DRAFT = 'DRAFT',         // پیش‌نویس
  APPROVED = 'APPROVED',   // تایید اولیه
  FINALIZED = 'FINALIZED', // قطعی / ثبت در دفاتر قانونی (غیرقابل تغییر)
  REVERSED = 'REVERSED'    // معکوس شده با سند اصلاحی
}

export enum JournalEntryType {
  NORMAL = 'NORMAL',               // سند عمومی
  OPENING = 'OPENING',             // سند افتتاحیه
  CLOSING = 'CLOSING',             // سند اختتامیه
  PROFIT_LOSS = 'PROFIT_LOSS',     // بستن حساب‌های موقت (سود و زیانی)
  CORRECTION = 'CORRECTION',       // سند اصلاحی
  REVERSAL = 'REVERSAL'            // سند برگشتی / معکوس‌کننده
}

export interface JournalLineInput {
  rowNumber?: number;
  subsidiaryAccountId: string;
  floatingDimension1Id?: string;
  floatingDimension2Id?: string;
  floatingDimension3Id?: string;
  debit: string | number;
  credit: string | number;
  description: string;
  currencyCode?: string;
  currencyRate?: string | number;
  foreignAmount?: string | number;
}

export interface JournalLine {
  id: string;
  journalEntryId: string;
  rowNumber: number;
  subsidiaryAccountId: string;
  floatingDimension1Id?: string;
  floatingDimension2Id?: string;
  floatingDimension3Id?: string;
  debit: string;   // Decimal string
  credit: string;  // Decimal string
  description: string;
  currencyCode: string;
  currencyRate: string;
  foreignAmount?: string;
}

export interface JournalEntryInput {
  tenantId: string;
  companyId: string;
  branchId: string;
  fiscalYearId: string;
  fiscalPeriodId?: string;
  entryDateShamsi: string; // YYYY/MM/DD
  entryType?: JournalEntryType;
  description: string;
  sourceModule?: string;
  sourceDocumentId?: string;
  createdByUserId: string;
  lines: JournalLineInput[];
}

export interface JournalEntry {
  id: string;
  tenantId: string;
  companyId: string;
  branchId: string;
  fiscalYearId: string;
  fiscalPeriodId?: string;
  sequenceNumber: number;   // شماره عطف ترتیبی
  dailyNumber: number;      // شماره روزانه
  permanentNumber?: number; // شماره قطعی دفتر روزنامه پس از نهایی‌سازی
  entryDateShamsi: string;  // YYYY/MM/DD
  entryDateGregorian: Date;
  entryType: JournalEntryType;
  status: JournalEntryStatus;
  description: string;
  totalDebit: string;
  totalCredit: string;
  sourceModule?: string;
  sourceDocumentId?: string;
  reversalEntryId?: string; // اگر معکوس شده باشد
  reversedEntryId?: string; // اگر این سند خود معکوس‌کننده سند دیگری باشد
  createdByUserId: string;
  approvedByUserId?: string;
  createdAt: Date;
  updatedAt: Date;
  lines: JournalLine[];
}
