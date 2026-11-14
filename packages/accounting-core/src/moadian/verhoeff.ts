/**
 * پیاده‌سازی الگوریتم کنترلی و چک‌سام Verhoeff
 * مورد استفاده رسمی در تولید رقم ۲۲ام شماره منحصر‌به‌فرد مالیاتی (Tax ID)
 */

export class VerhoeffAlgorithm {
  // جدول ضرب دی‌هدرال (Dihedral group D5)
  private static readonly d: number[][] = [
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
    [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
    [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
    [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
    [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
    [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
    [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
    [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
    [9, 8, 7, 6, 5, 4, 3, 2, 1, 0]
  ];

  // جدول جایگشت موقعیت (Permutation table)
  private static readonly p: number[][] = [
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
    [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
    [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
    [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
    [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
    [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
    [7, 0, 4, 6, 9, 1, 3, 2, 5, 8]
  ];

  // جدول معکوس (Inverse table)
  private static readonly inv: number[] = [0, 4, 3, 2, 1, 5, 6, 7, 8, 9];

  /**
   * محاسبه رقم چک‌سام Verhoeff برای یک رشته عددی
   */
  public static generateCheckDigit(numStr: string): number {
    let c = 0;
    const digits = numStr.split('').reverse().map(Number);

    for (let i = 0; i < digits.length; i++) {
      const pIndex = (i + 1) % 8;
      c = this.d[c][this.p[pIndex][digits[i]]];
    }

    return this.inv[c];
  }

  /**
   * اعتبارسنجی یک عدد به همراه رقم چک‌سام Verhoeff
   */
  public static validate(numWithCheckDigit: string): boolean {
    let c = 0;
    const digits = numWithCheckDigit.split('').reverse().map(Number);

    for (let i = 0; i < digits.length; i++) {
      const pIndex = i % 8;
      c = this.d[c][this.p[pIndex][digits[i]]];
    }

    return c === 0;
  }
}
