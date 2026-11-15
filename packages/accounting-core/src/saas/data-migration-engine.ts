import Decimal from 'decimal.js';
import {
  DataMigrationSource,
  AccountMigrationRow,
  PartyMigrationRow,
  ProductMigrationRow,
  OpeningBalanceRow,
  MigrationValidationResult,
  MigrationRowError,
} from './types';
import { TenantOnboardingEngine } from './tenant-onboarding-engine';

export class DataMigrationEngine {
  /**
   * اعتبارسنجی و نرمال‌سازی کدینگ حساب‌ها
   */
  public static validateAccountsMigration(
    source: DataMigrationSource,
    rows: any[],
  ): MigrationValidationResult<AccountMigrationRow> {
    const errors: MigrationRowError[] = [];
    const parsedData: AccountMigrationRow[] = [];
    const seenCodes = new Set<string>();

    rows.forEach((raw, index) => {
      const rowNum = index + 1;
      const code = String(raw.code || raw['کد حساب'] || raw['کد معین'] || '').trim();
      const name = String(raw.name || raw['نام حساب'] || raw['عنوان حساب'] || '').trim();
      let type: 'GENERAL' | 'SUBSIDIARY' = raw.type ? raw.type : code.length === 2 ? 'GENERAL' : 'SUBSIDIARY';
      let parentCode = raw.parentCode || (type === 'SUBSIDIARY' ? code.substring(0, 2) : undefined);
      let nature: 'DEBIT' | 'CREDIT' = raw.nature === 'CREDIT' || raw['ماهیت'] === 'بستانکار' ? 'CREDIT' : 'DEBIT';

      if (!code) {
        errors.push({ row: rowNum, field: 'code', message: 'کد حساب الزامی است.', rawValue: raw });
        return;
      }

      if (seenCodes.has(code)) {
        errors.push({ row: rowNum, field: 'code', message: `کد حساب تکراری است: ${code}`, rawValue: code });
        return;
      }
      seenCodes.add(code);

      if (!name) {
        errors.push({ row: rowNum, field: 'name', message: 'نام حساب الزامی است.', rawValue: raw });
        return;
      }

      if (type === 'SUBSIDIARY' && code.length !== 4) {
        errors.push({
          row: rowNum,
          field: 'code',
          message: `کد معین باید ۴ رقم باشد (دریافت شد: ${code})`,
          rawValue: code,
        });
        return;
      }

      parsedData.push({
        code,
        name,
        type,
        parentCode,
        nature,
      });
    });

    return {
      isValid: errors.length === 0,
      totalRows: rows.length,
      validRows: parsedData.length,
      invalidRows: errors.length,
      errors,
      parsedData,
    };
  }

  /**
   * اعتبارسنجی و تبدیل اطلاعات اشخاص و طرف‌حساب‌ها
   */
  public static validatePartiesMigration(
    source: DataMigrationSource,
    rows: any[],
  ): MigrationValidationResult<PartyMigrationRow> {
    const errors: MigrationRowError[] = [];
    const parsedData: PartyMigrationRow[] = [];
    const seenCodes = new Set<string>();

    rows.forEach((raw, index) => {
      const rowNum = index + 1;
      const code = String(raw.code || raw['کد تفصیلی'] || raw['کد شخص'] || '').trim();
      const name = String(raw.name || raw['نام'] || raw['عنوان شخص'] || '').trim();
      const nationalId = String(raw.nationalId || raw['کد ملی'] || raw['شناسه ملی'] || '').trim();
      const mobile = String(raw.mobile || raw['موبایل'] || raw['تلفن همراه'] || '').trim();
      const phone = String(raw.phone || raw['تلفن'] || '').trim();
      const address = String(raw.address || raw['آدرس'] || '').trim();
      const creditLimit = String(raw.creditLimit || raw['سقف اعتبار'] || '0').trim();

      if (!name) {
        errors.push({ row: rowNum, field: 'name', message: 'نام طرف‌حساب الزامی است.', rawValue: raw });
        return;
      }

      if (code && seenCodes.has(code)) {
        errors.push({ row: rowNum, field: 'code', message: `کد طرف‌حساب تکراری است: ${code}`, rawValue: code });
        return;
      }
      if (code) seenCodes.add(code);

      // بررسی نوع شخص و صحت شناسه ملی در صورت وجود
      let partyType: 'INDIVIDUAL' | 'LEGAL' = 'INDIVIDUAL';
      if (nationalId) {
        const idCheck = TenantOnboardingEngine.validateNationalIdentifier(nationalId);
        if (!idCheck.isValid) {
          errors.push({
            row: rowNum,
            field: 'nationalId',
            message: idCheck.message || 'شناسه ملی یا کد ملی نامعتبر است.',
            rawValue: nationalId,
          });
          return;
        }
        partyType = idCheck.type;
      }

      // بررسی سقف اعتبار عددی
      try {
        const decCredit = new Decimal(creditLimit || '0');
        if (decCredit.isNegative()) {
          errors.push({
            row: rowNum,
            field: 'creditLimit',
            message: 'سقف اعتبار نمی‌تواند منفی باشد.',
            rawValue: creditLimit,
          });
          return;
        }
      } catch {
        errors.push({
          row: rowNum,
          field: 'creditLimit',
          message: 'فرمت سقف اعتبار نامعتبر است.',
          rawValue: creditLimit,
        });
        return;
      }

      parsedData.push({
        code: code || `PARTY-${rowNum}`,
        name,
        partyType,
        nationalId: nationalId || undefined,
        economicCode: String(raw.economicCode || raw['کد اقتصادی'] || '').trim() || undefined,
        mobile: mobile || undefined,
        phone: phone || undefined,
        address: address || undefined,
        creditLimit,
      });
    });

    return {
      isValid: errors.length === 0,
      totalRows: rows.length,
      validRows: parsedData.length,
      invalidRows: errors.length,
      errors,
      parsedData,
    };
  }

