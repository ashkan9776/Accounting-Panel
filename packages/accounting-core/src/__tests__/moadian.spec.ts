import {
  VerhoeffAlgorithm,
  TaxIdGenerator,
  MoadianCryptoEngine,
  MoadianValidator,
  MockMoadianSimulator,
  MoadianInvoicePayload,
  MoadianInvoiceType,
  MoadianInvoicePattern,
  MoadianInvoiceSubject,
  MoadianInvoiceStatus
} from '../index';

describe('Moadian & Tax Authority Core Engine (سامانه مودیان و صورتحساب الکترونیکی)', () => {
  describe('Verhoeff Check-Digit Algorithm', () => {
    it('should generate correct check digit and validate numbers', () => {
      // تست نمونه استاندارد الگوریتم Verhoeff:
      // برای عدد 236 رقم کنترل برابر 3 است -> 2363
      const checkDigit = VerhoeffAlgorithm.generateCheckDigit('236');
      expect(checkDigit).toBe(3);
      expect(VerhoeffAlgorithm.validate('2363')).toBe(true);
      // تغییر یک رقم باید توسط الگوریتم کشف و رد شود
      expect(VerhoeffAlgorithm.validate('2364')).toBe(false);
      // جابجایی دو رقم مجاور (Transposition error) باید کشف و رد شود
      expect(VerhoeffAlgorithm.validate('2633')).toBe(false);
    });
  });

  describe('TaxIdGenerator (تولید شناسه منحصر به فرد مالیاتی ۲۲ کاراکتری)', () => {
    it('should generate a valid 22-character Tax ID and validate successfully', () => {
      const memoryId = 'A123B4';
      const issueDate = new Date('2024-11-15T10:00:00Z');
      const serial = 1001;

      const taxId = TaxIdGenerator.generateTaxId(memoryId, issueDate, serial);

      expect(taxId).toHaveLength(22);
      expect(taxId.startsWith('A123B4')).toBe(true);
      expect(TaxIdGenerator.validateTaxId(taxId)).toBe(true);

      // دستکاری یک رقم در شماره مالیاتی باید سریعاً نامعتبر تشخیص داده شود
      const tamperedTaxId = taxId.substring(0, 21) + (taxId[21] === '0' ? '1' : '0');
      expect(TaxIdGenerator.validateTaxId(tamperedTaxId)).toBe(false);
    });

    it('should reject invalid memory ID length', () => {
      expect(() => {
        TaxIdGenerator.generateTaxId('A12', new Date(), 1);
      }).toThrow('شناسه حافظه مالیاتی باید دقیقاً ۶ کاراکتر باشد');
    });
  });

  describe('MoadianCryptoEngine (امضای دیجیتال و نرمال‌سازی)', () => {
    it('should generate RSA key pair and sign/verify payloads successfully', () => {
      const keys = MoadianCryptoEngine.generateKeyPair();
      expect(keys.privateKeyPem).toContain('BEGIN PRIVATE KEY');
      expect(keys.publicKeyPem).toContain('BEGIN PUBLIC KEY');
      expect(keys.publicKeyBase64.length).toBeGreaterThan(100);

      const payload = {
        invoiceNumber: 'INV-101',
        totalAmount: '10000000',
        seller: '10100000006'
      };

      const signature = MoadianCryptoEngine.sign(payload, keys.privateKeyPem);
      expect(signature).toBeDefined();

      const isValid = MoadianCryptoEngine.verify(payload, signature, keys.publicKeyPem);
      expect(isValid).toBe(true);

      // اعتبارسنجی با داده دستکاری‌شده
      const tampered = { ...payload, totalAmount: '99999999' };
      const isTamperedValid = MoadianCryptoEngine.verify(tampered, signature, keys.publicKeyPem);
      expect(isTamperedValid).toBe(false);
    });

    it('should generate valid JWS compact format', () => {
      const keys = MoadianCryptoEngine.generateKeyPair();
      const payload = { message: 'Moadian test payload' };
      const jws = MoadianCryptoEngine.buildJwsCompact(payload, keys.privateKeyPem);

      expect(jws).toBeDefined();
      const parts = jws.split('.');
      expect(parts).toHaveLength(3);
    });
  });

  describe('MoadianValidator & MockMoadianSimulator', () => {
    const keys = MoadianCryptoEngine.generateKeyPair();
    const memoryId = 'A123B4';
    const issueDate = new Date('2024-11-15T12:00:00Z');
    const taxId = TaxIdGenerator.generateTaxId(memoryId, issueDate, 501);

    const validPayload: MoadianInvoicePayload = {
      header: {
        taxId,
        issueDateShamsi: '1403/08/25',
        issueDateTimeStamp: issueDate.getTime(),
        invoiceType: MoadianInvoiceType.TYPE_1,
        invoicePattern: MoadianInvoicePattern.PATTERN_1_GENERAL,
        invoiceSubject: MoadianInvoiceSubject.MAIN,
        sellerFiscalMemoryId: memoryId,
        sellerNationalId: '10100000006', // شناسه ملی حقوقی معتبر با چکسام ریاضی
        sellerEconomicCode: '411111111111',
        customerType: 'LEGAL',
        customerNationalId: '10100000006',
        totalGrossAmount: '10000000',
        totalDiscountAmount: '1000000',
        totalNetAmount: '9000000',
        totalVatAmount: '900000',
        totalGrandAmount: '9900000'
      },
      items: [
        {
          rowNumber: 1,
          sstid: '2710000012345', // ۱۳ رقم استاندارد
          description: 'لپ‌تاپ لنوو',
          quantity: '1',
          unitCode: '1640', // کد ۴ رقمی واحد عدد
          unitPrice: '10000000',
          totalPrice: '10000000',
          discountAmount: '1000000',
          netPrice: '9000000',
          vatRate: '0.10',
          vatAmount: '900000',
          finalAmount: '9900000'
        }
      ]
    };

    it('should validate complete valid invoice payload with zero issues', () => {
      const validation = MoadianValidator.validate(validPayload);
      expect(validation.isValid).toBe(true);
      expect(validation.issues).toHaveLength(0);
    });

    it('should detect mismatch in calculations and invalid SSTID', () => {
      const invalidPayload: MoadianInvoicePayload = {
        ...validPayload,
        items: [
          {
            ...validPayload.items[0],
            sstid: '123', // کمتر از ۱۳ رقم
            totalPrice: '8000000' // مغایرت با حاصلضرب قیمت و تعداد
          }
        ]
      };

      const validation = MoadianValidator.validate(invalidPayload);
      expect(validation.isValid).toBe(false);
      expect(validation.issues.some((i) => i.code === 'SSTID_INVALID')).toBe(true);
      expect(validation.issues.some((i) => i.code === 'TOTAL_PRICE_MISMATCH')).toBe(true);
    });

    it('should send invoice through MockMoadianSimulator and successfully confirm in portal', async () => {
      const simulator = new MockMoadianSimulator();

      const sendResults = await simulator.sendInvoices([validPayload], keys.privateKeyPem);
      expect(sendResults).toHaveLength(1);
      expect(sendResults[0].isSuccess).toBe(true);
      expect(sendResults[0].referenceTaxId).toBe(taxId);
      expect(sendResults[0].trackingToken).toBeDefined();

      // استعلام وضعیت از کارپوشه
      const inquiry = await simulator.inquireInvoices([taxId]);
      expect(inquiry).toHaveLength(1);
      expect(inquiry[0].taxId).toBe(taxId);
      expect(inquiry[0].status).toBe(MoadianInvoiceStatus.CONFIRMED);
      expect(inquiry[0].hasErrors).toBe(false);
    });
  });
});
