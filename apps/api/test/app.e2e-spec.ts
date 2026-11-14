import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Accounting Core Platform E2E Integration Tests (فاز ۱)', () => {
  let app: INestApplication;
  let jwtToken: string;

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
    // باید حداقل ۹ گروه اصلی استاندارد وجود داشته باشد
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

  it('Step 4: Should successfully create, approve, finalize, and verify trial balance', async () => {
    // ایجاد سند متوازن: فروش ۵۰,۰۰۰,۰۰۰ ریال با کارتخوان
    const validEntry = {
      entryDateShamsi: '1403/08/24',
      description: 'فروش روزانه شعبه مرکزی با پوز',
      lines: [
        {
          subsidiaryAccountId: 'sub-1104',
          floatingDimension1Id: 'dim-pos-1',
          debit: 55000000,
          credit: 0,
          description: 'دریافت کامل وجه فاکتور با پوز ملت'
        },
        {
          subsidiaryAccountId: 'sub-6101',
          debit: 0,
          credit: 50000000,
          description: 'درآمد ناخالص فروش'
        },
        {
          subsidiaryAccountId: 'sub-3306',
          debit: 0,
          credit: 5000000,
          description: 'مالیات بر ارزش افزوده ۱۰٪'
        }
      ]
    };

    const createRes = await request(app.getHttpServer())
      .post('/api/v1/accounting/journal-entries')
      .set('Authorization', `Bearer ${jwtToken}`)
      .set('x-tenant-id', 'tenant-pishro')
      .set('x-company-id', 'comp-pishro-1')
      .send(validEntry)
      .expect(201);

    expect(createRes.body.success).toBe(true);
    const createdId = createRes.body.data.id;
    expect(createRes.body.data.status).toBe('DRAFT');
    expect(createRes.body.data.totalDebit).toBe('55000000');
    expect(createRes.body.data.totalCredit).toBe('55000000');

    // تایید سند توسط حسابدار
    const approveRes = await request(app.getHttpServer())
      .post(`/api/v1/accounting/journal-entries/${createdId}/approve`)
      .set('Authorization', `Bearer ${jwtToken}`)
      .set('x-tenant-id', 'tenant-pishro')
      .set('x-company-id', 'comp-pishro-1')
      .expect(201);

    expect(approveRes.body.success).toBe(true);
    expect(approveRes.body.data.status).toBe('APPROVED');

    // قطعی‌سازی سند و ثبت دفاتر قانونی
    const finalizeRes = await request(app.getHttpServer())
      .post(`/api/v1/accounting/journal-entries/${createdId}/finalize`)
      .set('Authorization', `Bearer ${jwtToken}`)
      .set('x-tenant-id', 'tenant-pishro')
      .set('x-company-id', 'comp-pishro-1')
      .expect(201);

    expect(finalizeRes.body.success).toBe(true);
    expect(finalizeRes.body.data.status).toBe('FINALIZED');
    expect(finalizeRes.body.data.permanentNumber).toBeDefined();

    // بررسی تراز آزمایشی پس از قطعی‌سازی سند
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

    // معکوس‌سازی سند قطعی با سند اصلاحی
    const reverseRes = await request(app.getHttpServer())
      .post(`/api/v1/accounting/journal-entries/${createdId}/reverse`)
      .set('Authorization', `Bearer ${jwtToken}`)
      .set('x-tenant-id', 'tenant-pishro')
      .set('x-company-id', 'comp-pishro-1')
      .send({
        reversalDateShamsi: '1403/08/25',
        reason: 'ابطال فاکتور و اصلاح حساب‌ها'
      })
      .expect(201);

    expect(reverseRes.body.success).toBe(true);
    expect(reverseRes.body.data.reversalEntry.entryType).toBe('REVERSAL');
  });

  it('Step 5: Should evaluate versioned tax and payroll rules', async () => {
    // محاسبه ارزش افزوده بر اساس قوانین ۱۴۰۳ (۱۰٪)
    const vatRes = await request(app.getHttpServer())
      .post('/api/v1/rules/vat/calculate')
      .set('Authorization', `Bearer ${jwtToken}`)
      .send({
        grossAmount: 10000000,
        discountAmount: 0,
        commodityCode: 'GENERAL_GOODS_101',
        documentDateShamsi: '1403/06/15'
      })
      .expect(201);

    expect(vatRes.body.success).toBe(true);
    expect(vatRes.body.data.vatRatePercent).toBe(10);
    expect(vatRes.body.data.vatAmount).toBe('1000000');
    expect(vatRes.body.data.totalWithVat).toBe('11000000');

    // محاسبه مالیات حقوق بر اساس ماده ۸۴
    const payrollRes = await request(app.getHttpServer())
      .post('/api/v1/rules/payroll/calculate')
      .set('Authorization', `Bearer ${jwtToken}`)
      .send({
        monthlyTaxableIncome: 200000000,
        documentDateShamsi: '1403/08/30'
      })
      .expect(201);

    expect(payrollRes.body.success).toBe(true);
    expect(payrollRes.body.data.totalTax).toBe('9750000');
  });

  it('Step 6: Should cryptographically verify the append-only Audit Hash Chain', async () => {
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
