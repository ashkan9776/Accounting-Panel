import {
  LoginSchema,
  CompanyRegistrationSchema,
  BusinessPresetEnum,
  SalesInvoiceCreateSchema,
  JournalEntryCreateSchema,
  ChequeRegisterSchema,
  ChequeStatusChangeSchema,
  MoneyTransferSchema,
  BankAccountCreateSchema,
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

  describe('Treasury & Sayad Cheque Schemas', () => {
    it('should validate 16-digit Sayad cheque registration', () => {
      const cheque = {
        chequeDirection: 'RECEIVABLE',
        sayadId: '1234567890123456', // 16 digits
        chequeSerialNumber: 'CHQ-889900',
        bankName: 'بانک ملت',
        amount: 250000000,
        issueDateShamsi: '1403/08/26',
        dueDateShamsi: '1403/10/26',
        description: 'چک بابت تسویه فاکتور فروش',
      };
      const result = ChequeRegisterSchema.safeParse(cheque);
      expect(result.success).toBe(true);
    });

    it('should reject Sayad ID with less or more than 16 digits', () => {
      const invalidCheque = {
        chequeDirection: 'RECEIVABLE',
        sayadId: '12345678', // 8 digits (invalid)
        chequeSerialNumber: 'CHQ-889900',
        bankName: 'بانک صادرات',
        amount: 100000000,
        issueDateShamsi: '1403/08/26',
        dueDateShamsi: '1403/10/26',
      };
      const result = ChequeRegisterSchema.safeParse(invalidCheque);
      expect(result.success).toBe(false);
    });

    it('should validate cheque status change to IN_CLEARING or CLEARED', () => {
      const statusChange = {
        toStatus: 'IN_CLEARING',
        actionDateShamsi: '1403/08/27',
        bankDimensionId: 'dim-bank-mellat',
        description: 'واگذاری چک به حساب بانک ملت جهت وصول',
      };
      const result = ChequeStatusChangeSchema.safeParse(statusChange);
      expect(result.success).toBe(true);
    });

    it('should validate money transfer between accounts', () => {
      const transfer = {
        sourceType: 'BANK',
        sourceId: 'dim-bank-1',
        destType: 'CASH',
        destId: 'dim-cash-1',
        amount: 50000000,
        transferDateShamsi: '1403/08/26',
        trackingCode: 'TR-998877',
        description: 'برداشت از حساب و شارژ صندوق',
      };
      const result = MoneyTransferSchema.safeParse(transfer);
      expect(result.success).toBe(true);
    });

    it('should validate bank account creation with standard Iranian IBAN', () => {
      const bank = {
        bankName: 'بانک پاسارگاد',
        branchName: 'ونک',
        accountNumber: '1234567890',
        iban: 'IR120570000000001234567890', // 26 chars (IR + 24 digits)
        cardNumber: '5022291012345678',
        initialBalance: 500000000,
      };
      const result = BankAccountCreateSchema.safeParse(bank);
      expect(result.success).toBe(true);
    });
  });
});
