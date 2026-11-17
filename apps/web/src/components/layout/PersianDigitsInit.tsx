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

function shouldSkipNode(node: Node | null): boolean {
  if (!node) return true;
  const el = node.nodeType === Node.ELEMENT_NODE ? (node as HTMLElement) : node.parentElement;
  if (!el) return false;
  const tag = el.tagName?.toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'code' || tag === 'pre' || tag === 'script' || tag === 'style') {
    return true;
  }
  if (el.isContentEditable || el.getAttribute('data-latin-digits') === 'true') {
    return true;
  }
  return false;
}

function convertDigitsInNode(node: Node) {
  if (shouldSkipNode(node)) return;

  if (node.nodeType === Node.TEXT_NODE) {
    if (node.nodeValue && /[0-9]/.test(node.nodeValue)) {
      node.nodeValue = toPersianDigits(node.nodeValue);
    }
  } else {
    for (let i = 0; i < node.childNodes.length; i++) {
      convertDigitsInNode(node.childNodes[i]);
    }
  }
}

/**
 * کامپوننت سراسری جهت تضمین ۱۰۰٪ نمایش ارقام فارسی در کلیه صفحات، متن‌ها و اجزای رابط کاربری
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

    // ۳. پویش اولیه و رصد مداوم DOM جهت تضمین فارسی بودن کلیه اعداد نمایش‌یافته
    if (typeof document !== 'undefined' && document.body) {
      convertDigitsInNode(document.body);

      const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          if (mutation.type === 'childList') {
            mutation.addedNodes.forEach((added) => convertDigitsInNode(added));
          } else if (mutation.type === 'characterData') {
            const target = mutation.target;
            if (target.nodeValue && /[0-9]/.test(target.nodeValue) && !shouldSkipNode(target)) {
              target.nodeValue = toPersianDigits(target.nodeValue);
            }
          }
        }
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true,
      });

      return () => {
        observer.disconnect();
      };
    }
  }, []);

  return null;
}
