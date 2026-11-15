import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { ReportsService } from '../accounting/reports.service';
import {
  BalanceSheetEngine,
  IncomeStatementEngine,
  CashFlowEngine,
  FinancialRatiosEngine,
  BalanceSheetReport,
  IncomeStatementReport,
  CashFlowReport,
  FinancialRatiosReport
} from '@accounting/core';
import Decimal from 'decimal.js';

Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

@Injectable()
export class FinancialReportsService {
  constructor(
    private readonly db: DatabaseService,
    private readonly reportsService: ReportsService
  ) {}

  // ۱. تولید صورت سود و زیان جامع (Income Statement)
  async getIncomeStatement(
    tenantId: string,
    companyId: string,
    fromDateShamsi?: string,
    toDateShamsi?: string,
    fiscalYearId?: string
  ): Promise<IncomeStatementReport> {
    const company = await this.db.queryOne('SELECT * FROM companies WHERE id = ?', [companyId]);
    const tb = await this.reportsService.getTrialBalance(tenantId, companyId, fiscalYearId, 'SUBSIDIARY');

    const fromDate = fromDateShamsi || '1403/01/01';
    const toDate = toDateShamsi || '1403/12/29';

    return IncomeStatementEngine.generateIncomeStatement({
      companyTitle: company?.legal_name || 'شرکت پیشرو پارس',
      fromDateShamsi: fromDate,
      toDateShamsi: toDate,
      trialBalanceRows: tb.rows
    });
  }

  // ۲. تولید ترازنامه رسمی طبق استاندارد ۱ ایران (Balance Sheet)
  async getBalanceSheet(
    tenantId: string,
    companyId: string,
    asOfDateShamsi?: string,
    fiscalYearId?: string
  ): Promise<BalanceSheetReport> {
    const company = await this.db.queryOne('SELECT * FROM companies WHERE id = ?', [companyId]);
    const tb = await this.reportsService.getTrialBalance(tenantId, companyId, fiscalYearId, 'SUBSIDIARY');
    const is = await this.getIncomeStatement(tenantId, companyId, undefined, asOfDateShamsi, fiscalYearId);

    const asOfDate = asOfDateShamsi || '1403/12/29';

    return BalanceSheetEngine.generateBalanceSheet({
      companyTitle: company?.legal_name || 'شرکت پیشرو پارس',
      asOfDateShamsi: asOfDate,
      trialBalanceRows: tb.rows,
      netIncomeCurrentPeriod: is.netIncome
    });
  }

  // ۳. تولید صورت جریان وجوه نقد طبق استاندارد ۲ ایران (Cash Flow Statement)
  async getCashFlowStatement(
    tenantId: string,
    companyId: string,
    fromDateShamsi?: string,
    toDateShamsi?: string,
    fiscalYearId?: string
  ): Promise<CashFlowReport> {
    const company = await this.db.queryOne('SELECT * FROM companies WHERE id = ?', [companyId]);
    const is = await this.getIncomeStatement(tenantId, companyId, fromDateShamsi, toDateShamsi, fiscalYearId);
    const tb = await this.reportsService.getTrialBalance(tenantId, companyId, fiscalYearId, 'SUBSIDIARY');

    // استخراج استهلاک و سود/زیان واگذاری از دفاتر
    let depExp = new Decimal(0);
    let gainDisp = new Decimal(0);
    let lossDisp = new Decimal(0);

    let arClosing = new Decimal(0);
    let invClosing = new Decimal(0);
    let apClosing = new Decimal(0);
    let cashBeginning = new Decimal(0);

    for (const r of tb.rows) {
      const code = r.accountCode;
      const pDeb = new Decimal(r.periodDebit || 0);
      const pCred = new Decimal(r.periodCredit || 0);
      const cDeb = new Decimal(r.closingDebit || 0);
      const cCred = new Decimal(r.closingCredit || 0);
      const oDeb = new Decimal(r.openingDebit || 0);

      if (code === '8104') depExp = depExp.plus(pDeb);
      if (code === '6106') gainDisp = gainDisp.plus(pCred);
      if (code === '8110') lossDisp = lossDisp.plus(pDeb);

      if (code.startsWith('13')) arClosing = arClosing.plus(cDeb.minus(cCred));
      if (code.startsWith('15')) invClosing = invClosing.plus(cDeb.minus(cCred));
      if (code.startsWith('31') || code.startsWith('32') || code.startsWith('33')) {
        apClosing = apClosing.plus(cCred.minus(cDeb));
      }
      if (code.startsWith('11')) cashBeginning = cashBeginning.plus(oDeb);
    }

    // استخراج معاملات خرید و فروش دارایی‌های ثابت
    const fixedAssetStats = await this.db.queryOne(
      `SELECT
         SUM(CASE WHEN acquisition_journal_entry_id IS NOT NULL THEN CAST(historical_cost AS REAL) ELSE 0 END) as purchases,
         SUM(CASE WHEN status = 'SOLD' THEN CAST(disposal_sale_price AS REAL) ELSE 0 END) as sales
       FROM fixed_assets
       WHERE tenant_id = ? AND company_id = ?`,
      [tenantId, companyId]
    );

    const purchases = fixedAssetStats?.purchases || 0;
    const sales = fixedAssetStats?.sales || 0;

    return CashFlowEngine.generateCashFlowStatement({
      companyTitle: company?.legal_name || 'شرکت پیشرو پارس',
      fromDateShamsi: fromDateShamsi || '1403/01/01',
      toDateShamsi: toDateShamsi || '1403/12/29',
      netIncome: is.netIncome,
      depreciationExpense: depExp.toFixed(0),
      gainOnAssetDisposal: gainDisp.toFixed(0),
      lossOnAssetDisposal: lossDisp.toFixed(0),
      accountsReceivableChange: arClosing.toFixed(0),
      inventoryChange: invClosing.toFixed(0),
      accountsPayableChange: apClosing.toFixed(0),
      fixedAssetPurchases: purchases,
      fixedAssetSaleProceeds: sales,
      beginningCashBalance: cashBeginning.toFixed(0)
    });
  }

  // ۴. محاسبه و استخراج نسبت‌های مالی و ارزیابی سلامت بنگاه (Financial Ratios)
  async getFinancialRatios(
    tenantId: string,
    companyId: string,
    asOfDateShamsi?: string,
    fiscalYearId?: string
  ): Promise<FinancialRatiosReport> {
    const bs = await this.getBalanceSheet(tenantId, companyId, asOfDateShamsi, fiscalYearId);
    const is = await this.getIncomeStatement(tenantId, companyId, undefined, asOfDateShamsi, fiscalYearId);

    return FinancialRatiosEngine.calculateRatios({
      balanceSheet: bs,
      incomeStatement: is
    });
  }
}
