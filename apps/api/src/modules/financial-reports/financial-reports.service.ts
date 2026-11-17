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

  private async getFiscalYearDates(
    tenantId: string,
    companyId: string,
    fiscalYearId?: string
  ): Promise<{ startDate: string; endDate: string }> {
    let fy: any = null;
    if (fiscalYearId) {
      fy = await this.db.queryOne(
        'SELECT start_date_shamsi, end_date_shamsi FROM fiscal_years WHERE id = ? AND tenant_id = ? AND company_id = ?',
        [fiscalYearId, tenantId, companyId]
      );
    }
    if (!fy) {
      fy = await this.db.queryOne(
        'SELECT start_date_shamsi, end_date_shamsi FROM fiscal_years WHERE tenant_id = ? AND company_id = ? AND is_closed = false ORDER BY start_date_shamsi DESC LIMIT 1',
        [tenantId, companyId]
      );
    }
    return {
      startDate: fy?.start_date_shamsi || '1403/01/01',
      endDate: fy?.end_date_shamsi || '1403/12/29'
    };
  }

  // ۱. تولید صورت سود و زیان جامع (Income Statement)
  async getIncomeStatement(
    tenantId: string,
    companyId: string,
    fromDateShamsi?: string,
    toDateShamsi?: string,
    fiscalYearId?: string
  ): Promise<IncomeStatementReport> {
    const company = await this.db.queryOne('SELECT * FROM companies WHERE id = ? AND tenant_id = ?', [companyId, tenantId]);
    const dates = await this.getFiscalYearDates(tenantId, companyId, fiscalYearId);
    const fromDate = fromDateShamsi || dates.startDate;
    const toDate = toDateShamsi || dates.endDate;
    const tb = await this.reportsService.getTrialBalance(tenantId, companyId, fiscalYearId, 'SUBSIDIARY', fromDate, toDate);

    return IncomeStatementEngine.generateIncomeStatement({
      companyTitle: company?.legal_name || 'شرکت',
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
    const company = await this.db.queryOne('SELECT * FROM companies WHERE id = ? AND tenant_id = ?', [companyId, tenantId]);
    const dates = await this.getFiscalYearDates(tenantId, companyId, fiscalYearId);
    const asOfDate = asOfDateShamsi || dates.endDate;
    const tb = await this.reportsService.getTrialBalance(tenantId, companyId, fiscalYearId, 'SUBSIDIARY', undefined, asOfDate);
    const is = await this.getIncomeStatement(tenantId, companyId, undefined, asOfDate, fiscalYearId);

    return BalanceSheetEngine.generateBalanceSheet({
      companyTitle: company?.legal_name || 'شرکت',
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
    const company = await this.db.queryOne('SELECT * FROM companies WHERE id = ? AND tenant_id = ?', [companyId, tenantId]);
    const dates = await this.getFiscalYearDates(tenantId, companyId, fiscalYearId);
    const fromDate = fromDateShamsi || dates.startDate;
    const toDate = toDateShamsi || dates.endDate;
    const is = await this.getIncomeStatement(tenantId, companyId, fromDate, toDate, fiscalYearId);
    const tb = await this.reportsService.getTrialBalance(tenantId, companyId, fiscalYearId, 'SUBSIDIARY', fromDate, toDate);

    // استخراج استهلاک و سود/زیان واگذاری از دفاتر
    let depExp = new Decimal(0);
    let gainDisp = new Decimal(0);
    let lossDisp = new Decimal(0);

    let arOpening = new Decimal(0);
    let arClosing = new Decimal(0);
    let invOpening = new Decimal(0);
    let invClosing = new Decimal(0);
    let apOpening = new Decimal(0);
    let apClosing = new Decimal(0);
    let cashBeginning = new Decimal(0);

    for (const r of tb.rows) {
      const code = r.accountCode;
      const pDeb = new Decimal(r.periodDebit || 0);
      const pCred = new Decimal(r.periodCredit || 0);
      const cDeb = new Decimal(r.closingDebit || 0);
      const cCred = new Decimal(r.closingCredit || 0);
      const oDeb = new Decimal(r.openingDebit || 0);
      const oCred = new Decimal(r.openingCredit || 0);

      if (code === '8104') depExp = depExp.plus(pDeb);
      if (code === '6106') gainDisp = gainDisp.plus(pCred);
      if (code === '8110') lossDisp = lossDisp.plus(pDeb);

      if (code.startsWith('13')) {
        arOpening = arOpening.plus(oDeb.minus(oCred));
        arClosing = arClosing.plus(cDeb.minus(cCred));
      }
      if (code.startsWith('15')) {
        invOpening = invOpening.plus(oDeb.minus(oCred));
        invClosing = invClosing.plus(cDeb.minus(cCred));
      }
      if (code.startsWith('31') || code.startsWith('32') || code.startsWith('33')) {
        apOpening = apOpening.plus(oCred.minus(oDeb));
        apClosing = apClosing.plus(cCred.minus(cDeb));
      }
      if (code.startsWith('11')) {
        cashBeginning = cashBeginning.plus(oDeb.minus(oCred));
      }
    }

    const arChange = arClosing.minus(arOpening);
    const invChange = invClosing.minus(invOpening);
    const apChange = apClosing.minus(apOpening);

    // استخراج معاملات خرید و فروش دارایی‌های ثابت با استفاده از Decimal (بررسی مجزای بازه تاریخ خرید و تاریخ واگذاری)
    const faQuery = `SELECT historical_cost, purchase_date_shamsi, disposal_sale_price, disposal_date_shamsi, status, acquisition_journal_entry_id FROM fixed_assets WHERE tenant_id = ? AND company_id = ?`;
    const faRows = await this.db.query(faQuery, [tenantId, companyId]);
    let purchases = new Decimal(0);
    let sales = new Decimal(0);
    for (const fa of faRows) {
      if (fa.acquisition_journal_entry_id && fa.historical_cost) {
        if (!fromDate || !toDate || (fa.purchase_date_shamsi >= fromDate && fa.purchase_date_shamsi <= toDate)) {
          purchases = purchases.plus(new Decimal(fa.historical_cost));
        }
      }
      if ((fa.status === 'SOLD' || fa.status === 'DISPOSED') && fa.disposal_sale_price) {
        if (!fromDate || !toDate || (fa.disposal_date_shamsi >= fromDate && fa.disposal_date_shamsi <= toDate)) {
          sales = sales.plus(new Decimal(fa.disposal_sale_price));
        }
      }
    }

    return CashFlowEngine.generateCashFlowStatement({
      companyTitle: company?.legal_name || 'شرکت',
      fromDateShamsi: fromDate,
      toDateShamsi: toDate,
      netIncome: is.netIncome,
      depreciationExpense: depExp.toFixed(0),
      gainOnAssetDisposal: gainDisp.toFixed(0),
      lossOnAssetDisposal: lossDisp.toFixed(0),
      accountsReceivableChange: arChange.toFixed(0),
      inventoryChange: invChange.toFixed(0),
      accountsPayableChange: apChange.toFixed(0),
      fixedAssetPurchases: purchases.toFixed(0),
      fixedAssetSaleProceeds: sales.toFixed(0),
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
