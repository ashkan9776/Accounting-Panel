/**
 * توابع جامع و استاندارد فارسی‌سازی ارقام، مقادیر مالی و تاریخ‌های شمسی
 */

/**
 * تبدیل تمامی ارقام لاتین (0-9) و عربی (٠-٩) به ارقام استاندارد فارسی (۰-۹)
 */
export function toPersianDigits(input: string | number | bigint | null | undefined): string {
  if (input === null || input === undefined || input === '') return '';
  const farsiDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return input
    .toString()
    .replace(/[0-9]/g, (char) => farsiDigits[parseInt(char, 10)])
    .replace(/[٠-٩]/g, (char) => farsiDigits[char.charCodeAt(0) - 1632]);
}

/**
 * تبدیل ارقام فارسی و عربی به ارقام انگلیسی (جهت ارسال به API، کوئری‌ها یا محاسبات ریاضی)
 */
export function toEnglishDigits(input: string | number | null | undefined): string {
  if (input === null || input === undefined || input === '') return '';
  return input
    .toString()
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 1776))
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 1632));
}

/**
 * قالب‌بندی مقادیر ریالی با جداکننده سه‌رقمی و ارقام کاملاً فارسی
 * مثال: 12500000 -> ۱۲,۵۰۰,۰۰۰
 */
export function formatCurrencyFa(value: number | string | bigint | null | undefined): string {
  if (value === null || value === undefined || value === '') return '۰';
  const clean = typeof value === 'number' ? value.toFixed(0) : toEnglishDigits(value.toString()).replace(/,/g, '').trim();
  const num = Number(clean);
  if (isNaN(num)) return toPersianDigits(value);
  const formatted = Math.round(num).toLocaleString('fa-IR');
  return toPersianDigits(formatted);
}

/**
 * قالب‌بندی مقادیر عددی یا اعشاری با ارقام کاملاً فارسی
 * مثال: 45.5 -> ۴۵.۵
 */
export function formatNumberFa(value: number | string | bigint | null | undefined): string {
  if (value === null || value === undefined || value === '') return '۰';
  const clean = typeof value === 'number' ? value.toString() : toEnglishDigits(value.toString()).trim();
  const num = Number(clean);
  if (isNaN(num)) return toPersianDigits(value);
  const formatted = num.toLocaleString('fa-IR');
  return toPersianDigits(formatted);
}

/**
 * تبدیل تاریخ میلادی (ISO یا Date) و تاریخ‌های شمسی به رشته استاندارد شمسی با ارقام فارسی
 * مثال: 2027-11-16T13:14:06.529Z -> ۱۴۰۶/۰۸/۲۵
 */
export function formatShamsiDateFa(dateStr?: string | Date | null): string {
  if (!dateStr) return '—';
  if (dateStr instanceof Date) {
    try {
      const formatted = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(dateStr);
      return toPersianDigits(formatted);
    } catch {
      return '—';
    }
  }

  const str = dateStr.toString().trim();
  // اگر از قبل تاریخ شمسی در فرمت ۱۴۰x/xx/xx است
  if (/^1[34]\d\d[\/-]\d{1,2}[\/-]\d{1,2}/.test(str)) {
    return toPersianDigits(str.replace(/-/g, '/'));
  }

  try {
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      const formatted = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(d);
      return toPersianDigits(formatted);
    }
  } catch {}

  return toPersianDigits(str);
}

// تطبیق سراسری خروجی اعداد به فارسی در فرآیند SSR و مرورگر
if (typeof Number !== 'undefined' && Number.prototype.toLocaleString) {
  const origNumberToLocale = Number.prototype.toLocaleString;
  Number.prototype.toLocaleString = function (locales?: any, options?: any) {
    const res = origNumberToLocale.call(this, locales || 'fa-IR', options);
    return toPersianDigits(res);
  };
}
