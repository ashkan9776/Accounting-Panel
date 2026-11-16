import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { DatabaseService } from '../../database/database.service';
import {
  MoadianInvoiceType,
  MoadianInvoicePattern,
  MoadianInvoiceSubject,
  MoadianInvoiceStatus,
  MoadianTransportMethod,
  MoadianInvoicePayload,
  TaxIdGenerator,
  MoadianCryptoEngine,
  MoadianValidator,
  MockMoadianSimulator,
  DirectMoadianAdapter,
  TrustedCompanyAdapter,
  MoadianTransportAdapter
} from '@accounting/core';
import Decimal from 'decimal.js';

Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

@Injectable()
export class MoadianService {
  private mockSimulator = new MockMoadianSimulator();

  constructor(private readonly db: DatabaseService) {}

  // ۱. مدیریت تنظیمات مودیان و کلیدها
  async getSettings(tenantId: string, companyId: string) {
    const settings = await this.db.queryOne(
      'SELECT * FROM moadian_settings WHERE tenant_id = ? AND company_id = ?',
      [tenantId, companyId]
    );
    if (!settings) {
      throw new NotFoundException('تنظیمات سامانه مودیان برای این شرکت ثبت نشده است.');
    }
    // پنهان‌سازی کلید خصوصی در پاسخ API جهت امنیت
    const { private_key_pem, ...safeSettings } = settings;
    return safeSettings;
  }

  async updateSettings(
    tenantId: string,
    companyId: string,
    data: {
      fiscalMemoryId?: string;
      transportMethod?: MoadianTransportMethod;
      tspProviderName?: string;
      tspApiKey?: string;
      isSandboxMode?: boolean;
    }
  ) {
    const now = new Date().toISOString();
    await this.db.run(
      `UPDATE moadian_settings
       SET fiscal_memory_id = COALESCE(?, fiscal_memory_id),
           transport_method = COALESCE(?, transport_method),
           tsp_provider_name = COALESCE(?, tsp_provider_name),
           tsp_api_key = COALESCE(?, tsp_api_key),
           is_sandbox_mode = COALESCE(?, is_sandbox_mode),
           updated_at = ?
       WHERE tenant_id = ? AND company_id = ?`,
      [
        data.fiscalMemoryId || null,
        data.transportMethod || null,
        data.tspProviderName || null,
        data.tspApiKey || null,
        data.isSandboxMode !== undefined ? (data.isSandboxMode ? 1 : 0) : null,
        now,
        tenantId,
        companyId
      ]
    );
    return this.getSettings(tenantId, companyId);
  }

  async generateNewKeys(tenantId: string, companyId: string) {
    const keys = MoadianCryptoEngine.generateKeyPair();
    const now = new Date().toISOString();

    await this.db.run(
      `UPDATE moadian_settings
       SET private_key_pem = ?,
           public_key_pem = ?,
           public_key_base64 = ?,
           updated_at = ?
       WHERE tenant_id = ? AND company_id = ?`,
      [keys.privateKeyPem, keys.publicKeyPem, keys.publicKeyBase64, now, tenantId, companyId]
    );

    return {
      publicKeyPem: keys.publicKeyPem,
      publicKeyBase64: keys.publicKeyBase64,
      instruction: 'کلید عمومی استخراج‌شده را در بخش مدیریت کلیدهای کارپوشه مالیاتی سازمان امور مالیاتی بارگذاری نمایید.'
    };
  }

  // ۲. استخراج آداپتور ارسال بر اساس تنظیمات شرکت
  private async getAdapter(tenantId: string, companyId: string): Promise<{ adapter: MoadianTransportAdapter; privateKeyPem: string }> {
    const settings = await this.db.queryOne(
      'SELECT * FROM moadian_settings WHERE tenant_id = ? AND company_id = ?',
      [tenantId, companyId]
    );
    if (!settings) {
      throw new BadRequestException('تنظیمات مودیان برای این شرکت پیکربندی نشده است.');
    }

    if (settings.is_sandbox_mode) {
      return { adapter: this.mockSimulator, privateKeyPem: settings.private_key_pem };
    }

    if (settings.transport_method === MoadianTransportMethod.TRUSTED_COMPANY) {
      return {
        adapter: new TrustedCompanyAdapter(settings.tsp_provider_name || 'TSP_DEFAULT', settings.tsp_api_key || ''),
        privateKeyPem: settings.private_key_pem
      };
    }

    return {
      adapter: new DirectMoadianAdapter('https://tp.tax.gov.ir/req/api', settings.fiscal_memory_id),
      privateKeyPem: settings.private_key_pem
    };
  }

