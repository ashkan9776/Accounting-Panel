import Decimal from 'decimal.js';
import { BalanceSheetReport, BalanceSheetSection, FinancialStatementLine } from './types';
import { TrialBalanceRow } from '../reports/trial-balance';

Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

export class BalanceSheetEngine {
  /**
   * تولید ترازنامه رسمی طبق استاندارد حسابداری شماره ۱ ایران
   */
  public static generateBalanceSheet(params: {
    companyTitle: string;
    asOfDateShamsi: string;
    currency?: string;
    trialBalanceRows: TrialBalanceRow[];
    netIncomeCurrentPeriod: string | number;
  }): BalanceSheetReport {
    const cur = params.currency || 'IRR';
    const rows = params.trialBalanceRows;

    // ۱. دارایی‌های جاری (کدهای ۱۱، ۱۲، ۱۳، ۱۴، ۱۵)
    const currentAssetLines: FinancialStatementLine[] = [];
    let currentAssetsTotal = new Decimal(0);

    // ۲. دارایی‌های غیرجاری (کدهای ۲۱، ۲۲، ۲۳، ۱۶)
    const nonCurrentAssetLines: FinancialStatementLine[] = [];
    let nonCurrentAssetsTotal = new Decimal(0);

    // ۳. بدهی‌های جاری (کدهای ۳۱، ۳۲، ۳۳، ۳۴)
    const currentLiabilityLines: FinancialStatementLine[] = [];
    let currentLiabilitiesTotal = new Decimal(0);

    // ۴. بدهی‌های غیرجاری (کدهای ۴۱، ۴۲)
    const nonCurrentLiabilityLines: FinancialStatementLine[] = [];
    let nonCurrentLiabilitiesTotal = new Decimal(0);

    // ۵. حقوق صاحبان سرمایه (کدهای ۵۱، ۵۲، ۵۳)
    const equityLines: FinancialStatementLine[] = [];
    let equityTotal = new Decimal(0);

    for (const r of rows) {
      const code = r.accountCode;
      const title = r.accountTitle;
      const debitBal = new Decimal(r.closingDebit || 0);
      const creditBal = new Decimal(r.closingCredit || 0);

      // الف. گروه ۱: دارایی‌های جاری
      if (code.startsWith('11') || code.startsWith('12') || code.startsWith('13') || code.startsWith('14') || code.startsWith('15')) {
        const netAmt = debitBal.minus(creditBal);
        if (!netAmt.isZero()) {
          currentAssetLines.push({
            code,
            title,
            amount: netAmt.toFixed(0)
          });
          currentAssetsTotal = currentAssetsTotal.plus(netAmt);
        }
      }
      // ب. گروه ۲: دارایی‌های غیرجاری (دارایی ثابت و استهلاک انباشته)
      else if (code.startsWith('21') || code.startsWith('22') || code.startsWith('23') || code.startsWith('16')) {
        // حساب‌های استهلاک انباشته (کد ۲۲) ماهیت بستانکار/کاهنده دارایی دارند و با debitBal.minus(creditBal) منفی می‌شوند
        const netAmt = debitBal.minus(creditBal);
        if (!netAmt.isZero()) {
          nonCurrentAssetLines.push({
            code,
            title,
            amount: netAmt.toFixed(0)
          });
          nonCurrentAssetsTotal = nonCurrentAssetsTotal.plus(netAmt);
        }
      }
      // ج. گروه ۳: بدهی‌های جاری
      else if (code.startsWith('31') || code.startsWith('32') || code.startsWith('33') || code.startsWith('34')) {
        const netAmt = creditBal.minus(debitBal);
        if (!netAmt.isZero()) {
          currentLiabilityLines.push({
            code,
            title,
            amount: netAmt.toFixed(0)
          });
          currentLiabilitiesTotal = currentLiabilitiesTotal.plus(netAmt);
        }
      }
      // د. گروه ۴: بدهی‌های غیرجاری
      else if (code.startsWith('41') || code.startsWith('42')) {
        const netAmt = creditBal.minus(debitBal);
        if (!netAmt.isZero()) {
          nonCurrentLiabilityLines.push({
            code,
            title,
            amount: netAmt.toFixed(0)
          });
          nonCurrentLiabilitiesTotal = nonCurrentLiabilitiesTotal.plus(netAmt);
        }
      }
      // هـ. گروه ۵: حقوق صاحبان سهام
      else if (code.startsWith('51') || code.startsWith('52') || code.startsWith('53')) {
        const netAmt = creditBal.minus(debitBal);
        if (!netAmt.isZero()) {
          equityLines.push({
            code,
            title,
            amount: netAmt.toFixed(0)
          });
          equityTotal = equityTotal.plus(netAmt);
        }
      }
    }

    const netIncomeCurrent = new Decimal(params.netIncomeCurrentPeriod || 0);
    const finalEquityTotal = equityTotal.plus(netIncomeCurrent);

    const totalAssets = currentAssetsTotal.plus(nonCurrentAssetsTotal);
    const totalLiabilities = currentLiabilitiesTotal.plus(nonCurrentLiabilitiesTotal);
    const totalLiabilitiesAndEquity = totalLiabilities.plus(finalEquityTotal);

    const discrepancy = totalAssets.minus(totalLiabilitiesAndEquity);
    const isBalanced = discrepancy.isZero();

    return {
      companyTitle: params.companyTitle,
      asOfDateShamsi: params.asOfDateShamsi,
      currency: cur,

      currentAssets: {
        title: 'دارایی‌های جاری',
        lines: currentAssetLines,
        subtotal: currentAssetsTotal.toFixed(0)
      },
      nonCurrentAssets: {
        title: 'دارایی‌های غیرجاری',
        lines: nonCurrentAssetLines,
        subtotal: nonCurrentAssetsTotal.toFixed(0)
      },
      totalAssets: totalAssets.toFixed(0),

      currentLiabilities: {
        title: 'بدهی‌های جاری',
        lines: currentLiabilityLines,
        subtotal: currentLiabilitiesTotal.toFixed(0)
      },
      nonCurrentLiabilities: {
        title: 'بدهی‌های غیرجاری',
        lines: nonCurrentLiabilityLines,
        subtotal: nonCurrentLiabilitiesTotal.toFixed(0)
      },
      totalLiabilities: totalLiabilities.toFixed(0),

      equity: {
        title: 'حقوق صاحبان سرمایه',
        lines: equityLines,
        subtotal: equityTotal.toFixed(0)
      },
      netIncomeCurrentPeriod: netIncomeCurrent.toFixed(0),
      totalEquity: finalEquityTotal.toFixed(0),

      totalLiabilitiesAndEquity: totalLiabilitiesAndEquity.toFixed(0),
      isBalanced,
      discrepancyAmount: discrepancy.toFixed(0)
    };
  }
}
