import Decimal from 'decimal.js';
import { TaxQuarter, Article169TransactionRecord, Article169SeasonalReport } from './types';

Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

export class Article169Engine {
  /**
   * تولید گزارش معاملات فصلی موضوع ماده ۱۶۹ مکرر قانون مالیات‌های مستقیم (سامانه TTMS)
   */
  public static generateSeasonalReport(params: {
    yearShamsi: string;
    quarter: TaxQuarter;
    sales: Array<{
      partyName: string;
      partyNationalId: string;
      partyEconomicCode?: string;
      partyType?: 'LEGAL' | 'INDIVIDUAL';
      invoiceNumber: string;
      invoiceDateShamsi: string;
      amountWithoutVat: string | number;
      vatAmount: string | number;
    }>;
    purchases: Array<{
      partyName: string;
      partyNationalId: string;
      partyEconomicCode?: string;
      partyType?: 'LEGAL' | 'INDIVIDUAL';
      invoiceNumber: string;
      invoiceDateShamsi: string;
      amountWithoutVat: string | number;
      vatAmount: string | number;
    }>;
  }): Article169SeasonalReport {
    const transactions: Article169TransactionRecord[] = [];
    let rowNumber = 1;

    let totalSalesAmt = new Decimal(0);
    let totalSalesVat = new Decimal(0);

    for (const s of params.sales) {
      const net = new Decimal(s.amountWithoutVat || 0);
      const vat = new Decimal(s.vatAmount || 0);
      const total = net.plus(vat);

      totalSalesAmt = totalSalesAmt.plus(net);
      totalSalesVat = totalSalesVat.plus(vat);

      transactions.push({
        rowNumber: rowNumber++,
        transactionType: 'SALE',
        partyName: s.partyName,
        partyNationalId: s.partyNationalId,
        partyEconomicCode: s.partyEconomicCode,
        partyType: s.partyType || (s.partyNationalId.length === 11 ? 'LEGAL' : 'INDIVIDUAL'),
        invoiceNumber: s.invoiceNumber,
        invoiceDateShamsi: s.invoiceDateShamsi,
        amountWithoutVat: net.round().toFixed(0),
        vatAmount: vat.round().toFixed(0),
        totalAmount: total.round().toFixed(0)
      });
    }

    let totalPurchasesAmt = new Decimal(0);
    let totalPurchasesVat = new Decimal(0);

    for (const p of params.purchases) {
      const net = new Decimal(p.amountWithoutVat || 0);
      const vat = new Decimal(p.vatAmount || 0);
      const total = net.plus(vat);

      totalPurchasesAmt = totalPurchasesAmt.plus(net);
      totalPurchasesVat = totalPurchasesVat.plus(vat);

      transactions.push({
        rowNumber: rowNumber++,
        transactionType: 'PURCHASE',
        partyName: p.partyName,
        partyNationalId: p.partyNationalId,
        partyEconomicCode: p.partyEconomicCode,
        partyType: p.partyType || (p.partyNationalId.length === 11 ? 'LEGAL' : 'INDIVIDUAL'),
        invoiceNumber: p.invoiceNumber,
        invoiceDateShamsi: p.invoiceDateShamsi,
        amountWithoutVat: net.round().toFixed(0),
        vatAmount: vat.round().toFixed(0),
        totalAmount: total.round().toFixed(0)
      });
    }

    return {
      yearShamsi: params.yearShamsi,
      quarter: params.quarter,
      salesCount: params.sales.length,
      totalSalesAmount: totalSalesAmt.round().toFixed(0),
      totalSalesVat: totalSalesVat.round().toFixed(0),
      purchasesCount: params.purchases.length,
      totalPurchasesAmount: totalPurchasesAmt.round().toFixed(0),
      totalPurchasesVat: totalPurchasesVat.round().toFixed(0),
      transactions
    };
  }

  /**
   * تولید فایل متنی خروجی استاندارد جهت بارگذاری در سامانه معاملات فصلی سازمان امور مالیاتی
   */
  public static exportToTtmsCsv(report: Article169SeasonalReport): string {
    const header = 'ردیف,نوع معامله,نام طرف معامله,شناسه/کد ملی,کد اقتصادی,نوع شخص,شماره فاکتور,تاریخ فاکتور,مبلغ خالص,مالیات ارزش افزوده,مبلغ کل';
    const lines = report.transactions.map((t) =>
      [
        t.rowNumber,
        t.transactionType === 'SALE' ? 'فروش' : 'خرید',
        `"${t.partyName}"`,
        t.partyNationalId,
        t.partyEconomicCode || '',
        t.partyType === 'LEGAL' ? 'حقوقی' : 'حقیقی',
        t.invoiceNumber,
        t.invoiceDateShamsi,
        t.amountWithoutVat,
        t.vatAmount,
        t.totalAmount
      ].join(',')
    );

    return [header, ...lines].join('\n');
  }
}
