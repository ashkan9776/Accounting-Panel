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
  WarehouseCreateSchema,
  ProductCreateSchema,
  InventoryCountCreateSchema,
  PurchaseInvoiceCreateSchema,
  MoadianTaxIdSchema,
  MoadianConfigSchema,
  MoadianInvoicePayloadSchema,
  PosOrderCreateSchema,
  PosShiftOpenSchema,
  PosShiftCloseSchema,
  PosCashMovementSchema,
  RestaurantTableCreateSchema,
  RestaurantTableTransferSchema,
  RestaurantRecipeCreateSchema,
  RestaurantOrderCreateSchema,
  WorkCenterCreateSchema,
  BomCreateSchema,
  ProductionOrderCreateSchema,
  MaterialIssueSchema,
  ProductionOrderCompleteSchema,
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

  describe('Inventory & Purchase Schemas', () => {
    it('should validate warehouse creation', () => {
      const wh = {
        code: 'WH-01',
        name: 'انبار مرکزی مواد و کالا',
        phone: '02188880000',
        keeperName: 'رضا انباردار',
      };
      const result = WarehouseCreateSchema.safeParse(wh);
      expect(result.success).toBe(true);
    });

    it('should validate product creation with 10% VAT and stock alert limits', () => {
      const prod = {
        code: 'PRD-OIL-5L',
        name: 'روغن سرخ‌کردنی ۵ لیتری بهار',
        unitId: 'unit-piece-1',
        type: 'GOODS',
        sellPrice: 19500000,
        purchasePrice: 16000000,
        taxExempt: false,
        vatRate: 10,
        minStockAlert: 10,
        maxStockAlert: 500,
      };
      const result = ProductCreateSchema.safeParse(prod);
      expect(result.success).toBe(true);
    });

    it('should validate inventory count with discrepancy rows', () => {
      const count = {
        warehouseId: 'wh-main-1',
        countDateShamsi: '1403/08/26',
        description: 'انبارگردانی پایان دوره آبان‌ماه',
        items: [
          {
            productId: 'prod-1',
            systemQuantity: 50,
            countedQuantity: 48, // ۲ عدد کسری
            unitCost: 15000000,
            description: 'کسری ناشی از تبخیر یا ضایعات',
          },
        ],
      };
      const result = InventoryCountCreateSchema.safeParse(count);
      expect(result.success).toBe(true);
    });

    it('should validate purchase invoice creation with freight amount', () => {
      const purchase = {
        documentNumber: 'PUR-1403-0001',
        dateShamsi: '1403/08/26',
        supplierPartyId: 'party-supplier-1',
        warehouseId: 'wh-main-1',
        freightAmount: 5000000, // ۵ میلیون ریال هزینه حمل
        discountAmount: 2000000,
        description: 'خرید عمده مواد اولیه دوره جاری',
        items: [
          {
            productId: 'prod-oil-1',
            quantity: 100,
            unitCost: 15000000,
            taxExempt: false,
            vatRate: 10,
          },
        ],
      };
      const result = PurchaseInvoiceCreateSchema.safeParse(purchase);
      expect(result.success).toBe(true);
    });
  });

  describe('Moadian & Tax Terminal Schemas', () => {
    it('should validate 22-character uppercase alphanumeric Tax ID', () => {
      const validTaxId = 'A123450000000000000128';
      const result = MoadianTaxIdSchema.safeParse(validTaxId);
      expect(result.success).toBe(true);
    });

    it('should reject invalid Tax ID with wrong length or lowercase', () => {
      expect(MoadianTaxIdSchema.safeParse('A12345').success).toBe(false);
      expect(MoadianTaxIdSchema.safeParse('a123450000000000000128').success).toBe(false);
    });

    it('should validate Moadian configuration with 6-char memory ID and RSA keys', () => {
      const config = {
        fiscalMemoryId: 'A12345',
        privateKey: '-----BEGIN RSA PRIVATE KEY-----\nMIIEowIBAAKCAQEAz...==\n-----END RSA PRIVATE KEY-----',
        publicKey: '-----BEGIN CERTIFICATE-----\nMIIDdzCCAl+gAwIBAgIU...==\n-----END CERTIFICATE-----',
        transportMethod: 'DIRECT',
        fiscalYear: '1403',
        isSandbox: false,
      };
      const result = MoadianConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
    });

    it('should validate full Moadian invoice payload with header and items', () => {
      const payload = {
        header: {
          taxId: 'A123450000000000000128',
          issueDateShamsi: '1403/08/26',
          issueDateTimeStamp: 1732608000000,
          invoiceType: 'TYPE_1',
          invoicePattern: 'PATTERN_1_GENERAL',
          invoiceSubject: 'MAIN',
          sellerFiscalMemoryId: 'A12345',
          sellerNationalId: '14001234567',
          sellerPostalCode: '1987654321',
          customerType: 'LEGAL',
          customerNationalId: '14009876543',
          customerPostalCode: '1456789012',
          totalGrossAmount: '100000000',
          totalDiscountAmount: '0',
          totalNetAmount: '100000000',
          totalVatAmount: '10000000',
          totalGrandAmount: '110000000',
          settlementMethod: 'CASH',
        },
        items: [
          {
            rowNumber: 1,
            sstid: '2710000012345', // 13 digits fiscal item code
            description: 'خدمات پشتیبانی و لایسنس نرم‌افزار',
            quantity: '1',
            unitCode: '1640',
            unitPrice: '100000000',
            totalPrice: '100000000',
            discountAmount: '0',
            netPrice: '100000000',
            vatRate: '0.10',
            vatAmount: '10000000',
            otherTaxesAmount: '0',
            finalAmount: '110000000',
          },
        ],
      };
      const result = MoadianInvoicePayloadSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });
  });

  describe('Point of Sale (POS) & Cashier Schemas', () => {
    it('should validate opening a cashier shift with initial float', () => {
      const open = {
        cashDeskId: 'cash-desk-1',
        openingCash: 5000000, // ۵ میلیون ریال پول خرد اولیه
        notes: 'شروع شیفت صبح صندوق ۱',
      };
      const result = PosShiftOpenSchema.safeParse(open);
      expect(result.success).toBe(true);
    });

    it('should validate closing a cashier shift with physical cash count', () => {
      const close = {
        closingCashActual: 18500000,
        notes: 'تحویل شیفت به صندوقدار بعد',
      };
      const result = PosShiftCloseSchema.safeParse(close);
      expect(result.success).toBe(true);
    });

    it('should validate cash movement during shift (cash-in / cash-out)', () => {
      const moveIn = {
        type: 'CASH_IN',
        amount: 2000000,
        reason: 'تزریق پول خرد به صندوق',
      };
      expect(PosCashMovementSchema.safeParse(moveIn).success).toBe(true);

      const moveOut = {
        type: 'CASH_OUT',
        amount: 500000,
        reason: 'پرداخت پیک موتوری ناهار پرسنل',
      };
      expect(PosCashMovementSchema.safeParse(moveOut).success).toBe(true);
    });

    it('should validate POS order creation with items and card/cash payment', () => {
      const order = {
        shiftId: 'shift-1001',
        customerName: 'مشتری حضوری',
        paymentMethod: 'SPLIT',
        paidCash: 1000000,
        paidCard: 2200000,
        items: [
          {
            productId: 'prod-milk-1',
            productName: 'شیر کم چرب ۱ لیتری',
            barcode: '6260123456789',
            quantity: 2,
            unitPrice: 1000000,
            discount: 0,
            taxExempt: false,
            vatRate: 10,
            vatAmount: 200000,
            totalPrice: 2200000,
          },
          {
            productId: 'prod-bread-1',
            productName: 'نان تست سبوس‌دار',
            barcode: '6260987654321',
            quantity: 1,
            unitPrice: 1000000,
            discount: 0,
            taxExempt: true,
            vatRate: 0,
            vatAmount: 0,
            totalPrice: 1000000,
          },
        ],
        totalGross: 3000000,
        totalDiscount: 0,
        totalVat: 200000,
        totalPayable: 3200000,
      };
      const result = PosOrderCreateSchema.safeParse(order);
      expect(result.success).toBe(true);
    });

    it('should reject POS order with empty basket', () => {
      const emptyOrder = {
        shiftId: 'shift-1001',
        paymentMethod: 'CASH',
        items: [],
        totalGross: 0,
        totalPayable: 0,
      };
      expect(PosOrderCreateSchema.safeParse(emptyOrder).success).toBe(false);
    });
  });

  describe('Restaurant & Food Service Schemas', () => {
    it('should validate creating restaurant table with section and capacity', () => {
      const table = {
        tableNumber: 'T-VIP-1',
        section: 'سالن VIP',
        capacity: 8,
        status: 'VACANT',
      };
      const result = RestaurantTableCreateSchema.safeParse(table);
      expect(result.success).toBe(true);
    });

    it('should validate restaurant table transfer from one table to another', () => {
      const transfer = {
        fromTableId: 'tbl-101',
        toTableId: 'tbl-102',
      };
      const result = RestaurantTableTransferSchema.safeParse(transfer);
      expect(result.success).toBe(true);
    });

    it('should validate recipe formulation (BOM) with raw materials and waste percentage', () => {
      const recipe = {
        menuProductId: 'prod-chelo-kabab',
        menuProductName: 'چلوکباب کوبیده زعفرانی مخصوص',
        yieldQuantity: 1,
        sellingPrice: 3500000,
        preparationTimeMinutes: 20,
        kitchenStation: 'HOT_KITCHEN',
        ingredients: [
          {
            rawProductId: 'raw-beef-1',
            rawProductName: 'گوشت راسته گوساله',
            quantity: 150, // ۱۵۰ گرم
            unit: 'گرم',
            unitCost: 7500, // ۷,۵۰۰ ریال هر گرم
            wastePercentage: 5, // ۵٪ ضایعات پاک‌کردن
          },
          {
            rawProductId: 'raw-rice-1',
            rawProductName: 'برنج درجه یک ایرانی',
            quantity: 250, // ۲۵۰ گرم
            unit: 'گرم',
            unitCost: 1500,
            wastePercentage: 2,
          },
        ],
      };
      const result = RestaurantRecipeCreateSchema.safeParse(recipe);
      expect(result.success).toBe(true);
    });

    it('should validate restaurant order creation with kitchen station, tip, and service fee', () => {
      const order = {
        channel: 'DINE_IN',
        tableId: 'tbl-101',
        tableNumber: 'T-101',
        customerName: 'مهمان سالن اصلی',
        items: [
          {
            productId: 'prod-chelo-kabab',
            productName: 'چلوکباب کوبیده زعفرانی مخصوص',
            quantity: 2,
            unitPrice: 3500000,
            vatAmount: 700000,
            totalPrice: 7700000,
            notes: 'بدون گوجه، کره محلی اضافه',
            kitchenStation: 'HOT_KITCHEN',
          },
        ],
        totalGross: 7000000,
        serviceFeeRate: 5,
        serviceFeeAmount: 350000,
        tipAmount: 100000,
        totalVat: 700000,
        totalPayable: 8150000,
      };
      const result = RestaurantOrderCreateSchema.safeParse(order);
      expect(result.success).toBe(true);
    });

    it('should reject restaurant order with empty items list', () => {
      const invalidOrder = {
        channel: 'DINE_IN',
        tableId: 'tbl-101',
        items: [],
        totalGross: 0,
        totalPayable: 0,
      };
      expect(RestaurantOrderCreateSchema.safeParse(invalidOrder).success).toBe(false);
    });
  });

  describe('Manufacturing & Cost Accounting Schemas', () => {
    it('should validate creating a production work center with labor and machine rates', () => {
      const wc = {
        code: 'WC-CNC-01',
        title: 'مرکز فرز و تراشکاری CNC',
        type: 'MACHINE',
        hourlyLaborRate: 1500000,
        hourlyMachineRate: 2500000,
        capacityHoursPerDay: 16,
      };
      const result = WorkCenterCreateSchema.safeParse(wc);
      expect(result.success).toBe(true);
    });

    it('should validate multi-level Bill of Materials (BOM) creation', () => {
      const bom = {
        productId: 'prod-electric-motor',
        productName: 'الکتروموتور صنعتی ۳ فاز ۵ اسب',
        version: 'v2.1',
        title: 'فرمولاسیون اصلی سیم‌پیچی مس و پوسته چدن',
        yieldQuantity: 1,
        items: [
          {
            productId: 'raw-copper-wire',
            productName: 'سیم لاکی مسی نمره ۰.۸',
            itemType: 'RAW_MATERIAL',
            quantityPerUnit: 4.5,
            unit: 'کیلوگرم',
            unitCost: 5500000,
            scrapPercentage: 2,
          },
          {
            productId: 'semi-cast-rotor',
            productName: 'روتور تراش‌خورده بالانس‌شده',
            itemType: 'SEMI_FINISHED',
            quantityPerUnit: 1,
            unit: 'عدد',
            unitCost: 12000000,
            scrapPercentage: 0,
          },
        ],
      };
      const result = BomCreateSchema.safeParse(bom);
      expect(result.success).toBe(true);
    });

    it('should validate production order creation with dates and planned quantity', () => {
      const order = {
        bomId: 'bom-motor-01',
        productId: 'prod-electric-motor',
        plannedQuantity: 50,
        plannedStartDate: '1403/08/26',
        plannedEndDate: '1403/09/10',
        notes: 'تولید بچ سری اول سفارش پتروشیمی',
      };
      const result = ProductionOrderCreateSchema.safeParse(order);
      expect(result.success).toBe(true);
    });

    it('should validate raw materials issue to work-in-progress (WIP)', () => {
      const issue = {
        orderId: 'wo-1403-0501',
        warehouseId: 'wh-raw-1',
        materials: [
          {
            productId: 'raw-copper-wire',
            quantity: 225,
            unitCost: 5500000,
          },
        ],
      };
      const result = MaterialIssueSchema.safeParse(issue);
      expect(result.success).toBe(true);
    });

    it('should validate production completion and finished goods receipt', () => {
      const complete = {
        orderId: 'wo-1403-0501',
        completedQuantity: 50,
        destinationWarehouseId: 'wh-finished-goods',
        notes: 'تایید کنترل کیفیت QC و انتقال به انبار محصول',
      };
      const result = ProductionOrderCompleteSchema.safeParse(complete);
      expect(result.success).toBe(true);
    });
  });
});
