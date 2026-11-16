'use client';

import { useEffect } from 'react';

const farsiDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

function toPersianDigits(input: string | number | null | undefined): string {
  if (input === null || input === undefined || input === '') return '';
  return input
    .toString()
    .replace(/[0-9]/g, (char) => farsiDigits[parseInt(char, 10)])
    .replace(/[٠-٩]/g, (char) => farsiDigits[char.charCodeAt(0) - 1632]);
}

/**
 * کامپوننت سراسری جهت تضمین نمایش ارقام فارسی در کلیه مرورگرها و سیستم‌های عامل
 */
export function PersianDigitsInit() {
  useEffect(() => {
    // ۱. اصلاح سراسری متد فرمت اعداد در سطح مرورگر کلاینت
    if (typeof Number !== 'undefined' && Number.prototype.toLocaleString) {
      const origNumberToLocale = Number.prototype.toLocaleString;
      Number.prototype.toLocaleString = function (
        locales?: Intl.LocalesArgument,
        options?: Intl.NumberFormatOptions
      ) {
        const res = origNumberToLocale.call(this, locales || 'fa-IR', options);
        return toPersianDigits(res);
      };
    }

    // ۲. اصلاح سراسری متد فرمت تاریخ در سطح مرورگر کلاینت
    if (typeof Date !== 'undefined' && Date.prototype.toLocaleDateString) {
      const origDateToLocale = Date.prototype.toLocaleDateString;
      Date.prototype.toLocaleDateString = function (
        locales?: Intl.LocalesArgument,
        options?: Intl.DateTimeFormatOptions
      ) {
        const res = origDateToLocale.call(this, locales || 'fa-IR-u-ca-persian', options);
        return toPersianDigits(res);
      };
    }
  }, []);

  return null;
}
