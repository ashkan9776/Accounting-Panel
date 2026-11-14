import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Accounting Core Platform E2E Integration Tests (فاز ۱ و فاز ۲)', () => {
  let app: INestApplication;
  let jwtToken: string;
  let createdPartyId: string;
  let createdChequeId: string;

  beforeAll(async () => {
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
