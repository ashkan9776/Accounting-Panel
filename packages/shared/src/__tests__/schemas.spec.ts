import {
  LoginSchema,
  CompanyRegistrationSchema,
  BusinessPresetEnum,
  SalesInvoiceCreateSchema,
  JournalEntryCreateSchema,
} from '../index';

describe('Shared Zod Schemas Validation (Iranian Accounting)', () => {
  describe('LoginSchema', () => {
    it('should validate standard Iranian mobile and password', () => {
      const valid = {
        mobile: '09121234567',
        password: 'securePassword123',
      };
      const result = LoginSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should reject invalid mobile number format', () => {
      const invalid = {
        mobile: '08121234567', // Not 09
        password: 'password123',
      };
      const result = LoginSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('CompanyRegistrationSchema & BusinessPreset', () => {
    it('should validate company creation with valid business preset', () => {
      const input = {
        name: 'رستوران و کترینگ ترنج',
        preset: 'RESTAURANT',
        nationalId: '10103456789',
        economicCode: '411122223333',
        currency: 'IRR',
        adminFullName: 'علی محمدی',
        adminMobile: '09121112233',
      };
      const result = CompanyRegistrationSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should reject invalid national id length', () => {
      const input = {
        name: 'فروشگاه نمونه',
        preset: 'RETAIL',
        nationalId: '12345', // Too short
        adminFullName: 'علی محمدی',
        adminMobile: '09121112233',
      };
      const result = CompanyRegistrationSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe('SalesInvoiceCreateSchema', () => {
    it('should validate sales invoice with items and Iranian 10% VAT', () => {
      const invoice = {
        customerId: 'party-cust-1',
        dateShamsi: '1403/08/26',
        paymentMethod: 'CREDIT',
        warehouseId: 'wh-main-1',
        items: [
          {
            productId: 'prod-rice-1',
            productName: 'برنج طارم',
            quantity: 2,
            unitPrice: 15000000,
            discountAmount: 0,
            vatRate: 0.1,
          },
        ],
      };
      const result = SalesInvoiceCreateSchema.safeParse(invoice);
      expect(result.success).toBe(true);
    });

    it('should reject sales invoice with empty items list', () => {
      const invoice = {
        customerId: 'party-cust-1',
        dateShamsi: '1403/08/26',
        warehouseId: 'wh-main-1',
        items: [],
      };
      const result = SalesInvoiceCreateSchema.safeParse(invoice);
      expect(result.success).toBe(false);
    });
  });

  describe('JournalEntryCreateSchema', () => {
    it('should validate double-entry journal voucher payload', () => {
      const voucher = {
        entryDateShamsi: '1403/08/26',
        description: 'ثبت سند فروش نقدی دوره جاری',
        lines: [
          {
            subsidiaryAccountId: 'sub-bank-1',
            description: 'واریز وجه فروش به بانک',
            debit: '110000000',
            credit: '0',
          },
          {
            subsidiaryAccountId: 'sub-sales-1',
            description: 'فروش کالا',
            debit: '0',
            credit: '100000000',
          },
        ],
      };
      const result = JournalEntryCreateSchema.safeParse(voucher);
      expect(result.success).toBe(true);
    });
  });
});
