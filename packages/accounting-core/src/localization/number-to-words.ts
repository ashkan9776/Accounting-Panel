/**
 * تبدیل اعداد و مبالغ به حروف فارسی با پشتیبانی از ریال و تومان
 */

const ONES = ['', 'یک', 'دو', 'سه', 'چهار', 'پنج', 'شش', 'هفت', 'هشت', 'نه'];
const TEENS = ['ده', 'یازده', 'دوازده', 'سیزده', 'چهارده', 'پانزده', 'شانزده', 'هفده', 'هجده', 'نوزده'];
const TENS = ['', '', 'بیست', 'سی', 'چهل', 'پنجاه', 'شصت', 'هفتاد', 'هشتاد', 'نود'];
const HUNDREDS = ['', 'صد', 'دویست', 'سیصد', 'چهارصد', 'پانصد', 'ششصد', 'هفتصد', 'هشتصد', 'نهصد'];
const THOUSANDS = ['', 'هزار', 'میلیون', 'میلیارد', 'تریلیون'];

function convertThreeDigits(num: number): string {
  const h = Math.floor(num / 100);
  const remainder = num % 100;
  const t = Math.floor(remainder / 10);
  const o = remainder % 10;

  const parts: string[] = [];

  if (h > 0) {
    parts.push(HUNDREDS[h]);
  }

  if (remainder >= 10 && remainder <= 19) {
    parts.push(TEENS[remainder - 10]);
  } else {
    if (t > 0) parts.push(TENS[t]);
    if (o > 0) parts.push(ONES[o]);
  }

  return parts.join(' و ');
}

/**
 * تبدیل یک عدد صحیح مثبت به حروف فارسی
 */
export function numberToPersianWords(input: number | string | bigint): string {
  const str = input.toString().replace(/,/g, '').trim();
  if (str === '0' || str === '') return 'صفر';

  const isNegative = str.startsWith('-');
  const cleanStr = isNegative ? str.substring(1) : str;

  // تقسیم به دسته‌های ۳ رقمی از راست به چپ
  const chunks: number[] = [];
  let remaining = cleanStr;
  while (remaining.length > 0) {
    const chunkLength = remaining.length % 3 || 3;
    chunks.push(parseInt(remaining.substring(0, chunkLength), 10));
    remaining = remaining.substring(chunkLength);
  }

  const parts: string[] = [];
  const totalChunks = chunks.length;

  for (let i = 0; i < totalChunks; i++) {
    const chunkValue = chunks[i];
    if (chunkValue === 0) continue;

    const scaleIndex = totalChunks - 1 - i;
    const chunkText = convertThreeDigits(chunkValue);
    const scale = THOUSANDS[scaleIndex] || '';

    if (scale) {
      parts.push(`${chunkText} ${scale}`);
    } else {
      parts.push(chunkText);
    }
  }

  const result = parts.join(' و ');
  return isNegative ? `منفی ${result}` : result;
}

/**
 * قالب‌بندی مبلغ مالی به حروف همراه با واحد ریال یا تومان
 */
export function amountToPersianWords(amount: number | string | bigint, unit: 'RIAL' | 'TOMAN' = 'RIAL'): string {
  const words = numberToPersianWords(amount);
  if (words === 'صفر') {
    return unit === 'RIAL' ? 'صفر ریال' : 'صفر تومان';
  }
  return unit === 'RIAL' ? `${words} ریال` : `${words} تومان`;
}

/**
 * فرمت جداکننده سه‌رقمی فارسی/انگلیسی
 */
export function formatThousands(value: number | string | bigint): string {
  const parts = value.toString().split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return parts.join('.');
}

/**
 * تبدیل ارقام انگلیسی به فارسی
 */
export function toPersianDigits(input: string | number): string {
  const farsiDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return input.toString().replace(/[0-9]/g, (char) => farsiDigits[parseInt(char, 10)]);
}
