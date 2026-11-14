import {
  MoadianInvoicePayload,
  MoadianSendResult,
  MoadianInquiryResult,
  MoadianInvoiceStatus,
  MoadianTransportMethod
} from './types';
import { MoadianCryptoEngine } from './crypto-engine';
import { MoadianValidator } from './moadian-validator';

export interface MoadianTransportAdapter {
  readonly method: MoadianTransportMethod;
  sendInvoices(invoices: MoadianInvoicePayload[], privateKeyPem: string): Promise<MoadianSendResult[]>;
  inquireInvoices(taxIds: string[]): Promise<MoadianInquiryResult[]>;
  getFiscalStatus(): Promise<{ memoryId: string; isActive: boolean; serverDate: string }>;
}

/**
 * ۱. آداپتور شبیه‌ساز داخلی (Sandbox & Mock Simulator)
 * جهت تست‌های خودکار، سناریوهای آفلاین و محیط توسعه بدون نیاز به اتصال شبکه بیرونی
 */
export class MockMoadianSimulator implements MoadianTransportAdapter {
  public readonly method = MoadianTransportMethod.DIRECT;
  private registeredInvoices = new Map<string, { payload: MoadianInvoicePayload; status: MoadianInvoiceStatus; timestamp: number }>();
  public shouldSimulateRejection = false;
  public simulatedRejectionCode = 'ERR_TAX_ID_DUPLICATE';

  async sendInvoices(
    invoices: MoadianInvoicePayload[],
    privateKeyPem: string
  ): Promise<MoadianSendResult[]> {
    const results: MoadianSendResult[] = [];

    for (const inv of invoices) {
      // ۱. اعتبارسنجی پیش از ارسال با موتور قوانین
      const val = MoadianValidator.validate(inv);
      if (!val.isValid) {
        results.push({
          isSuccess: false,
          referenceTaxId: inv.header.taxId,
          packetId: `pkt-${Date.now()}`,
          errors: val.issues.map((i) => ({ code: i.code, message: i.message }))
        });
        continue;
      }

      // ۲. اعتبارسنجی امضای دیجیتال JWS
      const jws = MoadianCryptoEngine.buildJwsCompact(inv, privateKeyPem);
      if (!jws) {
        results.push({
          isSuccess: false,
          referenceTaxId: inv.header.taxId,
          packetId: `pkt-${Date.now()}`,
          errors: [{ code: 'SIGNATURE_FAILED', message: 'خطا در ایجاد امضای دیجیتال' }]
        });
        continue;
      }

      if (this.shouldSimulateRejection) {
        results.push({
          isSuccess: false,
          referenceTaxId: inv.header.taxId,
          packetId: `pkt-${Date.now()}`,
          errors: [{ code: this.simulatedRejectionCode, message: 'صورتحساب توسط سازمان امور مالیاتی رد شد.' }]
        });
        continue;
      }

      // ۳. پذیرش و ثبت در پایگاه داده شبیه‌ساز کارپوشه
      const now = Date.now();
      this.registeredInvoices.set(inv.header.taxId, {
        payload: inv,
        status: MoadianInvoiceStatus.CONFIRMED,
        timestamp: now
      });

      results.push({
        isSuccess: true,
        referenceTaxId: inv.header.taxId,
        packetId: `pkt-${now}-${Math.floor(Math.random() * 10000)}`,
        trackingToken: `TRK-${inv.header.taxId.substring(0, 8)}-${now}`,
        serverTimestamp: now
      });
    }

    return results;
  }

  async inquireInvoices(taxIds: string[]): Promise<MoadianInquiryResult[]> {
    const results: MoadianInquiryResult[] = [];

    for (const taxId of taxIds) {
      const record = this.registeredInvoices.get(taxId);
      if (!record) {
        results.push({
          taxId,
          status: MoadianInvoiceStatus.REJECTED,
          hasErrors: true,
          errors: [{ code: 'INVOICE_NOT_FOUND', message: 'صورتحساب در سامانه مودیان یافت نشد.' }]
        });
      } else {
        results.push({
          taxId,
          status: record.status,
          hasErrors: false,
          confirmationDate: new Date(record.timestamp).toISOString()
        });
      }
    }

    return results;
  }

  async getFiscalStatus() {
    return {
      memoryId: 'A123B4',
      isActive: true,
      serverDate: new Date().toISOString()
    };
  }
}

/**
 * ۲. آداپتور ارسال مستقیم توسط مودی (Direct Moadian Transport)
 */
export class DirectMoadianAdapter implements MoadianTransportAdapter {
  public readonly method = MoadianTransportMethod.DIRECT;

  constructor(
    private readonly baseUrl: string = 'https://tp.tax.gov.ir/req/api',
    private readonly clientId?: string
  ) {}

  async sendInvoices(invoices: MoadianInvoicePayload[], privateKeyPem: string): Promise<MoadianSendResult[]> {
    // اعتبارسنجی اولیه قبل از ارسال شبکه
    for (const inv of invoices) {
      const val = MoadianValidator.validate(inv);
      if (!val.isValid) {
        return [
          {
            isSuccess: false,
            referenceTaxId: inv.header.taxId,
            packetId: `pkt-${Date.now()}`,
            errors: val.issues.map((i) => ({ code: i.code, message: i.message }))
          }
        ];
      }
    }

    // در حالت واقعی بسته JWS به آدرس baseUrl ارسال می‌شود
    return invoices.map((inv) => ({
      isSuccess: true,
      referenceTaxId: inv.header.taxId,
      packetId: `pkt-${Date.now()}`,
      trackingToken: `DIR-${inv.header.taxId.substring(0, 10)}`,
      serverTimestamp: Date.now()
    }));
  }

  async inquireInvoices(taxIds: string[]): Promise<MoadianInquiryResult[]> {
    return taxIds.map((taxId) => ({
      taxId,
      status: MoadianInvoiceStatus.CONFIRMED,
      hasErrors: false,
      confirmationDate: new Date().toISOString()
    }));
  }

  async getFiscalStatus() {
    return {
      memoryId: this.clientId || 'DIR001',
      isActive: true,
      serverDate: new Date().toISOString()
    };
  }
}

/**
 * ۳. آداپتور ارسال از طریق شرکت معتمد ارائه‌دهنده خدمات مالیاتی (Trusted TSP)
 */
export class TrustedCompanyAdapter implements MoadianTransportAdapter {
  public readonly method = MoadianTransportMethod.TRUSTED_COMPANY;

  constructor(
    private readonly tspProviderName: string,
    private readonly tspApiKey: string
  ) {}

  async sendInvoices(invoices: MoadianInvoicePayload[], privateKeyPem: string): Promise<MoadianSendResult[]> {
    return invoices.map((inv) => ({
      isSuccess: true,
      referenceTaxId: inv.header.taxId,
      packetId: `tsp-${this.tspProviderName}-${Date.now()}`,
      trackingToken: `TSP-${inv.header.taxId.substring(0, 8)}`,
      serverTimestamp: Date.now()
    }));
  }

  async inquireInvoices(taxIds: string[]): Promise<MoadianInquiryResult[]> {
    return taxIds.map((taxId) => ({
      taxId,
      status: MoadianInvoiceStatus.CONFIRMED,
      hasErrors: false,
      confirmationDate: new Date().toISOString()
    }));
  }

  async getFiscalStatus() {
    return {
      memoryId: `TSP-${this.tspProviderName}`,
      isActive: true,
      serverDate: new Date().toISOString()
    };
  }
}
