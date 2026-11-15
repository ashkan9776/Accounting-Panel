import * as crypto from 'crypto';
import { TwoFactorSetupResponse } from './types';

export class SecurityEngine {
  private static readonly BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

  /**
   * تولید یک کلید تصادفی Base32 برای تایید دومرحله‌ای
   */
  public static generateBase32Secret(length = 20): string {
    const bytes = crypto.randomBytes(length);
    let secret = '';
    for (let i = 0; i < bytes.length; i++) {
      secret += this.BASE32_ALPHABET[bytes[i] % this.BASE32_ALPHABET.length];
    }
    return secret;
  }

  /**
   * تولید URL استاندارد otpauth جهت استفاده در QR Code
   */
  public static generateOtpAuthUrl(
    issuer: string,
    userAccount: string,
    secret: string,
  ): string {
    const encodedIssuer = encodeURIComponent(issuer);
    const encodedAccount = encodeURIComponent(userAccount);
    return `otpauth://totp/${encodedIssuer}:${encodedAccount}?secret=${secret}&issuer=${encodedIssuer}&algorithm=SHA1&digits=6&period=30`;
  }

  /**
   * تولید کدهای پشتیبان یکبار مصرف (Backup Codes)
   */
  public static generateBackupCodes(count = 8): { plainCodes: string[]; hashedCodes: string[] } {
    const plainCodes: string[] = [];
    const hashedCodes: string[] = [];

    for (let i = 0; i < count; i++) {
      const code = crypto.randomBytes(4).toString('hex').toUpperCase(); // 8 characters
      plainCodes.push(code);
      const hash = crypto.createHash('sha256').update(code).digest('hex');
      hashedCodes.push(hash);
    }

    return { plainCodes, hashedCodes };
  }

  /**
   * اعتبارسنجی کد ۶ رقمی TOTP (RFC 6238)
   */
  public static verifyTotpCode(
    secret: string,
    token: string,
    window = 1, // tolerance: 1 step before or after (30s)
    timestamp: number = Date.now(),
  ): boolean {
    const cleanedToken = (token || '').trim();
    if (cleanedToken.length !== 6 || !/^\d{6}$/.test(cleanedToken)) {
      return false;
    }

    const epochTime = Math.floor(timestamp / 1000);
    const currentStep = Math.floor(epochTime / 30);

    for (let i = -window; i <= window; i++) {
      const step = currentStep + i;
      const expectedCode = this.generateTotpForStep(secret, step);
      if (expectedCode === cleanedToken) {
        return true;
      }
    }

    return false;
  }

  /**
   * تولید کد TOTP برای یک گام زمانی خاص
   */
  public static generateTotpForStep(secret: string, step: number): string {
    const key = this.base32ToBuffer(secret);
    const counterBuffer = Buffer.alloc(8);
    counterBuffer.writeBigInt64BE(BigInt(step));

    const hmac = crypto.createHmac('sha1', key);
    hmac.update(counterBuffer);
    const digest = hmac.digest();

    const offset = digest[digest.length - 1] & 0x0f;
    const binary =
      ((digest[offset] & 0x7f) << 24) |
      ((digest[offset + 1] & 0xff) << 16) |
      ((digest[offset + 2] & 0xff) << 8) |
      (digest[offset + 3] & 0xff);

    const otp = binary % 1000000;
    return otp.toString().padStart(6, '0');
  }

  /**
   * اعتبارسنجی رمز عبور مطابق الزامات امنیتی افتا و شاپرک
   */
  public static validatePasswordStrength(password: string): { isValid: boolean; score: number; errors: string[] } {
    const errors: string[] = [];
    let score = 0;

    if (!password || password.length < 8) {
      errors.push('طول کلمه عبور باید حداقل ۸ کاراکتر باشد.');
    } else {
      score += 25;
    }

    if (/[A-Z]/.test(password)) {
      score += 25;
    } else {
      errors.push('کلمه عبور باید حداقل شامل یک حرف بزرگ لاتین (A-Z) باشد.');
    }

    if (/[a-z]/.test(password)) {
      score += 25;
    } else {
      errors.push('کلمه عبور باید حداقل شامل یک حرف کوچک لاتین (a-z) باشد.');
    }

    if (/\d/.test(password)) {
      score += 15;
    } else {
      errors.push('کلمه عبور باید حداقل شامل یک عدد (0-9) باشد.');
    }

    if (/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
      score += 10;
    } else {
      errors.push('کلمه عبور باید حداقل شامل یک علامت یا نماد خاص (@, #, $, ...) باشد.');
    }

    return {
      isValid: errors.length === 0,
      score: Math.min(score, 100),
      errors,
    };
  }

  /**
   * تبدیل رشته Base32 به بافر بایت
   */
  private static base32ToBuffer(base32: string): Buffer {
    const cleanBase32 = base32.toUpperCase().replace(/=+$/, '');
    let bits = '';
    for (let i = 0; i < cleanBase32.length; i++) {
      const val = this.BASE32_ALPHABET.indexOf(cleanBase32[i]);
      if (val === -1) continue;
      bits += val.toString(2).padStart(5, '0');
    }

    const bytes: number[] = [];
    for (let i = 0; i + 8 <= bits.length; i += 8) {
      bytes.push(parseInt(bits.substring(i, i + 8), 2));
    }

    return Buffer.from(bytes);
  }
}
