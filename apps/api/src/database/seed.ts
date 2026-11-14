import * as bcrypt from 'bcryptjs';
import * as path from 'path';
import * as fs from 'fs';
import * as sqlite3 from 'sqlite3';
import {
  STANDARD_IRANIAN_GROUPS,
  STANDARD_IRANIAN_HEADS,
  STANDARD_IRANIAN_SUBSIDIARIES,
  DEFAULT_IRANIAN_RULES_1403,
  AuditHashChain,
  FloatingDimensionType,
  MoadianCryptoEngine
} from '@accounting/core';

export async function runSeed() {
  const storageDir = path.resolve(process.cwd(), 'storage');
  if (!fs.existsSync(storageDir)) {
    fs.mkdirSync(storageDir, { recursive: true });
  }
  const dbPath = process.env.DATABASE_PATH || path.join(storageDir, 'accounting.db');
  console.log(`[Seed] Connecting to database at: ${dbPath}`);

  const db = new sqlite3.Database(dbPath);

  const exec = (sql: string) =>
    new Promise<void>((resolve, reject) => {
      db.exec(sql, (err) => (err ? reject(err) : resolve()));
    });

  const run = (sql: string, params: any[] = []) =>
    new Promise<void>((resolve, reject) => {
      db.run(sql, params, (err) => (err ? reject(err) : resolve()));
    });

  // ۱. اعمال اسکیما
  const schemaPath = path.resolve(__dirname, 'schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  await exec(schemaSql);
  await exec(`
    DELETE FROM audit_logs;
    DELETE FROM journal_lines;
    DELETE FROM journal_entries;
    DELETE FROM cheques;
    DELETE FROM cheque_status_history;
    DELETE FROM money_transfers;
    DELETE FROM stock_ledger_entries;
    DELETE FROM purchase_document_items;
    DELETE FROM purchase_documents;
    DELETE FROM sales_document_items;
    DELETE FROM sales_documents;
    DELETE FROM inventory_count_items;
    DELETE FROM inventory_counts;
    DELETE FROM product_variants;
    DELETE FROM products;
    DELETE FROM unit_conversions;
    DELETE FROM product_units;
    DELETE FROM product_categories;
    DELETE FROM warehouses;
    DELETE FROM moadian_reconciliations;
    DELETE FROM moadian_outbox_queue;
    DELETE FROM moadian_invoice_items;
    DELETE FROM moadian_invoices;
    DELETE FROM moadian_unit_mappings;
    DELETE FROM moadian_settings;
    DELETE FROM pos_order_items;
    DELETE FROM pos_orders;
    DELETE FROM pos_cash_movements;
    DELETE FROM pos_shifts;
    DELETE FROM pos_terminals;
  `);
  console.log('[Seed] Schema applied and tables initialized successfully.');

  const now = new Date().toISOString();

  // ۲. درج تنانت پیش‌فرض
  const tenantId = 'tenant-pishro';
  await run(
    `INSERT OR REPLACE INTO tenants (id, subdomain, name, plan_id, is_active, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [tenantId, 'pishro-pars', 'هلدینگ بازرگانی و خدماتی پیشرو پارس', 'ENTERPRISE', 1, now]
  );

  // ۳. درج شرکت پیش‌فرض
  const companyId = 'comp-pishro-1';
  await run(
    `INSERT OR REPLACE INTO companies (id, tenant_id, legal_name, trade_name, national_id, economic_code, registration_number, tax_office_code, postal_code, address, phone, currency_code, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      companyId,
      tenantId,
      'شرکت بازرگانی و خدماتی پیشرو پارس (سهامی خاص)',
      'پیشرو پارس',
      '10100000006',
      '411111111111',
      '452100',
      '1102',
      '1998835111',
      'تهران، خیابان ولیعصر، بالاتر از میدان ونک، برج پیشرو، طبقه ۵',
      '02188880000',
      'IRR',
      now
    ]
  );

  // ۴. درج شعبه مرکزی
  const branchId = 'branch-central-1';
  await run(
    `INSERT OR REPLACE INTO branches (id, tenant_id, company_id, code, name, is_central, address, phone, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      branchId,
      tenantId,
      companyId,
      'BR01',
      'شعبه مرکزی تهران',
      1,
      'تهران، میدان ونک، برج پیشرو',
      '02188880000',
      now
    ]
  );

  // ۵. درج سال مالی ۱۴۰۳
  const fiscalYearId = 'fy-1403';
  await run(
    `INSERT OR REPLACE INTO fiscal_years (id, tenant_id, company_id, title, start_date_shamsi, end_date_shamsi, start_date_gregorian, end_date_gregorian, is_closed, is_locked, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      fiscalYearId,
      tenantId,
      companyId,
      'سال مالی ۱۴۰۳',
      '1403/01/01',
      '1403/12/29',
      '2024-03-20',
      '2025-03-20',
      0,
      0,
      now
    ]
  );

  // درج دوره‌های ماهانه ۱ تا ۱۲
  for (let m = 1; m <= 12; m++) {
    const periodId = `period-1403-${m.toString().padStart(2, '0')}`;
    await run(
      `INSERT OR REPLACE INTO fiscal_periods (id, tenant_id, fiscal_year_id, period_number, title, is_closed)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [periodId, tenantId, fiscalYearId, m, `دوره مالی ماه ${m}`, 0]
    );
  }

  // ۶. نقش‌ها و کاربر مدیر ارشد
  const roleAdminId = 'role-super-admin';
  const roleAccountantId = 'role-accountant';
  await run(
    `INSERT OR REPLACE INTO roles (id, tenant_id, code, title, description) VALUES (?, ?, ?, ?, ?)`,
    [roleAdminId, tenantId, 'SUPER_ADMIN', 'مدیر ارشد مالی و سیستم', 'دسترسی نامحدود به تمامی ماژول‌ها و تنظیمات']
  );
  await run(
    `INSERT OR REPLACE INTO roles (id, tenant_id, code, title, description) VALUES (?, ?, ?, ?, ?)`,
    [roleAccountantId, tenantId, 'ACCOUNTANT', 'حسابدار ارشد', 'ثبت و تایید اسناد حسابداری، استخراج دفاتر و تراز']
  );

  const passwordHash = await bcrypt.hash('admin12345', 10);
  const userId = 'user-admin-1';
  await run(
    `INSERT OR REPLACE INTO users (id, tenant_id, mobile, email, password_hash, full_name, is_super_admin, is_active, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [userId, tenantId, '09120000000', 'admin@pishro.ir', passwordHash, 'مدیر ارشد مالی', 1, 1, now]
  );

  await run(
    `INSERT OR REPLACE INTO user_roles (user_id, role_id, branch_id) VALUES (?, ?, ?)`,
    [userId, roleAdminId, branchId]
  );

  // ۷. درخت کدینگ حساب‌های استاندارد ایران
  console.log('[Seed] Seeding Chart of Accounts...');
  for (const g of STANDARD_IRANIAN_GROUPS) {
    await run(
      `INSERT OR REPLACE INTO account_groups (id, tenant_id, company_id, code, title, nature, description)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [g.id, tenantId, companyId, g.code, g.title, g.nature, g.description || '']
    );
  }

  for (const h of STANDARD_IRANIAN_HEADS) {
    await run(
      `INSERT OR REPLACE INTO account_heads (id, tenant_id, company_id, group_id, code, title, nature, description)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [h.id, tenantId, companyId, h.groupId, h.code, h.title, h.nature, h.description || '']
    );
  }

  for (const s of STANDARD_IRANIAN_SUBSIDIARIES) {
    await run(
      `INSERT OR REPLACE INTO account_subsidiaries (id, tenant_id, company_id, head_id, code, title, nature, requires_floating_dimension_1, allowed_dimension_1_type, requires_floating_dimension_2, allowed_dimension_2_type, requires_floating_dimension_3, allowed_dimension_3_type, is_currency_dependent, is_active, description)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        s.id,
        tenantId,
        companyId,
        s.headId,
        s.code,
        s.title,
        s.nature,
        s.requiresFloatingDimension1 ? 1 : 0,
        s.allowedDimension1Type || null,
        s.requiresFloatingDimension2 ? 1 : 0,
        s.allowedDimension2Type || null,
        s.requiresFloatingDimension3 ? 1 : 0,
        s.allowedDimension3Type || null,
        s.isCurrencyDependent ? 1 : 0,
        s.isActive ? 1 : 0,
        s.description || ''
      ]
    );
  }

  // ۸. اقلام تفصیلی شناور
  console.log('[Seed] Seeding Floating Dimensions...');
  const floatingDims = [
    { id: 'dim-cust-1', type: FloatingDimensionType.PARTY, code: '100001', title: 'آقای علی رضایی (مشتری وفادار)' },
    { id: 'dim-cust-2', type: FloatingDimensionType.PARTY, code: '100002', title: 'شرکت فناوری سامان پارس (مشتری حقوقی)' },
    { id: 'dim-supp-1', type: FloatingDimensionType.PARTY, code: '200001', title: 'بازرگانی قطعات یدکی ایران (تامین‌کننده)' },
    { id: 'dim-bank-1', type: FloatingDimensionType.BANK_ACCOUNT, code: '300001', title: 'بانک سامان - شعبه ونک (حساب ۸۴۰۱)' },
    { id: 'dim-bank-2', type: FloatingDimensionType.BANK_ACCOUNT, code: '300002', title: 'بانک ملی - شعبه اسکان (حساب ۰۱۰۲)' },
    { id: 'dim-pos-1', type: FloatingDimensionType.BANK_ACCOUNT, code: '400001', title: 'کارتخوان به‌پرداخت ملت (صندوق ۱)' },
    { id: 'dim-cash-1', type: FloatingDimensionType.CASH_DESK, code: '500001', title: 'صندوق نقدی ریالی شعبه ونک' },
    { id: 'dim-cc-1', type: FloatingDimensionType.COST_CENTER, code: '600001', title: 'مرکز هزینه امور اداری و ستادی' },
    { id: 'dim-cc-2', type: FloatingDimensionType.COST_CENTER, code: '600002', title: 'مرکز هزینه فروش و توزیع' }
  ];

  for (const dim of floatingDims) {
    await run(
      `INSERT OR REPLACE INTO floating_dimensions (id, tenant_id, company_id, dimension_type, code, title, is_active, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [dim.id, tenantId, companyId, dim.type, dim.code, dim.title, 1, now]
    );
  }

  // ۹. موتور قوانین نسخه‌دار پیش‌فرض ۱۴۰۳
  console.log('[Seed] Seeding Versioned Rules...');
  for (const rule of DEFAULT_IRANIAN_RULES_1403) {
    await run(
      `INSERT OR REPLACE INTO rule_definitions (id, rule_code, title, description)
       VALUES (?, ?, ?, ?)`,
      [`def-${rule.ruleCode}`, rule.ruleCode, rule.legalReference, 'قاعده رسمی و نسخه‌دار دولتی']
    );

    await run(
      `INSERT OR REPLACE INTO rule_versions (id, rule_definition_id, version_number, effective_from_shamsi, effective_to_shamsi, legal_reference, parameters_json, is_active, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        rule.id,
        `def-${rule.ruleCode}`,
        rule.version,
        rule.effectiveFromShamsi,
        rule.effectiveToShamsi || null,
        rule.legalReference,
        JSON.stringify(rule.parameters),
        rule.isActive ? 1 : 0,
        now
      ]
    );
  }

  // ۱۰. درج ۳ سند نمونه واقعی با توازن کامل و زنجیره ممیزی
  console.log('[Seed] Seeding Initial Journal Entries & Audit Chain...');

  // سند ۱: افتتاحیه (سرمایه و موجودی بانک)
  const entry1Id = 'entry-seed-1';
  await run(
    `INSERT OR REPLACE INTO journal_entries (id, tenant_id, company_id, branch_id, fiscal_year_id, fiscal_period_id, sequence_number, daily_number, permanent_number, entry_date_shamsi, entry_date_gregorian, entry_type, status, description, total_debit, total_credit, created_by_user_id, approved_by_user_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      entry1Id,
      tenantId,
      companyId,
      branchId,
      fiscalYearId,
      'period-1403-01',
      1,
      1,
      1,
      '1403/01/01',
      '2024-03-20',
      'OPENING',
      'FINALIZED',
      'سند افتتاحیه سال مالی ۱۴۰۳ - ثبت سرمایه و موجودی اولیه بانک',
      '500000000',
      '500000000',
      userId,
      userId,
      now,
      now
    ]
  );

  await run(
    `INSERT OR REPLACE INTO journal_lines (id, journal_entry_id, row_number, subsidiary_account_id, floating_dimension_1_id, debit, credit, description)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ['line-1-1', entry1Id, 1, 'sub-1103', 'dim-bank-1', '500000000', '0', 'موجودی اولیه بانک سامان']
  );
  await run(
    `INSERT OR REPLACE INTO journal_lines (id, journal_entry_id, row_number, subsidiary_account_id, debit, credit, description)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ['line-1-2', entry1Id, 2, 'sub-5101', '0', '500000000', 'سرمایه اولیه ثبت‌شده سهامداران']
  );

  // سند ۲: فروش کالا با کارتخوان و ۱۰٪ ارزش افزوده
  const entry2Id = 'entry-seed-2';
  await run(
    `INSERT OR REPLACE INTO journal_entries (id, tenant_id, company_id, branch_id, fiscal_year_id, fiscal_period_id, sequence_number, daily_number, permanent_number, entry_date_shamsi, entry_date_gregorian, entry_type, status, description, total_debit, total_credit, created_by_user_id, approved_by_user_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      entry2Id,
      tenantId,
      companyId,
      branchId,
      fiscalYearId,
      'period-1403-08',
      2,
      1,
      2,
      '1403/08/20',
      '2024-11-10',
      'NORMAL',
      'FINALIZED',
      'فروش کالای تجاری با پوز به انضمام ۱۰٪ مالیات بر ارزش افزوده',
      '110000000',
      '110000000',
      userId,
      userId,
      now,
      now
    ]
  );

  await run(
    `INSERT OR REPLACE INTO journal_lines (id, journal_entry_id, row_number, subsidiary_account_id, floating_dimension_1_id, debit, credit, description)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ['line-2-1', entry2Id, 1, 'sub-1104', 'dim-pos-1', '110000000', '0', 'واریز وجه فروش به کارتخوان ملت']
  );
  await run(
    `INSERT OR REPLACE INTO journal_lines (id, journal_entry_id, row_number, subsidiary_account_id, debit, credit, description)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ['line-2-2', entry2Id, 2, 'sub-6101', '0', '100000000', 'درآمد ناخالص فروش کالا']
  );
  await run(
    `INSERT OR REPLACE INTO journal_lines (id, journal_entry_id, row_number, subsidiary_account_id, debit, credit, description)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ['line-2-3', entry2Id, 3, 'sub-3306', '0', '10000000', 'مالیات بر ارزش افزوده ۱۰٪ فروش']
  );

  // زنجیره ممیزی با رمزنگاری SHA-256
  const log1 = AuditHashChain.createLogEntry(
    'audit-seed-1',
    tenantId,
    userId,
    'FINALIZE',
    'journal_entries',
    entry1Id,
    { permanentNumber: 1, totalDebit: '500000000' }
  );
  await run(
    `INSERT OR REPLACE INTO audit_logs (id, tenant_id, user_id, action, table_name, record_id, timestamp, previous_hash, current_hash, payload_json)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      log1.id,
      log1.tenantId,
      log1.userId,
      log1.action,
      log1.tableName,
      log1.recordId,
      log1.timestamp,
      log1.previousHash,
      log1.currentHash,
      JSON.stringify(log1.payload)
    ]
  );

  const log2 = AuditHashChain.createLogEntry(
    'audit-seed-2',
    tenantId,
    userId,
    'FINALIZE',
    'journal_entries',
    entry2Id,
    { permanentNumber: 2, totalDebit: '110000000' },
    log1.currentHash
  );
  await run(
    `INSERT OR REPLACE INTO audit_logs (id, tenant_id, user_id, action, table_name, record_id, timestamp, previous_hash, current_hash, payload_json)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      log2.id,
      log2.tenantId,
      log2.userId,
      log2.action,
      log2.tableName,
      log2.recordId,
      log2.timestamp,
      log2.previousHash,
      log2.currentHash,
      JSON.stringify(log2.payload)
    ]
  );

  // فاز ۲: درج اطلاعات پایه اشخاص، بانک‌ها، صندوق، تنخواه و چک صیاد
  console.log('[Seed Phase 2] Seeding Parties and Treasury Baseline...');

  // اشخاص
  await run(
    `INSERT OR REPLACE INTO parties (id, tenant_id, company_id, party_type, name, first_name, last_name, national_id, mobile, credit_limit, credit_terms_days, is_customer, is_supplier, is_employee, floating_dimension_id, is_active, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
    [
      'party-cust-1',
      tenantId,
      companyId,
      'INDIVIDUAL_IRANIAN',
      'آقای علی رضایی (مشتری وفادار)',
      'علی',
      'رضایی',
      '0084575948',
      '09121111111',
      '100000000',
      30,
      1,
      0,
      0,
      'dim-cust-1',
      now
    ]
  );

  await run(
    `INSERT OR REPLACE INTO parties (id, tenant_id, company_id, party_type, name, national_id, economic_code, phone, credit_limit, credit_terms_days, is_customer, is_supplier, is_employee, floating_dimension_id, is_active, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
    [
      'party-cust-2',
      tenantId,
      companyId,
      'LEGAL_ENTITY',
      'شرکت فناوری سامان پارس (مشتری حقوقی)',
      '10100000006',
      '411122223333',
      '02188881111',
      '500000000',
      60,
      1,
      0,
      0,
      'dim-cust-2',
      now
    ]
  );

  await run(
    `INSERT OR REPLACE INTO parties (id, tenant_id, company_id, party_type, name, national_id, phone, is_customer, is_supplier, is_employee, floating_dimension_id, is_active, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 0, 1, 0, ?, 1, ?)`,
    [
      'party-supp-1',
      tenantId,
      companyId,
      'LEGAL_ENTITY',
      'بازرگانی قطعات یدکی ایران (تامین‌کننده)',
      '10100000010',
      '02188882222',
      'dim-supp-1',
      now
    ]
  );

  // حساب‌های بانکی
  await run(
    `INSERT OR REPLACE INTO bank_accounts (id, tenant_id, company_id, bank_name, branch_name, account_number, iban, card_number, floating_dimension_id, initial_balance, is_active, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
    [
      'bank-saman-1',
      tenantId,
      companyId,
      'بانک سامان',
      'شعبه ونک',
      '8401-123456',
      'IR820120000000004123456789',
      '6219861012345670',
      'dim-bank-1',
      '500000000',
      now
    ]
  );

  // صندوق نقدی
  await run(
    `INSERT OR REPLACE INTO cash_desks (id, tenant_id, company_id, branch_id, code, title, floating_dimension_id, initial_balance, is_active, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
    [
      'cash-desk-1',
      tenantId,
      companyId,
      branchId,
      'CSH01',
      'صندوق نقدی ریالی شعبه ونک',
      'dim-cash-1',
      '20000000',
      now
    ]
  );

  // تنخواه‌گردان
  await run(
    `INSERT OR REPLACE INTO petty_cash_funds (id, tenant_id, company_id, branch_id, code, title, custodian_party_id, ceiling_amount, floating_dimension_id, is_active, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
    [
      'petty-1',
      tenantId,
      companyId,
      branchId,
      'PETTY01',
      'تنخواه امور اداری مرکزی',
      'party-cust-1',
      '50000000',
      'dim-cust-1',
      now
    ]
  );

  console.log('[Seed Phase 2] Phase 2 parties, banks, cash, and petty cash seeded successfully.');

  // ==========================================
  // فاز ۳: انبار، کالاها، خدمات و کاردکس
  // ==========================================
  // دسته‌بندی کالاها
  await run(
    `INSERT OR REPLACE INTO product_categories (id, tenant_id, company_id, code, title, parent_id, created_at)
     VALUES (?, ?, ?, ?, ?, NULL, ?)`,
    ['cat-digital', tenantId, companyId, 'CAT-01', 'کالاهای دیجیتال و تجهیزات الکترونیک', now]
  );
  await run(
    `INSERT OR REPLACE INTO product_categories (id, tenant_id, company_id, code, title, parent_id, created_at)
     VALUES (?, ?, ?, ?, ?, NULL, ?)`,
    ['cat-services', tenantId, companyId, 'CAT-02', 'خدمات فنی، مهندسی و مالی', now]
  );

  // واحدهای سنجش کالا
  await run(
    `INSERT OR REPLACE INTO product_units (id, tenant_id, company_id, code, title, symbol, is_reference, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 1, ?)`,
    ['unit-piece', tenantId, companyId, 'PCS', 'دستگاه / عدد', 'عدد', now]
  );
  await run(
    `INSERT OR REPLACE INTO product_units (id, tenant_id, company_id, code, title, symbol, is_reference, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 0, ?)`,
    ['unit-box', tenantId, companyId, 'BOX', 'کارتن (بسته ۱۰ تایی)', 'کارتن', now]
  );

  // ضریب تبدیل واحد (هر کارتن = ۱۰ عدد)
  await run(
    `INSERT OR REPLACE INTO unit_conversions (id, tenant_id, from_unit_id, to_unit_id, conversion_rate, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    ['conv-box-to-piece', tenantId, 'unit-box', 'unit-piece', '10', now]
  );

  // انبارها
  await run(
    `INSERT OR REPLACE INTO warehouses (id, tenant_id, company_id, branch_id, code, name, address, phone, keeper_name, is_active, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
    [
      'wh-main',
      tenantId,
      companyId,
      branchId,
      'WH01',
      'انبار مرکزی قطعات و کالا (ونک)',
      'تهران، خیابان ملاصدرا، انبار مرکزی پیشرو',
      '02188880001',
      'علی مرادی',
      now
    ]
  );
  await run(
    `INSERT OR REPLACE INTO warehouses (id, tenant_id, company_id, branch_id, code, name, address, phone, keeper_name, is_active, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
    [
      'wh-retail',
      tenantId,
      companyId,
      branchId,
      'WH02',
      'انبار فروشگاه و ویترین',
      'تهران، میدان ونک، فروشگاه پیشرو',
      '02188880002',
      'حسین صادقی',
      now
    ]
  );

  // کالاها و خدمات
  // ۱. کالای فیزیکی با روش میانگین موزون متحرک (MOVING_AVERAGE)
  await run(
    `INSERT OR REPLACE INTO products (
      id, tenant_id, company_id, category_id, unit_id, code, name, type,
      barcode, tax_exempt, vat_rate, valuation_method, min_stock_alert, max_stock_alert,
      sell_price, purchase_price, is_active, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, '0.10', 'MOVING_AVERAGE', '5', '100', '350000000', '280000000', 1, ?)`,
    [
      'prod-laptop',
      tenantId,
      companyId,
      'cat-digital',
      'unit-piece',
      'PRD-101',
      'لپ‌تاپ لنوو ThinkPad E14',
      'GOODS',
      '6921234567890',
      now
    ]
  );

  // ۲. کالای فیزیکی جانبی با روش میانگین
  await run(
    `INSERT OR REPLACE INTO products (
      id, tenant_id, company_id, category_id, unit_id, code, name, type,
      barcode, tax_exempt, vat_rate, valuation_method, min_stock_alert, max_stock_alert,
      sell_price, purchase_price, is_active, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, '0.10', 'MOVING_AVERAGE', '10', '500', '15000000', '10000000', 1, ?)`,
    [
      'prod-mouse',
      tenantId,
      companyId,
      'cat-digital',
      'unit-piece',
      'PRD-102',
      'موس بی‌سیم لاجیتک M185',
      'GOODS',
      '6921234567891',
      now
    ]
  );

  // ۳. کالای فیزیکی با روش FIFO
  await run(
    `INSERT OR REPLACE INTO products (
      id, tenant_id, company_id, category_id, unit_id, code, name, type,
      barcode, tax_exempt, vat_rate, valuation_method, min_stock_alert, max_stock_alert,
      sell_price, purchase_price, is_active, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, '0.10', 'FIFO', '5', '50', '180000000', '140000000', 1, ?)`,
    [
      'prod-tablet',
      tenantId,
      companyId,
      'cat-digital',
      'unit-piece',
      'PRD-103',
      'تبلت سامسونگ Galaxy Tab A9',
      'GOODS',
      '6921234567892',
      now
    ]
  );

  // ۴. خدمات غیرفیزیکی (فاقد کاردکس انبار)
  await run(
    `INSERT OR REPLACE INTO products (
      id, tenant_id, company_id, category_id, unit_id, code, name, type,
      barcode, tax_exempt, vat_rate, valuation_method, min_stock_alert, max_stock_alert,
      sell_price, purchase_price, is_active, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, 0, '0.10', 'MOVING_AVERAGE', '0', '0', '50000000', '0', 1, ?)`,
    [
      'prod-consulting',
      tenantId,
      companyId,
      'cat-services',
      'unit-piece',
      'SRV-201',
      'خدمات مشاوره مدیریت و راه‌اندازی شبکه',
      'SERVICE',
      now
    ]
  );

  console.log('[Seed Phase 3] Warehouses, categories, units, and products seeded successfully.');

  // ==========================================
  // فاز ۴: تنظیمات سامانه مودیان و نگاشت واحدها
  // ==========================================
  const moadianKeys = MoadianCryptoEngine.generateKeyPair();
  await run(
    `INSERT OR REPLACE INTO moadian_settings (
      id, tenant_id, company_id, fiscal_memory_id, transport_method,
      private_key_pem, public_key_pem, public_key_base64,
      tsp_provider_name, tsp_api_key, is_sandbox_mode, is_active, created_at, updated_at
    ) VALUES (?, ?, ?, ?, 'DIRECT', ?, ?, ?, NULL, NULL, 1, 1, ?, ?)`,
    [
      'moadian-set-1',
      tenantId,
      companyId,
      'A123B4', // شناسه ۶ کاراکتری حافظه مالیاتی نمونه هلدینگ پیشرو
      moadianKeys.privateKeyPem,
      moadianKeys.publicKeyPem,
      moadianKeys.publicKeyBase64,
      now,
      now
    ]
  );

  // نگاشت واحدهای سنجش به کدهای ۴ رقمی سامانه مودیان
  await run(
    `INSERT OR REPLACE INTO moadian_unit_mappings (id, tenant_id, unit_id, moadian_unit_code, moadian_unit_title, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    ['map-unit-1', tenantId, 'unit-piece', '1640', 'تعداد / عدد / دستگاه', now]
  );
  await run(
    `INSERT OR REPLACE INTO moadian_unit_mappings (id, tenant_id, unit_id, moadian_unit_code, moadian_unit_title, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    ['map-unit-2', tenantId, 'unit-box', '1641', 'بسته / کارتن', now]
  );

  console.log('[Seed Phase 4] Moadian keys, settings and unit mappings seeded successfully.');

  // ==========================================
  // فاز ۵: پایانه کارتخوان POS و صندوق فروشگاهی
  // ==========================================
  await run(
    `INSERT OR REPLACE INTO pos_terminals (
      id, tenant_id, company_id, branch_id, code, title, terminal_number,
      serial_number, psp_name, bank_account_id, floating_dimension_id, is_active, created_at
    ) VALUES (?, ?, ?, ?, 'POS01', 'کارتخوان متصل به صندوق ونک', '89211045', 'SN-SAMAN-991', 'سامان‌کیش', 'bank-saman-1', 'dim-pos-1', 1, ?)`,
    [
      'pos-term-1',
      tenantId,
      companyId,
      branchId,
      now
    ]
  );

  // کالای وزنی ترازویی
  await run(
    `INSERT OR REPLACE INTO products (
      id, tenant_id, company_id, category_id, unit_id, code, name, type,
      barcode, tax_exempt, vat_rate, valuation_method, min_stock_alert, max_stock_alert,
      sell_price, purchase_price, is_active, created_at
    ) VALUES (?, ?, ?, ?, 'unit-piece', '00105', 'گوشت ران گوساله ممتاز (وزنی)', 'GOODS', '2100105000000', 1, '0.00', 'MOVING_AVERAGE', '10', '200', '2400000', '1800000', 1, ?)`,
    [
      'prod-meat',
      tenantId,
      companyId,
      'cat-digital', // or general category
      now
    ]
  );

  // موجودی اولیه گوشت در انبار اصلی برای تست ترازو
  await run(
    `INSERT OR REPLACE INTO stock_ledger_entries (
      id, tenant_id, company_id, warehouse_id, product_id, variant_id,
      document_type, document_id, document_number, date_shamsi,
      in_quantity, in_unit_cost, in_total_cost,
      out_quantity, out_unit_cost, out_total_cost,
      balance_quantity, balance_unit_cost, balance_total_cost,
      created_at
    ) VALUES (
      'stk-init-meat', ?, ?, 'wh-main', 'prod-meat', NULL,
      'INITIAL_BALANCE', 'init-meat', 'INIT-MEAT-01', '1403/01/01',
      '100', '1800000', '180000000',
      '0', '0', '0',
      '100', '1800000', '180000000',
      ?
    )`,
    [tenantId, companyId, now]
  );

  console.log('[Seed Phase 5] POS terminal and weight scale product seeded successfully.');

  // ==========================================
  // فاز ۶: ماژول رستوران، کافی‌شاپ، منو، دستور پخت، میزها و پیک
  // ==========================================
  console.log('[Seed Phase 6] Seeding Restaurant sections, tables, categories, recipes and raw ingredients...');

  // ۱. بخش‌های سالن رستوران
  await run(
    `INSERT OR REPLACE INTO restaurant_sections (id, tenant_id, company_id, branch_id, code, title, description, created_at)
     VALUES (?, ?, ?, ?, 'SEC-MAIN', 'سالن مرکزی ونک', 'سالن اصلی با ظرفیت ۶۰ نفر و موسیقی ملایم', ?)`,
    ['sec-main', tenantId, companyId, branchId, now]
  );
  await run(
    `INSERT OR REPLACE INTO restaurant_sections (id, tenant_id, company_id, branch_id, code, title, description, created_at)
     VALUES (?, ?, ?, ?, 'SEC-VIP', 'بخش اختصاصی VIP', 'سالن جلسات تجاری و مراسم خصوصی', ?)`,
    ['sec-vip', tenantId, companyId, branchId, now]
  );

  // ۲. میزهای سالن
  await run(
    `INSERT OR REPLACE INTO restaurant_tables (id, tenant_id, company_id, branch_id, section_id, table_number, title, capacity, status, is_active, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'sec-main', 'T01', 'میز شماره ۱ (کنار پنجره)', 4, 'VACANT', 1, ?, ?)`,
    ['tbl-01', tenantId, companyId, branchId, now, now]
  );
  await run(
    `INSERT OR REPLACE INTO restaurant_tables (id, tenant_id, company_id, branch_id, section_id, table_number, title, capacity, status, is_active, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'sec-main', 'T02', 'میز شماره ۲ (دونفره دنج)', 2, 'VACANT', 1, ?, ?)`,
    ['tbl-02', tenantId, companyId, branchId, now, now]
  );
  await run(
    `INSERT OR REPLACE INTO restaurant_tables (id, tenant_id, company_id, branch_id, section_id, table_number, title, capacity, status, is_active, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'sec-vip', 'VIP01', 'میز بزرگ VIP و اتاق کنفرانس', 8, 'VACANT', 1, ?, ?)`,
    ['tbl-vip', tenantId, companyId, branchId, now, now]
  );

  // ۳. دسته‌بندی منوی رستوران
  await run(
    `INSERT OR REPLACE INTO restaurant_menu_categories (id, tenant_id, company_id, code, title, icon, display_order, kitchen_station, is_active, created_at)
     VALUES (?, ?, ?, 'MCAT-PIZZA', 'پیتزا و گریل تخصصی', 'pizza', 1, 'HOT_KITCHEN', 1, ?)`,
    ['mcat-pizza', tenantId, companyId, now]
  );
  await run(
    `INSERT OR REPLACE INTO restaurant_menu_categories (id, tenant_id, company_id, code, title, icon, display_order, kitchen_station, is_active, created_at)
     VALUES (?, ?, ?, 'MCAT-COFFEE', 'بار تخصصی قهوه و بارتندری', 'coffee', 2, 'BAR_CAFE', 1, ?)`,
    ['mcat-coffee', tenantId, companyId, now]
  );

  // ۴. مواد اولیه آشپزخانه رستوران
  const rawProducts = [
    { id: 'raw-dough', code: 'RAW-01', name: 'خمیر پیتزا تخمیر سرد (کیلوگرم)', price: '400000' },
    { id: 'raw-cheese', code: 'RAW-02', name: 'پنیر موزارلا قالبی درجه یک (کیلوگرم)', price: '1500000' },
    { id: 'raw-pepperoni', code: 'RAW-03', name: 'سوسیس پپرونی دودی مرغوب (کیلوگرم)', price: '3000000' },
    { id: 'raw-sauce', code: 'RAW-04', name: 'سس مارینارا دست‌ساز (کیلوگرم)', price: '600000' },
    { id: 'raw-coffee', code: 'RAW-05', name: 'دانه قهوه اسپرسو ۱۰۰٪ عربیکا (کیلوگرم)', price: '4000000' }
  ];

  for (const rp of rawProducts) {
    await run(
      `INSERT OR REPLACE INTO products (
        id, tenant_id, company_id, category_id, unit_id, code, name, type,
        barcode, tax_exempt, vat_rate, valuation_method, min_stock_alert, max_stock_alert,
        sell_price, purchase_price, is_active, created_at
      ) VALUES (?, ?, ?, 'cat-digital', 'unit-piece', ?, ?, 'GOODS', NULL, 1, '0.00', 'MOVING_AVERAGE', '5', '200', '0', ?, 1, ?)`,
      [rp.id, tenantId, companyId, rp.code, rp.name, rp.price, now]
    );

    // ثبت موجودی اولیه کاردکس مواد در انبار مرکزی
    await run(
      `INSERT OR REPLACE INTO stock_ledger_entries (
        id, tenant_id, company_id, warehouse_id, product_id, variant_id,
        document_type, document_id, document_number, date_shamsi,
        in_quantity, in_unit_cost, in_total_cost,
        out_quantity, out_unit_cost, out_total_cost,
        balance_quantity, balance_unit_cost, balance_total_cost,
        created_at
      ) VALUES (
        ?, ?, ?, 'wh-main', ?, NULL,
        'INITIAL_BALANCE', 'init-raw', 'INIT-RAW-01', '1403/01/01',
        '100', ?, ?,
        '0', '0', '0',
        '100', ?, ?,
        ?
      )`,
      [
        `stk-init-${rp.id}`,
        tenantId,
        companyId,
        rp.id,
        rp.price,
        (Number(rp.price) * 100).toString(),
        rp.price,
        (Number(rp.price) * 100).toString(),
        now
      ]
    );
  }

  // ۵. غذاهای نهایی منو
  await run(
    `INSERT OR REPLACE INTO products (
      id, tenant_id, company_id, category_id, unit_id, code, name, type,
      barcode, tax_exempt, vat_rate, valuation_method, min_stock_alert, max_stock_alert,
      sell_price, purchase_price, is_active, created_at
    ) VALUES (?, ?, ?, 'cat-digital', 'unit-piece', 'MENU-101', 'پیتزا پپرونی ایتالیایی ۳۲ سانتی', 'GOODS', '2800101000000', 0, '0.10', 'MOVING_AVERAGE', '0', '0', '1800000', '493400', 1, ?)`,
    ['prod-pizza-pep', tenantId, companyId, now]
  );
  await run(
    `INSERT OR REPLACE INTO products (
      id, tenant_id, company_id, category_id, unit_id, code, name, type,
      barcode, tax_exempt, vat_rate, valuation_method, min_stock_alert, max_stock_alert,
      sell_price, purchase_price, is_active, created_at
    ) VALUES (?, ?, ?, 'cat-digital', 'unit-piece', 'MENU-102', 'قهوه اسپرسو دبل شات ۱۰۰٪ عربیکا', 'GOODS', '2800102000000', 0, '0.10', 'MOVING_AVERAGE', '0', '0', '450000', '75600', 1, ?)`,
    ['prod-espresso', tenantId, companyId, now]
  );

  // ۶. دستور پخت (BOM) پیتزا پپرونی
  await run(
    `INSERT OR REPLACE INTO restaurant_recipes (id, tenant_id, company_id, menu_product_id, yield_quantity, notes, is_active, created_at, updated_at)
     VALUES (?, ?, ?, 'prod-pizza-pep', '1', 'دستور پخت استاندارد پیتزا پپرونی با تخمیر ۴۸ ساعته', 1, ?, ?)`,
    ['rec-pizza-pep', tenantId, companyId, now, now]
  );

  const pizzaIngredients = [
    { id: 'ri-01', rawId: 'raw-dough', qty: '0.200', waste: '0' },      // ۲۰۰ گرم خمیر
    { id: 'ri-02', rawId: 'raw-cheese', qty: '0.100', waste: '3' },     // ۱۰۰ گرم پنیر موزارلا (۳٪ ضایعات)
    { id: 'ri-03', rawId: 'raw-pepperoni', qty: '0.080', waste: '0' },  // ۸۰ گرم پپرونی
    { id: 'ri-04', rawId: 'raw-sauce', qty: '0.030', waste: '5' }       // ۳۰ گرم سس (۵٪ ضایعات)
  ];
  for (const it of pizzaIngredients) {
    await run(
      `INSERT OR REPLACE INTO restaurant_recipe_items (id, recipe_id, raw_product_id, quantity, waste_percentage, created_at)
       VALUES (?, 'rec-pizza-pep', ?, ?, ?, ?)`,
      [it.id, it.rawId, it.qty, it.waste, now]
    );
  }

  // دستور پخت قهوه اسپرسو دبل
  await run(
    `INSERT OR REPLACE INTO restaurant_recipes (id, tenant_id, company_id, menu_product_id, yield_quantity, notes, is_active, created_at, updated_at)
     VALUES (?, ?, ?, 'prod-espresso', '1', 'اسپرسو دبل شات استاندارد ۱۸ گرم سابه قهوه', 1, ?, ?)`,
    ['rec-espresso', tenantId, companyId, now, now]
  );
  await run(
    `INSERT OR REPLACE INTO restaurant_recipe_items (id, recipe_id, raw_product_id, quantity, waste_percentage, created_at)
     VALUES (?, 'rec-espresso', 'raw-coffee', '0.018', '5', ?)`,
    ['ri-esp-01', now]
  );

  // ۷. ثبت شخص پیک دلیوری
  await run(
    `INSERT OR REPLACE INTO parties (id, tenant_id, company_id, party_type, name, first_name, last_name, mobile, is_customer, is_supplier, is_employee, floating_dimension_id, is_active, created_at)
     VALUES (?, ?, ?, 'INDIVIDUAL_IRANIAN', 'آقای رضا مرادی (پیک دلیوری)', 'رضا', 'مرادی', '09123334455', 0, 0, 1, 'dim-cust-1', 1, ?)`,
    ['party-courier-1', tenantId, companyId, now]
  );

  console.log('[Seed Phase 6] Restaurant baseline seeded successfully.');

  console.log('[Seed] Database populated successfully with full enterprise accounting baseline!');
  db.close();
}

if (require.main === module) {
  runSeed().catch((err) => {
    console.error('[Seed] Error during seeding:', err);
    process.exit(1);
  });
}
