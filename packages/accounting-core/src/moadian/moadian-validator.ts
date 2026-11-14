import Decimal from 'decimal.js';
import {
  MoadianInvoicePayload,
  MoadianInvoiceType,
  MoadianInvoiceSubject,
  MoadianInvoicePattern
} from './types';
import { TaxIdGenerator } from './tax-id-generator';
import {
  isValidNationalCode,
  isValidCompanyNationalId
} from '../localization/validators';

Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

export interface ValidationIssue {
  field: string;
  code: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  issues: ValidationIssue[];
}

export class MoadianValidator {
  /**
   * اعتبارسنجی پیش از ارسال (Pre-flight Validation) بسته صورتحساب الکترونیکی سامانه مودیان
   */
  public static validate(payload: MoadianInvoicePayload): ValidationResult {
    const issues: ValidationIssue[] = [];
    const { header, items } = payload;

    // ۱. اعتبارسنجی سربرگ (Header)
    if (!header.taxId) {
      issues.push({ field: 'header.taxId', code: 'TAX_ID_REQUIRED', message: 'شماره منحصر به فرد مالیاتی الزامی است.' });
    } else if (!TaxIdGenerator.validateTaxId(header.taxId)) {
      issues.push({
        field: 'header.taxId',
        code: 'TAX_ID_INVALID',
        message: 'ساختار یا رقم کنترلی شماره مالیاتی ۲۲ رقمی نامعتبر است.'
      });
    }

    if (!header.sellerFiscalMemoryId || header.sellerFiscalMemoryId.trim().length !== 6) {
      issues.push({
        field: 'header.sellerFiscalMemoryId',
        code: 'SELLER_MEMORY_ID_INVALID',
        message: 'شناسه یکتای حافظه مالیاتی فروشنده باید ۶ کاراکتر باشد.'
      });
    }

    // اعتبارسنجی شناسه ملی فروشنده
    if (!header.sellerNationalId) {
      issues.push({ field: 'header.sellerNationalId', code: 'SELLER_NATIONAL_ID_REQUIRED', message: 'شناسه/کد ملی فروشنده الزامی است.' });
    } else {
      const isValidSeller =
        header.sellerNationalId.length === 11
          ? isValidCompanyNationalId(header.sellerNationalId)
          : isValidNationalCode(header.sellerNationalId);
      if (!isValidSeller) {
        issues.push({
          field: 'header.sellerNationalId',
          code: 'SELLER_NATIONAL_ID_INVALID',
          message: 'شناسه ملی یا کد ملی فروشنده از نظر الگوریتم کنترلی نامعتبر است.'
        });
      }
    }

    // در صورتحساب نوع ۱، اطلاعات هویتی خریدار الزامی است
    if (header.invoiceType === MoadianInvoiceType.TYPE_1) {
      if (!header.customerNationalId) {
        issues.push({
          field: 'header.customerNationalId',
          code: 'CUSTOMER_NATIONAL_ID_REQUIRED',
          message: 'در صورتحساب نوع اول، ثبت شناسه ملی یا کد ملی خریدار الزامی است.'
        });
      } else if (header.customerType !== 'FOREIGN_NATIONAL') {
        const isValidCust =
          header.customerNationalId.length === 11
            ? isValidCompanyNationalId(header.customerNationalId)
            : isValidNationalCode(header.customerNationalId);
        if (!isValidCust) {
          issues.push({
            field: 'header.customerNationalId',
            code: 'CUSTOMER_NATIONAL_ID_INVALID',
            message: 'کد ملی یا شناسه ملی خریدار نامعتبر است.'
          });
        }
      }
    }

    // در صورتحساب اصلاحی، ابطالی یا برگشت، شماره مالیاتی مرجع الزامی است
    if (
      header.invoiceSubject === MoadianInvoiceSubject.CORRECTION ||
      header.invoiceSubject === MoadianInvoiceSubject.CANCELLATION ||
      header.invoiceSubject === MoadianInvoiceSubject.RETURN
    ) {
      if (!header.referenceTaxId) {
        issues.push({
          field: 'header.referenceTaxId',
          code: 'REFERENCE_TAX_ID_REQUIRED',
          message: 'در صورتحساب‌های اصلاحی، ابطالی و برگشتی، شماره مالیاتی صورتحساب مرجع الزامی است.'
        });
      } else if (!TaxIdGenerator.validateTaxId(header.referenceTaxId)) {
        issues.push({
          field: 'header.referenceTaxId',
          code: 'REFERENCE_TAX_ID_INVALID',
          message: 'شماره مالیاتی صورتحساب مرجع نامعتبر است.'
        });
      }
    }

    // ۲. اعتبارسنجی اقلام (Items)
    if (!items || items.length === 0) {
      issues.push({ field: 'items', code: 'ITEMS_EMPTY', message: 'صورتحساب باید حداقل شامل یک ردیف کالا یا خدمت باشد.' });
      return { isValid: issues.length === 0, issues };
    }

    let calculatedGross = new Decimal(0);
    let calculatedDiscount = new Decimal(0);
    let calculatedNet = new Decimal(0);
    let calculatedVat = new Decimal(0);

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const row = item.rowNumber || i + 1;

      // شناسه ۱۳ رقمی کالا و خدمت (SSTID)
      if (!item.sstid || !/^\d{13}$/.test(item.sstid)) {
        issues.push({
          field: `items[${i}].sstid`,
          code: 'SSTID_INVALID',
          message: `ردیف ${row}: شناسه کالا/خدمت سازمان مالیاتی باید دقیقاً یک عدد ۱۳ رقمی باشد.`
        });
      }

      // واحد اندازه‌گیری ۴ رقمی
      if (!item.unitCode || !/^\d{4}$/.test(item.unitCode)) {
        issues.push({
          field: `items[${i}].unitCode`,
          code: 'UNIT_CODE_INVALID',
          message: `ردیف ${row}: کد واحد اندازه‌گیری مودیان باید یک کد ۴ رقمی معتبر باشد.`
        });
      }

      const qty = new Decimal(item.quantity || 0);
      const unitPrice = new Decimal(item.unitPrice || 0);
      const itemTotal = new Decimal(item.totalPrice || 0);
      const itemDisc = new Decimal(item.discountAmount || 0);
      const itemNet = new Decimal(item.netPrice || 0);
      const itemVat = new Decimal(item.vatAmount || 0);

      if (qty.lessThanOrEqualTo(0)) {
        issues.push({ field: `items[${i}].quantity`, code: 'QUANTITY_INVALID', message: `ردیف ${row}: تعداد/مقدار باید بزرگتر از صفر باشد.` });
      }

      // بررسی محاسبات ریالی سطر
      const expectedTotal = qty.times(unitPrice).round();
      if (!expectedTotal.equals(itemTotal)) {
        issues.push({
          field: `items[${i}].totalPrice`,
          code: 'TOTAL_PRICE_MISMATCH',
          message: `ردیف ${row}: مبلغ کل ناخالص با حاصلضرب تعداد در نرخ واحد همخوانی ندارد.`
        });
      }

      const expectedNet = itemTotal.minus(itemDisc).round();
      if (!expectedNet.equals(itemNet)) {
        issues.push({
          field: `items[${i}].netPrice`,
          code: 'NET_PRICE_MISMATCH',
          message: `ردیف ${row}: مبلغ خالص پس از تخفیف همخوانی ندارد.`
        });
      }

      calculatedGross = calculatedGross.plus(itemTotal);
      calculatedDiscount = calculatedDiscount.plus(itemDisc);
      calculatedNet = calculatedNet.plus(itemNet);
      calculatedVat = calculatedVat.plus(itemVat);
    }

