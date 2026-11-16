import jalaali from 'jalaali-js';

export interface ShamsiDateComponents {
  year: number;
  month: number;
  day: number;
}

export interface GregorianDateComponents {
  year: number;
  month: number;
  day: number;
}

const SHAMSI_MONTH_NAMES = [
  'فروردین',
  'اردیبهشت',
  'خرداد',
  'تیر',
  'مرداد',
  'شهریور',
  'مهر',
  'آبان',
  'آذر',
  'دی',
  'بهمن',
  'اسفند'
];

/**
 * بررسی کبیسه بودن سال شمسی بر اساس محاسبات استاندارد جلالی
 */
export function isShamsiLeapYear(year: number): boolean {
  return jalaali.isLeapJalaaliYear(year);
}

/**
 * تعداد روزهای ماه شمسی
 */
export function getShamsiMonthDays(year: number, month: number): number {
  if (month < 1 || month > 12) {
    throw new Error(`شماره ماه شمسی نامعتبر است: ${month}`);
  }
  return jalaali.jalaaliMonthLength(year, month);
}

/**
 * تبدیل میلادی به شمسی
 */
export function gregorianToShamsi(gy: number, gm: number, gd: number): ShamsiDateComponents {
  const res = jalaali.toJalaali(gy, gm, gd);
  return { year: res.jy, month: res.jm, day: res.jd };
}

/**
 * تبدیل شمسی به میلادی
 */
export function shamsiToGregorian(jy: number, jm: number, jd: number): GregorianDateComponents {
  const res = jalaali.toGregorian(jy, jm, jd);
  return { year: res.gy, month: res.gm, day: res.gd };
}

/**
 * تبدیل شیء Date جاوااسکریپت به رشته استاندارد شمسی YYYY/MM/DD
 */
export function formatToShamsiString(date: Date): string {
  const gy = date.getUTCFullYear();
  const gm = date.getUTCMonth() + 1;
  const gd = date.getUTCDate();
  const shamsi = gregorianToShamsi(gy, gm, gd);
  const m = shamsi.month.toString().padStart(2, '0');
  const d = shamsi.day.toString().padStart(2, '0');
  return `${shamsi.year}/${m}/${d}`;
}

/**
 * پارس کردن رشته تاریخ شمسی YYYY/MM/DD یا YYYY-MM-DD
 */
export function parseShamsiString(str: string): ShamsiDateComponents {
  const parts = str.replace(/-/g, '/').split('/').map((p) => parseInt(p.trim(), 10));
  if (parts.length !== 3 || isNaN(parts[0]) || isNaN(parts[1]) || isNaN(parts[2])) {
    throw new Error(`قالب تاریخ شمسی نامعتبر است: ${str}`);
  }
  const [year, month, day] = parts;
  if (year < 1300 || year > 1500) {
    throw new Error(`سال شمسی باید بین ۱۳۰۰ تا ۱۵۰۰ باشد: ${year}`);
  }
  if (month < 1 || month > 12) {
    throw new Error(`ماه شمسی باید بین ۱ تا ۱۲ باشد: ${month}`);
  }
  const maxDays = getShamsiMonthDays(year, month);
  if (day < 1 || day > maxDays) {
    throw new Error(`روز شمسی در ماه ${month} باید بین ۱ تا ${maxDays} باشد: ${day}`);
  }
  return { year, month, day };
}

/**
 * تبدیل رشته شمسی به Date جاوااسکریپت
 */
export function shamsiStringToDate(str: string): Date {
  const { year, month, day } = parseShamsiString(str);
  const g = shamsiToGregorian(year, month, day);
  return new Date(Date.UTC(g.year, g.month - 1, g.day));
}

/**
 * نام ماه شمسی
 */
export function getShamsiMonthName(monthNumber: number): string {
  if (monthNumber < 1 || monthNumber > 12) {
    throw new Error(`شماره ماه نامعتبر: ${monthNumber}`);
  }
  return SHAMSI_MONTH_NAMES[monthNumber - 1];
}
