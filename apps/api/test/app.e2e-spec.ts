import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import Decimal from 'decimal.js';
import { AppModule } from '../src/app.module';
import { runSeed } from '../src/database/seed';
import { SecurityEngine } from '@accounting/core';

describe('Accounting Core Platform E2E Integration Tests (فاز ۱ و فاز ۲ و فاز ۳)', () => {
  let app: INestApplication;
  let jwtToken: string;
  let createdPartyId: string;
  let createdChequeId: string;
  let createdSalesId: string;
  let createdCountId: string;
  let createdMoadianInvoiceId: string;
  let createdTaxId: string;
  let createdShiftId: string;
  let createdPosOrderId: string;
  let createdHeldOrderId: string;
  let createdRestaurantOrderId: string;
  let createdDeliveryOrderId: string;
  let createdKdsHotTicketId: string;
  let createdDeliveryId: string;
  let createdProductionOrderId: string;
  let createdEmployeeId: string;
  let createdPeriodId: string;
  let createdAssetId: string;

  beforeAll(async () => {
    await runSeed();
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule]
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  // ==========================================
  // آزمون‌های فاز ۱: هسته، کدینگ و اسناد دوبل
  // ==========================================

  it('Step 1: Should authenticate with mobile and password and return JWT', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        mobile: '09120000000',
        password: 'admin12345',
        tenantId: 'tenant-pishro'
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.user.mobile).toBe('09120000000');
    expect(res.body.user.isSuperAdmin).toBe(true);

    jwtToken = res.body.accessToken;
  });

  it('Step 2: Should retrieve the complete Iranian hierarchical Chart of Accounts tree', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/accounting/chart/tree')
      .set('Authorization', `Bearer ${jwtToken}`)
      .set('x-tenant-id', 'tenant-pishro')
      .set('x-company-id', 'comp-pishro-1')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(9);

    const group1 = res.body.data.find((g: any) => g.code === '1');
    expect(group1).toBeDefined();
    expect(group1.title).toBe('دارایی‌های جاری');
    expect(group1.heads.length).toBeGreaterThan(0);
  });

  it('Step 3: Should reject an unbalanced journal entry with HTTP 400', async () => {
    const unbalancedEntry = {
      entryDateShamsi: '1403/08/24',
      description: 'سند تستی نامتوازن',
      lines: [
        {
          subsidiaryAccountId: 'sub-1104',
          floatingDimension1Id: 'dim-pos-1',
          debit: 10000000,
          credit: 0,
          description: 'دریافت با پوز'
        },
        {
          subsidiaryAccountId: 'sub-6101',
          debit: 0,
          credit: 9000000, // ۱,۰۰۰,۰۰۰ ریال اختلاف
          description: 'فروش'
        }
      ]
    };

    const res = await request(app.getHttpServer())
      .post('/api/v1/accounting/journal-entries')
      .set('Authorization', `Bearer ${jwtToken}`)
      .set('x-tenant-id', 'tenant-pishro')
      .set('x-company-id', 'comp-pishro-1')
      .send(unbalancedEntry)
      .expect(400);

    expect(res.body.message).toContain('عدم توازن در سند حسابداری');
  });

  // ==========================================
  // آزمون‌های فاز ۲: اشخاص، خزانه‌داری و چک صیاد
  // ==========================================

  it('Step 4 (Phase 2): Should create a Party and automatically link floating dimension', async () => {
    const partyData = {
      partyType: 'INDIVIDUAL_IRANIAN',
      name: 'آقای بهرام راد (مشتری جدید)',
      nationalId: '0084575948',
      mobile: '09123456789',
      creditLimit: 150000000,
      creditTermsDays: 45,
      isCustomer: true
    };

    const res = await request(app.getHttpServer())
      .post('/api/v1/parties')
      .set('Authorization', `Bearer ${jwtToken}`)
      .set('x-tenant-id', 'tenant-pishro')
      .set('x-company-id', 'comp-pishro-1')
      .send(partyData)
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.floatingDimensionId).toBeDefined();
    expect(res.body.data.code).toBeDefined();

    createdPartyId = res.body.data.id;
  });

  it('Step 5 (Phase 2): Should reject party creation with invalid National ID', async () => {
    const invalidParty = {
      partyType: 'INDIVIDUAL_IRANIAN',
      name: 'شخص نامعتبر',
      nationalId: '1111111111' // ارقام یکسان نامعتبر است
    };

    const res = await request(app.getHttpServer())
      .post('/api/v1/parties')
      .set('Authorization', `Bearer ${jwtToken}`)
      .set('x-tenant-id', 'tenant-pishro')
      .set('x-company-id', 'comp-pishro-1')
      .send(invalidParty)
      .expect(400);

    expect(res.body.message).toContain('کد ملی شخص حقیقی ۱۰ رقمی نامعتبر است');
  });

  it('Step 6 (Phase 2): Should execute money transfer from Bank to Cash Desk and post balanced entry', async () => {
    const transferData = {
      sourceType: 'BANK',
      sourceId: 'dim-bank-1', // بانک سامان
      destType: 'CASH',
      destId: 'dim-cash-1',   // صندوق مرکزی
      amount: 20000000,
      transferDateShamsi: '1403/08/24',
      trackingCode: 'TRF-98214',
      description: 'شارژ صندوق نقدی از حساب بانک سامان'
    };

    const res = await request(app.getHttpServer())
      .post('/api/v1/treasury/transfers')
      .set('Authorization', `Bearer ${jwtToken}`)
      .set('x-tenant-id', 'tenant-pishro')
      .set('x-company-id', 'comp-pishro-1')
      .send(transferData)
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.transferId).toBeDefined();
    expect(res.body.data.journalEntryId).toBeDefined();
  });

  it('Step 7 (Phase 2): Should inquire Sayad cheque status from Central Bank adapter', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/treasury/cheques/sayad/inquire/1234567890123456')
      .set('Authorization', `Bearer ${jwtToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.isValid).toBe(true);
    expect(res.body.data.color).toBe('WHITE');
    expect(res.body.data.isBounced).toBe(false);
  });

  it('Step 8 (Phase 2): Should register receivable Sayad cheque with AUTO_POST and issue receipt entry', async () => {
    const chequeData = {
      chequeDirection: 'RECEIVABLE',
      sayadId: '1234567890123456',
      chequeSerialNumber: 'CHQ-1403-1002',
      bankName: 'بانک ملت',
      drawerPartyId: 'party-cust-1', // علی رضایی
      amount: 50000000,
      issueDateShamsi: '1403/08/24',
      dueDateShamsi: '1403/11/30',
      postingPolicy: 'AUTO_POST',
      description: 'تسویه فاکتور فروش با چک صیادی ۳ ماهه'
    };

    const res = await request(app.getHttpServer())
      .post('/api/v1/treasury/cheques')
      .set('Authorization', `Bearer ${jwtToken}`)
      .set('x-tenant-id', 'tenant-pishro')
      .set('x-company-id', 'comp-pishro-1')
      .send(chequeData)
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.status).toBe('AT_HAND');
    expect(res.body.data.journalEntryId).toBeDefined();

    createdChequeId = res.body.data.id;
  });

  it('Step 9 (Phase 2): Should deposit receivable cheque to bank (IN_CLEARING) and issue journal entry', async () => {
    const depositData = {
      toStatus: 'IN_CLEARING',
      actionDateShamsi: '1403/08/25',
      bankDimensionId: 'dim-bank-1', // بانک سامان
      description: 'واگذاری چک به بانک سامان شعبه ونک'
    };

    const res = await request(app.getHttpServer())
      .post(`/api/v1/treasury/cheques/${createdChequeId}/status`)
      .set('Authorization', `Bearer ${jwtToken}`)
      .set('x-tenant-id', 'tenant-pishro')
      .set('x-company-id', 'comp-pishro-1')
      .send(depositData)
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.toStatus).toBe('IN_CLEARING');
    expect(res.body.data.journalEntryId).toBeDefined();
  });

  it('Step 10 (Phase 2): Should clear receivable cheque (CLEARED) and verify bank balance increment', async () => {
    const clearData = {
      toStatus: 'CLEARED',
      actionDateShamsi: '1403/11/30',
      bankDimensionId: 'dim-bank-1',
      description: 'وصول قطعی چک در سررسید و واریز به حساب سامان'
    };

    const res = await request(app.getHttpServer())
      .post(`/api/v1/treasury/cheques/${createdChequeId}/status`)
      .set('Authorization', `Bearer ${jwtToken}`)
      .set('x-tenant-id', 'tenant-pishro')
      .set('x-company-id', 'comp-pishro-1')
      .send(clearData)
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.toStatus).toBe('CLEARED');
  });

  it('Step 11 (Phase 2): Should import bank statement rows for reconciliation', async () => {
    const stmtData = {
      bankAccountId: 'bank-saman-1',
      rows: [
        {
          statementDateShamsi: '1403/11/30',
          referenceNumber: 'TX-892110',
          credit: 50000000,
          description: 'واریز بابت وصول چک صیادی 1234567890123456'
        }
      ]
    };

    const res = await request(app.getHttpServer())
      .post('/api/v1/treasury/bank-statements/import')
      .set('Authorization', `Bearer ${jwtToken}`)
      .set('x-tenant-id', 'tenant-pishro')
      .set('x-company-id', 'comp-pishro-1')
      .send(stmtData)
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.importedCount).toBe(1);
  });

  // ==========================================
  // آزمون‌های فاز ۳: کالا، انبار، کاردکس، خرید و فروش
  // ==========================================

  it('Step 12 (Phase 3): Should list products and warehouses from seed', async () => {
    const prodsRes = await request(app.getHttpServer())
      .get('/api/v1/inventory/products')
      .set('Authorization', `Bearer ${jwtToken}`)
      .set('x-tenant-id', 'tenant-pishro')
      .set('x-company-id', 'comp-pishro-1')
      .expect(200);

    expect(prodsRes.body.success).toBe(true);
    expect(Array.isArray(prodsRes.body.data)).toBe(true);
    expect(prodsRes.body.data.length).toBeGreaterThanOrEqual(4);

    const whRes = await request(app.getHttpServer())
      .get('/api/v1/inventory/warehouses')
      .set('Authorization', `Bearer ${jwtToken}`)
      .set('x-tenant-id', 'tenant-pishro')
      .set('x-company-id', 'comp-pishro-1')
      .expect(200);

    expect(whRes.body.success).toBe(true);
    expect(whRes.body.data.length).toBeGreaterThanOrEqual(2);
  });

  it('Step 12.1 (Phase 3): Should create a new product without 500 error even with fallback unitId', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/inventory/products')
      .set('Authorization', `Bearer ${jwtToken}`)
      .set('x-tenant-id', 'tenant-pishro')
      .set('x-company-id', 'comp-pishro-1')
      .send({
        code: 'PRD-1953',
        name: 'برنج اعلا شمالی تست',
        unitId: 'unit-piece',
        type: 'GOODS',
        sellPrice: 15000000,
        purchasePrice: 10000000,
        taxExempt: false,
        vatRate: 0.10,
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.name).toBe('برنج اعلا شمالی تست');
  });

  it('Step 13 (Phase 3): Should create a purchase document with Landed Cost (freight) and VAT', async () => {
    const purchaseData = {
      warehouseId: 'wh-main',
      supplierPartyId: 'party-supp-1',
      documentNumber: 'PINV-1403-001',
      dateShamsi: '1403/11/10',
      freightAmount: 50000000, // ۵۰ میلیون ریال کرایه حمل
      items: [
        {
          productId: 'prod-laptop',
          quantity: 10,
          unitCost: 250000000 // ۱۰ عدد لپ‌تاپ هر عدد ۲۵۰ میلیون ریال = ۲,۵۰۰,۰۰۰,۰۰۰
        }
      ]
    };

    const res = await request(app.getHttpServer())
      .post('/api/v1/purchases')
      .set('Authorization', `Bearer ${jwtToken}`)
      .set('x-tenant-id', 'tenant-pishro')
      .set('x-company-id', 'comp-pishro-1')
      .send(purchaseData)
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.documentNumber).toBe('PINV-1403-001');
    expect(res.body.data.totalGoodsAmount).toBe('2500000000');
    expect(res.body.data.freightAmount).toBe('50000000');
    // ارزش افزوده ۱۰٪ = ۲۵۰,۰۰۰,۰۰۰
    expect(res.body.data.totalVat).toBe('250000000');
    // مبلغ کل = ۲,۵۰۰,۰۰۰,۰۰۰ + ۵۰,۰۰۰,۰۰۰ + ۲۵۰,۰۰۰,۰۰۰ = ۲,۸۰۰,۰۰۰,۰۰۰
    expect(res.body.data.grandTotal).toBe('2800000000');
    expect(res.body.data.journalEntryId).toBeDefined();

    // بررسی بهای تمام شده لندد برای هر واحد: ۲۵۰ میلیون + ۵ میلیون کرایه = ۲۵۵ میلیون
    expect(res.body.data.items[0].finalUnitCost).toBe('255000000');
  });

  it('Step 14 (Phase 3): Should process second purchase and calculate rolling moving average in Kardex', async () => {
    // خرید دوم: ۱۰ عدد با نرخ ۲۷۰ میلیون ریال بدون کرایه حمل
    const purchaseData2 = {
      warehouseId: 'wh-main',
      supplierPartyId: 'party-supp-1',
      documentNumber: 'PINV-1403-002',
      dateShamsi: '1403/11/12',
      freightAmount: 0,
      items: [
        {
          productId: 'prod-laptop',
          quantity: 10,
          unitCost: 270000000
        }
      ]
    };

    const res = await request(app.getHttpServer())
      .post('/api/v1/purchases')
      .set('Authorization', `Bearer ${jwtToken}`)
      .set('x-tenant-id', 'tenant-pishro')
      .set('x-company-id', 'comp-pishro-1')
      .send(purchaseData2)
      .expect(201);

    expect(res.body.success).toBe(true);

    // استعلام کاردکس مقداری-ریالی:
    // کل موجودی = ۲۰ عدد
    // بهای تمام شده مانده = ۲,۵۵۰,۰۰۰,۰۰۰ + ۲,۷۰۰,۰۰۰,۰۰۰ = ۵,۲۵۰,۰۰۰,۰۰۰
    // نرخ میانگین موزون متحرک = ۵,۲۵۰,۰۰۰,۰۰۰ / ۲۰ = ۲۶۲,۵۰۰,۰۰۰ ریال
    const kardexRes = await request(app.getHttpServer())
      .get('/api/v1/inventory/kardex?warehouseId=wh-main&productId=prod-laptop')
      .set('Authorization', `Bearer ${jwtToken}`)
      .set('x-tenant-id', 'tenant-pishro')
      .set('x-company-id', 'comp-pishro-1')
      .expect(200);

    expect(kardexRes.body.success).toBe(true);
    expect(kardexRes.body.data.length).toBe(2);
    const latestEntry = kardexRes.body.data[1];
    expect(latestEntry.balance_quantity).toBe('20');
    expect(latestEntry.balance_unit_cost).toBe('262500000');
    expect(latestEntry.balance_total_cost).toBe('5250000000');
  });

  it('Step 15 (Phase 3): Should create sales invoice, automatically issue COGS journal entry, and reduce stock', async () => {
    // فروش ۵ عدد لپ‌تاپ به قیمت ۳۵۰ میلیون ریال با تخفیف ۵۰ میلیون ریال
    const salesData = {
      warehouseId: 'wh-main',
      customerPartyId: 'party-cust-1',
      documentNumber: 'SINV-1403-501',
      dateShamsi: '1403/11/15',
      discountAmount: 50000000,
      items: [
        {
          productId: 'prod-laptop',
          quantity: 5,
          unitPrice: 350000000
        }
      ]
    };

    const res = await request(app.getHttpServer())
      .post('/api/v1/sales')
      .set('Authorization', `Bearer ${jwtToken}`)
      .set('x-tenant-id', 'tenant-pishro')
      .set('x-company-id', 'comp-pishro-1')
      .send(salesData)
      .expect(201);

    expect(res.body.success).toBe(true);
    createdSalesId = res.body.data.id;
    expect(res.body.data.grossAmount).toBe('1750000000');
    expect(res.body.data.discountAmount).toBe('50000000');
    expect(res.body.data.netAmount).toBe('1700000000');
    // ارزش افزوده ۱۰٪ بر خالص ۱,۷۰۰,۰۰۰,۰۰۰ = ۱۷۰,۰۰۰,۰۰۰
    expect(res.body.data.vatAmount).toBe('170000000');
    // کل فاکتور = ۱,۷۰۰,۰۰۰,۰۰۰ + ۱۷۰,۰۰۰,۰۰۰ = ۱,۸۷۰,۰۰۰,۰۰۰
    expect(res.body.data.grandTotal).toBe('1870000000');

    // بهای تمام شده ۵ عدد لپ‌تاپ با نرخ میانگین ۲۶۲,۵۰۰,۰۰۰ = ۱,۳۱۲,۵۰۰,۰۰۰ ریال
    expect(res.body.data.cogsTotal).toBe('1312500000');
    expect(res.body.data.salesJournalEntryId).toBeDefined();
    expect(res.body.data.cogsJournalEntryId).toBeDefined();

    // بررسی کاردکس: موجودی باید از ۲۰ به ۱۵ عدد کاهش یافته باشد
    const kardexRes = await request(app.getHttpServer())
      .get('/api/v1/inventory/kardex?warehouseId=wh-main&productId=prod-laptop')
      .set('Authorization', `Bearer ${jwtToken}`)
      .set('x-tenant-id', 'tenant-pishro')
      .set('x-company-id', 'comp-pishro-1')
      .expect(200);

    const latest = kardexRes.body.data[kardexRes.body.data.length - 1];
    expect(latest.balance_quantity).toBe('15');
    expect(latest.balance_unit_cost).toBe('262500000');
    expect(latest.balance_total_cost).toBe('3937500000');
  });

  it('Step 16 (Phase 3): Should process sales return and restock inventory', async () => {
    // برگشت ۱ عدد لپ‌تاپ از فاکتور فروش
    const returnData = {
      returnDocumentNumber: 'RET-1403-01',
      dateShamsi: '1403/11/18',
      returnedItems: [
        {
          productId: 'prod-laptop',
          quantity: 1
        }
      ]
    };

    const res = await request(app.getHttpServer())
      .post(`/api/v1/sales/${createdSalesId}/return`)
      .set('Authorization', `Bearer ${jwtToken}`)
      .set('x-tenant-id', 'tenant-pishro')
      .set('x-company-id', 'comp-pishro-1')
      .send(returnData)
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.totalReturnedGross).toBe('350000000');
    expect(res.body.data.totalReturnedCogs).toBe('262500000');
    expect(res.body.data.financialJournalEntryId).toBeDefined();
    expect(res.body.data.inventoryJournalEntryId).toBeDefined();

    // بررسی کاردکس: موجودی باید با ۱ عدد برگشتی به ۱۶ عدد افزایش یافته باشد
    const kardexRes = await request(app.getHttpServer())
      .get('/api/v1/inventory/kardex?warehouseId=wh-main&productId=prod-laptop')
      .set('Authorization', `Bearer ${jwtToken}`)
      .set('x-tenant-id', 'tenant-pishro')
      .set('x-company-id', 'comp-pishro-1')
      .expect(200);

    const latest = kardexRes.body.data[kardexRes.body.data.length - 1];
    expect(latest.balance_quantity).toBe('16');
  });

  it('Step 17 (Phase 3): Should perform inventory count, detect deficit, and post discrepancy adjustment', async () => {
    // شمارش فیزیکی انبار: موجودی واقعی ۱۵ عدد (در سیستم ۱۶ عدد بود -> ۱ عدد کسری)
    const countData = {
      warehouseId: 'wh-main',
      countNumber: 'CNT-1403-01',
      countDateShamsi: '1403/11/25',
      items: [
        {
          productId: 'prod-laptop',
          physicalQuantity: 15
        }
      ]
    };

    const countRes = await request(app.getHttpServer())
      .post('/api/v1/inventory/counts')
      .set('Authorization', `Bearer ${jwtToken}`)
      .set('x-tenant-id', 'tenant-pishro')
      .set('x-company-id', 'comp-pishro-1')
      .send(countData)
      .expect(201);

    expect(countRes.body.success).toBe(true);
    createdCountId = countRes.body.data.id;
    expect(countRes.body.data.items[0].systemQuantity).toBe('16');
    expect(countRes.body.data.items[0].physicalQuantity).toBe('15');
    expect(countRes.body.data.items[0].discrepancyQuantity).toBe('-1');
    expect(countRes.body.data.items[0].discrepancyType).toBe('DEFICIT');
    expect(countRes.body.data.items[0].totalDiscrepancyValue).toBe('262500000');

    // اعمال تعدیل انبارگردانی
    const adjRes = await request(app.getHttpServer())
      .post(`/api/v1/inventory/counts/${createdCountId}/adjust`)
      .set('Authorization', `Bearer ${jwtToken}`)
      .set('x-tenant-id', 'tenant-pishro')
      .set('x-company-id', 'comp-pishro-1')
      .expect(201);

    expect(adjRes.body.success).toBe(true);
    expect(adjRes.body.data.status).toBe('ADJUSTED');
    expect(adjRes.body.data.totalDeficitValue).toBe('262500000');
    expect(adjRes.body.data.journalEntryId).toBeDefined();

    // بررسی کاردکس پس از تعدیل: مانده انبار دقیقاً ۱۵ عدد
    const kardexRes = await request(app.getHttpServer())
      .get('/api/v1/inventory/kardex?warehouseId=wh-main&productId=prod-laptop')
      .set('Authorization', `Bearer ${jwtToken}`)
      .set('x-tenant-id', 'tenant-pishro')
      .set('x-company-id', 'comp-pishro-1')
      .expect(200);

    const latest = kardexRes.body.data[kardexRes.body.data.length - 1];
    expect(latest.balance_quantity).toBe('15');
    expect(latest.document_type).toBe('COUNT_DISCREPANCY');
  });

  // ==========================================
  // آزمون‌های فاز ۴: سامانه مودیان و صورتحساب الکترونیکی
  // ==========================================

  it('Step 18 (Phase 4): Should retrieve company Moadian settings and verify memory ID', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/moadian/settings')
      .set('Authorization', `Bearer ${jwtToken}`)
      .set('x-tenant-id', 'tenant-pishro')
      .set('x-company-id', 'comp-pishro-1')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.fiscal_memory_id).toBe('A123B4');
    expect(res.body.data.public_key_base64).toBeDefined();
    expect(res.body.data.is_sandbox_mode).toBe(1);
  });

  it('Step 19 (Phase 4): Should generate new RSA 2048-bit key pair for tax portal registration', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/moadian/settings/generate-keys')
      .set('Authorization', `Bearer ${jwtToken}`)
      .set('x-tenant-id', 'tenant-pishro')
      .set('x-company-id', 'comp-pishro-1')
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.publicKeyPem).toContain('BEGIN PUBLIC KEY');
    expect(res.body.data.publicKeyBase64.length).toBeGreaterThan(100);
    expect(res.body.data.instruction).toBeDefined();
  });

  it('Step 20 (Phase 4): Should prepare Type 1 electronic invoice from sales document with 22-char Tax ID', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/moadian/invoices/prepare-from-sales/${createdSalesId}`)
      .set('Authorization', `Bearer ${jwtToken}`)
      .set('x-tenant-id', 'tenant-pishro')
      .set('x-company-id', 'comp-pishro-1')
      .send({
        invoiceType: 'TYPE_1',
        invoicePattern: 'PATTERN_1_GENERAL'
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    createdMoadianInvoiceId = res.body.data.id;
    createdTaxId = res.body.data.taxId;

    // شماره مالیاتی باید دقیقاً ۲۲ کاراکتر و دارای پیشوند حافظه مالیاتی باشد
    expect(createdTaxId).toHaveLength(22);
    expect(createdTaxId.startsWith('A123B4')).toBe(true);
    expect(res.body.data.status).toBe('PENDING');
    expect(res.body.data.items).toHaveLength(1);
    expect(res.body.data.items[0].sstid).toBe('2710000012345');
    expect(res.body.data.items[0].unitCode).toBe('1640');
  });

  it('Step 21 (Phase 4): Should digitally sign and send invoice to Tax Authority (confirmed in sandbox)', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/moadian/invoices/${createdMoadianInvoiceId}/send`)
      .set('Authorization', `Bearer ${jwtToken}`)
      .set('x-tenant-id', 'tenant-pishro')
      .set('x-company-id', 'comp-pishro-1')
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.isSuccess).toBe(true);
    expect(res.body.data.taxId).toBe(createdTaxId);
    expect(res.body.data.status).toBe('CONFIRMED');
    expect(res.body.data.trackingToken).toBeDefined();
    expect(res.body.data.packetId).toBeDefined();
  });

  it('Step 22 (Phase 4): Should inquire invoice confirmation status from tax portal', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/moadian/invoices/${createdMoadianInvoiceId}/inquire`)
      .set('Authorization', `Bearer ${jwtToken}`)
      .set('x-tenant-id', 'tenant-pishro')
      .set('x-company-id', 'comp-pishro-1')
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.taxId).toBe(createdTaxId);
    expect(res.body.data.portalStatus).toBe('CONFIRMED');
    expect(res.body.data.hasErrors).toBe(false);
  });

  it('Step 23 (Phase 4): Should prepare and send Cancellation invoice referencing original Tax ID', async () => {
    const cancelRes = await request(app.getHttpServer())
      .post(`/api/v1/moadian/invoices/prepare-cancellation/${createdMoadianInvoiceId}`)
      .set('Authorization', `Bearer ${jwtToken}`)
      .set('x-tenant-id', 'tenant-pishro')
      .set('x-company-id', 'comp-pishro-1')
      .expect(201);

    expect(cancelRes.body.success).toBe(true);
    const cancelId = cancelRes.body.data.id;
    expect(cancelRes.body.data.invoiceSubject).toBe('CANCELLATION');

    // ارسال صورتحساب ابطالی
    const sendRes = await request(app.getHttpServer())
      .post(`/api/v1/moadian/invoices/${cancelId}/send`)
      .set('Authorization', `Bearer ${jwtToken}`)
      .set('x-tenant-id', 'tenant-pishro')
      .set('x-company-id', 'comp-pishro-1')
      .expect(201);

    expect(sendRes.body.success).toBe(true);
    expect(sendRes.body.data.status).toBe('CONFIRMED');
  });

  it('Step 24 (Phase 4): Should process Outbox Queue asynchronously with exponential backoff capability', async () => {
    const outboxRes = await request(app.getHttpServer())
      .post('/api/v1/moadian/outbox/process')
      .set('Authorization', `Bearer ${jwtToken}`)
      .set('x-tenant-id', 'tenant-pishro')
      .set('x-company-id', 'comp-pishro-1')
      .expect(201);

    expect(outboxRes.body.success).toBe(true);
    expect(outboxRes.body.data.processedCount).toBeGreaterThanOrEqual(0);
  });

  it('Step 25 (Phase 4): Should perform reconciliation with Tax Portal invoices and report discrepancies', async () => {
    const reconcileData = {
      portalInvoices: [
        {
          taxId: createdTaxId,
          documentType: 'SALES',
          portalAmount: '1870000000' // مبلغ دقیقاً منطبق با صورتحساب سیستم
        },
        {
          taxId: 'A123B40000000000000999',
          documentType: 'SALES',
          portalAmount: '500000000' // صورتحسابی که فقط در کارپوشه است
        }
      ]
    };

    const res = await request(app.getHttpServer())
      .post('/api/v1/moadian/reconcile')
      .set('Authorization', `Bearer ${jwtToken}`)
      .set('x-tenant-id', 'tenant-pishro')
      .set('x-company-id', 'comp-pishro-1')
      .send(reconcileData)
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(2);

    const matched = res.body.data.find((r: any) => r.taxId === createdTaxId);
    expect(matched).toBeDefined();
    expect(matched.status).toBe('MATCHED');
    expect(matched.discrepancyAmount).toBe('0');

    const portalOnly = res.body.data.find((r: any) => r.taxId === 'A123B40000000000000999');
    expect(portalOnly).toBeDefined();
    expect(portalOnly.status).toBe('ONLY_IN_PORTAL');
  });

  // ==========================================
  // آزمون‌های فاز ۵: POS آفلاین و ماژول فروشگاهی
  // ==========================================

  it('Step 26 (Phase 5): Should list POS terminals and open a cashier shift with opening cash', async () => {
    // استعلام پایانه‌های کارتخوان فعال
    const termRes = await request(app.getHttpServer())
      .get('/api/v1/pos/terminals')
      .set('Authorization', `Bearer ${jwtToken}`)
      .set('x-tenant-id', 'tenant-pishro')
      .set('x-company-id', 'comp-pishro-1')
      .expect(200);

    expect(termRes.body.success).toBe(true);
    expect(termRes.body.data.length).toBeGreaterThanOrEqual(1);
    const terminal = termRes.body.data.find((t: any) => t.id === 'pos-term-1');
    expect(terminal).toBeDefined();
    expect(terminal.code).toBe('POS01');

    // باز کردن شیفت با ۵ میلیون ریال پول خرد اول وقت
    const openRes = await request(app.getHttpServer())
      .post('/api/v1/pos/shifts/open')
      .set('Authorization', `Bearer ${jwtToken}`)
      .set('x-tenant-id', 'tenant-pishro')
      .set('x-company-id', 'comp-pishro-1')
      .send({
        cashDeskId: 'cash-desk-1',
        posTerminalId: 'pos-term-1',
        openingCashBalance: 5000000,
        cashBreakdownOpening: { notes_500000: 10 }
      })
      .expect(201);

    expect(openRes.body.success).toBe(true);
    createdShiftId = openRes.body.data.id;
    expect(openRes.body.data.status).toBe('OPEN');
    expect(openRes.body.data.opening_cash_balance).toBe('5000000');
    expect(openRes.body.data.expected_cash_balance).toBe('5000000');
    expect(openRes.body.data.shift_number).toContain('SHF-');

    // استعلام شیفت فعال کاربر
    const activeRes = await request(app.getHttpServer())
      .get('/api/v1/pos/shifts/active')
      .set('Authorization', `Bearer ${jwtToken}`)
      .set('x-tenant-id', 'tenant-pishro')
      .set('x-company-id', 'comp-pishro-1')
      .expect(200);

    expect(activeRes.body.success).toBe(true);
    expect(activeRes.body.data.id).toBe(createdShiftId);
  });

  it('Step 27 (Phase 5): Should process fast POS order with weight scale barcode and deduct warehouse stock', async () => {
    // بارکد ترازوی وزنی: ۲۱ (پیشوند) + ۰۰۱۰۵ (کد گوشت) + ۰۱۵۰۰ (۱.۵۰۰ کیلوگرم) + ۳ (رقم کنترل)
    // قیمت هر کیلو گوشت: ۲,۴۰۰,۰۰۰ ریال -> ۱.۵ کیلو = ۳,۶۰۰,۰۰۰ ریال (معاف از مالیات)
    const orderData = {
      shiftId: createdShiftId,
      warehouseId: 'wh-main',
      paymentMethod: 'POS_CARD',
      items: [
        {
          barcode: '2100105015003'
        }
      ]
    };

    const res = await request(app.getHttpServer())
      .post('/api/v1/pos/orders')
      .set('Authorization', `Bearer ${jwtToken}`)
      .set('x-tenant-id', 'tenant-pishro')
      .set('x-company-id', 'comp-pishro-1')
      .send(orderData)
      .expect(201);

    expect(res.body.success).toBe(true);
    createdPosOrderId = res.body.data.id;
    expect(res.body.data.status).toBe('COMPLETED');
    expect(res.body.data.grandTotal).toBe('3600000');
    expect(res.body.data.posCardAmount).toBe('3600000');
    expect(res.body.data.items).toHaveLength(1);
    expect(Boolean(res.body.data.items[0].isWeighted)).toBe(true);
    expect(res.body.data.items[0].weightGrams).toBe(1500);
    expect(res.body.data.items[0].quantity).toBe('1.500');
    // بهای تمام شده ۱.۵ کیلو در نرخ خرید ۱,۸۰۰,۰۰۰ = ۲,۷۰۰,۰۰۰ ریال
    expect(res.body.data.cogsTotal).toBe('2700000');

    // استعلام فاکتور حرارتی با حروف فارسی
    const receiptRes = await request(app.getHttpServer())
      .get(`/api/v1/pos/orders/${createdPosOrderId}/receipt`)
      .set('Authorization', `Bearer ${jwtToken}`)
      .set('x-tenant-id', 'tenant-pishro')
      .set('x-company-id', 'comp-pishro-1')
      .expect(200);

    expect(receiptRes.body.success).toBe(true);
    expect(receiptRes.body.data.grandTotalWords).toContain('سه میلیون و ششصد هزار ریال');

    // بررسی کاردکس انبار برای کالای گوشت: موجودی اولیه ۱۰۰ منهای ۱.۵ = ۹۸.۵ کیلوگرم
    const kardexRes = await request(app.getHttpServer())
      .get('/api/v1/inventory/kardex?warehouseId=wh-main&productId=prod-meat')
      .set('Authorization', `Bearer ${jwtToken}`)
      .set('x-tenant-id', 'tenant-pishro')
      .set('x-company-id', 'comp-pishro-1')
      .expect(200);

    expect(kardexRes.body.success).toBe(true);
    expect(kardexRes.body.data.length).toBe(2);
    const latest = kardexRes.body.data[1];
    expect(latest.out_quantity).toBe('1.5');
    expect(latest.balance_quantity).toBe('98.5');
  });

  it('Step 28 (Phase 5): Should handle suspended cart (Hold) and recall to complete payment', async () => {
    // ثبت سفارش معلق (HOLD) برای مشتری که کارت خود را فراموش کرده
    const holdData = {
      shiftId: createdShiftId,
      warehouseId: 'wh-main',
      status: 'HOLD',
      holdReference: 'مشتری میز ۴ - در حال انتخاب لوازم جانبی',
      items: [
        {
          productId: 'prod-laptop',
          quantity: 1,
          unitPrice: 350000000
        }
      ]
    };

    const holdRes = await request(app.getHttpServer())
      .post('/api/v1/pos/orders')
      .set('Authorization', `Bearer ${jwtToken}`)
      .set('x-tenant-id', 'tenant-pishro')
      .set('x-company-id', 'comp-pishro-1')
      .send(holdData)
      .expect(201);

    expect(holdRes.body.success).toBe(true);
    createdHeldOrderId = holdRes.body.data.id;
    expect(holdRes.body.data.status).toBe('HOLD');

    // استعلام لیست سبدهای خرید معلق
    const listHeldRes = await request(app.getHttpServer())
      .get('/api/v1/pos/orders/hold')
      .set('Authorization', `Bearer ${jwtToken}`)
      .set('x-tenant-id', 'tenant-pishro')
      .set('x-company-id', 'comp-pishro-1')
      .expect(200);

    expect(listHeldRes.body.success).toBe(true);
    expect(listHeldRes.body.data.some((o: any) => o.id === createdHeldOrderId)).toBe(true);

    // بازیابی (Recall) و تسویه نقدی سبد معلق
    // لپتاپ: ۳۵۰ میلیون + ۱۰٪ ارزش افزوده = ۳۸۵ میلیون ریال
    const completeRes = await request(app.getHttpServer())
      .post(`/api/v1/pos/orders/${createdHeldOrderId}/recall-complete`)
      .set('Authorization', `Bearer ${jwtToken}`)
      .set('x-tenant-id', 'tenant-pishro')
      .set('x-company-id', 'comp-pishro-1')
      .send({
        paymentMethod: 'CASH'
      })
      .expect(201);

    expect(completeRes.body.success).toBe(true);
    expect(completeRes.body.data.status).toBe('COMPLETED');
    expect(completeRes.body.data.cash_amount).toBe('385000000');
    expect(completeRes.body.data.grand_total).toBe('385000000');
  });

  it('Step 29 (Phase 5): Should sync offline POS batch orders and enforce idempotency key protection', async () => {
    const offlineBatch = {
      orders: [
        {
          shiftId: createdShiftId,
          warehouseId: 'wh-main',
          idempotencyKey: 'idemp-pos-offline-001',
          paymentMethod: 'CASH',
          items: [
            {
              productId: 'prod-mouse',
              quantity: 2,
              unitPrice: 15000000
            }
          ]
        }
      ]
    };

    // ارسال بار اول: ثبت سفارش آفلاین
    const syncRes = await request(app.getHttpServer())
      .post('/api/v1/pos/orders/sync-offline')
      .set('Authorization', `Bearer ${jwtToken}`)
      .set('x-tenant-id', 'tenant-pishro')
      .set('x-company-id', 'comp-pishro-1')
      .send(offlineBatch)
      .expect(201);

    expect(syncRes.body.success).toBe(true);
    expect(syncRes.body.data.syncedCount).toBe(1);
    // ۲ عدد موس به مبلغ ۱۵ میلیون + ۱۰٪ ارزش افزوده = ۳۳,۰۰۰,۰۰۰ ریال
    expect(syncRes.body.data.orders[0].grandTotal).toBe('33000000');

    // ارسال مجدد همان سفارش به دلیل قطعی موقت اینترنت (Idempotency Test)
    const retryRes = await request(app.getHttpServer())
      .post('/api/v1/pos/orders/sync-offline')
      .set('Authorization', `Bearer ${jwtToken}`)
      .set('x-tenant-id', 'tenant-pishro')
      .set('x-company-id', 'comp-pishro-1')
      .send(offlineBatch)
      .expect(201);

    expect(retryRes.body.success).toBe(true);
    // سفارش بدون ثبت مجدد و بدون کسر تکراری انبار بازگردانده می‌شود
    expect(retryRes.body.data.orders[0].id).toBe(syncRes.body.data.orders[0].id);
  });

  it('Step 30 (Phase 5): Should record cash movements (Cash In / Cash Drop) during shift', async () => {
    // ۱. تخلیه نقدی مبالغ مازاد صندوق به گاوصندوق اصلی (Cash Drop)
    const dropRes = await request(app.getHttpServer())
      .post(`/api/v1/pos/shifts/${createdShiftId}/cash-movement`)
      .set('Authorization', `Bearer ${jwtToken}`)
      .set('x-tenant-id', 'tenant-pishro')
      .set('x-company-id', 'comp-pishro-1')
      .send({
        movementType: 'CASH_DROP',
        amount: 2000000,
        description: 'تخلیه نقدی مازاد به گاوصندوق امن'
      })
      .expect(201);

    expect(dropRes.body.success).toBe(true);
    expect(dropRes.body.data.movementType).toBe('CASH_DROP');
    expect(dropRes.body.data.amount).toBe('2000000');

    // ۲. تزریق مجدد اسکناس ریز به صندوق (Cash In)
    const inRes = await request(app.getHttpServer())
      .post(`/api/v1/pos/shifts/${createdShiftId}/cash-movement`)
      .set('Authorization', `Bearer ${jwtToken}`)
      .set('x-tenant-id', 'tenant-pishro')
      .set('x-company-id', 'comp-pishro-1')
      .send({
        movementType: 'CASH_IN',
        amount: 500000,
        description: 'تزریق پول خرد ۵۰ هزار ریالی'
      })
      .expect(201);

    expect(inRes.body.success).toBe(true);
    expect(inRes.body.data.movementType).toBe('CASH_IN');
  });

  it('Step 31 (Phase 5): Should generate interim X-Report without closing the cashier shift', async () => {
    const xRes = await request(app.getHttpServer())
      .get(`/api/v1/pos/shifts/${createdShiftId}/x-report`)
      .set('Authorization', `Bearer ${jwtToken}`)
      .set('x-tenant-id', 'tenant-pishro')
      .set('x-company-id', 'comp-pishro-1')
      .expect(200);

    expect(xRes.body.success).toBe(true);
    expect(xRes.body.data.reportType).toBe('X_REPORT');
    expect(xRes.body.data.status).toBe('OPEN');
    // ۳ سفارش قطعی: گوشت (پوز)، لپ‌تاپ ریکال‌شده (نقد)، موس آفلاین (نقد)
    expect(xRes.body.data.totalSalesCount).toBe(3);
    // کارتخوان = ۳,۶۰۰,۰۰۰ ریال
    expect(xRes.body.data.totalPosCardSales).toBe('3600000');
    // نقدی = ۳۸۵,۰۰۰,۰۰۰ + ۳۳,۰۰۰,۰۰۰ = ۴۱۸,۰۰۰,۰۰۰ ریال
    expect(xRes.body.data.totalCashSales).toBe('418000000');
    // مانده نقد انتظاری در صندوق:
    // ۵,۰۰۰,۰۰۰ (اولیه) + ۴۱۸,۰۰۰,۰۰۰ (فروش نقدی) - ۲,۰۰۰,۰۰۰ (تخلیه) + ۵۰۰,۰۰۰ (واریز خرد) = ۴۲۱,۵۰۰,۰۰۰ ریال
    expect(xRes.body.data.expectedCashInDrawer).toBe('421500000');
  });

  it('Step 32 (Phase 5): Should close shift, print Z-Report and post Daily Consolidated, COGS & Discrepancy Entries', async () => {
    // شمارش فیزیکی نقدینگی صندوقدار: ۴۲۱,۴۵۰,۰۰۰ ریال (۵۰ هزار ریال کسری صندوق نسبت به مانده انتظاری ۴۲۱,۵۰۰,۰۰۰)
    const closeRes = await request(app.getHttpServer())
      .post(`/api/v1/pos/shifts/${createdShiftId}/close`)
      .set('Authorization', `Bearer ${jwtToken}`)
      .set('x-tenant-id', 'tenant-pishro')
      .set('x-company-id', 'comp-pishro-1')
      .send({
        dateShamsi: '1403/11/15',
        actualCashBalance: '421450000',
        cashBreakdownClosing: {
          notes_500000: 842,
          notes_100000: 4,
          notes_50000: 1
        }
      })
      .expect(201);

    expect(closeRes.body.success).toBe(true);
    expect(closeRes.body.data.reportType).toBe('Z_REPORT');
    expect(closeRes.body.data.status).toBe('CLOSED');
    expect(closeRes.body.data.cashDiscrepancy).toBe('-50000');

    // سند تجمیعی روزانه فروش صادر شده باشد
    expect(closeRes.body.data.dailyJournalEntryId).toBeDefined();
    // سند بهای تمام شده کالای فروش رفته صادر شده باشد
    expect(closeRes.body.data.cogsJournalEntryId).toBeDefined();
    // سند کسری صندوق صادر شده باشد
    expect(closeRes.body.data.discrepancyJournalEntryId).toBeDefined();
  });

  // ==========================================
  // آزمون‌های فاز ۶: ماژول رستوران، کافی‌شاپ، منو، دستور پخت، میزها، KDS و پیک
  // ==========================================

  it('Step 33 (Phase 6): Should list restaurant sections, tables, and toggle table reservation', async () => {
    // ۱. استعلام بخش‌های سالن
    const secRes = await request(app.getHttpServer())
      .get('/api/v1/restaurant/sections')
      .set('Authorization', `Bearer ${jwtToken}`)
      .set('x-tenant-id', 'tenant-pishro')
      .set('x-company-id', 'comp-pishro-1')
      .expect(200);

    expect(secRes.body.success).toBe(true);
    expect(secRes.body.data.length).toBeGreaterThanOrEqual(2);
    expect(secRes.body.data.some((s: any) => s.code === 'SEC-MAIN')).toBe(true);

    // ۲. استعلام میزها
    const tblRes = await request(app.getHttpServer())
      .get('/api/v1/restaurant/tables')
      .set('Authorization', `Bearer ${jwtToken}`)
      .set('x-tenant-id', 'tenant-pishro')
      .set('x-company-id', 'comp-pishro-1')
      .expect(200);

    expect(tblRes.body.success).toBe(true);
    expect(tblRes.body.data.length).toBeGreaterThanOrEqual(3);
    const table1 = tblRes.body.data.find((t: any) => t.id === 'tbl-01');
    expect(table1).toBeDefined();
    expect(table1.status).toBe('VACANT');

    // ۳. تغییر موقت به رزرو و بازگشت به خالی
    const resRes = await request(app.getHttpServer())
      .post('/api/v1/restaurant/tables/tbl-01/status')
      .set('Authorization', `Bearer ${jwtToken}`)
      .set('x-tenant-id', 'tenant-pishro')
      .set('x-company-id', 'comp-pishro-1')
      .send({ status: 'RESERVED' })
      .expect(201);

    expect(resRes.body.data.status).toBe('RESERVED');

    await request(app.getHttpServer())
      .post('/api/v1/restaurant/tables/tbl-01/status')
      .set('Authorization', `Bearer ${jwtToken}`)
      .set('x-tenant-id', 'tenant-pishro')
      .set('x-company-id', 'comp-pishro-1')
      .send({ status: 'VACANT' })
      .expect(201);
  });

  it('Step 34 (Phase 6): Should merge two adjacent tables (Merge Tables) for a large group', async () => {
    const mergeRes = await request(app.getHttpServer())
      .post('/api/v1/restaurant/tables/merge')
      .set('Authorization', `Bearer ${jwtToken}`)
      .set('x-tenant-id', 'tenant-pishro')
      .set('x-company-id', 'comp-pishro-1')
      .send({
        primaryTableId: 'tbl-01',
        secondaryTableId: 'tbl-02'
      })
      .expect(201);

    expect(mergeRes.body.success).toBe(true);

    // بررسی میز ثانویه
    const checkRes = await request(app.getHttpServer())
      .get('/api/v1/restaurant/tables')
      .set('Authorization', `Bearer ${jwtToken}`)
      .set('x-tenant-id', 'tenant-pishro')
      .set('x-company-id', 'comp-pishro-1')
      .expect(200);

    const tbl2 = checkRes.body.data.find((t: any) => t.id === 'tbl-02');
    expect(tbl2.merged_with_table_id).toBe('tbl-01');
    expect(tbl2.status).toBe('OCCUPIED');
  });

  it('Step 35 (Phase 6): Should calculate recipe raw materials, Food Cost percentage, and analyze Menu Engineering', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/restaurant/recipes/prod-pizza-pep/analysis?isPopular=true')
      .set('Authorization', `Bearer ${jwtToken}`)
      .set('x-tenant-id', 'tenant-pishro')
      .set('x-company-id', 'comp-pishro-1')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.sellPrice).toBe('1800000');
    // بهای تمام شده محاسبه شده مواد اولیه پیتزا پپرونی: ۴۹۳,۴۰۰ ریال
    expect(res.body.data.foodCostAmount).toBe('493400');
    // درصد Food Cost: ۲۷.۴۱٪
    expect(res.body.data.analysis.foodCostPercentage).toBe('27.41');
    // طبقه مهندسی منو: STAR (سود بالا + محبوبیت بالا)
    expect(res.body.data.analysis.category).toBe('STAR');
  });

  it('Step 36 (Phase 6): Should create Dine-In restaurant order with KDS tickets distributed to stations', async () => {
    // سفارش سالن: ۲ پیتزا پپرونی (آشپزخانه گرم) + ۲ قهوه اسپرسو (بار کافه)
    const orderData = {
      channel: 'DINE_IN',
      tableId: 'tbl-01',
      guestCount: 4,
      notes: 'پیتزاها برشته و قهوه‌ها بعد از غذا سرو شود',
      items: [
        {
          productId: 'prod-pizza-pep',
          quantity: 2
        },
        {
          productId: 'prod-espresso',
          quantity: 2
        }
      ]
    };

    const res = await request(app.getHttpServer())
      .post('/api/v1/restaurant/orders')
      .set('Authorization', `Bearer ${jwtToken}`)
      .set('x-tenant-id', 'tenant-pishro')
      .set('x-company-id', 'comp-pishro-1')
      .send(orderData)
      .expect(201);

    expect(res.body.success).toBe(true);
    createdRestaurantOrderId = res.body.data.id;
    expect(res.body.data.channel).toBe('DINE_IN');
    expect(res.body.data.tableNumber).toBe('T01');

    // مبالغ:
    // ناخالص غذا: (۲ * ۱,۸۰۰,۰۰۰) + (۲ * ۴۵۰,۰۰۰) = ۴,۵۰۰,۰۰۰ ریال
    expect(res.body.data.grossAmount).toBe('4500000');
    // حق سرویس سالن ۵٪: ۲۲۵,۰۰۰ ریال
    expect(res.body.data.serviceChargeAmount).toBe('225000');
    // ارزش افزوده ۱۰٪: ۴۵۰,۰۰۰ ریال
    expect(res.body.data.vatAmount).toBe('450000');
    // مبلغ کل فاکتور = ۴,۵۰۰,۰۰۰ + ۲۲۵,۰۰۰ + ۴۵۰,۰۰۰ = ۵,۱۷۵,۰۰۰ ریال
    expect(res.body.data.grandTotal).toBe('5175000');

    // تیکت‌های آشپزخانه KDS
    expect(res.body.data.kdsTickets).toHaveLength(2);
    const hotTicket = res.body.data.kdsTickets.find((t: any) => t.station === 'HOT_KITCHEN');
    const barTicket = res.body.data.kdsTickets.find((t: any) => t.station === 'BAR_CAFE');
    expect(hotTicket).toBeDefined();
    expect(barTicket).toBeDefined();
    createdKdsHotTicketId = hotTicket.id;

    // بررسی اشغال شدن میز ۱ در سالن
    const tblRes = await request(app.getHttpServer())
      .get('/api/v1/restaurant/tables')
      .set('Authorization', `Bearer ${jwtToken}`)
      .set('x-tenant-id', 'tenant-pishro')
      .set('x-company-id', 'comp-pishro-1')
      .expect(200);

    const tbl1 = tblRes.body.data.find((t: any) => t.id === 'tbl-01');
    expect(tbl1.status).toBe('OCCUPIED');
    expect(tbl1.current_order_id).toBe(createdRestaurantOrderId);
  });

  it('Step 37 (Phase 6): Should update KDS kitchen tickets and transition order to READY_TO_SERVE', async () => {
    // ۱. ایستگاه گرم: شروع پخت پیتزا (PREPARING)
    const prepRes = await request(app.getHttpServer())
      .post(`/api/v1/restaurant/kds/tickets/${createdKdsHotTicketId}/status`)
      .set('Authorization', `Bearer ${jwtToken}`)
      .set('x-tenant-id', 'tenant-pishro')
      .set('x-company-id', 'comp-pishro-1')
      .send({ status: 'PREPARING' })
      .expect(201);

    expect(prepRes.body.data.status).toBe('PREPARING');
    expect(prepRes.body.data.startedAt).toBeDefined();

    // ۲. ایستگاه گرم: اتمام پخت و اعلام آمادگی (READY)
    const readyRes = await request(app.getHttpServer())
      .post(`/api/v1/restaurant/kds/tickets/${createdKdsHotTicketId}/status`)
      .set('Authorization', `Bearer ${jwtToken}`)
      .set('x-tenant-id', 'tenant-pishro')
      .set('x-company-id', 'comp-pishro-1')
      .send({ status: 'READY' })
      .expect(201);

    expect(readyRes.body.data.status).toBe('READY');
    expect(readyRes.body.data.readyAt).toBeDefined();

    // استعلام تیکت‌های مانیتور آشپزخانه
    const kdsListRes = await request(app.getHttpServer())
      .get('/api/v1/restaurant/kds/tickets?station=HOT_KITCHEN')
      .set('Authorization', `Bearer ${jwtToken}`)
      .set('x-tenant-id', 'tenant-pishro')
      .set('x-company-id', 'comp-pishro-1')
      .expect(200);

    expect(kdsListRes.body.success).toBe(true);
    expect(kdsListRes.body.data.length).toBeGreaterThanOrEqual(1);
  });

  it('Step 38 (Phase 6): Should transfer order from Window Table to VIP Table (Move Table)', async () => {
    // انتقال سفارش از میز ۱ به میز بزرگ VIP
    const transferRes = await request(app.getHttpServer())
      .post('/api/v1/restaurant/tables/transfer')
      .set('Authorization', `Bearer ${jwtToken}`)
      .set('x-tenant-id', 'tenant-pishro')
      .set('x-company-id', 'comp-pishro-1')
      .send({
        fromTableId: 'tbl-01',
        toTableId: 'tbl-vip'
      })
      .expect(201);

    expect(transferRes.body.success).toBe(true);

    // بررسی وضعیت میزها پس از انتقال
    const checkTables = await request(app.getHttpServer())
      .get('/api/v1/restaurant/tables')
      .set('Authorization', `Bearer ${jwtToken}`)
      .set('x-tenant-id', 'tenant-pishro')
      .set('x-company-id', 'comp-pishro-1')
      .expect(200);

    const tbl1 = checkTables.body.data.find((t: any) => t.id === 'tbl-01');
    const tblVip = checkTables.body.data.find((t: any) => t.id === 'tbl-vip');

    expect(tbl1.status).toBe('VACANT');
    expect(tbl1.current_order_id).toBeNull();

    expect(tblVip.status).toBe('OCCUPIED');
    expect(tblVip.current_order_id).toBe(createdRestaurantOrderId);
  });

  it('Step 39 (Phase 6): Should perform Split Bill calculation into 3 equal shares', async () => {
    // تسهیم فاکتور ۵,۱۹۷,۵۰۰ ریالی بین ۳ نفر:
    // ۵,۱۹۷,۵۰۰ / ۳ = ۱,۷۳۲,۵۰۰ ریال برای هر سهم
    const splitRes = await request(app.getHttpServer())
      .post(`/api/v1/restaurant/orders/${createdRestaurantOrderId}/split`)
      .set('Authorization', `Bearer ${jwtToken}`)
      .set('x-tenant-id', 'tenant-pishro')
      .set('x-company-id', 'comp-pishro-1')
      .send({
        method: 'EQUAL_PARTS',
        parts: 3
      })
      .expect(201);

    expect(splitRes.body.success).toBe(true);
    expect(splitRes.body.data.partsCount).toBe(3);
    expect(splitRes.body.data.shares).toHaveLength(3);
    expect(splitRes.body.data.shares[0].amount).toBe('1725000');
    expect(splitRes.body.data.shares[1].amount).toBe('1725000');
    expect(splitRes.body.data.shares[2].amount).toBe('1725000');
  });

  it('Step 40 (Phase 6): Should settle Dine-In order, deduct raw materials from inventory, and post Sales & Food Cost Journal Entries', async () => {
    // تسویه با کارتخوان سالن
    const settleRes = await request(app.getHttpServer())
      .post(`/api/v1/restaurant/orders/${createdRestaurantOrderId}/settle`)
      .set('Authorization', `Bearer ${jwtToken}`)
      .set('x-tenant-id', 'tenant-pishro')
      .set('x-company-id', 'comp-pishro-1')
      .send({
        settlementMethod: 'POS_CARD'
      })
      .expect(201);

    expect(settleRes.body.success).toBe(true);
    expect(settleRes.body.data.status).toBe('PAID');
    expect(settleRes.body.data.grandTotal).toBe('5175000');
    // سند دوبل فروش غذا
    expect(settleRes.body.data.journalEntryId).toBeDefined();
    // سند دوبل بهای تمام شده مواد اولیه (Food Cost)
    expect(settleRes.body.data.cogsJournalEntryId).toBeDefined();

    // بررسی آزادسازی میز VIP به وضعیت تمیزکاری (CLEANING)
    const tblRes = await request(app.getHttpServer())
      .get('/api/v1/restaurant/tables')
      .set('Authorization', `Bearer ${jwtToken}`)
      .set('x-tenant-id', 'tenant-pishro')
      .set('x-company-id', 'comp-pishro-1')
      .expect(200);

    const tblVip = tblRes.body.data.find((t: any) => t.id === 'tbl-vip');
    expect(tblVip.status).toBe('CLEANING');

    // بررسی کسر دقیق کاردکس انبار مواد اولیه:
    // ۲ پیتزا: هر پیتزا ۲۰۰ گرم خمیر -> ۰.۴۰۰ کیلوگرم کسر از ۱۰۰ کیلو اولیه = ۹۹.۶۰۰ کیلوگرم
    const doughKardex = await request(app.getHttpServer())
      .get('/api/v1/inventory/kardex?warehouseId=wh-main&productId=raw-dough')
      .set('Authorization', `Bearer ${jwtToken}`)
      .set('x-tenant-id', 'tenant-pishro')
      .set('x-company-id', 'comp-pishro-1')
      .expect(200);

    expect(doughKardex.body.success).toBe(true);
    expect(doughKardex.body.data.length).toBe(2);
    const latestDough = doughKardex.body.data[1];
    expect(latestDough.out_quantity).toBe('0.400');
    expect(Number(latestDough.balance_quantity)).toBe(99.6);
  });

  it('Step 41 (Phase 6): Should process Delivery order, assign courier, complete delivery and settle courier cash', async () => {
    // ۱. ثبت سفارش بیرون‌بر / دلیوری: ۱ پیتزا پپرونی (۱,۸۰۰,۰۰۰ + ۱۰٪ ارزش افزوده = ۱,۹۸۰,۰۰۰ ریال)
    const delOrderRes = await request(app.getHttpServer())
      .post('/api/v1/restaurant/orders')
      .set('Authorization', `Bearer ${jwtToken}`)
      .set('x-tenant-id', 'tenant-pishro')
      .set('x-company-id', 'comp-pishro-1')
      .send({
        channel: 'DELIVERY',
        items: [
          {
            productId: 'prod-pizza-pep',
            quantity: 1
          }
        ]
      })
      .expect(201);

    expect(delOrderRes.body.success).toBe(true);
    createdDeliveryOrderId = delOrderRes.body.data.id;
    expect(delOrderRes.body.data.grandTotal).toBe('1980000');

    // ۲. ایجاد ماموریت دلیوری با هزینه ارسال ۳۰۰,۰۰۰ ریال
    const delMissionRes = await request(app.getHttpServer())
      .post('/api/v1/restaurant/deliveries')
      .set('Authorization', `Bearer ${jwtToken}`)
      .set('x-tenant-id', 'tenant-pishro')
      .set('x-company-id', 'comp-pishro-1')
      .send({
        orderId: createdDeliveryOrderId,
        customerName: 'مهندس سهرابی',
        customerPhone: '09129998877',
        deliveryAddress: 'تهران، خیابان ملاصدرا، پلاک ۲۰، واحد ۴',
        deliveryFee: 300000
      })
      .expect(201);

    expect(delMissionRes.body.success).toBe(true);
    createdDeliveryId = delMissionRes.body.data.id;
    expect(delMissionRes.body.data.status).toBe('PENDING_ASSIGNMENT');

    // ۳. تخصیص پیک موتوری رستوران (آقای رضا مرادی)
    const assignRes = await request(app.getHttpServer())
      .post(`/api/v1/restaurant/deliveries/${createdDeliveryId}/assign`)
      .set('Authorization', `Bearer ${jwtToken}`)
      .set('x-tenant-id', 'tenant-pishro')
      .set('x-company-id', 'comp-pishro-1')
      .send({
        courierPartyId: 'party-courier-1'
      })
      .expect(201);

    expect(assignRes.body.success).toBe(true);
    expect(assignRes.body.data.status).toBe('DISPATCHED');

    // ۴. ثبت تحویل سفارش درب منزل و وصول نقدینگی (۱,۹۸۰,۰۰۰ غذا + ۳۰۰,۰۰۰ هزینه پیک = ۲,۲۸۰,۰۰۰ ریال)
    const compDelRes = await request(app.getHttpServer())
      .post(`/api/v1/restaurant/deliveries/${createdDeliveryId}/complete`)
      .set('Authorization', `Bearer ${jwtToken}`)
      .set('x-tenant-id', 'tenant-pishro')
      .set('x-company-id', 'comp-pishro-1')
      .send({
        cashCollected: 2280000
      })
      .expect(201);

    expect(compDelRes.body.success).toBe(true);
    expect(compDelRes.body.data.status).toBe('DELIVERED');
    expect(compDelRes.body.data.cashCollected).toBe('2280000');

    // ۵. تسویه حساب پایان روز پیک با صندوق رستوران
    const settleCourierRes = await request(app.getHttpServer())
      .post('/api/v1/restaurant/deliveries/settle-courier')
      .set('Authorization', `Bearer ${jwtToken}`)
      .set('x-tenant-id', 'tenant-pishro')
      .set('x-company-id', 'comp-pishro-1')
      .send({
        courierPartyId: 'party-courier-1'
      })
      .expect(201);

    expect(settleCourierRes.body.success).toBe(true);
    expect(settleCourierRes.body.data.settledCount).toBe(1);
    expect(settleCourierRes.body.data.totalCashToHandover).toBe('2280000');
  });

  // ==========================================
  // آزمون‌های فاز ۷: ماژول جامع تولید و بهای تمام‌شده (Manufacturing & Cost Accounting)
  // ==========================================

  it('Step 42 (Phase 7): Should retrieve Work Centers and verify hourly rates', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/manufacturing/work-centers')
      .set('Authorization', `Bearer ${jwtToken}`)
      .set('x-tenant-id', 'tenant-pishro')
      .set('x-company-id', 'comp-pishro-1')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(2);

    const assembly = res.body.data.find((w: any) => w.id === 'wc-assembly');
    expect(assembly).toBeDefined();
    expect(assembly.labor_hourly_rate).toBe('2500000');
    expect(assembly.overhead_hourly_rate).toBe('1500000');

    const qc = res.body.data.find((w: any) => w.id === 'wc-qc-packaging');
    expect(qc).toBeDefined();
    expect(qc.labor_hourly_rate).toBe('2000000');
    expect(qc.overhead_hourly_rate).toBe('1000000');
  });

  it('Step 43 (Phase 7): Should explode Bill of Materials (BOM) with normal scrap allowances and calculate standard cost', async () => {
    // ۱. انفجار فرمول ساخت برای تولید ۱۰ دستگاه پوز هوشمند
    const explodeRes = await request(app.getHttpServer())
      .post('/api/v1/manufacturing/boms/bom-smart-pos-v1/explode')
      .set('Authorization', `Bearer ${jwtToken}`)
      .set('x-tenant-id', 'tenant-pishro')
      .set('x-company-id', 'comp-pishro-1')
      .send({ quantity: 10 })
      .expect(201);

    expect(explodeRes.body.success).toBe(true);
    expect(explodeRes.body.data.orderQuantity).toBe('10');
    expect(explodeRes.body.data.materials.length).toBe(5);

    // بررسی محاسبه ضایعات عادی در مقدار مورد نیاز
    const touchscreen = explodeRes.body.data.materials.find((m: any) => m.productId === 'comp-touchscreen');
    expect(touchscreen).toBeDefined();
    expect(touchscreen.requiredQuantity).toBe('10.100'); // ۱٪ ضایعات مجاز

    const chassis = explodeRes.body.data.materials.find((m: any) => m.productId === 'comp-chassis');
    expect(chassis).toBeDefined();
    expect(chassis.requiredQuantity).toBe('10.200'); // ۲٪ ضایعات مجاز

    // ۲. استعلام بهای تمام‌شده استاندارد یک واحد محصول
    const stdCostRes = await request(app.getHttpServer())
      .get('/api/v1/manufacturing/boms/bom-smart-pos-v1/standard-cost')
      .set('Authorization', `Bearer ${jwtToken}`)
      .set('x-tenant-id', 'tenant-pishro')
      .set('x-company-id', 'comp-pishro-1')
      .expect(200);

    expect(stdCostRes.body.success).toBe(true);
    expect(Number(stdCostRes.body.data.unitStandardMaterialCost)).toBeGreaterThan(35000000);
    expect(Number(stdCostRes.body.data.unitStandardLaborCost)).toBe(2100000);
    expect(Number(stdCostRes.body.data.unitStandardOverheadCost)).toBe(1200000);
    expect(Number(stdCostRes.body.data.unitTotalStandardCost)).toBe(
      Number(stdCostRes.body.data.unitStandardMaterialCost) + 2100000 + 1200000
    );
  });

  it('Step 44 (Phase 7): Should create Production Order for 10 Smart POS and issue materials to WIP with double-entry voucher', async () => {
    // ۱. ایجاد و صدور سفارش تولید (Release Work Order)
    const orderRes = await request(app.getHttpServer())
      .post('/api/v1/manufacturing/orders')
      .set('Authorization', `Bearer ${jwtToken}`)
      .set('x-tenant-id', 'tenant-pishro')
      .set('x-company-id', 'comp-pishro-1')
      .send({
        productId: 'prod-smart-pos',
        bomId: 'bom-smart-pos-v1',
        rawMaterialWarehouseId: 'wh-main',
        finishedGoodsWarehouseId: 'wh-main',
        plannedQuantity: 10,
        dateShamsi: '1403/11/26',
        costingMethod: 'JOB_ORDER',
        notes: 'دستور کار ساخت سری اول کارتخوان‌های اندرویدی هوشمند پیشرو مدل X-900'
      })
      .expect(201);

    expect(orderRes.body.success).toBe(true);
    createdProductionOrderId = orderRes.body.data.id;
    expect(orderRes.body.data.status).toBe('RELEASED');
    expect(orderRes.body.data.materials.length).toBe(5);

    // ۲. صدور حواله خروج مواد اولیه به خط تولید و شارژ حساب در جریان ساخت (WIP - ۱۵۰۳)
    const issueRes = await request(app.getHttpServer())
      .post(`/api/v1/manufacturing/orders/${createdProductionOrderId}/issue-materials`)
      .set('Authorization', `Bearer ${jwtToken}`)
      .set('x-tenant-id', 'tenant-pishro')
      .set('x-company-id', 'comp-pishro-1')
      .send({
        dateShamsi: '1403/11/26'
      })
      .expect(201);

    expect(issueRes.body.success).toBe(true);
    expect(Number(issueRes.body.data.totalMaterialCost)).toBeGreaterThan(350000000);
    expect(issueRes.body.data.journalEntry).toBeDefined();

    // سند حسابداری خروج مواد باید دارای بدهکار ۱۵۰۳ و بستانکار ۱۵۰۲ باشد
    const jLines = issueRes.body.data.journalEntry.lines;
    const debitWip = jLines.find((l: any) => (l.subsidiaryAccountId || l.subsidiary_account_id) === 'sub-1503');
    const creditRaw = jLines.find((l: any) => (l.subsidiaryAccountId || l.subsidiary_account_id) === 'sub-1502');
    expect(debitWip).toBeDefined();
    expect(creditRaw).toBeDefined();
    expect(debitWip.debit).toBe(issueRes.body.data.totalMaterialCost);
    expect(creditRaw.credit).toBe(issueRes.body.data.totalMaterialCost);

    // بررسی کسر موجودی قطعات از کاردکس انبار مرکزی مواد
    const kardexRes = await request(app.getHttpServer())
      .get('/api/v1/inventory/kardex?warehouseId=wh-main&productId=comp-mainboard')
      .set('Authorization', `Bearer ${jwtToken}`)
      .set('x-tenant-id', 'tenant-pishro')
      .set('x-company-id', 'comp-pishro-1')
      .expect(200);

    const latest = kardexRes.body.data[kardexRes.body.data.length - 1];
    expect(latest.document_type).toBe('ISSUE');
    expect(latest.out_quantity).toBe('10');
    expect(latest.balance_quantity).toBe('490'); // موجودی اولیه ۵۰۰ منهای ۱۰ عدد مصرف خط
  });

  it('Step 45 (Phase 7): Should record operation work, direct labor and applied overhead with absorption voucher', async () => {
    // ثبت کارکرد ۵ ساعت مونتاژ و ۲.۵ ساعت تست و کنترل کیفیت
    const opRes = await request(app.getHttpServer())
      .post(`/api/v1/manufacturing/orders/${createdProductionOrderId}/record-operation`)
      .set('Authorization', `Bearer ${jwtToken}`)
      .set('x-tenant-id', 'tenant-pishro')
      .set('x-company-id', 'comp-pishro-1')
      .send({
        operations: [
          {
            workCenterId: 'wc-assembly',
            operationName: 'مونتاژ برد، ماژول‌ها و پرینتر حرارتی',
            actualLaborHours: 5,
            actualMachineHours: 5,
            recordedDateShamsi: '1403/11/26'
          },
          {
            workCenterId: 'wc-qc-packaging',
            operationName: 'تست سخت‌افزاری و بسته‌بندی نهایی',
            actualLaborHours: 2.5,
            actualMachineHours: 2.5,
            recordedDateShamsi: '1403/11/26'
          }
        ]
      })
      .expect(201);

    expect(opRes.body.success).toBe(true);
    // دستمزد: 5 * 2,500,000 + 2.5 * 2,000,000 = 12,500,000 + 5,000,000 = 17,500,000 ریال
    expect(opRes.body.data.laborCost).toBe('17500000');
    // سربار ساخت: 5 * 1,500,000 + 2.5 * 1,000,000 = 7,500,000 + 2,500,000 = 10,000,000 ریال
    expect(opRes.body.data.overheadCost).toBe('10000000');

    // سند حسابداری جذب: بدهکار در جریان ساخت ۱۵۰۳ / بستانکار ۷۱۰۲ و ۷۱۰۳
    const jLines = opRes.body.data.journalEntry.lines;
    const debitWip = jLines.find((l: any) => (l.subsidiaryAccountId || l.subsidiary_account_id) === 'sub-1503');
    const creditLabor = jLines.find((l: any) => (l.subsidiaryAccountId || l.subsidiary_account_id) === 'sub-7102');
    const creditOverhead = jLines.find((l: any) => (l.subsidiaryAccountId || l.subsidiary_account_id) === 'sub-7103');

    expect(debitWip.debit).toBe('27500000');
    expect(creditLabor.credit).toBe('17500000');
    expect(creditOverhead.credit).toBe('10000000');
  });

  it('Step 46 (Phase 7): Should record abnormal scrap and post abnormal loss journal entry', async () => {
    // ثبت ۱ عدد تاچ اسکرین شکسته شده غیرعادی حین تست ضربه (۸,۰۰۰,۰۰۰ ریال زیان دوره)
    const scrapRes = await request(app.getHttpServer())
      .post(`/api/v1/manufacturing/orders/${createdProductionOrderId}/record-scrap`)
      .set('Authorization', `Bearer ${jwtToken}`)
      .set('x-tenant-id', 'tenant-pishro')
      .set('x-company-id', 'comp-pishro-1')
      .send({
        productId: 'comp-touchscreen',
        scrapType: 'ABNORMAL',
        quantity: 1,
        estimatedCost: 8000000,
        reason: 'شکستگی نمایشگر در اثر خطای اپراتور حین پرس حرارتی',
        dateShamsi: '1403/11/26'
      })
      .expect(201);

    expect(scrapRes.body.success).toBe(true);
    expect(scrapRes.body.data.scrapType).toBe('ABNORMAL');
    expect(scrapRes.body.data.cost).toBe('8000000');
    expect(scrapRes.body.data.journalEntry).toBeDefined();

    // سند حسابداری ضایعات غیرعادی: بدهکار ۸۱۰۸ (هزینه ضایعات) / بستانکار ۱۵۰۳ (در جریان ساخت)
    const jLines = scrapRes.body.data.journalEntry.lines;
    const debitScrapExp = jLines.find((l: any) => (l.subsidiaryAccountId || l.subsidiary_account_id) === 'sub-8108');
    const creditWip = jLines.find((l: any) => (l.subsidiaryAccountId || l.subsidiary_account_id) === 'sub-1503');

    expect(debitScrapExp.debit).toBe('8000000');
    expect(creditWip.credit).toBe('8000000');
  });

  it('Step 47 (Phase 7): Should complete production, receive 10 Smart POS units to warehouse, and post completion voucher', async () => {
    const compRes = await request(app.getHttpServer())
      .post(`/api/v1/manufacturing/orders/${createdProductionOrderId}/complete`)
      .set('Authorization', `Bearer ${jwtToken}`)
      .set('x-tenant-id', 'tenant-pishro')
      .set('x-company-id', 'comp-pishro-1')
      .send({
        producedQuantity: 10,
        rejectedQuantity: 0,
        dateShamsi: '1403/11/27'
      })
      .expect(201);

    expect(compRes.body.success).toBe(true);
    expect(compRes.body.data.producedQuantity).toBe('10');
    expect(Number(compRes.body.data.unitCost)).toBeGreaterThan(35000000);
    expect(compRes.body.data.stockReceiptId).toBeDefined();

    // سند حسابداری رسید محصول نهایی: بدهکار ۱۵۰۴ (محصولات نهایی) / بستانکار ۱۵۰۳ (در جریان ساخت)
    const jLines = compRes.body.data.journalEntry.lines;
    const debitFinished = jLines.find((l: any) => (l.subsidiaryAccountId || l.subsidiary_account_id) === 'sub-1504');
    const creditWip = jLines.find((l: any) => (l.subsidiaryAccountId || l.subsidiary_account_id) === 'sub-1503');

    expect(debitFinished).toBeDefined();
    expect(creditWip).toBeDefined();
    expect(debitFinished.debit).toBe(compRes.body.data.totalCost);
    expect(creditWip.credit).toBe(compRes.body.data.totalCost);

    // بررسی کاردکس محصول نهایی در انبار مرکزی: موجودی دقیقا ۱۰ عدد ثبت شده است
    const kardexRes = await request(app.getHttpServer())
      .get('/api/v1/inventory/kardex?warehouseId=wh-main&productId=prod-smart-pos')
      .set('Authorization', `Bearer ${jwtToken}`)
      .set('x-tenant-id', 'tenant-pishro')
      .set('x-company-id', 'comp-pishro-1')
      .expect(200);

    expect(kardexRes.body.data.length).toBe(1);
    expect(kardexRes.body.data[0].document_type).toBe('RECEIPT');
    expect(kardexRes.body.data[0].in_quantity).toBe('10');
    expect(kardexRes.body.data[0].balance_quantity).toBe('10');
  });

  it('Step 48 (Phase 7): Should close order, analyze cost variances, and recognize variance voucher', async () => {
    const closeRes = await request(app.getHttpServer())
      .post(`/api/v1/manufacturing/orders/${createdProductionOrderId}/close-variances`)
      .set('Authorization', `Bearer ${jwtToken}`)
      .set('x-tenant-id', 'tenant-pishro')
      .set('x-company-id', 'comp-pishro-1')
      .send({
        dateShamsi: '1403/11/27'
      })
      .expect(201);

    expect(closeRes.body.success).toBe(true);
    expect(closeRes.body.data.status).toBe('CLOSED');
    expect(closeRes.body.data.varianceAnalysis).toBeDefined();
    expect(closeRes.body.data.varianceAnalysis.netVarianceType).toBeDefined();

    // استعلام نهایی وضعیت سفارش ساخت
    const getOrderRes = await request(app.getHttpServer())
      .get(`/api/v1/manufacturing/orders/${createdProductionOrderId}`)
      .set('Authorization', `Bearer ${jwtToken}`)
      .set('x-tenant-id', 'tenant-pishro')
      .set('x-company-id', 'comp-pishro-1')
      .expect(200);

    expect(getOrderRes.body.data.status).toBe('CLOSED');
    expect(getOrderRes.body.data.produced_quantity).toBe('10');
    expect(getOrderRes.body.data.completion_journal_entry_id).toBeDefined();
  });

  // ==========================================
  // آزمون‌های فاز ۸: حقوق و دستمزد، دارایی‌های ثابت، مالیات و گزارش‌های قانونی
  // ==========================================

  it('Step 49 (Phase 8): Should register new employee and create labor contract', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/payroll/employees')
      .set('Authorization', `Bearer ${jwtToken}`)
      .set('x-tenant-id', 'tenant-pishro')
      .set('x-company-id', 'comp-pishro-1')
      .send({
        personnelCode: 'EMP-103',
        nationalId: '0019876543',
        firstName: 'آرش',
        lastName: 'افشار',
        hireDateShamsi: '1403/01/01',
        insuranceNumber: '88776655',
        bankName: 'بانک ملت',
        bankShebaNumber: 'IR120120000000001234567890',
        department: 'فنی و مهندسی',
        jobTitle: 'مهندس ارشد نرم‌افزار',
        contract: {
          contractType: 'PERMANENT',
          startDateShamsi: '1403/01/01',
          monthlyBaseSalary: 150000000,
          monthlyHousingAllowance: 9000000,
          monthlyGroceryAllowance: 14000000,
          monthlySeniorityBonus: 2100000,
          childCount: 1,
          monthlyChildAllowancePerChild: 7166184
        }
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.personnel_code).toBe('EMP-103');
    expect(res.body.data.activeContract).toBeDefined();
    createdEmployeeId = res.body.data.id;
  });

  it('Step 50 (Phase 8): Should create monthly payroll period and calculate salary slips', async () => {
    // ۱. ایجاد دوره حقوق بهمن ۱۴۰۳
    const periodRes = await request(app.getHttpServer())
      .post('/api/v1/payroll/periods')
      .set('Authorization', `Bearer ${jwtToken}`)
      .set('x-tenant-id', 'tenant-pishro')
      .set('x-company-id', 'comp-pishro-1')
      .set('x-branch-id', 'branch-central-1')
      .send({
        title: 'حقوق و دستمزد بهمن ماه ۱۴۰۳',
        yearShamsi: '1403',
        monthNumber: 11,
        startDateShamsi: '1403/11/01',
        endDateShamsi: '1403/11/30'
      })
      .expect(201);

    expect(periodRes.body.success).toBe(true);
    createdPeriodId = periodRes.body.data.id;

    // ۲. محاسبه فیش حقوقی برای پرسنل با کارکرد و اضافه‌کار و مساعده
    const calcRes = await request(app.getHttpServer())
      .post(`/api/v1/payroll/periods/${createdPeriodId}/calculate`)
      .set('Authorization', `Bearer ${jwtToken}`)
      .set('x-tenant-id', 'tenant-pishro')
      .set('x-company-id', 'comp-pishro-1')
      .send({
        timecards: [
          {
            employeeId: 'emp-01',
            workedDays: 30,
            overtimeHours: 20
          },
          {
            employeeId: 'emp-02',
            workedDays: 30,
            overtimeHours: 10
          },
          {
            employeeId: createdEmployeeId,
            workedDays: 30,
            overtimeHours: 15,
            advanceDeduction: 10000000
          }
        ]
      })
      .expect(201);

    expect(calcRes.body.success).toBe(true);
    expect(calcRes.body.data.slips.length).toBeGreaterThanOrEqual(3);
    expect(Number(calcRes.body.data.total_gross_pay)).toBeGreaterThan(300000000);
    expect(Number(calcRes.body.data.total_net_pay)).toBeGreaterThan(250000000);
  });

  it('Step 51 (Phase 8): Should approve payroll period and post monthly payroll journal entry', async () => {
    const approveRes = await request(app.getHttpServer())
      .post(`/api/v1/payroll/periods/${createdPeriodId}/approve`)
      .set('Authorization', `Bearer ${jwtToken}`)
      .set('x-tenant-id', 'tenant-pishro')
      .set('x-company-id', 'comp-pishro-1')
      .set('x-branch-id', 'branch-central-1')
      .set('x-fiscal-year-id', 'fy-1403')
      .send({
        dateShamsi: '1403/11/30',
        costCenterDimensionId: 'dim-cc-1'
      })
      .expect(201);

    expect(approveRes.body.success).toBe(true);
    expect(approveRes.body.data.status).toBe('APPROVED');
    expect(approveRes.body.data.journalEntry).toBeDefined();

    const jLines = approveRes.body.data.journalEntry.lines;
    const debitSalaryExp = jLines.find((l: any) => (l.subsidiaryAccountId || l.subsidiary_account_id) === 'sub-8101');
    const debitEmployerIns = jLines.find((l: any) => (l.subsidiaryAccountId || l.subsidiary_account_id) === 'sub-8102');
    const creditInsPayable = jLines.find((l: any) => (l.subsidiaryAccountId || l.subsidiary_account_id) === 'sub-3304');
    const creditTaxPayable = jLines.find((l: any) => (l.subsidiaryAccountId || l.subsidiary_account_id) === 'sub-3305');
    const creditStaffPayable = jLines.find((l: any) => (l.subsidiaryAccountId || l.subsidiary_account_id) === 'sub-3303');

    expect(debitSalaryExp).toBeDefined();
    expect(debitEmployerIns).toBeDefined();
    expect(creditInsPayable).toBeDefined();
    expect(creditTaxPayable).toBeDefined();
    expect(creditStaffPayable).toBeDefined();
  });

  it('Step 52 (Phase 8): Should pay salaries via bank Paya batch and generate Social Security DSKWOR diskette', async () => {
    const payRes = await request(app.getHttpServer())
      .post(`/api/v1/payroll/periods/${createdPeriodId}/pay`)
      .set('Authorization', `Bearer ${jwtToken}`)
      .set('x-tenant-id', 'tenant-pishro')
      .set('x-company-id', 'comp-pishro-1')
      .set('x-branch-id', 'branch-central-1')
      .set('x-fiscal-year-id', 'fy-1403')
      .send({
        dateShamsi: '1403/11/30',
        bankFloatingDimensionId: 'dim-bank-1'
      })
      .expect(201);

    expect(payRes.body.success).toBe(true);
    expect(payRes.body.data.status).toBe('PAID');
    expect(payRes.body.data.paymentBatch).toBeDefined();
    expect(payRes.body.data.paymentBatch.totalRecords).toBeGreaterThanOrEqual(3);
    expect(payRes.body.data.journalEntry).toBeDefined();

    const jLines = payRes.body.data.journalEntry.lines;
    const debitStaff = jLines.find((l: any) => (l.subsidiaryAccountId || l.subsidiary_account_id) === 'sub-3303');
    const creditBank = jLines.find((l: any) => (l.subsidiaryAccountId || l.subsidiary_account_id) === 'sub-1102');
    expect(debitStaff).toBeDefined();
    expect(creditBank).toBeDefined();

    // تولید دیسکت تامین اجتماعی DSKWOR
    const taminRes = await request(app.getHttpServer())
      .get(`/api/v1/payroll/periods/${createdPeriodId}/tamin-diskette`)
      .set('Authorization', `Bearer ${jwtToken}`)
      .set('x-tenant-id', 'tenant-pishro')
      .set('x-company-id', 'comp-pishro-1')
      .expect(200);

    expect(taminRes.body.success).toBe(true);
    expect(taminRes.body.data.workersCount).toBeGreaterThanOrEqual(3);
    expect(taminRes.body.data.dskworContent).toContain('0019876543');
  });

  it('Step 53 (Phase 8): Should acquire fixed asset and post acquisition journal entry', async () => {
    const assetRes = await request(app.getHttpServer())
      .post('/api/v1/fixed-assets')
      .set('Authorization', `Bearer ${jwtToken}`)
      .set('x-tenant-id', 'tenant-pishro')
      .set('x-company-id', 'comp-pishro-1')
      .set('x-branch-id', 'branch-central-1')
      .set('x-fiscal-year-id', 'fy-1403')
      .send({
        assetCode: 'AST-LPT-05',
        title: 'لپ‌تاپ مهندسی لنوو ThinkPad P1',
        category: 'COMPUTERS_AND_IT',
        purchaseDateShamsi: '1403/11/01',
        historicalCost: 120000000,
        salvageValue: 5000000,
        depreciationMethod: 'STRAIGHT_LINE',
        usefulLifeYears: 3,
        location: 'دفتر مرکزی - واحد فنی',
        costCenterDimensionId: 'dim-cc-1',
        creditSubsidiaryId: 'sub-1102',
        creditFloatingDimensionId: 'dim-bank-1'
      })
      .expect(201);

    expect(assetRes.body.success).toBe(true);
    expect(assetRes.body.data.asset.id).toBeDefined();
    expect(assetRes.body.data.asset.asset_code).toBe('AST-LPT-05');
    expect(assetRes.body.data.journalEntry).toBeDefined();
    createdAssetId = assetRes.body.data.asset.id;

    const jLines = assetRes.body.data.journalEntry.lines;
    const debitAsset = jLines.find((l: any) => (l.subsidiaryAccountId || l.subsidiary_account_id) === 'sub-2101');
    const creditBank = jLines.find((l: any) => (l.subsidiaryAccountId || l.subsidiary_account_id) === 'sub-1102');
    expect(debitAsset).toBeDefined();
    expect(creditBank).toBeDefined();
    expect(debitAsset.debit).toBe('120000000');
    expect(creditBank.credit).toBe('120000000');
  });

  it('Step 54 (Phase 8): Should calculate monthly asset depreciation and post accumulated depreciation entry', async () => {
    const depRes = await request(app.getHttpServer())
      .post('/api/v1/fixed-assets/depreciation/calculate')
      .set('Authorization', `Bearer ${jwtToken}`)
      .set('x-tenant-id', 'tenant-pishro')
      .set('x-company-id', 'comp-pishro-1')
      .set('x-branch-id', 'branch-central-1')
      .set('x-fiscal-year-id', 'fy-1403')
      .send({
        periodTitle: 'استهلاک بهمن ماه ۱۴۰۳',
        periodDateShamsi: '1403/11/30',
        monthsCount: 1,
        assetIds: [createdAssetId],
        costCenterDimensionId: 'dim-cc-1'
      })
      .expect(201);

    expect(depRes.body.success).toBe(true);
    expect(depRes.body.data.depreciatedCount).toBe(1);
    expect(depRes.body.data.totalDepreciationAmount).toBe('3194444');
    expect(depRes.body.data.journalEntry).toBeDefined();

    const jLines = depRes.body.data.journalEntry.lines;
    const debitDepExp = jLines.find((l: any) => (l.subsidiaryAccountId || l.subsidiary_account_id) === 'sub-8104');
    const creditAccDep = jLines.find((l: any) => (l.subsidiaryAccountId || l.subsidiary_account_id) === 'sub-2201');
    expect(debitDepExp).toBeDefined();
    expect(creditAccDep).toBeDefined();
    expect(debitDepExp.debit).toBe('3194444');
    expect(creditAccDep.credit).toBe('3194444');
  });

  it('Step 55 (Phase 8): Should dispose fixed asset and post disposal gain/loss voucher', async () => {
    const dispRes = await request(app.getHttpServer())
      .post(`/api/v1/fixed-assets/${createdAssetId}/dispose`)
      .set('Authorization', `Bearer ${jwtToken}`)
      .set('x-tenant-id', 'tenant-pishro')
      .set('x-company-id', 'comp-pishro-1')
      .set('x-branch-id', 'branch-central-1')
      .set('x-fiscal-year-id', 'fy-1403')
      .send({
        disposalDateShamsi: '1403/11/30',
        salePrice: 125000000,
        paymentReceivableSubsidiaryId: 'sub-1102',
        paymentFloatingDimensionId: 'dim-bank-1',
        costCenterDimensionId: 'dim-cc-1'
      })
      .expect(201);

    expect(dispRes.body.success).toBe(true);
    expect(dispRes.body.data.disposalResult.isGain).toBe(true);
    expect(dispRes.body.data.disposalResult.gainOrLossAmount).toBe('8194444');
    expect(dispRes.body.data.journalEntry).toBeDefined();

    const jLines = dispRes.body.data.journalEntry.lines;
    const debitBank = jLines.find((l: any) => (l.subsidiaryAccountId || l.subsidiary_account_id) === 'sub-1102');
    const debitAccDep = jLines.find((l: any) => (l.subsidiaryAccountId || l.subsidiary_account_id) === 'sub-2201');
    const creditAsset = jLines.find((l: any) => (l.subsidiaryAccountId || l.subsidiary_account_id) === 'sub-2101');
    const creditGain = jLines.find((l: any) => (l.subsidiaryAccountId || l.subsidiary_account_id) === 'sub-6106');

    expect(debitBank).toBeDefined();
    expect(debitAccDep).toBeDefined();
    expect(creditAsset).toBeDefined();
    expect(creditGain).toBeDefined();
  });

  it('Step 56 (Phase 8): Should extract quarterly VAT return and post settlement/offsetting voucher', async () => {
    const vatRes = await request(app.getHttpServer())
      .get('/api/v1/tax/vat-return?yearShamsi=1403&quarter=WINTER')
      .set('Authorization', `Bearer ${jwtToken}`)
      .set('x-tenant-id', 'tenant-pishro')
      .set('x-company-id', 'comp-pishro-1')
      .expect(200);

    expect(vatRes.body.success).toBe(true);
    expect(vatRes.body.data.yearShamsi).toBe('1403');
    expect(vatRes.body.data.quarter).toBe('WINTER');
    expect(Number(vatRes.body.data.outputVatCollected)).toBeGreaterThan(0);

    const settleRes = await request(app.getHttpServer())
      .post('/api/v1/tax/vat-return/settle')
      .set('Authorization', `Bearer ${jwtToken}`)
      .set('x-tenant-id', 'tenant-pishro')
      .set('x-company-id', 'comp-pishro-1')
      .set('x-branch-id', 'branch-central-1')
      .set('x-fiscal-year-id', 'fy-1403')
      .send({
        yearShamsi: '1403',
        quarter: 'WINTER',
        dateShamsi: '1403/12/29',
        bankFloatingDimensionId: 'dim-bank-1'
      })
      .expect(201);

    expect(settleRes.body.success).toBe(true);
    expect(settleRes.body.data.reportId).toBe('vat-1403-WINTER');
    expect(settleRes.body.data.journalEntry).toBeDefined();

    const jLines = settleRes.body.data.journalEntry.lines;
    const debitVatOut = jLines.find((l: any) => (l.subsidiaryAccountId || l.subsidiary_account_id) === 'sub-3306');
    expect(debitVatOut).toBeDefined();
  });

  it('Step 57 (Phase 8): Should generate seasonal Article 169 (TTMS) report and export CSV', async () => {
    const r169Res = await request(app.getHttpServer())
      .get('/api/v1/tax/article-169?yearShamsi=1403&quarter=WINTER')
      .set('Authorization', `Bearer ${jwtToken}`)
      .set('x-tenant-id', 'tenant-pishro')
      .set('x-company-id', 'comp-pishro-1')
      .expect(200);

    expect(r169Res.body.success).toBe(true);
    expect(r169Res.body.data.yearShamsi).toBe('1403');
    expect(r169Res.body.data.salesCount).toBeGreaterThan(0);
    expect(r169Res.body.data.csvContent).toBeDefined();
    expect(r169Res.body.data.csvContent).toContain('نوع معامله,نام طرف معامله');
  });

  it('Step 58 (Phase 8): Should estimate corporate income tax (Article 105 - 25%) and post tax provision voucher', async () => {
    const corpRes = await request(app.getHttpServer())
      .post('/api/v1/tax/corporate-tax/provision')
      .set('Authorization', `Bearer ${jwtToken}`)
      .set('x-tenant-id', 'tenant-pishro')
      .set('x-company-id', 'comp-pishro-1')
      .set('x-branch-id', 'branch-central-1')
      .set('x-fiscal-year-id', 'fy-1403')
      .send({
        yearShamsi: '1403',
        dateShamsi: '1403/12/29',
        taxExemptions: 0,
        costCenterDimensionId: 'dim-cc-1'
      })
      .expect(201);

    expect(corpRes.body.success).toBe(true);
    expect(corpRes.body.data.reportId).toBe('tax-corp-1403');
    expect(corpRes.body.data.estimation).toBeDefined();
    expect(corpRes.body.data.estimation.taxRate).toBe('0.25');

    if (new Decimal(corpRes.body.data.estimation.estimatedTaxProvision).greaterThan(0)) {
      expect(corpRes.body.data.journalEntry).toBeDefined();
      const jLines = corpRes.body.data.journalEntry.lines;
      const debitTaxExp = jLines.find((l: any) => (l.subsidiaryAccountId || l.subsidiary_account_id) === 'sub-8109');
      const creditTaxProv = jLines.find((l: any) => (l.subsidiaryAccountId || l.subsidiary_account_id) === 'sub-3307');
      expect(debitTaxExp).toBeDefined();
      expect(creditTaxProv).toBeDefined();
      expect(debitTaxExp.debit).toBe(corpRes.body.data.estimation.estimatedTaxProvision);
      expect(creditTaxProv.credit).toBe(corpRes.body.data.estimation.estimatedTaxProvision);
    }
  });

  // ==========================================
  // آزمون‌های فاز ۹: صورت‌های مالی اساسی، نسبت‌های مالی و داشبورد مدیریتی (BI)
  // ==========================================

  it('Step 59 (Phase 9): Should generate multi-step Income Statement (P&L) with revenues, COGS and net income', async () => {
    const isRes = await request(app.getHttpServer())
      .get('/api/v1/financial-reports/income-statement?fromDate=1403/01/01&toDate=1403/12/29')
      .set('Authorization', `Bearer ${jwtToken}`)
      .set('x-tenant-id', 'tenant-pishro')
      .set('x-company-id', 'comp-pishro-1')
      .expect(200);

    expect(isRes.body.success).toBe(true);
    const isData = isRes.body.data;

    expect(Number(isData.grossRevenues)).toBeGreaterThan(0);
    expect(Number(isData.netRevenues)).toBeGreaterThan(0);
    expect(isData.costOfGoodsAndServicesSold).toBeDefined();
    expect(isData.grossProfit).toBeDefined();
    expect(isData.administrativeExpenses).toBeDefined();
    expect(isData.operatingProfit).toBeDefined();
    expect(isData.profitBeforeTax).toBeDefined();
    expect(isData.netIncome).toBeDefined();
    expect(typeof isData.isProfitable).toBe('boolean');
  });

  it('Step 60 (Phase 9): Should generate Balance Sheet conforming to Iranian Standard No. 1 with Assets = Liabilities + Equity', async () => {
    const bsRes = await request(app.getHttpServer())
      .get('/api/v1/financial-reports/balance-sheet?asOfDate=1403/12/29')
      .set('Authorization', `Bearer ${jwtToken}`)
      .set('x-tenant-id', 'tenant-pishro')
      .set('x-company-id', 'comp-pishro-1')
      .expect(200);

    expect(bsRes.body.success).toBe(true);
    const bsData = bsRes.body.data;

    // دارایی‌های جاری و غیرجاری
    expect(bsData.currentAssets).toBeDefined();
    expect(Number(bsData.currentAssets.subtotal)).toBeGreaterThan(0);
    expect(bsData.nonCurrentAssets).toBeDefined();
    expect(Number(bsData.totalAssets)).toBeGreaterThan(0);

    // بدهی‌ها و حقوق مالکانه
    expect(bsData.currentLiabilities).toBeDefined();
    expect(bsData.totalLiabilities).toBeDefined();
    expect(bsData.equity).toBeDefined();
    expect(bsData.totalEquity).toBeDefined();
    expect(bsData.totalLiabilitiesAndEquity).toBeDefined();

    // تراز بودن ترازنامه
    expect(bsData.isBalanced).toBe(true);
    expect(bsData.discrepancyAmount).toBe('0');
  });

  it('Step 61 (Phase 9): Should generate Cash Flow Statement conforming to Standard No. 2 with Operating, Investing and Financing', async () => {
    const cfRes = await request(app.getHttpServer())
      .get('/api/v1/financial-reports/cash-flow?fromDate=1403/01/01&toDate=1403/12/29')
      .set('Authorization', `Bearer ${jwtToken}`)
      .set('x-tenant-id', 'tenant-pishro')
      .set('x-company-id', 'comp-pishro-1')
      .expect(200);

    expect(cfRes.body.success).toBe(true);
    const cfData = cfRes.body.data;

    expect(cfData.operatingActivities).toBeDefined();
    expect(cfData.operatingActivities.netCashFromOperatingActivities).toBeDefined();
    expect(cfData.investingActivities).toBeDefined();
    expect(cfData.investingActivities.netCashFromInvestingActivities).toBeDefined();
    expect(cfData.financingActivities).toBeDefined();
    expect(cfData.financingActivities.netCashFromFinancingActivities).toBeDefined();
    expect(cfData.netChangeInCash).toBeDefined();
    expect(Number(cfData.endingCashBalance)).toBeGreaterThan(0);
  });

  it('Step 62 (Phase 9): Should calculate comprehensive Financial Ratios (Liquidity, Profitability, Activity, Leverage)', async () => {
    const ratioRes = await request(app.getHttpServer())
      .get('/api/v1/financial-reports/ratios?asOfDate=1403/12/29')
      .set('Authorization', `Bearer ${jwtToken}`)
      .set('x-tenant-id', 'tenant-pishro')
      .set('x-company-id', 'comp-pishro-1')
      .expect(200);

    expect(ratioRes.body.success).toBe(true);
    const rData = ratioRes.body.data;

    // نسبت‌های نقدینگی
    expect(rData.liquidity).toBeDefined();
    expect(Number(rData.liquidity.currentRatio)).toBeGreaterThan(0);
    expect(Number(rData.liquidity.quickRatio)).toBeGreaterThan(0);
    expect(Number(rData.liquidity.cashRatio)).toBeGreaterThan(0);

    // نسبت‌های سودآوری
    expect(rData.profitability).toBeDefined();
    expect(rData.profitability.grossProfitMarginPercentage).toBeDefined();
    expect(rData.profitability.netProfitMarginPercentage).toBeDefined();

    // نسبت‌های فعالیت و اهرمی
    expect(rData.activity).toBeDefined();
    expect(rData.leverage).toBeDefined();
    expect(rData.leverage.debtRatioPercentage).toBeDefined();
    expect(rData.financialHealthGrade).toBeDefined();
    expect(rData.observations.length).toBeGreaterThan(0);
  });

  it('Step 63 (Phase 9): Should generate Executive Dashboard with daily cash, trend, aging, top products and alerts', async () => {
    const dashRes = await request(app.getHttpServer())
      .get('/api/v1/dashboard/executive?asOfDate=1403/12/29')
      .set('Authorization', `Bearer ${jwtToken}`)
      .set('x-tenant-id', 'tenant-pishro')
      .set('x-company-id', 'comp-pishro-1')
      .expect(200);

    expect(dashRes.body.success).toBe(true);
    const dData = dashRes.body.data;

    expect(Number(dData.todayCashBalance)).toBeGreaterThan(0);
    expect(Number(dData.monthlySalesRevenue)).toBeGreaterThan(0);
    expect(dData.receivablesAging).toBeDefined();
    expect(dData.receivablesAging.current0To30Days).toBeDefined();
    expect(dData.cashTrendLast30Days.length).toBeGreaterThan(0);
    expect(dData.activeAlerts).toBeDefined();
  });

  it('Step 64 (Phase 9): Should retrieve and update customizable user Dashboard Widgets', async () => {
    // ۱. استعلام ویجت‌های داشبورد کاربر
    const getWdgRes = await request(app.getHttpServer())
      .get('/api/v1/dashboard/widgets')
      .set('Authorization', `Bearer ${jwtToken}`)
      .set('x-tenant-id', 'tenant-pishro')
      .set('x-company-id', 'comp-pishro-1')
      .expect(200);

    expect(getWdgRes.body.success).toBe(true);
    expect(getWdgRes.body.data.length).toBeGreaterThanOrEqual(3);

    const firstWidget = getWdgRes.body.data[0];

    // ۲. به‌روزرسانی چیدمان ویجت‌ها
    const putWdgRes = await request(app.getHttpServer())
      .put('/api/v1/dashboard/widgets/layout')
      .set('Authorization', `Bearer ${jwtToken}`)
      .set('x-tenant-id', 'tenant-pishro')
      .set('x-company-id', 'comp-pishro-1')
      .send({
        widgets: [
          {
            id: firstWidget.id,
            positionX: 4,
            positionY: 4,
            width: 8,
            height: 3
          }
        ]
      })
      .expect(200);

    expect(putWdgRes.body.success).toBe(true);
    const updated = putWdgRes.body.data.find((w: any) => w.id === firstWidget.id);
    expect(updated.position_x).toBe(4);
    expect(updated.position_y).toBe(4);
  });

  // ==========================================
  // آزمون‌های فاز ۱۰: فروش آنلاین و چندکاناله، رابط سخت‌افزاری، ویزیتور و تردد
  // ==========================================

  let onlineOrderId: string;
  let onlinePaymentTxId: string;
  let onlinePaymentToken: string;

  it('Step 65 (Phase 10): Should create an Online Order with items, shipping fee, and calculate pricing with VAT', async () => {
    const orderRes = await request(app.getHttpServer())
      .post('/api/v1/omnichannel/e-commerce/orders')
      .set('Authorization', `Bearer ${jwtToken}`)
      .set('x-tenant-id', 'tenant-pishro')
      .set('x-company-id', 'comp-pishro-1')
      .set('x-branch-id', 'branch-central-1')
      .send({
        customerPartyId: 'party-cust-1',
        customerName: 'فروشگاه پارسیان آنلاین',
        customerMobile: '09123456789',
        shippingAddress: 'تهران، خیابان ولیعصر، پلاک ۱۲۳، واحد ۴',
        items: [
          {
            productId: 'prod-smart-pos',
            quantity: 1,
            unitPrice: '10000000',
            discountAmount: '500000'
          }
        ],
        shippingFee: '1000000',
        couponDiscount: '0'
      })
      .expect(201);

    expect(orderRes.body.success).toBe(true);
    const ord = orderRes.body.data;
    onlineOrderId = ord.id;

    expect(ord.order_number).toBeDefined();
    expect(ord.status).toBe('PENDING');
    expect(ord.payment_status).toBe('UNPAID');
    // مبلغ کالا: 10,000,000 | تخفیف: 500,000 | خالص: 9,500,000 | مالیات ۱۰٪: 950,000 | حمل: 1,000,000 | جمع کل: 11,450,000
    expect(ord.total_goods_amount).toBe('10000000');
    expect(ord.discount_amount).toBe('500000');
    expect(ord.vat_amount).toBe('950000');
    expect(ord.shipping_fee).toBe('1000000');
    expect(ord.grand_total).toBe('11450000');
    expect(ord.items.length).toBe(1);
  });

  it('Step 66 (Phase 10): Should initiate IPG payment, verify transaction, issue sales document & post balanced journal voucher', async () => {
    // ۱. ایجاد توکن پرداخت شاپرک
    const initRes = await request(app.getHttpServer())
      .post(`/api/v1/omnichannel/e-commerce/orders/${onlineOrderId}/payment/initiate`)
      .set('Authorization', `Bearer ${jwtToken}`)
      .set('x-tenant-id', 'tenant-pishro')
      .set('x-company-id', 'comp-pishro-1')
      .send({ gatewayType: 'SAMAN' })
      .expect(201);

    expect(initRes.body.success).toBe(true);
    expect(initRes.body.data.token).toBeDefined();
    expect(initRes.body.data.redirectUrl).toContain('shaparak.ir');
    onlinePaymentTxId = initRes.body.data.transactionId;
    onlinePaymentToken = initRes.body.data.token;

    // ۲. وریفای پرداخت و صدور اسناد فروش و حسابداری
    const verifyRes = await request(app.getHttpServer())
      .post('/api/v1/omnichannel/e-commerce/payment/verify')
      .set('Authorization', `Bearer ${jwtToken}`)
      .set('x-tenant-id', 'tenant-pishro')
      .set('x-company-id', 'comp-pishro-1')
      .set('x-branch-id', 'branch-central-1')
      .set('x-fiscal-year-id', 'fy-1403')
      .send({
        transactionId: onlinePaymentTxId,
        token: onlinePaymentToken,
        rrn: '748291038472',
        cardPanMasked: '603799******1234',
        gatewayFee: '40000',
        costCenterDimensionId: 'dim-cc-1',
        warehouseDimensionId: 'wh-central'
      })
      .expect(201);

    expect(verifyRes.body.success).toBe(true);
    expect(verifyRes.body.data.rrn).toBe('748291038472');
    expect(verifyRes.body.data.journalEntry).toBeDefined();
    expect(verifyRes.body.data.journalEntry.status).toBe('APPROVED');
    expect(verifyRes.body.data.journalEntry.totalDebit).toBe(verifyRes.body.data.journalEntry.totalCredit);

    // ۳. تسویه وجوه در راه شاپرک به حساب بانکی شرکت
    const settleRes = await request(app.getHttpServer())
      .post('/api/v1/omnichannel/e-commerce/payment/settle-to-bank')
      .set('Authorization', `Bearer ${jwtToken}`)
      .set('x-tenant-id', 'tenant-pishro')
      .set('x-company-id', 'comp-pishro-1')
      .set('x-branch-id', 'branch-central-1')
      .set('x-fiscal-year-id', 'fy-1403')
      .send({
        orderNumber: verifyRes.body.data.orderNumber,
        settledAmount: '11450000',
        gatewayFee: '40000',
        bankDimensionId: 'dim-bank-1',
        costCenterDimensionId: 'dim-cc-1'
      })
      .expect(201);

    expect(settleRes.body.success).toBe(true);
    expect(settleRes.body.data.journalEntry).toBeDefined();
    expect(settleRes.body.data.journalEntry.status).toBe('APPROVED');
    expect(settleRes.body.data.journalEntry.totalDebit).toBe('11450000');
  });

  it('Step 67 (Phase 10): Should assign courier (SnappBox/Alopeyk) and sync catalog with external e-commerce (WooCommerce)', async () => {
    // تخصیص پیک اسنپ‌باکس
    const courierRes = await request(app.getHttpServer())
      .post(`/api/v1/omnichannel/e-commerce/orders/${onlineOrderId}/assign-courier`)
      .set('Authorization', `Bearer ${jwtToken}`)
      .set('x-tenant-id', 'tenant-pishro')
      .set('x-company-id', 'comp-pishro-1')
      .send({
        courierProvider: 'SNAPP_BOX',
        trackingCode: 'SNP-784910'
      })
      .expect(201);

    expect(courierRes.body.success).toBe(true);
    expect(courierRes.body.data.status).toBe('SHIPPED');
    expect(courierRes.body.data.trackingCode).toBe('SNP-784910');

    // همگام‌سازی موجودی و قیمت با ووکامرس
    const syncRes = await request(app.getHttpServer())
      .get('/api/v1/omnichannel/e-commerce/sync-catalog?platform=WOOCOMMERCE')
      .set('Authorization', `Bearer ${jwtToken}`)
      .set('x-tenant-id', 'tenant-pishro')
      .set('x-company-id', 'comp-pishro-1')
      .expect(200);

    expect(syncRes.body.success).toBe(true);
    expect(syncRes.body.data.platform).toBe('WOOCOMMERCE');
    expect(syncRes.body.data.items).toBeDefined();
    expect(syncRes.body.data.items.length).toBeGreaterThan(0);
  });

  it('Step 68 (Phase 10): Should generate ESC/POS thermal receipt binary commands with barcode and cash drawer pulse', async () => {
    const escRes = await request(app.getHttpServer())
      .get(`/api/v1/omnichannel/hardware/receipt-escpos/${onlineOrderId}`)
      .set('Authorization', `Bearer ${jwtToken}`)
      .set('x-tenant-id', 'tenant-pishro')
      .set('x-company-id', 'comp-pishro-1')
      .expect(200);

    expect(escRes.body.success).toBe(true);
    expect(escRes.body.data.bufferLengthBytes).toBeGreaterThan(50);
    expect(escRes.body.data.hexCommands).toBeDefined();
    // شروع بافر با ESC @ (1b40)
    expect(escRes.body.data.hexCommands.startsWith('1b40')).toBe(true);
    expect(escRes.body.data.base64Commands).toBeDefined();
  });

  it('Step 69 (Phase 10): Should list hardware terminals, send PC-POS payment request, and read digital scale weight', async () => {
    // لیست تجهیزات سخت‌افزاری
    const termRes = await request(app.getHttpServer())
      .get('/api/v1/omnichannel/hardware/terminals')
      .set('Authorization', `Bearer ${jwtToken}`)
      .set('x-tenant-id', 'tenant-pishro')
      .set('x-company-id', 'comp-pishro-1')
      .expect(200);

    expect(termRes.body.success).toBe(true);
    expect(termRes.body.data.length).toBeGreaterThanOrEqual(4);
    const pcposTerm = termRes.body.data.find((t: any) => t.device_type === 'PC_POS');
    expect(pcposTerm).toBeDefined();

    // ارسال تراکنش به کارتخوان PC-POS
    const pcposRes = await request(app.getHttpServer())
      .post('/api/v1/omnichannel/hardware/pcpos/sale')
      .set('Authorization', `Bearer ${jwtToken}`)
      .set('x-tenant-id', 'tenant-pishro')
      .set('x-company-id', 'comp-pishro-1')
      .send({
        terminalId: pcposTerm.id,
        amount: '15000000',
        orderId: 'ORD-1403-9901'
      })
      .expect(201);

    expect(pcposRes.body.success).toBe(true);
    expect(pcposRes.body.data.response.isSuccess).toBe(true);
    expect(pcposRes.body.data.response.rrn).toBeDefined();
    expect(pcposRes.body.data.response.cardPanMasked).toBeDefined();

    // خواندن وزن لحظه‌ای ترازوی دیجیتال
    const scaleRes = await request(app.getHttpServer())
      .post('/api/v1/omnichannel/hardware/scale/read')
      .set('Authorization', `Bearer ${jwtToken}`)
      .send({
        terminalId: 'term-scale-1',
        rawStream: 'ST,GS,+003.500KG'
      })
      .expect(201);

    expect(scaleRes.body.success).toBe(true);
    expect(scaleRes.body.data.isStable).toBe(true);
    expect(scaleRes.body.data.netWeightGrams).toBe(3500);
  });

  it('Step 70 (Phase 10): Should check customer credit limit, record visitor visit with GPS geofencing, and process attendance logs', async () => {
    // ۱. استعلام سقف اعتبار مشتری برای اپلیکیشن ویزیتور (تایید مشتری با اعتبار آزاد)
    const creditRes = await request(app.getHttpServer())
      .get('/api/v1/omnichannel/visitor/customer-credit?partyId=party-cust-2&amount=5000000')
      .set('Authorization', `Bearer ${jwtToken}`)
      .set('x-tenant-id', 'tenant-pishro')
      .set('x-company-id', 'comp-pishro-1')
      .expect(200);

    expect(creditRes.body.success).toBe(true);
    expect(creditRes.body.data.partyId).toBe('party-cust-2');
    expect(creditRes.body.data.isCreditApproved).toBe(true);

    // بررسی رد اعتبار برای مشتری با بدهی بیش از سقف مجاز
    const rejectedCreditRes = await request(app.getHttpServer())
      .get('/api/v1/omnichannel/visitor/customer-credit?partyId=party-cust-1&amount=5000000')
      .set('Authorization', `Bearer ${jwtToken}`)
      .set('x-tenant-id', 'tenant-pishro')
      .set('x-company-id', 'comp-pishro-1')
      .expect(200);

    expect(rejectedCreditRes.body.data.isCreditApproved).toBe(false);
    expect(rejectedCreditRes.body.data.rejectionReason).toContain('سقف اعتبار');

    // ۲. ثبت ویزیت بازاریاب با ژئوفنسینگ GPS
    const visitRes = await request(app.getHttpServer())
      .post('/api/v1/omnichannel/visitor/visits')
      .set('Authorization', `Bearer ${jwtToken}`)
      .set('x-tenant-id', 'tenant-pishro')
      .set('x-company-id', 'comp-pishro-1')
      .send({
        customerPartyId: 'party-cust-1',
        visitDateShamsi: '1403/12/29',
        latitude: 35.7575,
        longitude: 51.4100,
        visitNotes: 'ملاقات با مدیر فروشگاه پارسیان و معرفی کاتالوگ پایانه‌های فروشگاهی جدید'
      })
      .expect(201);

    expect(visitRes.body.success).toBe(true);
    expect(visitRes.body.data.visitId).toBeDefined();
    expect(visitRes.body.data.geofence.isWithinGeofence).toBe(true);

    // ۳. استعلام خلاصه کارکرد و حضور و غیاب پرسنل از دستگاه ورود و خروج
    const attRes = await request(app.getHttpServer())
      .get('/api/v1/omnichannel/hardware/attendance/summary/emp-rezaei-1?dateShamsi=1403/12/29')
      .set('Authorization', `Bearer ${jwtToken}`)
      .set('x-tenant-id', 'tenant-pishro')
      .set('x-company-id', 'comp-pishro-1')
      .expect(200);

    expect(attRes.body.success).toBe(true);
    expect(attRes.body.data.employeeId).toBe('emp-rezaei-1');
    expect(attRes.body.data.totalPresentMinutes).toBe(570); // ۹.۵ ساعت کارکرد
    expect(attRes.body.data.overtimeMinutes).toBe(90); // ۱.۵ ساعت اضافه‌کاری
    expect(attRes.body.data.firstClockIn).toBe('08:00:00');
    expect(attRes.body.data.lastClockOut).toBe('17:30:00');
  });

  // =========================================================================
  // آزمون‌های فاز ۱۱: زیرساخت SaaS، اشتراک، امنیت، Onboarding و مهاجرت داده
  // =========================================================================

  it('Step 71 (Phase 11): Should query SaaS plans, retrieve tenant subscription and check usage metrics against quotas', async () => {
    // ۱. استعلام کاتالوگ تمام پلن‌های اشتراک ابری
    const plansRes = await request(app.getHttpServer())
      .get('/api/v1/saas/plans')
      .expect(200);

    expect(plansRes.body.success).toBe(true);
    expect(plansRes.body.data.length).toBeGreaterThanOrEqual(4);
    const proPlan = plansRes.body.data.find((p: any) => p.code === 'PRO');
    expect(proPlan).toBeDefined();
    expect(proPlan.maxMonthlyTransactions).toBe(15000);
    expect(proPlan.hasApiAccess).toBe(true);

    // ۲. استعلام اشتراک فعال سازمان جاری (tenant-pishro)
    const subRes = await request(app.getHttpServer())
      .get('/api/v1/saas/subscription')
      .set('Authorization', `Bearer ${jwtToken}`)
      .set('x-tenant-id', 'tenant-pishro')
      .set('x-company-id', 'comp-pishro-1')
      .expect(200);

    expect(subRes.body.success).toBe(true);
    expect(subRes.body.data.subscription.status).toBe('ACTIVE');
    expect(subRes.body.data.evaluation.status).toBe('ACTIVE');
    expect(subRes.body.data.evaluation.daysRemaining).toBeGreaterThan(300);
    expect(subRes.body.data.evaluation.isInGracePeriod).toBe(false);

    // ۳. استعلام میزان مصرف منابع ماه جاری نسبت به سقف پلن
    const usageRes = await request(app.getHttpServer())
      .get('/api/v1/saas/usage')
      .set('Authorization', `Bearer ${jwtToken}`)
      .set('x-tenant-id', 'tenant-pishro')
      .set('x-company-id', 'comp-pishro-1')
      .expect(200);

    expect(usageRes.body.success).toBe(true);
    expect(usageRes.body.data.metrics.periodMonth).toBe('1403-12');
    expect(usageRes.body.data.limits.maxTransactions).toBe(15000);
    expect(usageRes.body.data.usagePercentages.transactions).toBeLessThan(50);
  });

  it('Step 72 (Phase 11): Should calculate prorated plan upgrade and execute subscription upgrade', async () => {
    // ۱. محاسبه پیش‌فاکتور ارتقای تناسبی از پلن حرفه‌ای به پلن سازمانی (ENTERPRISE)
    const calcRes = await request(app.getHttpServer())
      .post('/api/v1/saas/upgrade/calculate')
      .set('Authorization', `Bearer ${jwtToken}`)
      .set('x-tenant-id', 'tenant-pishro')
      .set('x-company-id', 'comp-pishro-1')
      .send({
        newPlanId: 'plan-enterprise'
      })
      .expect(201);

    expect(calcRes.body.success).toBe(true);
    expect(calcRes.body.data.calculation.newPlanId).toBe('plan-enterprise');
    expect(calcRes.body.data.calculation.remainingDays).toBeGreaterThan(0);
    expect(calcRes.body.data.calculation.netPayableAmount).toBeDefined();

    // ۲. اعمال و ثبت ارتقای اشتراک سازمان
    const execRes = await request(app.getHttpServer())
      .post('/api/v1/saas/upgrade/execute')
      .set('Authorization', `Bearer ${jwtToken}`)
      .set('x-tenant-id', 'tenant-pishro')
      .set('x-company-id', 'comp-pishro-1')
      .send({
        newPlanId: 'plan-enterprise',
        billingCycle: 'YEARLY',
        paymentReference: 'SHP-UPG-ENTERPRISE-001'
      })
      .expect(201);

    expect(execRes.body.success).toBe(true);
    expect(execRes.body.data.success).toBe(true);
    expect(execRes.body.data.subscriptionId).toBeDefined();
    expect(execRes.body.data.newPlan.tier).toBe('ENTERPRISE');
  });

  it('Step 73 (Phase 11): Should onboard a brand-new tenant with industry-specific Chart of Accounts (Manufacturing) and trial subscription', async () => {
    // راه‌اندازی تمام‌خودکار شرکت صنعتی و تولیدی جدید
    const onboardingRes = await request(app.getHttpServer())
      .post('/api/v1/saas/onboarding')
      .send({
        organizationName: 'شرکت صنایع قطعه‌سازان نوین البرز',
        nationalId: '10100123456', // شناسه ملی حقوقی معتبر ۱۱ رقمی
        economicCode: '411234567890',
        industry: 'MANUFACTURING',
        defaultCurrency: 'IRR',
        initialFiscalYearTitle: 'سال مالی ۱۴۰۴',
        fiscalYearStartDate: '1404/01/01',
        fiscalYearEndDate: '1404/12/29',
        adminFullName: 'مهندس کامران رستمی',
        adminMobile: '09129998877',
        adminEmail: 'rostami@alborz-mfg.ir'
      })
      .expect(201);

    expect(onboardingRes.body.success).toBe(true);
    expect(onboardingRes.body.data.organizationId).toBeDefined();
    expect(onboardingRes.body.data.defaultWarehouseId).toBeDefined();
    expect(onboardingRes.body.data.assignedPlanId).toBe('plan-free-trial');
    // باید حساب‌های معین اختصاصی صنف تولیدی درج شده باشد
    expect(onboardingRes.body.data.initialAccountsCount).toBeGreaterThan(15);
    expect(onboardingRes.body.data.subscription.status).toBe('TRIAL');
  });

  it('Step 74 (Phase 11): Should import legacy data (parties & products) and post balanced Opening Balance journal entry from Rahkaran/Sepidar', async () => {
    // ۱. ایمپورت دسته‌ای طرف‌حساب‌ها از سپیدار سیستم
    const legacyParties = [
      {
        code: 'SEP-CUST-101',
        name: 'شرکت پترو تجهیز پارس',
        partyType: 'LEGAL',
        nationalId: '10100123456',
        mobile: '09121234567',
        creditLimit: '750000000'
      },
      {
        code: 'SEP-SUPP-102',
        name: 'صنایع فولاد آذرخش',
        partyType: 'LEGAL',
        nationalId: '10100123456',
        mobile: '09127654321',
        creditLimit: '1200000000'
      }
    ];

    const partyMigRes = await request(app.getHttpServer())
      .post('/api/v1/saas/migration/parties')
      .set('Authorization', `Bearer ${jwtToken}`)
      .set('x-tenant-id', 'tenant-pishro')
      .set('x-company-id', 'comp-pishro-1')
      .send({
        source: 'SEPIDAR',
        rows: legacyParties
      })
      .expect(201);

    expect(partyMigRes.body.success).toBe(true);
    expect(partyMigRes.body.data.totalRows).toBe(2);
    expect(partyMigRes.body.data.importedRows).toBe(2);
    expect(partyMigRes.body.data.status).toBe('COMPLETED');

    // ۲. ایمپورت دسته‌ای کالاها و خدمات از سپیدار
    const legacyProducts = [
      {
        code: 'SEP-PROD-01',
        name: 'کارتخوان بی‌سیم اندرویدی مدل X990',
        barcode: '6261234567890',
        unitTitle: 'دستگاه',
        buyPrice: '38000000',
        sellPrice: '48000000',
        vatRate: '0.10'
      }
    ];

    const prodMigRes = await request(app.getHttpServer())
      .post('/api/v1/saas/migration/products')
      .set('Authorization', `Bearer ${jwtToken}`)
      .set('x-tenant-id', 'tenant-pishro')
      .set('x-company-id', 'comp-pishro-1')
      .send({
        source: 'SEPIDAR',
        rows: legacyProducts
      })
      .expect(201);

    expect(prodMigRes.body.success).toBe(true);
    expect(prodMigRes.body.data.importedRows).toBe(1);

    // ۳. رد سند افتتاحیه نامتعادل (اختلاف بدهکار و بستانکار)
    const unbalancedOpeningRows = [
      { subsidiaryCode: '1101', dimensionCode: 'dim-cash-1', debit: '100000000', credit: '0' },
      { subsidiaryCode: '5101', debit: '0', credit: '150000000' } // ۵۰ میلیون ریال عدم تراز
    ];

    const unbalancedRes = await request(app.getHttpServer())
      .post('/api/v1/saas/migration/opening-balance')
      .set('Authorization', `Bearer ${jwtToken}`)
      .set('x-tenant-id', 'tenant-pishro')
      .set('x-company-id', 'comp-pishro-1')
      .send({
        source: 'RAHKARAN',
        fiscalYearId: 'fy-1403',
        rows: unbalancedOpeningRows
      })
      .expect(400);

    expect(unbalancedRes.body.message).toContain('سند افتتاحیه');

    // ۴. ثبت سند افتتاحیه تراز و متوازن منتقل‌شده از راهکاران سیستم
    const balancedOpeningRows = [
      {
        subsidiaryCode: '1101',
        dimensionCode: 'dim-cash-1',
        debit: '250000000',
        credit: '0',
        description: 'موجودی نقد افتتاحیه صندوق مرکزی در راهکاران'
      },
      {
        subsidiaryCode: '1103',
        dimensionCode: 'dim-bank-1',
        debit: '750000000',
        credit: '0',
        description: 'موجودی افتتاحیه حساب بانک سامان در راهکاران'
      },
      {
        subsidiaryCode: '5101',
        debit: '0',
        credit: '1000000000',
        description: 'سرمایه اولیه ثبت‌شده سهامداران در راهکاران'
      }
    ];

    const balancedRes = await request(app.getHttpServer())
      .post('/api/v1/saas/migration/opening-balance')
      .set('Authorization', `Bearer ${jwtToken}`)
      .set('x-tenant-id', 'tenant-pishro')
      .set('x-company-id', 'comp-pishro-1')
      .send({
        source: 'RAHKARAN',
        fiscalYearId: 'fy-1403',
        rows: balancedOpeningRows
      })
      .expect(201);

    expect(balancedRes.body.success).toBe(true);
    expect(balancedRes.body.data.journalEntryId).toBeDefined();
    expect(balancedRes.body.data.totalDebit).toBe('1000000000');
    expect(balancedRes.body.data.totalCredit).toBe('1000000000');
    expect(balancedRes.body.data.status).toBe('COMPLETED');
  });

  it('Step 75 (Phase 11): Should setup 2FA, verify TOTP token, log security audit event, and enforce Tenant Isolation Guard against cross-tenant access', async () => {
    // ۱. راه‌اندازی و شروع تنظیم تایید دومرحله‌ای
    const setup2faRes = await request(app.getHttpServer())
      .post('/api/v1/saas/security/2fa/setup')
      .set('Authorization', `Bearer ${jwtToken}`)
      .set('x-tenant-id', 'tenant-pishro')
      .set('x-company-id', 'comp-pishro-1')
      .expect(201);

    expect(setup2faRes.body.success).toBe(true);
    expect(setup2faRes.body.data.secret).toBeDefined();
    expect(setup2faRes.body.data.otpAuthUrl).toContain('otpauth://totp/');
    expect(setup2faRes.body.data.backupCodes.length).toBe(8);

    const secret = setup2faRes.body.data.secret;
    const currentStep = Math.floor(Math.floor(Date.now() / 1000) / 30);
    const validToken = SecurityEngine.generateTotpForStep(secret, currentStep);

    // ۲. اعتبارسنجی کد ۶ رقمی و فعال‌سازی قطعی 2FA
    const verify2faRes = await request(app.getHttpServer())
      .post('/api/v1/saas/security/2fa/verify')
      .set('Authorization', `Bearer ${jwtToken}`)
      .set('x-tenant-id', 'tenant-pishro')
      .set('x-company-id', 'comp-pishro-1')
      .send({ token: validToken })
      .expect(201);

    expect(verify2faRes.body.success).toBe(true);
    expect(verify2faRes.body.data.message).toContain('تایید دومرحله‌ای');

    // ۳. استعلام لاگ‌های امنیتی سازمان (Security Audit Logs)
    const auditRes = await request(app.getHttpServer())
      .get('/api/v1/saas/security/audit-logs')
      .set('Authorization', `Bearer ${jwtToken}`)
      .set('x-tenant-id', 'tenant-pishro')
      .set('x-company-id', 'comp-pishro-1')
      .expect(200);

    expect(auditRes.body.success).toBe(true);
    expect(auditRes.body.data.length).toBeGreaterThan(0);
    expect(auditRes.body.data.some((l: any) => l.action_type === '2FA_ENABLED')).toBe(true);

    // ۴. آزمون گارد تفکیک امنیتی چندمستاجری (Tenant Isolation Guard)
    // تلاش برای دسترسی به سازمان دیگر (باید ۴۰۳ بازگرداند)
    await request(app.getHttpServer())
      .get('/api/v1/saas/security/tenant-check')
      .set('Authorization', `Bearer ${jwtToken}`)
      .set('x-tenant-id', 'tenant-other-hacker')
      .expect(403);

    // دسترسی مجاز با شناسه سازمان معتبر کاربر
    const allowedTenantRes = await request(app.getHttpServer())
      .get('/api/v1/saas/security/tenant-check')
      .set('Authorization', `Bearer ${jwtToken}`)
      .set('x-tenant-id', 'tenant-pishro')
      .expect(200);

    expect(allowedTenantRes.body.success).toBe(true);
    expect(allowedTenantRes.body.data.status).toBe('ISOLATED_OK');
  });

  it('Step 12: Final integrity check: Trial Balance must remain 100% balanced across all operations', async () => {
    const tbRes = await request(app.getHttpServer())
      .get('/api/v1/accounting/reports/trial-balance')
      .set('Authorization', `Bearer ${jwtToken}`)
      .set('x-tenant-id', 'tenant-pishro')
      .set('x-company-id', 'comp-pishro-1')
      .expect(200);

    expect(tbRes.body.success).toBe(true);
    expect(tbRes.body.data.isBalanced).toBe(true);
    expect(tbRes.body.data.totalPeriodDebit).toBe(tbRes.body.data.totalPeriodCredit);
    expect(tbRes.body.data.totalClosingDebit).toBe(tbRes.body.data.totalClosingCredit);
  });

  it('Step 13: Cryptographic verification: Audit Hash Chain must remain untampered', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/audit/verify-chain')
      .set('Authorization', `Bearer ${jwtToken}`)
      .set('x-tenant-id', 'tenant-pishro')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.isValid).toBe(true);
    expect(res.body.data.totalRecords).toBeGreaterThan(0);
  });
});