  /**
   * اعتبارسنجی و تبدیل کالاها و خدمات
   */
  public static validateProductsMigration(
    source: DataMigrationSource,
    rows: any[],
  ): MigrationValidationResult<ProductMigrationRow> {
    const errors: MigrationRowError[] = [];
    const parsedData: ProductMigrationRow[] = [];
    const seenCodes = new Set<string>();

    rows.forEach((raw, index) => {
      const rowNum = index + 1;
      const code = String(raw.code || raw['کد کالا'] || '').trim();
      const name = String(raw.name || raw['نام کالا'] || raw['عنوان'] || '').trim();
      const barcode = String(raw.barcode || raw['بارکد'] || '').trim();
      const categoryName = String(raw.categoryName || raw['گروه کالا'] || '').trim();
      const unitTitle = String(raw.unitTitle || raw['واحد سنجش'] || raw['واحد'] || 'عدد').trim();
      const buyPrice = String(raw.buyPrice || raw['قیمت خرید'] || '0').trim();
      const sellPrice = String(raw.sellPrice || raw['قیمت فروش'] || '0').trim();
      const vatRate = String(raw.vatRate || raw['درصد مالیات'] || '0.10').trim();
      const isService = Boolean(raw.isService || raw['نوع'] === 'خدمات');

      if (!name) {
        errors.push({ row: rowNum, field: 'name', message: 'نام کالا یا خدمت الزامی است.', rawValue: raw });
        return;
      }

      if (code && seenCodes.has(code)) {
        errors.push({ row: rowNum, field: 'code', message: `کد کالا تکراری است: ${code}`, rawValue: code });
        return;
      }
      if (code) seenCodes.add(code);

      try {
        const decBuy = new Decimal(buyPrice);
        const decSell = new Decimal(sellPrice);
        if (decBuy.isNegative() || decSell.isNegative()) {
          errors.push({
            row: rowNum,
            field: 'price',
            message: 'قیمت خرید و فروش نمی‌تواند منفی باشد.',
            rawValue: { buyPrice, sellPrice },
          });
          return;
        }
      } catch {
        errors.push({
          row: rowNum,
          field: 'price',
          message: 'مقدار قیمت خرید یا فروش عددی معتبر نیست.',
          rawValue: { buyPrice, sellPrice },
        });
        return;
      }

      parsedData.push({
        code: code || `PROD-${rowNum}`,
        barcode: barcode || undefined,
        name,
        categoryName: categoryName || undefined,
        unitTitle,
        buyPrice,
        sellPrice,
        vatRate,
        isService,
      });
    });

    return {
      isValid: errors.length === 0,
      totalRows: rows.length,
      validRows: parsedData.length,
      invalidRows: errors.length,
      errors,
      parsedData,
    };
  }

