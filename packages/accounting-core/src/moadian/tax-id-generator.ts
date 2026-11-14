import { VerhoeffAlgorithm } from './verhoeff';

export class TaxIdGenerator {
  // تاریخ مبدا سازمان امور مالیاتی (1970-01-01 UTC)
  private static readonly EPOCH_DATE = new Date('1970-01-01T00:00:00.000Z');

  /**
   * تولید شماره منحصر به فرد مالیاتی ۲۲ کاراکتری صورتحساب
   * @param fiscalMemoryId شناسه یکتای حافظه مالیاتی (۶ کاراکتر اختصاص‌یافته توسط کارپوشه)
   * @param issueDate تاریخ صدور صورتحساب (شیء Date یا timestamp)
   * @param serialNumber شماره سریال داخلی صورتحساب (عدد صحیح مثبت تا ۱۰ رقم)
   */
  public static generateTaxId(
    fiscalMemoryId: string,
    issueDate: Date | number,
    serialNumber: number | string
  ): string {
    const memoryId = fiscalMemoryId.trim().toUpperCase();
    if (memoryId.length !== 6) {
      throw new Error(`شناسه حافظه مالیاتی باید دقیقاً ۶ کاراکتر باشد. مقدار دریافت شده: ${memoryId}`);
    }

    const dateObj = typeof issueDate === 'number' ? new Date(issueDate) : issueDate;
    const diffMs = dateObj.getTime() - this.EPOCH_DATE.getTime();
    const daysSinceEpoch = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (daysSinceEpoch < 0 || daysSinceEpoch > 99999) {
      throw new Error(`تاریخ صدور صورتحساب نامعتبر است: ${dateObj.toISOString()}`);
    }

    const daysPart = daysSinceEpoch.toString().padStart(5, '0');
    const serialNum = typeof serialNumber === 'string' ? parseInt(serialNumber, 10) : serialNumber;

    if (isNaN(serialNum) || serialNum <= 0 || serialNum > 9999999999) {
      throw new Error(`شماره سریال صورتحساب باید عددی بین ۱ تا ۹۹۹۹۹۹۹۹۹۹ باشد.`);
    }

    const serialPart = serialNum.toString().padStart(10, '0');

    // ۲۱ کاراکتر بدنه صورتحساب: [۶ کاراکتر حافظه] + [۵ رقم روز از مبدا] + [۱۰ رقم سریال]
    const body21 = `${memoryId}${daysPart}${serialPart}`;

    // جهت محاسبه رقم کنترل Verhoeff، کاراکترهای حرفی حافظه مالیاتی به کد اسکی عددی تبدیل می‌شوند
    const numericStringToVerify = this.convertToNumericString(body21);
    const checkDigit = VerhoeffAlgorithm.generateCheckDigit(numericStringToVerify);

    return `${body21}${checkDigit}`;
  }

  /**
   * تبدیل رشته دارای حروف الفبا به رشته تماماً عددی جهت تغذیه به الگوریتم Verhoeff
   */
  public static convertToNumericString(text: string): string {
    let result = '';
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (char >= '0' && char <= '9') {
        result += char;
      } else {
        // تبدیل حروف انگلیسی به کد اسکی (A -> 65, B -> 66, ...)
        const ascii = char.charCodeAt(0);
        result += ascii.toString();
      }
    }
    return result;
  }

  /**
   * اعتبارسنجی ساختار و رقم کنترلی شماره مالیاتی ۲۲ کاراکتری
   */
  public static validateTaxId(taxId: string): boolean {
    if (!taxId || taxId.length !== 22) {
      return false;
    }

    const body21 = taxId.substring(0, 21);
    const checkDigit = parseInt(taxId.substring(21, 22), 10);
    if (isNaN(checkDigit)) {
      return false;
    }

    const numericString = this.convertToNumericString(body21);
    const calculatedCheck = VerhoeffAlgorithm.generateCheckDigit(numericString);

    return calculatedCheck === checkDigit;
  }
}
