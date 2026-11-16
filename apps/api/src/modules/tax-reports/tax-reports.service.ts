import { Injectable, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { JournalEntriesService } from '../accounting/journal-entries.service';
import {
  VatReturnEngine,
  Article169Engine,
  CorporateTaxEngine,
  TaxQuarter,
  JournalEntryType,
  JournalEntryStatus
} from '@accounting/core';
import Decimal from 'decimal.js';

Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

@Injectable()
export class TaxReportsService {
  constructor(
    private readonly db: DatabaseService,
    private readonly journalService: JournalEntriesService
  ) {}

  private getQuarterMonths(quarter: TaxQuarter): string[] {
    switch (quarter) {
      case TaxQuarter.SPRING:
        return ['01', '02', '03'];
      case TaxQuarter.SUMMER:
        return ['04', '05', '06'];
      case TaxQuarter.AUTUMN:
        return ['07', '08', '09'];
      case TaxQuarter.WINTER:
      default:
        return ['10', '11', '12'];
    }
  }

  // ۱. محاسبه اظهارنامه فصلی مالیات بر ارزش افزوده (VAT Return)
  async getVatReturn(tenantId: string, companyId: string, yearShamsi: string, quarter: TaxQuarter) {
    const months = this.getQuarterMonths(quarter);
    const likePattern1 = `${yearShamsi}/${months[0]}/%`;
    const likePattern2 = `${yearShamsi}/${months[1]}/%`;
    const likePattern3 = `${yearShamsi}/${months[2]}/%`;

    // استعلام فاکتورهای فروش دوره
    const sales = await this.db.query(
      `SELECT net_amount, vat_amount, grand_total
       FROM sales_documents
       WHERE tenant_id = ? AND company_id = ? AND status != 'CANCELLED'
         AND (date_shamsi LIKE ? OR date_shamsi LIKE ? OR date_shamsi LIKE ?)`,
      [tenantId, companyId, likePattern1, likePattern2, likePattern3]
    );

    // استعلام فاکتورهای خرید دوره
    const purchases = await this.db.query(
      `SELECT total_goods_amount, total_vat, grand_total
       FROM purchase_documents
       WHERE tenant_id = ? AND company_id = ? AND status != 'CANCELLED'
         AND (date_shamsi LIKE ? OR date_shamsi LIKE ? OR date_shamsi LIKE ?)`,
      [tenantId, companyId, likePattern1, likePattern2, likePattern3]
    );

    const salesList = sales.map((s: any) => ({
      grossAmount: s.grand_total,
      taxableAmount: s.net_amount,
      vatAmount: s.vat_amount
    }));

    const purchasesList = purchases.map((p: any) => ({
      grossAmount: p.grand_total,
      taxableAmount: p.total_goods_amount,
      vatAmount: p.total_vat
    }));

    return VatReturnEngine.calculateQuarterlyVatReturn({
      yearShamsi,
      quarter,
      sales: salesList,
      purchases: purchasesList
    });
  }

  // ۲. تسویه فصلی اظهارنامه ارزش افزوده و صدور سند تهاتر/پرداخت
  async settleVatReturn(
    tenantId: string,
    companyId: string,
    branchId: string,
    fiscalYearId: string,
    userId: string,
    data: {
      yearShamsi: string;
      quarter: TaxQuarter;
      dateShamsi: string;
      bankFloatingDimensionId?: string;
    }
  ) {
    const vatReturn = await this.getVatReturn(tenantId, companyId, data.yearShamsi, data.quarter);

    const journalLines = VatReturnEngine.buildVatSettlementLines({
      yearShamsi: data.yearShamsi,
      quarter: data.quarter,
      dateShamsi: data.dateShamsi,
      outputVatAmount: vatReturn.outputVatCollected,
      inputVatCreditAmount: vatReturn.inputVatCredit,
      bankFloatingDimensionId: data.bankFloatingDimensionId
    });

    let journalEntry: any = null;
    if (journalLines.length > 0) {
      journalEntry = await this.journalService.createEntry(tenantId, companyId, branchId, fiscalYearId, userId, {
        entryDateShamsi: data.dateShamsi,
        entryType: JournalEntryType.NORMAL,
        description: `سند تسویه اظهارنامه مالیات بر ارزش افزوده دوره ${data.quarter} سال ${data.yearShamsi}`,
        sourceModule: 'TAX_REPORTS',
        lines: journalLines
      });
    }

    const reportId = `vat-${data.yearShamsi}-${data.quarter}`;
    const now = new Date().toISOString();

    await this.db.run(
      `INSERT INTO tax_statutory_reports (
        id, tenant_id, company_id, year_shamsi, quarter, report_type,
        payload_json, net_payable_amount, journal_entry_id, created_at
      ) VALUES (?, ?, ?, ?, ?, 'VAT_RETURN', ?, ?, ?, ?)
      ON CONFLICT (id) DO UPDATE SET
        payload_json = EXCLUDED.payload_json,
        net_payable_amount = EXCLUDED.net_payable_amount,
        journal_entry_id = EXCLUDED.journal_entry_id,
        created_at = EXCLUDED.created_at`,
      [
        reportId,
        tenantId,
        companyId,
        data.yearShamsi,
        data.quarter,
        JSON.stringify(vatReturn),
        vatReturn.netVatPayable,
        journalEntry?.id || null,
        now
      ]
    );

    return {
      reportId,
      vatReturn,
      journalEntry
    };
  }

  // ۳. استخراج گزارش معاملات فصلی ماده ۱۶۹ مکرر (سامانه TTMS)
  async getArticle169Report(tenantId: string, companyId: string, yearShamsi: string, quarter: TaxQuarter) {
    const months = this.getQuarterMonths(quarter);
    const likePattern1 = `${yearShamsi}/${months[0]}/%`;
    const likePattern2 = `${yearShamsi}/${months[1]}/%`;
    const likePattern3 = `${yearShamsi}/${months[2]}/%`;

    const sales = await this.db.query(
      `SELECT s.document_number, s.date_shamsi, s.net_amount, s.vat_amount,
              p.name as party_name, p.national_id, p.economic_code
       FROM sales_documents s
       JOIN parties p ON s.customer_party_id = p.id
       WHERE s.tenant_id = ? AND s.company_id = ? AND s.status != 'CANCELLED'
         AND (s.date_shamsi LIKE ? OR s.date_shamsi LIKE ? OR s.date_shamsi LIKE ?)`,
      [tenantId, companyId, likePattern1, likePattern2, likePattern3]
    );

    const purchases = await this.db.query(
      `SELECT pr.document_number, pr.date_shamsi, pr.total_goods_amount, pr.total_vat,
              p.name as party_name, p.national_id, p.economic_code
       FROM purchase_documents pr
       JOIN parties p ON pr.supplier_party_id = p.id
       WHERE pr.tenant_id = ? AND pr.company_id = ? AND pr.status != 'CANCELLED'
         AND (pr.date_shamsi LIKE ? OR pr.date_shamsi LIKE ? OR pr.date_shamsi LIKE ?)`,
      [tenantId, companyId, likePattern1, likePattern2, likePattern3]
    );

    const report = Article169Engine.generateSeasonalReport({
      yearShamsi,
      quarter,
      sales: sales.map((s: any) => ({
        partyName: s.party_name,
        partyNationalId: s.national_id || '10100000000',
        partyEconomicCode: s.economic_code,
        invoiceNumber: s.document_number,
        invoiceDateShamsi: s.date_shamsi,
        amountWithoutVat: s.net_amount,
        vatAmount: s.vat_amount
      })),
      purchases: purchases.map((p: any) => ({
        partyName: p.party_name,
        partyNationalId: p.national_id || '10100000000',
        partyEconomicCode: p.economic_code,
        invoiceNumber: p.document_number,
        invoiceDateShamsi: p.date_shamsi,
        amountWithoutVat: p.total_goods_amount,
        vatAmount: p.total_vat
      }))
    });

    const csvContent = Article169Engine.exportToTtmsCsv(report);

    return {
      ...report,
      csvContent
    };
  }

  // ۴. برآورد و صدور سند ذخیره مالیات بر درآمد عملکرد سالانه (ماده ۱۰۵ ق.م.م - ۲۵٪)
  async estimateAndPostCorporateTax(
    tenantId: string,
    companyId: string,
    branchId: string,
    fiscalYearId: string,
    userId: string,
    data: {
      yearShamsi: string;
      dateShamsi: string;
      taxExemptions?: string | number;
      costCenterDimensionId?: string;
    }
  ) {
    // استعلام مجموع درآمدها (کد ۶۱) و هزینه‌ها (کد ۷۱ و ۸۱) سال مالی از دفاتر
    const revenues = await this.db.queryOne(
      `SELECT SUM(jl.credit::NUMERIC - jl.debit::NUMERIC) as total_rev
       FROM journal_lines jl
       JOIN journal_entries je ON jl.journal_entry_id = je.id
       JOIN account_subsidiaries s ON jl.subsidiary_account_id = s.id
       JOIN account_heads h ON s.head_id = h.id
       WHERE je.tenant_id = ? AND je.company_id = ? AND je.status IN ('APPROVED', 'FINALIZED')
         AND h.code LIKE '6%'`,
      [tenantId, companyId]
    );

    const expenses = await this.db.queryOne(
      `SELECT SUM(jl.debit::NUMERIC - jl.credit::NUMERIC) as total_exp
       FROM journal_lines jl
       JOIN journal_entries je ON jl.journal_entry_id = je.id
       JOIN account_subsidiaries s ON jl.subsidiary_account_id = s.id
       JOIN account_heads h ON s.head_id = h.id
       WHERE je.tenant_id = ? AND je.company_id = ? AND je.status IN ('APPROVED', 'FINALIZED')
         AND (h.code LIKE '7%' OR h.code LIKE '8%')`,
      [tenantId, companyId]
    );

    const totalRev = revenues?.total_rev || '0';
    const totalExp = expenses?.total_exp || '0';

    const estimation = CorporateTaxEngine.estimateCorporateTax({
      yearShamsi: data.yearShamsi,
      totalRevenues: totalRev,
      totalAllowableExpenses: totalExp,
      taxExemptions: data.taxExemptions || '0'
    });

    let journalEntry: any = null;
    if (new Decimal(estimation.estimatedTaxProvision).greaterThan(0)) {
      const journalLines = CorporateTaxEngine.buildCorporateTaxProvisionLines({
        yearShamsi: data.yearShamsi,
        dateShamsi: data.dateShamsi,
        taxAmount: estimation.estimatedTaxProvision,
        costCenterDimensionId: data.costCenterDimensionId
      });

      journalEntry = await this.journalService.createEntry(tenantId, companyId, branchId, fiscalYearId, userId, {
        entryDateShamsi: data.dateShamsi,
        entryType: JournalEntryType.NORMAL,
        description: `سند شناسایی ذخیره مالیات بر درآمد عملکرد سال مالی ${data.yearShamsi} (ماده ۱۰۵ ق.م.م)`,
        sourceModule: 'TAX_REPORTS',
        lines: journalLines
      });

      await this.journalService.approveEntry(tenantId, journalEntry.id, userId);
      journalEntry.status = JournalEntryStatus.APPROVED;
    }

    const reportId = `tax-corp-${data.yearShamsi}`;
    const now = new Date().toISOString();

    await this.db.run(
      `INSERT INTO tax_statutory_reports (
        id, tenant_id, company_id, year_shamsi, quarter, report_type,
        payload_json, net_payable_amount, journal_entry_id, created_at
      ) VALUES (?, ?, ?, ?, NULL, 'CORPORATE_TAX', ?, ?, ?, ?)
      ON CONFLICT (id) DO UPDATE SET
        payload_json = EXCLUDED.payload_json,
        net_payable_amount = EXCLUDED.net_payable_amount,
        journal_entry_id = EXCLUDED.journal_entry_id,
        created_at = EXCLUDED.created_at`,
      [
        reportId,
        tenantId,
        companyId,
        data.yearShamsi,
        JSON.stringify(estimation),
        estimation.estimatedTaxProvision,
        journalEntry?.id || null,
        now
      ]
    );

    return {
      reportId,
      estimation,
      journalEntry
    };
  }
}
