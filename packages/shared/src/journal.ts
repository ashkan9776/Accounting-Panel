import { z } from 'zod';

export const JournalLineSchema = z.object({
  subsidiaryAccountId: z.string().min(1, 'حساب معین الزامی است.'),
  floatingDimension1Id: z.string().optional(),
  floatingDimension2Id: z.string().optional(),
  floatingDimension3Id: z.string().optional(),
  debit: z.string().default('0'),
  credit: z.string().default('0'),
  description: z.string().min(1, 'شرح آرتیکل الزامی است.')
});

export type JournalLineInput = z.infer<typeof JournalLineSchema>;

export const JournalEntryCreateSchema = z.object({
  entryDateShamsi: z
    .string()
    .regex(/^\d{4}\/\d{2}\/\d{2}$/, 'فرمت تاریخ شمسی باید YYYY/MM/DD باشد.'),
  description: z.string().min(3, 'شرح سند الزامی است.'),
  sourceModule: z.string().default('GENERAL_LEDGER'),
  sourceDocumentId: z.string().optional(),
  lines: z.array(JournalLineSchema).min(2, 'سند حسابداری باید حداقل ۲ سطر داشته باشد.')
});

export type JournalEntryCreateInput = z.infer<typeof JournalEntryCreateSchema>;