    // ۳. انطباق جمع اقلام با مقادیر سربرگ
    if (!new Decimal(header.totalGrossAmount).equals(calculatedGross)) {
      issues.push({
        field: 'header.totalGrossAmount',
        code: 'HEADER_GROSS_MISMATCH',
        message: 'مجموع مبالغ ناخالص سربرگ با سرجمع اقلام صورتحساب مغایرت دارد.'
      });
    }

    if (!new Decimal(header.totalDiscountAmount).equals(calculatedDiscount)) {
      issues.push({
        field: 'header.totalDiscountAmount',
        code: 'HEADER_DISCOUNT_MISMATCH',
        message: 'مجموع تخفیفات سربرگ با مجموع تخفیفات اقلام مغایرت دارد.'
      });
    }

    if (!new Decimal(header.totalNetAmount).equals(calculatedNet)) {
      issues.push({
        field: 'header.totalNetAmount',
        code: 'HEADER_NET_MISMATCH',
        message: 'مجموع مبلغ خالص سربرگ با سرجمع اقلام مغایرت دارد.'
      });
    }

    if (!new Decimal(header.totalVatAmount).equals(calculatedVat)) {
      issues.push({
        field: 'header.totalVatAmount',
        code: 'HEADER_VAT_MISMATCH',
        message: 'مجموع مالیات بر ارزش افزوده سربرگ با مجموع مالیات اقلام مغایرت دارد.'
      });
    }

    const expectedGrand = calculatedNet.plus(calculatedVat);
    if (!new Decimal(header.totalGrandAmount).equals(expectedGrand)) {
      issues.push({
        field: 'header.totalGrandAmount',
        code: 'HEADER_GRAND_MISMATCH',
        message: 'مبلغ نهایی کل صورتحساب با حاصلجمع خالص و ارزش افزوده اقلام مغایرت دارد.'
      });
    }

    return {
      isValid: issues.length === 0,
      issues
    };
  }
}
