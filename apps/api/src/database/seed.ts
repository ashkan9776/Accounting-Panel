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
    DELETE FROM restaurant_deliveries;
    DELETE FROM restaurant_order_items;
    DELETE FROM restaurant_kds_tickets;
    DELETE FROM restaurant_orders;
    DELETE FROM restaurant_recipe_items;
    DELETE FROM restaurant_recipes;
    DELETE FROM restaurant_tables;
    DELETE FROM restaurant_sections;
    DELETE FROM manufacturing_scraps;
    DELETE FROM manufacturing_order_operations;
    DELETE FROM manufacturing_order_materials;
    DELETE FROM manufacturing_production_orders;
    DELETE FROM manufacturing_routings;
    DELETE FROM manufacturing_bom_items;
    DELETE FROM manufacturing_boms;
    DELETE FROM manufacturing_work_centers;
    DELETE FROM tax_statutory_reports;
    DELETE FROM fixed_asset_depreciation_records;
    DELETE FROM fixed_assets;
    DELETE FROM payroll_slips;
    DELETE FROM payroll_periods;
    DELETE FROM payroll_contracts;
    DELETE FROM payroll_employees;
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

  const permissionsList = [
    { id: 'perm-acc-write', code: 'ACCOUNTING_WRITE', title: 'ثبت اسناد دوبل', module: 'ACCOUNTING' },
    { id: 'perm-acc-close', code: 'ACCOUNTING_CLOSE', title: 'بستن حساب‌ها و دوره مالی', module: 'ACCOUNTING' },
    { id: 'perm-payroll-manage', code: 'PAYROLL_MANAGE', title: 'مدیریت و تایید حقوق و دستمزد', module: 'PAYROLL' },
    { id: 'perm-saas-admin', code: 'SAAS_ADMIN', title: 'مدیریت اشتراک و سهمیه‌ها', module: 'SAAS' },
  ];
  for (const perm of permissionsList) {
    await run(
      `INSERT OR REPLACE INTO permissions (id, code, module, title) VALUES (?, ?, ?, ?)`,
      [perm.id, perm.code, perm.module, perm.title],
    );
    await run(
      `INSERT OR REPLACE INTO role_permissions (role_id, permission_id) VALUES (?, ?)`,
      [roleAdminId, perm.id],
    );
  }

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

  // ==========================================
  // فاز ۷: ماژول جامع تولید و بهای تمام‌شده (Manufacturing Baseline)
  // ==========================================
  // ۱. مراکز کاری تولید
  const workCenters = [
    {
      id: 'wc-assembly',
      code: 'WC-101',
      name: 'مرکز کاری مونتاژ و لحیم‌کاری بردهای الکترونیک',
      department: 'مونتاژ سخت‌افزار',
      laborRate: '2500000',
      overheadRate: '1500000'
    },
    {
      id: 'wc-qc-packaging',
      code: 'WC-102',
      name: 'مرکز کاری تست نهایی، کنترل کیفیت و بسته‌بندی',
      department: 'کنترل کیفیت و بسته‌بندی',
      laborRate: '2000000',
      overheadRate: '1000000'
    }
  ];

  for (const wc of workCenters) {
    await run(
      `INSERT OR REPLACE INTO manufacturing_work_centers (
        id, tenant_id, company_id, code, name, department,
        capacity_hours_per_day, labor_hourly_rate, overhead_hourly_rate, is_active, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, '8', ?, ?, 1, ?)`,
      [wc.id, tenantId, companyId, wc.code, wc.name, wc.department, wc.laborRate, wc.overheadRate, now]
    );
  }

  // ۲. قطعات و مواد اولیه صنعتی تولید کارتخوان
  const mfgComponents = [
    { id: 'comp-mainboard', code: 'COMP-MB-900', name: 'برد پردازنده و تراشه مرکزی پوز X-900', cost: '15000000' },
    { id: 'comp-touchscreen', code: 'COMP-LCD-55', name: 'نمایشگر لمسی ۵.۵ اینچ IPS صنعتی', cost: '8000000' },
    { id: 'comp-thermal-printer', code: 'COMP-PRN-58', name: 'ماژول پرینتر حرارتی ۵۸ میلی‌متری سریع', cost: '5000000' },
    { id: 'comp-chassis', code: 'COMP-CASE-01', name: 'قاب و شاسی پلی‌کربنات ضدضربه پوز', cost: '3000000' },
    { id: 'comp-battery', code: 'COMP-BAT-5200', name: 'باتری لیتیومی ۵۲۰۰ میلی‌آمپر صنعتی پوز', cost: '4000000' }
  ];

  for (const comp of mfgComponents) {
    await run(
      `INSERT OR REPLACE INTO products (
        id, tenant_id, company_id, category_id, unit_id, code, name, type,
        barcode, tax_exempt, vat_rate, valuation_method, min_stock_alert, max_stock_alert,
        sell_price, purchase_price, is_active, created_at
      ) VALUES (?, ?, ?, 'cat-digital', 'unit-piece', ?, ?, 'GOODS', NULL, 0, '0.10', 'MOVING_AVERAGE', '10', '1000', '0', ?, 1, ?)`,
      [comp.id, tenantId, companyId, comp.code, comp.name, comp.cost, now]
    );

    // موجودی ۵۰۰ عددی قطعات اولیه در انبار مواد wh-main
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
        'INITIAL_BALANCE', 'init-mfg-comp', 'INIT-MFG-01', '1403/01/01',
        '500', ?, ?,
        '0', '0', '0',
        '500', ?, ?,
        ?
      )`,
      [
        `stk-init-${comp.id}`,
        tenantId,
        companyId,
        comp.id,
        comp.cost,
        (Number(comp.cost) * 500).toString(),
        comp.cost,
        (Number(comp.cost) * 500).toString(),
        now
      ]
    );
  }

  // ۳. محصول نهایی تولیدی: پوز اندرویدی پیشرو مدل X-900
  await run(
    `INSERT OR REPLACE INTO products (
      id, tenant_id, company_id, category_id, unit_id, code, name, type,
      barcode, tax_exempt, vat_rate, valuation_method, min_stock_alert, max_stock_alert,
      sell_price, purchase_price, is_active, created_at
    ) VALUES (?, ?, ?, 'cat-digital', 'unit-piece', 'PROD-POS-X900', 'کارتخوان هوشمند لمسی پیشرو مدل X-900', 'GOODS', '6260000009001', 0, '0.10', 'MOVING_AVERAGE', '5', '500', '55000000', '37890000', 1, ?)`,
    ['prod-smart-pos', tenantId, companyId, now]
  );

  // ۴. فرمول ساخت (BOM) استاندارد
  await run(
    `INSERT OR REPLACE INTO manufacturing_boms (
      id, tenant_id, company_id, product_id, bom_code, bom_name, version,
      base_quantity, is_default, is_active,
      standard_material_cost, standard_labor_cost, standard_overhead_cost, standard_total_cost,
      description, created_at, updated_at
    ) VALUES (
      'bom-smart-pos-v1', ?, ?, 'prod-smart-pos', 'BOM-POS-X900-V1', 'فرمول ساخت استاندارد کارتخوان لمسی X-900', '1.0',
      '1', 1, 1,
      '35140000', '1750000', '1000000', '37890000',
      'فرمول استاندارد کارخانه‌ای شامل قطعات، مونتاژ، تست نهایی و ضایعات عادی',
      ?, ?
    )`,
    [tenantId, companyId, now, now]
  );

  // ۵. اقلام فرمول ساخت با درصد ضایعات عادی مجاز
  const bomItems = [
    { id: 'bi-01', compId: 'comp-mainboard', qty: '1', scrap: '0' },
    { id: 'bi-02', compId: 'comp-touchscreen', qty: '1', scrap: '1' },
    { id: 'bi-03', compId: 'comp-thermal-printer', qty: '1', scrap: '0' },
    { id: 'bi-04', compId: 'comp-chassis', qty: '1', scrap: '2' },
    { id: 'bi-05', compId: 'comp-battery', qty: '1', scrap: '0' }
  ];
  for (const item of bomItems) {
    await run(
      `INSERT OR REPLACE INTO manufacturing_bom_items (
        id, bom_id, component_product_id, quantity, scrap_percentage, is_sub_assembly, line_order, created_at
      ) VALUES (?, 'bom-smart-pos-v1', ?, ?, ?, 0, 1, ?)`,
      [item.id, item.compId, item.qty, item.scrap, now]
    );
  }

  // ۶. مراحل روتینگ و ایستگاه‌های عملیات
  await run(
    `INSERT OR REPLACE INTO manufacturing_routings (
      id, bom_id, work_center_id, step_number, operation_name,
      setup_time_hours, run_time_hours_per_unit, labor_hours_per_unit, machine_hours_per_unit, created_at
    ) VALUES (
      'route-01', 'bom-smart-pos-v1', 'wc-assembly', 1, 'مونتاژ برد، ماژول‌ها و اتصالات سخت‌افزاری',
      '0.1', '0.5', '0.5', '0.5', ?
    )`,
    [now]
  );
  await run(
    `INSERT OR REPLACE INTO manufacturing_routings (
      id, bom_id, work_center_id, step_number, operation_name,
      setup_time_hours, run_time_hours_per_unit, labor_hours_per_unit, machine_hours_per_unit, created_at
    ) VALUES (
      'route-02', 'bom-smart-pos-v1', 'wc-qc-packaging', 2, 'تست کنترل کیفیت سخت‌افزار، کالیبراسیون و بسته‌بندی',
      '0.05', '0.25', '0.25', '0.25', ?
    )`,
    [now]
  );

  console.log('[Seed Phase 7] Manufacturing baseline seeded successfully.');

  // ==========================================
  // فاز ۸: حقوق و دستمزد، دارایی‌های ثابت و گزارش‌های مالیاتی (Phase 8 Baseline)
  // ==========================================
  // ۱. پرسنل و احکام کارگزینی
  const employeesData = [
    {
      partyId: 'party-emp-1',
      empId: 'emp-01',
      code: 'EMP-101',
      nationalId: '0012345678',
      firstName: 'سینا',
      lastName: 'مرادی',
      fatherName: 'محمود',
      birthDate: '1368/04/15',
      hireDate: '1401/01/15',
      insuranceNumber: '11223344',
      bankName: 'بانک ملت',
      bankAccount: '1234567890',
      sheba: 'IR120120000000001234567890',
      dept: 'فنی و مهندسی',
      jobTitle: 'مدیر فنی سخت‌افزار',
      contractId: 'cnt-01',
      baseSalary: '180000000',
      housing: '9000000',
      grocery: '14000000',
      seniority: '2100000',
      childCount: 1,
      childAllowance: '7166184'
    },
    {
      partyId: 'party-emp-2',
      empId: 'emp-02',
      code: 'EMP-102',
      nationalId: '0023456789',
      firstName: 'مریم',
      lastName: 'صادقی',
      fatherName: 'احمد',
      birthDate: '1372/08/20',
      hireDate: '1402/03/01',
      insuranceNumber: '55667788',
      bankName: 'بانک پاسارگاد',
      bankAccount: '9876543210',
      sheba: 'IR540570000000009876543210',
      dept: 'مالی و اداری',
      jobTitle: 'کارشناس ارشد حسابداری',
      contractId: 'cnt-02',
      baseSalary: '150000000',
      housing: '9000000',
      grocery: '14000000',
      seniority: '0',
      childCount: 0,
      childAllowance: '0'
    }
  ];

  for (const emp of employeesData) {
    // ثبت تفصیلی پرسنل در جدول اشخاص
    await run(
      `INSERT OR REPLACE INTO parties (
        id, tenant_id, company_id, party_type, name, first_name, last_name,
        national_id, mobile, is_customer, is_supplier, is_employee, floating_dimension_id, is_active, created_at
      ) VALUES (?, ?, ?, 'INDIVIDUAL_IRANIAN', ?, ?, ?, ?, '09121112233', 0, 0, 1, 'dim-cust-1', 1, ?)`,
      [
        emp.partyId,
        tenantId,
        companyId,
        `${emp.firstName} ${emp.lastName}`,
        emp.firstName,
        emp.lastName,
        emp.nationalId,
        now
      ]
    );

    // ثبت پرونده پرسنل
    await run(
      `INSERT OR REPLACE INTO payroll_employees (
        id, tenant_id, company_id, party_id, personnel_code, national_id,
        first_name, last_name, father_name, birth_date_shamsi, hire_date_shamsi,
        insurance_number, bank_name, bank_account_number, bank_sheba_number,
        department, job_title, is_active, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
      [
        emp.empId,
        tenantId,
        companyId,
        emp.partyId,
        emp.code,
        emp.nationalId,
        emp.firstName,
        emp.lastName,
        emp.fatherName,
        emp.birthDate,
        emp.hireDate,
        emp.insuranceNumber,
        emp.bankName,
        emp.bankAccount,
        emp.sheba,
        emp.dept,
        emp.jobTitle,
        now
      ]
    );

    // ثبت حکم کارگزینی
    await run(
      `INSERT OR REPLACE INTO payroll_contracts (
        id, tenant_id, company_id, employee_id, contract_type,
        start_date_shamsi, end_date_shamsi, monthly_base_salary,
        monthly_housing_allowance, monthly_grocery_allowance, monthly_seniority_bonus,
        child_count, monthly_child_allowance_per_child, is_active, created_at
      ) VALUES (?, ?, ?, ?, 'PERMANENT', '1403/01/01', '1403/12/29', ?, ?, ?, ?, ?, ?, 1, ?)`,
      [
        emp.contractId,
        tenantId,
        companyId,
        emp.empId,
        emp.baseSalary,
        emp.housing,
        emp.grocery,
        emp.seniority,
        emp.childCount,
        emp.childAllowance,
        now
      ]
    );
  }

  // ۲. دارایی‌های ثابت نمونه
  const fixedAssetsData = [
    {
      id: 'ast-srv-01',
      code: 'AST-SRV-01',
      title: 'سرور مرکزی دیتاسنتر HP ProLiant Gen10',
      category: 'FURNITURE_OFFICE',
      date: '1403/01/01',
      cost: '240000000',
      salvage: '0',
      method: 'STRAIGHT_LINE',
      rate: null,
      usefulLife: 4,
      location: 'اتاق سرور ساختمان مرکزی'
    },
    {
      id: 'ast-car-01',
      code: 'AST-CAR-01',
      title: 'خودرو پژو ۲۰۷ دنده‌ای اداری شرکت',
      category: 'VEHICLES',
      date: '1403/01/01',
      cost: '600000000',
      salvage: '60000000',
      method: 'STRAIGHT_LINE',
      rate: '20',
      usefulLife: null,
      location: 'پارکینگ مرکزی شرکت'
    }
  ];

  for (const ast of fixedAssetsData) {
    await run(
      `INSERT OR REPLACE INTO fixed_assets (
        id, tenant_id, company_id, branch_id, asset_code, title, category,
        purchase_date_shamsi, historical_cost, salvage_value, depreciation_method,
        annual_rate_percentage, useful_life_years, accumulated_depreciation, book_value,
        status, cost_center_dimension_id, location, created_at
      ) VALUES (?, ?, ?, 'branch-central', ?, ?, ?, ?, ?, ?, ?, ?, ?, '0', ?, 'ACTIVE', 'dim-cc-mgmt', ?, ?)`,
      [
        ast.id,
        tenantId,
        companyId,
        ast.code,
        ast.title,
        ast.category,
        ast.date,
        ast.cost,
        ast.salvage,
        ast.method,
        ast.rate,
        ast.usefulLife,
        ast.cost,
        ast.location,
        now
      ]
    );
  }

  console.log('[Seed Phase 8] Payroll and Fixed Assets baseline seeded successfully.');

  // ==========================================
  // فاز ۹: داشبورد هوش تجاری و هشدارهای مالی
  // ==========================================
  console.log('[Seed Phase 9] Seeding Dashboard widgets and Financial Alert rules...');
  const defaultWidgets = [
    {
      id: 'wdg-kpi-1',
      type: 'KPI_CARD',
      title: 'شاخص‌های کلیدی مالی و نقدینگی',
      x: 0,
      y: 0,
      w: 12,
      h: 2,
      config: JSON.stringify({ metrics: ['CASH_BALANCE', 'MONTHLY_SALES', 'GROSS_PROFIT', 'NET_PROFIT'] })
    },
    {
      id: 'wdg-cash-trend-1',
      type: 'CASH_FLOW_CHART',
      title: 'روند جریان نقدینگی و مانده تجمیعی ۳۰ روزه',
      x: 0,
      y: 2,
      w: 8,
      h: 4,
      config: JSON.stringify({ periodDays: 30, chartType: 'AREA' })
    },
    {
      id: 'wdg-aging-1',
      type: 'AGING_BAR',
      title: 'تحلیل سنی مطالبات سررسید گذشته (Aging)',
      x: 8,
      y: 2,
      w: 4,
      h: 4,
      config: JSON.stringify({ showPercentages: true })
    }
  ];

  for (const w of defaultWidgets) {
    await run(
      `INSERT OR REPLACE INTO dashboard_widgets (
        id, tenant_id, user_id, widget_type, title, position_x, position_y, width, height, config_json, is_visible, created_at
      ) VALUES (?, ?, 'user-admin-1', ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
      [w.id, tenantId, w.type, w.title, w.x, w.y, w.w, w.h, w.config, now]
    );
  }

  const defaultAlertRules = [
    {
      id: 'rule-alert-cash',
      code: 'CASH_DEFICIT',
      title: 'هشدار کسری نقدینگی برای پاس شدن چک‌های صیاد',
      threshold: '0',
      severity: 'CRITICAL'
    },
    {
      id: 'rule-alert-aging',
      code: 'OVERDUE_RECEIVABLES',
      title: 'هشدار مطالبات معوق با ریسک عدم وصول',
      threshold: '50000000',
      severity: 'WARNING'
    },
    {
      id: 'rule-alert-tax',
      code: 'TAX_DEADLINE',
      title: 'یادآوری مهلت تسویه اظهارنامه فصلی ارزش افزوده',
      threshold: '0',
      severity: 'INFO'
    }
  ];

  for (const ar of defaultAlertRules) {
    await run(
      `INSERT OR REPLACE INTO financial_alert_rules (
        id, tenant_id, company_id, rule_code, title, threshold_amount, severity, is_active, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)`,
      [ar.id, tenantId, companyId, ar.code, ar.title, ar.threshold, ar.severity, now]
    );
  }

  console.log('[Seed Phase 9] Dashboard widgets and alert rules seeded successfully.');

  // ==========================================
  // فاز ۱۰: فروش آنلاین، سخت‌افزار، ویزیتور و تردد (Phase 10)
  // ==========================================
  console.log('[Seed Phase 10] Seeding Hardware Terminals, Online Orders and Attendance Baseline...');

  // ۱. تجهیزات سخت‌افزاری فروشگاهی و اداری
  const hardwareTerminals = [
    {
      id: 'term-printer-1',
      deviceType: 'PRINTER_ESC_POS',
      title: 'چاپگر حرارتی بیکسلون صندوق ۱',
      ip: '192.168.1.150',
      port: 9100,
      serial: 'BIX-SRP-350-001',
      config: JSON.stringify({ paperWidth: 80, feedLines: 3, autoCut: true })
    },
    {
      id: 'term-pcpos-1',
      deviceType: 'PC_POS',
      title: 'پایانه کارتخوان به‌پرداخت ملت صندوق ۱',
      ip: '192.168.1.151',
      port: 8888,
      serial: 'BMP-ING-9220-001',
      config: JSON.stringify({ terminalId: '68541234', merchantId: '1002547', protocol: 'BEHPARDAKHT_LAN' })
    },
    {
      id: 'term-scale-1',
      deviceType: 'DIGITAL_SCALE',
      title: 'ترازوی دیجیتال فروشگاهی محک ۱',
      ip: '192.168.1.152',
      port: 4001,
      serial: 'MAHAK-15000-001',
      config: JSON.stringify({ baudRate: 9600, protocol: 'TOLEDO_CONTINUOUS' })
    },
    {
      id: 'term-attendance-1',
      deviceType: 'ATTENDANCE_TERMINAL',
      title: 'دستگاه حضور و غیاب علم و صنعت ورودی پرسنل',
      ip: '192.168.1.160',
      port: 4370,
      serial: 'ZK-UFACE-800-001',
      config: JSON.stringify({ syncIntervalMinutes: 15, protocol: 'ZK_TECO_TCP' })
    }
  ];

  for (const t of hardwareTerminals) {
    await run(
      `INSERT OR REPLACE INTO hardware_terminals (
        id, tenant_id, company_id, branch_id, device_type, title, ip_address, port, serial_number, is_active, config_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
      [t.id, tenantId, companyId, branchId, t.deviceType, t.title, t.ip, t.port, t.serial, t.config, now]
    );
  }

  // ۲. لاگ‌های پایه تردد پرسنل برای روز ۲۹ اسفند
  const attendanceLogs = [
    {
      id: 'log-att-1',
      empId: 'emp-rezaei-1',
      termId: 'term-attendance-1',
      dateShamsi: '1403/12/29',
      time: '08:00:00',
      type: 'CLOCK_IN'
    },
    {
      id: 'log-att-2',
      empId: 'emp-rezaei-1',
      termId: 'term-attendance-1',
      dateShamsi: '1403/12/29',
      time: '17:30:00', // ۹.۵ ساعت حضور (۵۷۰ دقیقه = ۴۸۰ دقیقه موظف + ۹۰ دقیقه اضافه‌کاری)
      type: 'CLOCK_OUT'
    }
  ];

  for (const al of attendanceLogs) {
    await run(
      `INSERT OR REPLACE INTO attendance_logs (
        id, tenant_id, company_id, employee_id, terminal_id, log_date_shamsi, log_time, log_type, is_processed, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
      [al.id, tenantId, companyId, al.empId, al.termId, al.dateShamsi, al.time, al.type, now]
    );
  }

  console.log('[Seed Phase 10] Phase 10 hardware terminals and attendance logs seeded successfully.');

  // =========================================================================
  // فاز ۱۱: بذر اولیه زیرساخت SaaS، اشتراک‌ها، سهمیه‌ها و تنظیمات امنیتی
  // =========================================================================
  console.log('[Seed Phase 11] Seeding SaaS Plans, Tenant Subscriptions, Usage Quotas and Security Baseline...');

  // ۱. پلن‌های استاندارد
  const saasPlans = [
    {
      id: 'plan-free-trial',
      code: 'TRIAL',
      nameFa: 'نسخه آزمایشی رایگان (۱۴ روزه)',
      tier: 'FREE',
      monthlyPrice: '0',
      yearlyPrice: '0',
      maxUsers: 1,
      maxBranches: 1,
      maxMonthlyTransactions: 200,
      allowedModules: ['GENERAL_LEDGER', 'TREASURY', 'INVENTORY', 'SALES'],
      hasApiAccess: 0,
      hasAuditChainVerification: 1,
      storageQuotaMb: 100
    },
    {
      id: 'plan-starter',
      code: 'STARTER',
      nameFa: 'پایه کسب‌وکار و فروشگاهی',
      tier: 'STARTER',
      monthlyPrice: '4500000',
      yearlyPrice: '45000000',
      maxUsers: 5,
      maxBranches: 2,
      maxMonthlyTransactions: 2000,
      allowedModules: ['GENERAL_LEDGER', 'TREASURY', 'INVENTORY', 'SALES', 'MOADIAN', 'POS'],
      hasApiAccess: 0,
      hasAuditChainVerification: 1,
      storageQuotaMb: 1024
    },
    {
      id: 'plan-pro',
      code: 'PRO',
      nameFa: 'حرفه‌ای و چندشعبه‌ای (تولیدی و رستورانی)',
      tier: 'PRO',
      monthlyPrice: '12000000',
      yearlyPrice: '120000000',
      maxUsers: 20,
      maxBranches: 10,
      maxMonthlyTransactions: 15000,
      allowedModules: [
        'GENERAL_LEDGER',
        'TREASURY',
        'INVENTORY',
        'SALES',
        'MOADIAN',
        'POS',
        'RESTAURANT',
        'MANUFACTURING',
        'PAYROLL',
        'FIXED_ASSETS',
        'OMNICHANNEL'
      ],
      hasApiAccess: 1,
      hasAuditChainVerification: 1,
      storageQuotaMb: 10240
    },
    {
      id: 'plan-enterprise',
      code: 'ENTERPRISE',
      nameFa: 'سازمانی و هلدینگ (نامحدود)',
      tier: 'ENTERPRISE',
      monthlyPrice: '35000000',
      yearlyPrice: '350000000',
      maxUsers: 9999,
      maxBranches: 9999,
      maxMonthlyTransactions: 9999999,
      allowedModules: [
        'GENERAL_LEDGER',
        'TREASURY',
        'INVENTORY',
        'SALES',
        'MOADIAN',
        'POS',
        'RESTAURANT',
        'MANUFACTURING',
        'PAYROLL',
        'FIXED_ASSETS',
        'BI_REPORTS',
        'OMNICHANNEL',
        'INTEGRATION_API'
      ],
      hasApiAccess: 1,
      hasAuditChainVerification: 1,
      storageQuotaMb: 102400
    }
  ];

  for (const p of saasPlans) {
    await run(
      `INSERT OR REPLACE INTO saas_plans (
        id, code, name_fa, tier, monthly_price, yearly_price, max_users, max_branches,
        max_monthly_transactions, allowed_modules_json, has_api_access,
        has_audit_chain_verification, storage_quota_mb, is_active, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
      [
        p.id,
        p.code,
        p.nameFa,
        p.tier,
        p.monthlyPrice,
        p.yearlyPrice,
        p.maxUsers,
        p.maxBranches,
        p.maxMonthlyTransactions,
        JSON.stringify(p.allowedModules),
        p.hasApiAccess,
        p.hasAuditChainVerification,
        p.storageQuotaMb,
        now
      ]
    );
  }

  // ۲. اشتراک فعال سازمان اصلی (org-default)
  const oneYearFromNow = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
  await run(
    `INSERT OR REPLACE INTO tenant_subscriptions (
      id, organization_id, plan_id, status, started_at, expires_at, auto_renew,
      billing_cycle, payment_reference, created_at, updated_at
    ) VALUES (?, ?, ?, 'ACTIVE', ?, ?, 1, 'YEARLY', 'SHP-SUB-1403-001', ?, ?)`,
    ['sub-active-default', tenantId, 'plan-pro', now, oneYearFromNow, now, now]
  );

  // ۳. سهمیه و متغیرهای مصرف ماه جاری
  await run(
    `INSERT OR REPLACE INTO tenant_usage_quotas (
      id, organization_id, period_month, current_transactions, current_users,
      current_storage_mb, last_updated_at
    ) VALUES (?, ?, '1403-12', 145, 4, 85, ?)`,
    ['quota-default-1403-12', tenantId, now]
  );

  // ۴. تنظیمات امنیتی پایه کاربر ادمین (۲FA آماده و غیرفعال)
  await run(
    `INSERT OR REPLACE INTO user_security_settings (
      id, user_id, two_factor_enabled, two_factor_secret, backup_codes_json,
      last_password_change, failed_login_attempts, locked_until, updated_at
    ) VALUES (?, ?, 0, 'JBSWY3DPEHPK3PXP', ?, ?, 0, NULL, ?)`,
    ['sec-user-admin-1', 'user-admin-1', JSON.stringify(['A1B2C3D4', 'E5F6G7H8']), now, now]
  );

  console.log('[Seed Phase 11] SaaS plans, subscriptions, quotas and security settings seeded successfully.');

  console.log('[Seed] Database populated successfully with full enterprise accounting baseline!');
  db.close();
}

if (require.main === module) {
  runSeed().catch((err) => {
    console.error('[Seed] Error during seeding:', err);
    process.exit(1);
  });
}
