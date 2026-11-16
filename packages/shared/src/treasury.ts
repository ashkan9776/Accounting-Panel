import { z } from 'zod';

export const ChequeDirectionEnum = z.enum(['RECEIVABLE', 'PAYABLE']);
export type ChequeDirectionType = z.infer<typeof ChequeDirectionEnum>;

export const ChequeStatusEnum = z.enum([
  'AT_HAND',
  'IN_CLEARING',
  'CLEARED',
  'BOUNCED',
  'PASSED',
  'REVOKED',
  'TRANSFERRED',
  'RETURNED',
]);
export type ChequeStatusType = z.infer<typeof ChequeStatusEnum>;

export const ChequeRegisterSchema = z.object({
  chequeDirection: ChequeDirectionEnum,
  sayadId: z
    .string()
    .trim()
    .regex(/^\d{16}$/, 'شناسه صیادی باید دقیقاً ۱۶ رقم باشد.'),
  chequeSerialNumber: z.string().min(1, 'شماره سریال چک الزامی است.'),
  bankName: z.string().min(2, 'نام بانک صادرکننده الزامی است.'),
  bankBranchName: z.string().optional(),
  drawerIban: z.string().optional(),
  drawerPartyId: z.string().optional(),
  payeePartyId: z.string().optional(),
  amount: z.union([z.number().positive(), z.string().min(1)]),
  issueDateShamsi: z
    .string()
    .regex(/^\d{4}\/\d{2}\/\d{2}$/, 'فرمت تاریخ صدور باید YYYY/MM/DD باشد.'),
  dueDateShamsi: z
    .string()
    .regex(/^\d{4}\/\d{2}\/\d{2}$/, 'فرمت تاریخ سررسید باید YYYY/MM/DD باشد.'),
  isGuarantee: z.boolean().default(false),
  description: z.string().optional(),
  bankDimensionId: z.string().optional(),
});
export type ChequeRegisterInput = z.infer<typeof ChequeRegisterSchema>;

export const ChequeStatusChangeSchema = z.object({
  toStatus: ChequeStatusEnum,
  actionDateShamsi: z
    .string()
    .regex(/^\d{4}\/\d{2}\/\d{2}$/, 'فرمت تاریخ اقدام باید YYYY/MM/DD باشد.'),
  bankDimensionId: z.string().optional(),
  payeePartyDimensionId: z.string().optional(),
  description: z.string().optional(),
});
export type ChequeStatusChangeInput = z.infer<typeof ChequeStatusChangeSchema>;

export const MoneyTransferSchema = z.object({
  sourceType: z.enum(['BANK', 'CASH', 'PETTY']),
  sourceId: z.string().min(1, 'حساب مبدا الزامی است.'),
  destType: z.enum(['BANK', 'CASH', 'PETTY']),
  destId: z.string().min(1, 'حساب مقصد الزامی است.'),
  amount: z.union([z.number().positive(), z.string().min(1)]),
  transferDateShamsi: z
    .string()
    .regex(/^\d{4}\/\d{2}\/\d{2}$/, 'فرمت تاریخ انتقال باید YYYY/MM/DD باشد.'),
  trackingCode: z.string().optional(),
  description: z.string().optional(),
});
export type MoneyTransferInput = z.infer<typeof MoneyTransferSchema>;

export const BankAccountCreateSchema = z.object({
  bankName: z.string().min(2, 'نام بانک الزامی است.'),
  branchName: z.string().optional(),
  branchCode: z.string().optional(),
  accountNumber: z.string().min(3, 'شماره حساب الزامی است.'),
  iban: z
    .string()
    .trim()
    .regex(/^IR\d{24}$/, 'شماره شبا باید با IR و ۲۴ رقم عددی باشد.')
    .optional()
    .or(z.literal('')),
  cardNumber: z.string().optional(),
  initialBalance: z.union([z.number(), z.string()]).default(0),
});
export type BankAccountCreateInput = z.infer<typeof BankAccountCreateSchema>;

export const CashDeskCreateSchema = z.object({
  code: z.string().min(1, 'کد صندوق الزامی است.'),
  title: z.string().min(2, 'عنوان صندوق الزامی است.'),
  initialBalance: z.union([z.number(), z.string()]).default(0),
});
export type CashDeskCreateInput = z.infer<typeof CashDeskCreateSchema>;
