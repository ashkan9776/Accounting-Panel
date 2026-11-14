/**
 * اعتبارسنجی شناسه‌های هویتی و بانکی ایران
 */

/**
 * اعتبارسنجی کد ملی اشخاص حقیقی ۱۰ رقمی
 */
export function isValidNationalCode(code: string): boolean {
  if (!code || typeof code !== 'string') return false;
  const clean = code.trim();
  if (!/^\d{10}$/.test(clean)) return false;

  // تمام ارقام نباید یکسان باشند (مانند 1111111111)
  if (/^(\d)\1{9}$/.test(clean)) return false;

  const check = parseInt(clean[9], 10);
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(clean[i], 10) * (10 - i);
  }
  const remainder = sum % 11;

  if (remainder < 2) {
    return check === remainder;
  } else {
    return check === 11 - remainder;
  }
}

/**
 * اعتبارسنجی شناسه ملی اشخاص حقوقی ۱۱ رقمی
 */
export function isValidCompanyNationalId(id: string): boolean {
  if (!id || typeof id !== 'string') return false;
  const clean = id.trim();
  if (!/^\d{11}$/.test(clean)) return false;

  const check = parseInt(clean[10], 10);
  const coefficients = [29, 27, 23, 19, 17, 29, 27, 23, 19, 17];
  const d = parseInt(clean[9], 10) + 2;

  let sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += (parseInt(clean[i], 10) + d) * coefficients[i];
  }
  let remainder = sum % 11;
  if (remainder === 10) remainder = 0;

  return check === remainder;
}

/**
 * اعتبارسنجی کد پستی ۱۰ رقمی ایران
 */
export function isValidPostalCode(postalCode: string): boolean {
  if (!postalCode || typeof postalCode !== 'string') return false;
  const clean = postalCode.trim();
  // کد پستی نباید با 0 یا 2 شروع شود و ارقام 0 یا 2 در رقم پنجم نباشد
  return /^[13-9]{4}[1-9][0-9]{5}$/.test(clean);
}

/**
 * اعتبارسنجی شماره شبا بانکی ایران (IBAN با پیش‌شماره IR)
 */
export function isValidSheba(sheba: string): boolean {
  if (!sheba || typeof sheba !== 'string') return false;
  const clean = sheba.replace(/\s+/g, '').toUpperCase();
  if (!/^IR\d{24}$/.test(clean)) return false;

  // جابجایی IR و دو رقم اول به انتهای رشته و تبدیل کاراکترها به ارقام (I=18, R=27)
  const rearranged = clean.substring(4) + '1827' + clean.substring(2, 4);

  // محاسبه پیمانه ۹۷ با BigInt برای رشته‌های طولانی
  const remainder = BigInt(rearranged) % 97n;
  return remainder === 1n;
}

/**
 * اعتبارسنجی شماره کارت بانکی ۱۶ رقمی با الگوریتم Luhn
 */
export function isValidBankCard(cardNumber: string): boolean {
  if (!cardNumber || typeof cardNumber !== 'string') return false;
  const clean = cardNumber.replace(/[\s-]+/g, '');
  if (!/^\d{16}$/.test(clean)) return false;

  let sum = 0;
  for (let i = 0; i < 16; i++) {
    let digit = parseInt(clean[i], 10);
    if (i % 2 === 0) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }
  return sum % 10 === 0;
}
