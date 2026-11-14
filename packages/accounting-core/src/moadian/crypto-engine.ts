import * as crypto from 'crypto';

export interface KeyPairResult {
  privateKeyPem: string;
  publicKeyPem: string;
  publicKeyBase64: string; // کلید عمومی استخراج‌شده بدون هدر/فوتر PEM برای کارپوشه سازمان مالیاتی
}

export class MoadianCryptoEngine {
  /**
   * تولید زوج‌کلید اختصاصی مودی (RSA 2048-bit) جهت امضای دیجیتال صورتحساب‌ها
   */
  public static generateKeyPair(): KeyPairResult {
    const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem'
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem'
      }
    });

    // استخراج کلید عمومی به‌صورت Base64 فاقد هدر/فوتر PEM جهت بارگذاری آسان در کارپوشه
    const publicKeyBase64 = publicKey
      .replace(/-----BEGIN PUBLIC KEY-----/g, '')
      .replace(/-----END PUBLIC KEY-----/g, '')
      .replace(/\r?\n|\r/g, '')
      .trim();

    return {
      privateKeyPem: privateKey,
      publicKeyPem: publicKey,
      publicKeyBase64
    };
  }

  /**
   * استانداردسازی و مرتب‌سازی کلیدها (Canonicalization) بر اساس مشخصات فنی سازمان امور مالیاتی
   */
  public static canonicalize(obj: any): string {
    if (obj === null || obj === undefined) {
      return '';
    }
    if (typeof obj !== 'object') {
      return JSON.stringify(obj);
    }
    if (Array.isArray(obj)) {
      return '[' + obj.map((item) => this.canonicalize(item)).join(',') + ']';
    }

    const sortedKeys = Object.keys(obj)
      .filter((k) => obj[k] !== undefined && obj[k] !== null)
      .sort();

    const parts = sortedKeys.map((key) => {
      return JSON.stringify(key) + ':' + this.canonicalize(obj[key]);
    });

    return '{' + parts.join(',') + '}';
  }

  /**
   * ایجاد امضای دیجیتال نامتقارن با الگوریتم SHA256withRSA
   */
  public static sign(payload: any, privateKeyPem: string): string {
    const canonicalText = this.canonicalize(payload);
    const sign = crypto.createSign('SHA256');
    sign.update(canonicalText, 'utf8');
    sign.end();
    return sign.sign(privateKeyPem, 'base64');
  }

  /**
   * اعتبارسنجی امضای دیجیتال با استفاده از کلید عمومی
   */
  public static verify(payload: any, signatureBase64: string, publicKeyPem: string): boolean {
    try {
      const canonicalText = this.canonicalize(payload);
      const verify = crypto.createVerify('SHA256');
      verify.update(canonicalText, 'utf8');
      verify.end();
      return verify.verify(publicKeyPem, signatureBase64, 'base64');
    } catch {
      return false;
    }
  }

  /**
   * ساخت بسته نهایی استاندارد JWS Compact بر مبنای RFC 7515
   */
  public static buildJwsCompact(payload: any, privateKeyPem: string, keyId?: string): string {
    const jwsHeader = {
      alg: 'RS256',
      typ: 'jose',
      kid: keyId || 'moadian-key-1'
    };

    const encodedHeader = Buffer.from(JSON.stringify(jwsHeader))
      .toString('base64url');
    const canonicalPayload = this.canonicalize(payload);
    const encodedPayload = Buffer.from(canonicalPayload)
      .toString('base64url');

    const signingInput = `${encodedHeader}.${encodedPayload}`;
    const sign = crypto.createSign('SHA256');
    sign.update(signingInput);
    sign.end();
    const signature = sign.sign(privateKeyPem).toString('base64url');

    return `${encodedHeader}.${encodedPayload}.${signature}`;
  }
}