  // ۳. تبدیل فاکتور فروش داخلی به صورتحساب الکترونیکی سامانه مودیان
  async prepareFromSales(
    tenantId: string,
    companyId: string,
    branchId: string,
    userId: string,
    salesId: string,
    options?: {
      invoiceType?: MoadianInvoiceType;
      invoicePattern?: MoadianInvoicePattern;
      invoiceSubject?: MoadianInvoiceSubject;
      referenceTaxId?: string;
    }
  ) {
    const settings = await this.db.queryOne(
      'SELECT * FROM moadian_settings WHERE tenant_id = ? AND company_id = ?',
      [tenantId, companyId]
    );
    if (!settings) {
      throw new BadRequestException('ابتدا تنظیمات و شناسه حافظه مالیاتی شرکت را ثبت نمایید.');
    }

    const company = await this.db.queryOne('SELECT * FROM companies WHERE id = ?', [companyId]);
    const sales = await this.db.queryOne('SELECT * FROM sales_documents WHERE id = ?', [salesId]);
    if (!sales) {
      throw new NotFoundException(`فاکتور فروش با شناسه ${salesId} یافت نشد.`);
    }

    const customer = await this.db.queryOne('SELECT * FROM parties WHERE id = ?', [sales.customer_party_id]);
    const salesItems = await this.db.query(
      `SELECT si.*, p.name as product_name, p.tax_exempt, p.vat_rate, p.code as product_code
       FROM sales_document_items si
       JOIN products p ON si.product_id = p.id
       WHERE si.sales_document_id = ?`,
      [salesId]
    );

    // محاسبه شماره سریال ترتیبی بعدی برای این حافظه مالیاتی
    const maxSerialRow = await this.db.queryOne(
      'SELECT COUNT(*) as count FROM moadian_invoices WHERE tenant_id = ? AND company_id = ?',
      [tenantId, companyId]
    );
    const serial = (maxSerialRow?.count || 0) + 1;

    // تولید شناسه یکتای مالیاتی ۲۲ کاراکتری رسمی
    const issueDate = new Date();
    const taxId = TaxIdGenerator.generateTaxId(settings.fiscal_memory_id, issueDate, serial);

    const invType = options?.invoiceType || (customer.national_id ? MoadianInvoiceType.TYPE_1 : MoadianInvoiceType.TYPE_2);
    const invPattern = options?.invoicePattern || MoadianInvoicePattern.PATTERN_1_GENERAL;
    const invSubject = options?.invoiceSubject || MoadianInvoiceSubject.MAIN;

    const moadianInvoiceId = randomUUID();
    const now = new Date().toISOString();

    // ثبت سربرگ صورتحساب مودیان
    await this.db.run(
      `INSERT INTO moadian_invoices (
        id, tenant_id, company_id, branch_id, sales_document_id, tax_id,
        invoice_type, invoice_pattern, invoice_subject, reference_tax_id,
        issue_date_shamsi, issue_date_timestamp,
        total_gross_amount, total_discount_amount, total_net_amount, total_vat_amount, total_grand_amount,
        status, created_by_user_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?, ?, ?)`,
      [
        moadianInvoiceId,
        tenantId,
        companyId,
        branchId,
        salesId,
        taxId,
        invType,
        invPattern,
        invSubject,
        options?.referenceTaxId || null,
        sales.date_shamsi,
        issueDate.getTime(),
        sales.gross_amount,
        sales.discount_amount,
        sales.net_amount,
        sales.vat_amount,
        sales.grand_total,
        userId,
        now,
        now
      ]
    );

    const preparedItems: any[] = [];
    for (let i = 0; i < salesItems.length; i++) {
      const it = salesItems[i];
      const itemId = randomUUID();
      // شناسه ۱۳ رقمی کالا و خدمت (پیش‌فرض استاندارد قطعات و تجهیزات)
      const sstid = '2710000012345';
      const unitCode = '1640'; // کد ۴ رقمی واحد اندازه گیری (دستگاه/عدد)

      await this.db.run(
        `INSERT INTO moadian_invoice_items (
          id, moadian_invoice_id, row_number, product_id, sstid, description,
          quantity, unit_code, unit_price, total_price, discount_amount,
          net_price, vat_rate, vat_amount, final_amount, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          itemId,
          moadianInvoiceId,
          i + 1,
          it.product_id,
          sstid,
          it.product_name,
          it.quantity,
          unitCode,
          it.unit_price,
          it.total_price,
          it.discount_amount,
          it.net_amount,
          '0.10',
          it.vat_amount,
          new Decimal(it.net_amount).plus(new Decimal(it.vat_amount)).toFixed(0),
          now
        ]
      );

      preparedItems.push({
        id: itemId,
        rowNumber: i + 1,
        sstid,
        description: it.product_name,
        quantity: it.quantity,
        unitCode,
        unitPrice: it.unit_price,
        totalPrice: it.total_price,
        discountAmount: it.discount_amount,
        netPrice: it.net_amount,
        vatRate: '0.10',
        vatAmount: it.vat_amount,
        finalAmount: new Decimal(it.net_amount).plus(new Decimal(it.vat_amount)).toFixed(0)
      });
    }

    // افزودن خودکار به صف ارسال (Outbox Queue)
    const outboxId = randomUUID();
    await this.db.run(
      `INSERT INTO moadian_outbox_queue (
        id, tenant_id, company_id, moadian_invoice_id, priority, retry_count,
        max_retries, status, next_retry_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, 1, 0, 5, 'PENDING', ?, ?, ?)`,
      [outboxId, tenantId, companyId, moadianInvoiceId, now, now, now]
    );

    return {
      id: moadianInvoiceId,
      taxId,
      invoiceType: invType,
      invoicePattern: invPattern,
      invoiceSubject: invSubject,
      totalGrandAmount: sales.grand_total,
      status: 'PENDING',
      outboxId,
      items: preparedItems
    };
  }

  // ۴. تولید فاکتور اصلاحی و ابطالی
  async prepareCancellation(
    tenantId: string,
    companyId: string,
    branchId: string,
    userId: string,
    originalMoadianInvoiceId: string
  ) {
    const orig = await this.db.queryOne(
      'SELECT * FROM moadian_invoices WHERE tenant_id = ? AND company_id = ? AND id = ?',
      [tenantId, companyId, originalMoadianInvoiceId]
    );
    if (!orig) {
      throw new NotFoundException('صورتحساب مرجع جهت ابطال یافت نشد.');
    }

    return this.prepareFromSales(tenantId, companyId, branchId, userId, orig.sales_document_id, {
      invoiceType: orig.invoice_type as MoadianInvoiceType,
      invoicePattern: orig.invoice_pattern as MoadianInvoicePattern,
      invoiceSubject: MoadianInvoiceSubject.CANCELLATION,
      referenceTaxId: orig.tax_id
    });
  }

  // ۵. ارسال صورتحساب به سامانه مودیان (از طریق Transport Adapter انتخابی)
  async sendInvoice(tenantId: string, companyId: string, moadianInvoiceId: string) {
    const invoice = await this.db.queryOne(
      'SELECT * FROM moadian_invoices WHERE tenant_id = ? AND company_id = ? AND id = ?',
      [tenantId, companyId, moadianInvoiceId]
    );
    if (!invoice) {
      throw new NotFoundException(`صورتحساب مودیان با شناسه ${moadianInvoiceId} یافت نشد.`);
    }

    const company = await this.db.queryOne('SELECT * FROM companies WHERE id = ?', [companyId]);
    const sales = await this.db.queryOne('SELECT * FROM sales_documents WHERE id = ?', [invoice.sales_document_id]);
    const customer = await this.db.queryOne('SELECT * FROM parties WHERE id = ?', [sales?.customer_party_id]);
    const items = await this.db.query(
      'SELECT * FROM moadian_invoice_items WHERE moadian_invoice_id = ? ORDER BY row_number ASC',
      [moadianInvoiceId]
    );

    const { adapter, privateKeyPem } = await this.getAdapter(tenantId, companyId);
    const settings = await this.db.queryOne('SELECT * FROM moadian_settings WHERE company_id = ?', [companyId]);

    const payload: MoadianInvoicePayload = {
      header: {
        taxId: invoice.tax_id,
        issueDateShamsi: invoice.issue_date_shamsi,
        issueDateTimeStamp: invoice.issue_date_timestamp,
        invoiceType: invoice.invoice_type as MoadianInvoiceType,
        invoicePattern: invoice.invoice_pattern as MoadianInvoicePattern,
        invoiceSubject: invoice.invoice_subject as MoadianInvoiceSubject,
        referenceTaxId: invoice.reference_tax_id || undefined,
        sellerFiscalMemoryId: settings.fiscal_memory_id,
        sellerNationalId: company.national_id || '10100000006',
        sellerEconomicCode: company.economic_code,
        sellerPostalCode: company.postal_code,
        customerType: customer?.party_type === 'LEGAL_ENTITY' ? 'LEGAL' : 'INDIVIDUAL',
        customerNationalId: customer?.national_id || '10100000006',
        customerEconomicCode: customer?.economic_code,
        customerPostalCode: customer?.postal_code,
        totalGrossAmount: invoice.total_gross_amount,
        totalDiscountAmount: invoice.total_discount_amount,
        totalNetAmount: invoice.total_net_amount,
        totalVatAmount: invoice.total_vat_amount,
        totalGrandAmount: invoice.total_grand_amount
      },
      items: items.map((it: any) => ({
        rowNumber: it.row_number,
        sstid: it.sstid,
        description: it.description,
        quantity: it.quantity,
        unitCode: it.unit_code,
        unitPrice: it.unit_price,
        totalPrice: it.total_price,
        discountAmount: it.discount_amount,
        netPrice: it.net_price,
        vatRate: it.vat_rate,
        vatAmount: it.vat_amount,
        finalAmount: it.final_amount
      }))
    };

    // ارسال بسته از طریق آداپتور
    const results = await adapter.sendInvoices([payload], privateKeyPem);
    const res = results[0];
    const now = new Date().toISOString();

    if (res.isSuccess) {
      await this.db.run(
        `UPDATE moadian_invoices
         SET status = 'CONFIRMED',
             tracking_token = ?,
             packet_id = ?,
             server_timestamp = ?,
             response_errors_json = NULL,
             updated_at = ?
         WHERE id = ?`,
        [res.trackingToken || null, res.packetId, res.serverTimestamp || Date.now(), now, moadianInvoiceId]
      );

      await this.db.run(
        `UPDATE moadian_outbox_queue
         SET status = 'SENT', updated_at = ?
         WHERE moadian_invoice_id = ?`,
        [now, moadianInvoiceId]
      );
    } else {
      await this.db.run(
        `UPDATE moadian_invoices
         SET status = 'REJECTED',
             packet_id = ?,
             response_errors_json = ?,
             updated_at = ?
         WHERE id = ?`,
        [res.packetId, JSON.stringify(res.errors), now, moadianInvoiceId]
      );

      await this.db.run(
        `UPDATE moadian_outbox_queue
         SET status = 'FAILED', last_error = ?, updated_at = ?
         WHERE moadian_invoice_id = ?`,
        [JSON.stringify(res.errors), now, moadianInvoiceId]
      );
    }

    return {
      taxId: invoice.tax_id,
      isSuccess: res.isSuccess,
      trackingToken: res.trackingToken,
      packetId: res.packetId,
      status: res.isSuccess ? 'CONFIRMED' : 'REJECTED',
      errors: res.errors
    };
  }

  // ۶. پردازش صف ارسال مقاوم Outbox
  async processOutbox(tenantId: string, companyId: string) {
    const queueItems = await this.db.query(
      `SELECT * FROM moadian_outbox_queue
       WHERE tenant_id = ? AND company_id = ? AND status = 'PENDING'
       ORDER BY priority DESC, created_at ASC LIMIT 10`,
      [tenantId, companyId]
    );

    const processed: any[] = [];
    for (const qItem of queueItems) {
      try {
        const sendRes = await this.sendInvoice(tenantId, companyId, qItem.moadian_invoice_id);
        processed.push({ id: qItem.id, moadianInvoiceId: qItem.moadian_invoice_id, ...sendRes });
      } catch (err: any) {
        const nextRetry = new Date(Date.now() + Math.pow(2, qItem.retry_count + 1) * 60000).toISOString();
        await this.db.run(
          `UPDATE moadian_outbox_queue
           SET retry_count = retry_count + 1,
               last_error = ?,
               next_retry_at = ?,
               updated_at = ?
           WHERE id = ?`,
          [err.message, nextRetry, new Date().toISOString(), qItem.id]
        );
        processed.push({ id: qItem.id, moadianInvoiceId: qItem.moadian_invoice_id, isSuccess: false, error: err.message });
      }
    }

    return {
      processedCount: processed.length,
      items: processed
    };
  }

  // ۷. استعلام وضعیت صورتحساب از کارپوشه سازمان مالیاتی
  async inquireInvoice(tenantId: string, companyId: string, moadianInvoiceId: string) {
    const invoice = await this.db.queryOne(
      'SELECT * FROM moadian_invoices WHERE tenant_id = ? AND company_id = ? AND id = ?',
      [tenantId, companyId, moadianInvoiceId]
    );
    if (!invoice) {
      throw new NotFoundException(`صورتحساب با شناسه ${moadianInvoiceId} یافت نشد.`);
    }

    const { adapter } = await this.getAdapter(tenantId, companyId);
    const inquiryRes = await adapter.inquireInvoices([invoice.tax_id]);
    const res = inquiryRes[0];

    return {
      taxId: invoice.tax_id,
      currentStatus: invoice.status,
      portalStatus: res.status,
      hasErrors: res.hasErrors,
      errors: res.errors,
      confirmationDate: res.confirmationDate
    };
  }

  // ۸. مغایرت‌گیری کارپوشه (Reconciliation)
  async reconcileWithPortal(
    tenantId: string,
    companyId: string,
    portalInvoices: Array<{ taxId: string; documentType: 'SALES' | 'PURCHASE'; portalAmount: string | number }>
  ) {
    const results: any[] = [];
    const now = new Date().toISOString();

    for (const pInv of portalInvoices) {
      const internal = await this.db.queryOne(
        'SELECT * FROM moadian_invoices WHERE tenant_id = ? AND company_id = ? AND tax_id = ?',
        [tenantId, companyId, pInv.taxId]
      );

      const pAmt = new Decimal(pInv.portalAmount);
      let status: 'MATCHED' | 'DISCREPANT' | 'ONLY_IN_PORTAL';
      let diff = new Decimal(0);
      let intAmt = new Decimal(0);

      if (!internal) {
        status = 'ONLY_IN_PORTAL';
        diff = pAmt;
      } else {
        intAmt = new Decimal(internal.total_grand_amount);
        diff = pAmt.minus(intAmt);
        status = diff.isZero() ? 'MATCHED' : 'DISCREPANT';
      }

      const recId = randomUUID();
      await this.db.run(
        `INSERT INTO moadian_reconciliations (
          id, tenant_id, company_id, tax_id, document_type, portal_amount,
          internal_amount, discrepancy_amount, status, reconciled_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [recId, tenantId, companyId, pInv.taxId, pInv.documentType, pAmt.toFixed(0), intAmt.toFixed(0), diff.abs().toFixed(0), status, now]
      );

      results.push({
        id: recId,
        taxId: pInv.taxId,
        documentType: pInv.documentType,
        portalAmount: pAmt.toFixed(0),
        internalAmount: intAmt.toFixed(0),
        discrepancyAmount: diff.abs().toFixed(0),
        status
      });
    }

    return results;
  }

  async listInvoices(tenantId: string, companyId: string) {
    return this.db.query(
      `SELECT m.*, s.document_number as sales_document_number
       FROM moadian_invoices m
       LEFT JOIN sales_documents s ON m.sales_document_id = s.id
       WHERE m.tenant_id = ? AND m.company_id = ?
       ORDER BY m.created_at DESC`,
      [tenantId, companyId]
    );
  }

  async getInvoice(tenantId: string, companyId: string, id: string) {
    const inv = await this.db.queryOne(
      `SELECT m.*, s.document_number as sales_document_number
       FROM moadian_invoices m
       LEFT JOIN sales_documents s ON m.sales_document_id = s.id
       WHERE m.tenant_id = ? AND m.company_id = ? AND m.id = ?`,
      [tenantId, companyId, id]
    );
    if (!inv) {
      throw new NotFoundException(`صورتحساب مودیان با شناسه ${id} یافت نشد.`);
    }

    const items = await this.db.query(
      'SELECT * FROM moadian_invoice_items WHERE moadian_invoice_id = ? ORDER BY row_number ASC',
      [id]
    );

    return { ...inv, items };
  }
}
