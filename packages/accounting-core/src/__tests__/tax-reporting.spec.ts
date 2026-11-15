import {
  VatReturnEngine,
  Article169Engine,
  CorporateTaxEngine,
  TaxQuarter
} from '../tax-reporting';
import Decimal from 'decimal.js';

describe('Tax & Statutory Reporting Engine (گزارش‌های مالیاتی، ارزش افزوده، ماده ۱۶۹ و ماده ۱۰۵)', () => {
  it('۱. محاسبه اظهارنامه فصلی مالیات بر ارزش افزوده و تهاتر با اعتبار مالیاتی خرید', () => {
    // فروش مشمول ۱,۰۰۰,۰۰۰,۰۰۰ ریال با ۱۰٪ مالیات (۱۰۰,۰۰۰,۰۰۰ ریال)
    // خرید مشمول ۶۰۰,۰۰۰,۰۰۰ ریال با ۱۰٪ مالیات (۶۰,۰۰۰,۰۰۰ ریال)
    const vatReturn = VatReturnEngine.calculateQuarterlyVatReturn({
      yearShamsi: '1403',
      quarter: TaxQuarter.AUTUMN,
      sales: [
        { grossAmount: '1100000000', taxableAmount: '1000000000', vatAmount: '100000000' }
      ],
      purchases: [
        { grossAmount: '660000000', taxableAmount: '600000000', vatAmount: '60000000' }
      ]
    });

    expect(vatReturn.outputVatCollected).toBe('100000000');
    expect(vatReturn.inputVatCredit).toBe('60000000');
    expect(vatReturn.netVatPayable).toBe('40000000');
    expect(vatReturn.isRefundableOrCredit).toBe(false);

    // سند حسابداری تسویه ارزش افزوده پایان فصل
    const lines = VatReturnEngine.buildVatSettlementLines({
      yearShamsi: '1403',
      quarter: TaxQuarter.AUTUMN,
      dateShamsi: '1403/10/15',
      outputVatAmount: vatReturn.outputVatCollected,
      inputVatCreditAmount: vatReturn.inputVatCredit
    });

    let totalDebit = new Decimal(0);
    let totalCredit = new Decimal(0);
    for (const l of lines) {
      totalDebit = totalDebit.plus(l.debit);
      totalCredit = totalCredit.plus(l.credit);
    }

    expect(totalDebit.toFixed(0)).toBe(totalCredit.toFixed(0));
    expect(totalDebit.toFixed(0)).toBe('100000000');
  });

  it('۲. تولید صورت معاملات فصلی موضوع ماده ۱۶۹ مکرر (سامانه TTMS)', () => {
    const report = Article169Engine.generateSeasonalReport({
      yearShamsi: '1403',
      quarter: TaxQuarter.AUTUMN,
      sales: [
        {
          partyName: 'شرکت تجارت نوین البرز',
          partyNationalId: '10100000008',
          partyEconomicCode: '411122223333',
          partyType: 'LEGAL',
          invoiceNumber: 'INV-1403-01',
          invoiceDateShamsi: '1403/08/10',
          amountWithoutVat: '500000000',
          vatAmount: '50000000'
        }
      ],
      purchases: [
        {
          partyName: 'شرکت تامین قطعات پیشتاز',
          partyNationalId: '10100000009',
          partyType: 'LEGAL',
          invoiceNumber: 'PINV-1403-05',
          invoiceDateShamsi: '1403/08/12',
          amountWithoutVat: '300000000',
          vatAmount: '30000000'
        }
      ]
    });

    expect(report.salesCount).toBe(1);
    expect(report.purchasesCount).toBe(1);
    expect(report.totalSalesAmount).toBe('500000000');
    expect(report.totalPurchasesAmount).toBe('300000000');

    // خروجی CSV برای سامانه TTMS
    const csv = Article169Engine.exportToTtmsCsv(report);
    expect(csv).toContain('10100000008');
    expect(csv).toContain('10100000009');
    expect(csv).toContain('فروش');
    expect(csv).toContain('خرید');
  });

  it('۳. محاسبه مالیات بر درآمد عملکرد اشخاص حقوقی (ماده ۱۰۵ ق.م.م - ۲۵٪) و سند ذخیره مالیات', () => {
    // درآمد کل ۱ میلیارد، هزینه‌های قابل قبول ۶۰۰ میلیون، سود قبل از مالیات ۴۰۰ میلیون
    // ۲۵٪ مالیات عملکرد = ۱۰۰,۰۰۰,۰۰۰ ریال
    const corpTax = CorporateTaxEngine.estimateCorporateTax({
      yearShamsi: '1403',
      totalRevenues: '1000000000',
      totalAllowableExpenses: '600000000'
    });

    expect(corpTax.accountingProfit).toBe('400000000');
    expect(corpTax.taxableProfit).toBe('400000000');
    expect(corpTax.estimatedTaxProvision).toBe('100000000');

    // سند حسابداری ذخیره مالیات عملکرد
    const lines = CorporateTaxEngine.buildCorporateTaxProvisionLines({
      yearShamsi: '1403',
      dateShamsi: '1403/12/29',
      taxAmount: corpTax.estimatedTaxProvision
    });

    expect(lines.length).toBe(2);
    expect(lines[0].subsidiaryAccountId).toBe('sub-8109'); // بدهکار هزینه مالیات عملکرد
    expect(lines[0].debit).toBe('100000000');
    expect(lines[1].subsidiaryAccountId).toBe('sub-3307'); // بستانکار ذخیره مالیات عملکرد
    expect(lines[1].credit).toBe('100000000');
  });
});
