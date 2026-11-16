import { z } from 'zod';

export const IranianMobileSchema = z
  .string()
  .trim()
  .regex(/^09\d{9}$/, 'شماره موبایل باید ۱۱ رقم و با ۰۹ شروع شود.');

export const LoginSchema = z.object({
  mobile: IranianMobileSchema,
  password: z.string().min(6, 'کلمه عبور باید حداقل ۶ کاراکتر باشد.'),
  tenantId: z.string().optional()
});

export type LoginInput = z.infer<typeof LoginSchema>;

export const TwoFactorVerifySchema = z.object({
  token: z
    .string()
    .trim()
    .length(6, 'کد تایید دو مرحله‌ای باید دقیقا ۶ رقم باشد.')
    .regex(/^\d{6}$/, 'کد تایید فقط شامل ارقام عددی است.')
});

export type TwoFactorVerifyInput = z.infer<typeof TwoFactorVerifySchema>;