  /**
   * اعتبارسنجی دقیق سند تراز افتتاحیه (Opening Balance Sheet)
   * شرط اساسی: مجموع بدهکار باید دقیقا با مجموع بستانکار با دقت ۲۸ رقم اعشار برابر باشد.
   */
  public static validateOpeningBalances(
    source: DataMigrationSource,
    rows: any[],
  ): MigrationValidationResult<OpeningBalanceRow> {
    const errors: MigrationRowError[] = [];
    const parsedData: OpeningBalanceRow[] = [];
    let totalDebit = new Decimal(0);
    let totalCredit = new Decimal(0);

    rows.forEach((raw, index) => {
      const rowNum = index + 1;
      const subsidiaryCode = String(raw.subsidiaryCode || raw['کد معین'] || raw['معین'] || '').trim();
      const subsidiaryName = String(raw.subsidiaryName || raw['نام معین'] || '').trim();
      const dimensionCode = String(raw.dimensionCode || raw['کد تفصیلی'] || raw['تفصیل'] || '').trim();
      const dimensionName = String(raw.dimensionName || raw['نام تفصیلی'] || '').trim();
      const rawDebit = String(raw.debit || raw['بدهکار'] || '0').trim();
      const rawCredit = String(raw.credit || raw['بستانکار'] || '0').trim();
      const description = String(raw.description || raw['شرح'] || 'ثبت تراز افتتاحیه سال مالی جدید').trim();

      if (!subsidiaryCode) {
        errors.push({ row: rowNum, field: 'subsidiaryCode', message: 'کد معین الزامی است.', rawValue: raw });
        return;
      }

      let decDebit: Decimal;
      let decCredit: Decimal;

      try {
        decDebit = new Decimal(rawDebit || '0');
        decCredit = new Decimal(rawCredit || '0');
      } catch {
        errors.push({
          row: rowNum,
          field: 'amount',
          message: 'مقدار بدهکار یا بستانکار نامعتبر است.',
          rawValue: { rawDebit, rawCredit },
        });
        return;
      }

      if (decDebit.isNegative() || decCredit.isNegative()) {
        errors.push({
          row: rowNum,
          field: 'amount',
          message: 'مبالغ بدهکار و بستانکار نمی‌توانند منفی باشند.',
          rawValue: { rawDebit, rawCredit },
        });
        return;
      }

      if (decDebit.isZero() && decCredit.isZero()) {
        errors.push({
          row: rowNum,
          field: 'amount',
          message: 'حداقل یکی از مقادیر بدهکار یا بستانکار باید بزرگتر از صفر باشد.',
          rawValue: { rawDebit, rawCredit },
        });
        return;
      }

      if (!decDebit.isZero() && !decCredit.isZero()) {
        errors.push({
          row: rowNum,
          field: 'amount',
          message: 'یک سطر سند نمی‌تواند همزمان دارای مقدار بدهکار و بستانکار باشد.',
          rawValue: { rawDebit, rawCredit },
        });
        return;
      }

      totalDebit = totalDebit.plus(decDebit);
      totalCredit = totalCredit.plus(decCredit);

      parsedData.push({
        subsidiaryCode,
        subsidiaryName: subsidiaryName || undefined,
        dimensionCode: dimensionCode || undefined,
        dimensionName: dimensionName || undefined,
        debit: decDebit.toFixed(0),
        credit: decCredit.toFixed(0),
        description,
      });
    });

    const difference = totalDebit.minus(totalCredit);
    const isBalanced = difference.isZero();

    if (!isBalanced && errors.length === 0) {
      errors.push({
        row: 0,
        field: 'balance',
        message: `سند افتتاحیه تراز نیست! اختلاف تراز: ${difference.abs().toFixed(0)} ریال (بدهکار: ${totalDebit.toFixed(0)} ریال، بستانکار: ${totalCredit.toFixed(0)} ریال)`,
        rawValue: { totalDebit: totalDebit.toFixed(0), totalCredit: totalCredit.toFixed(0), difference: difference.toFixed(0) },
      });
    }

    return {
      isValid: errors.length === 0 && isBalanced,
      totalRows: rows.length,
      validRows: parsedData.length,
      invalidRows: errors.length,
      errors,
      parsedData,
      balanceCheck: {
        totalDebit: totalDebit.toFixed(0),
        totalCredit: totalCredit.toFixed(0),
        isBalanced,
        difference: difference.toFixed(0),
      },
    };
  }
}
