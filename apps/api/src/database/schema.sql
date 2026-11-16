-- ==========================================================
-- ساختار جداول پایگاه‌داده هسته پلتفرم حسابداری و مدیریت مالی (فاز ۱)
-- پشتیبانی کامل از Multi-tenancy، کدینگ درختی، اسناد دوبل، قوانین و ممیزی
-- ==========================================================

-- ۱. ساختار تنانت و سازمان
CREATE TABLE IF NOT EXISTS tenants (
    id TEXT PRIMARY KEY,
    subdomain TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    plan_id TEXT DEFAULT 'STANDARD',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS companies (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    legal_name TEXT NOT NULL,
    trade_name TEXT,
    national_id TEXT,
    economic_code TEXT,
    registration_number TEXT,
    tax_office_code TEXT,
    postal_code TEXT,
    address TEXT,
    phone TEXT,
    currency_code TEXT DEFAULT 'IRR',
    created_at TEXT NOT NULL,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

CREATE TABLE IF NOT EXISTS branches (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    company_id TEXT NOT NULL,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    is_central BOOLEAN DEFAULT FALSE,
    address TEXT,
    phone TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (company_id) REFERENCES companies(id)
);

CREATE TABLE IF NOT EXISTS fiscal_years (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    company_id TEXT NOT NULL,
    title TEXT NOT NULL,
    start_date_shamsi TEXT NOT NULL,
    end_date_shamsi TEXT NOT NULL,
    start_date_gregorian TEXT NOT NULL,
    end_date_gregorian TEXT NOT NULL,
    is_closed BOOLEAN DEFAULT FALSE,
    is_locked BOOLEAN DEFAULT FALSE,
    created_at TEXT NOT NULL,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (company_id) REFERENCES companies(id)
);

CREATE TABLE IF NOT EXISTS fiscal_periods (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    fiscal_year_id TEXT NOT NULL,
    period_number INTEGER NOT NULL,
    title TEXT NOT NULL,
    is_closed BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (fiscal_year_id) REFERENCES fiscal_years(id)
);

-- ۲. کاربران، نقش‌ها و امنیت (RBAC)
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    mobile TEXT NOT NULL,
    email TEXT,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    is_super_admin BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TEXT NOT NULL,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    UNIQUE(tenant_id, mobile)
);

CREATE TABLE IF NOT EXISTS roles (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    code TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

CREATE TABLE IF NOT EXISTS permissions (
    id TEXT PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    module TEXT NOT NULL,
    title TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS user_roles (
    user_id TEXT NOT NULL,
    role_id TEXT NOT NULL,
    branch_id TEXT,
    PRIMARY KEY (user_id, role_id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (role_id) REFERENCES roles(id)
);

CREATE TABLE IF NOT EXISTS role_permissions (
    role_id TEXT NOT NULL,
    permission_id TEXT NOT NULL,
    PRIMARY KEY (role_id, permission_id),
    FOREIGN KEY (role_id) REFERENCES roles(id),
    FOREIGN KEY (permission_id) REFERENCES permissions(id)
);

-- ۳. کدینگ حساب‌ها (گروه، کل، معین، تفصیلی شناور)
CREATE TABLE IF NOT EXISTS account_groups (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    company_id TEXT NOT NULL,
    code TEXT NOT NULL,
    title TEXT NOT NULL,
    nature TEXT NOT NULL,
    description TEXT,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    UNIQUE(tenant_id, company_id, code)
);

CREATE TABLE IF NOT EXISTS account_heads (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    company_id TEXT NOT NULL,
    group_id TEXT NOT NULL,
    code TEXT NOT NULL,
    title TEXT NOT NULL,
    nature TEXT NOT NULL,
    description TEXT,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (group_id) REFERENCES account_groups(id),
    UNIQUE(tenant_id, company_id, code)
);

CREATE TABLE IF NOT EXISTS account_subsidiaries (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    company_id TEXT NOT NULL,
    head_id TEXT NOT NULL,
    code TEXT NOT NULL,
    title TEXT NOT NULL,
    nature TEXT NOT NULL,
    requires_floating_dimension_1 BOOLEAN DEFAULT FALSE,
    allowed_dimension_1_type TEXT,
    requires_floating_dimension_2 BOOLEAN DEFAULT FALSE,
    allowed_dimension_2_type TEXT,
    requires_floating_dimension_3 BOOLEAN DEFAULT FALSE,
    allowed_dimension_3_type TEXT,
    is_currency_dependent BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    description TEXT,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (head_id) REFERENCES account_heads(id),
    UNIQUE(tenant_id, company_id, code)
);

CREATE TABLE IF NOT EXISTS floating_dimensions (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    company_id TEXT NOT NULL,
    dimension_type TEXT NOT NULL,
    code TEXT NOT NULL,
    title TEXT NOT NULL,
    reference_id TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TEXT NOT NULL,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    UNIQUE(tenant_id, company_id, code)
);

CREATE TABLE IF NOT EXISTS account_mappings (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    company_id TEXT NOT NULL,
    mapping_key TEXT NOT NULL,
    subsidiary_account_id TEXT NOT NULL,
    description TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (company_id) REFERENCES companies(id),
    FOREIGN KEY (subsidiary_account_id) REFERENCES account_subsidiaries(id),
    UNIQUE(tenant_id, company_id, mapping_key)
);

-- ۴. اسناد حسابداری و دفاتر قانونی
CREATE TABLE IF NOT EXISTS journal_entries (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    company_id TEXT NOT NULL,
    branch_id TEXT NOT NULL,
    fiscal_year_id TEXT NOT NULL,
    fiscal_period_id TEXT,
    sequence_number INTEGER NOT NULL,
    daily_number INTEGER NOT NULL,
    permanent_number INTEGER,
    entry_date_shamsi TEXT NOT NULL,
    entry_date_gregorian TEXT NOT NULL,
    entry_type TEXT NOT NULL,
    status TEXT NOT NULL,
    description TEXT NOT NULL,
    total_debit TEXT NOT NULL,
    total_credit TEXT NOT NULL,
    source_module TEXT,
    source_document_id TEXT,
    reversal_entry_id TEXT,
    reversed_entry_id TEXT,
    created_by_user_id TEXT NOT NULL,
    approved_by_user_id TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (company_id) REFERENCES companies(id),
    FOREIGN KEY (branch_id) REFERENCES branches(id),
    FOREIGN KEY (fiscal_year_id) REFERENCES fiscal_years(id),
    UNIQUE(tenant_id, company_id, fiscal_year_id, sequence_number),
    UNIQUE(tenant_id, company_id, fiscal_year_id, permanent_number)
);

CREATE TABLE IF NOT EXISTS journal_lines (
    id TEXT PRIMARY KEY,
    journal_entry_id TEXT NOT NULL,
    row_number INTEGER NOT NULL,
    subsidiary_account_id TEXT NOT NULL,
    floating_dimension_1_id TEXT,
    floating_dimension_2_id TEXT,
    floating_dimension_3_id TEXT,
    debit TEXT NOT NULL,
    credit TEXT NOT NULL,
    description TEXT NOT NULL,
    currency_code TEXT DEFAULT 'IRR',
    currency_rate TEXT DEFAULT '1',
    foreign_amount TEXT,
    FOREIGN KEY (journal_entry_id) REFERENCES journal_entries(id) ON DELETE CASCADE,
    FOREIGN KEY (subsidiary_account_id) REFERENCES account_subsidiaries(id)
);

-- ۵. موتور قوانین نسخه‌دار (Versioned Rules)
CREATE TABLE IF NOT EXISTS rule_definitions (
    id TEXT PRIMARY KEY,
    rule_code TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    description TEXT
);

CREATE TABLE IF NOT EXISTS rule_versions (
    id TEXT PRIMARY KEY,
    rule_definition_id TEXT NOT NULL,
    version_number INTEGER NOT NULL,
    effective_from_shamsi TEXT NOT NULL,
    effective_to_shamsi TEXT,
    legal_reference TEXT NOT NULL,
    parameters_json TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TEXT NOT NULL,
    FOREIGN KEY (rule_definition_id) REFERENCES rule_definitions(id)
);

-- ۶. زنجیره ممیزی امن (Audit Trail with Cryptographic Hash Chaining)
CREATE TABLE IF NOT EXISTS audit_logs (
    seq_no BIGSERIAL,
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    action TEXT NOT NULL,
    table_name TEXT NOT NULL,
    record_id TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    previous_hash TEXT NOT NULL,
    current_hash TEXT NOT NULL,
    payload_json TEXT NOT NULL,
    ip_address TEXT,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

-- ایندکس‌های بهینه‌سازی عملکرد
CREATE INDEX IF NOT EXISTS idx_journal_entries_tenant_date ON journal_entries(tenant_id, entry_date_shamsi);
CREATE INDEX IF NOT EXISTS idx_journal_entries_sequence ON journal_entries(tenant_id, fiscal_year_id, sequence_number);
CREATE INDEX IF NOT EXISTS idx_journal_lines_subsidiary ON journal_lines(subsidiary_account_id);
CREATE INDEX IF NOT EXISTS idx_journal_lines_floating_1 ON journal_lines(floating_dimension_1_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_timestamp ON audit_logs(tenant_id, timestamp);

-- ==========================================================
-- جداول فاز ۲: اشخاص، خزانه‌داری، بانک، صندوق، تنخواه، چک صیاد و تطبیق بانکی
-- ==========================================================

-- ۷. اشخاص و طرف‌های حساب (مشتری، تامین‌کننده، پرسنل، شریک)
CREATE TABLE IF NOT EXISTS parties (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    company_id TEXT NOT NULL,
    code TEXT,
    party_type TEXT NOT NULL, -- INDIVIDUAL_IRANIAN, LEGAL_ENTITY, PARTNERSHIP, FOREIGN_NATIONAL
    name TEXT NOT NULL,
    first_name TEXT,
    last_name TEXT,
    national_id TEXT, -- کد ملی ۱۰ رقمی یا شناسه ملی ۱۱ رقمی یا کد اتباع
    economic_code TEXT,
    registration_number TEXT,
    mobile TEXT,
    phone TEXT,
    email TEXT,
    postal_code TEXT,
    address TEXT,
    credit_limit TEXT DEFAULT '0', -- سقف اعتبار ریالی
    credit_terms_days INTEGER DEFAULT 0, -- مهلت تسویه نسیه
    is_customer BOOLEAN DEFAULT TRUE,
    is_supplier BOOLEAN DEFAULT FALSE,
    is_employee BOOLEAN DEFAULT FALSE,
    is_shareholder BOOLEAN DEFAULT FALSE,
    floating_dimension_id TEXT, -- لینک خودکار به تفصیلی شناور
    is_active BOOLEAN DEFAULT TRUE,
    created_at TEXT NOT NULL,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (company_id) REFERENCES companies(id),
    FOREIGN KEY (floating_dimension_id) REFERENCES floating_dimensions(id),
    UNIQUE(tenant_id, company_id, code)
);

-- ۸. حساب‌های بانکی
CREATE TABLE IF NOT EXISTS bank_accounts (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    company_id TEXT NOT NULL,
    bank_name TEXT NOT NULL,
    branch_name TEXT,
    branch_code TEXT,
    account_number TEXT NOT NULL,
    iban TEXT, -- شبا IR
    card_number TEXT,
    floating_dimension_id TEXT NOT NULL,
    initial_balance TEXT DEFAULT '0',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TEXT NOT NULL,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (company_id) REFERENCES companies(id),
    FOREIGN KEY (floating_dimension_id) REFERENCES floating_dimensions(id)
);

-- ۹. صندوق‌ها (Cash Desks)
CREATE TABLE IF NOT EXISTS cash_desks (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    company_id TEXT NOT NULL,
    branch_id TEXT NOT NULL,
    code TEXT NOT NULL,
    title TEXT NOT NULL,
    floating_dimension_id TEXT NOT NULL,
    initial_balance TEXT DEFAULT '0',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TEXT NOT NULL,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (company_id) REFERENCES companies(id),
    FOREIGN KEY (branch_id) REFERENCES branches(id),
    FOREIGN KEY (floating_dimension_id) REFERENCES floating_dimensions(id)
);

-- ۱۰. تنخواه‌گردان‌ها (Petty Cash Funds)
CREATE TABLE IF NOT EXISTS petty_cash_funds (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    company_id TEXT NOT NULL,
    branch_id TEXT NOT NULL,
    code TEXT NOT NULL,
    title TEXT NOT NULL,
    custodian_party_id TEXT NOT NULL, -- تنخواه‌دار
    ceiling_amount TEXT NOT NULL, -- سقف تنخواه
    floating_dimension_id TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TEXT NOT NULL,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (company_id) REFERENCES companies(id),
    FOREIGN KEY (branch_id) REFERENCES branches(id),
    FOREIGN KEY (custodian_party_id) REFERENCES parties(id),
    FOREIGN KEY (floating_dimension_id) REFERENCES floating_dimensions(id)
);

-- ۱۱. چک‌های صیادی (دریافتی و پرداختی)
CREATE TABLE IF NOT EXISTS cheques (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    company_id TEXT NOT NULL,
    branch_id TEXT NOT NULL,
    cheque_direction TEXT NOT NULL, -- RECEIVABLE (دریافتی), PAYABLE (پرداختی)
    sayad_id TEXT NOT NULL, -- شناسه ۱۶ رقمی صیادی
    cheque_serial_number TEXT NOT NULL, -- سری و سریال چک
    bank_name TEXT NOT NULL,
    bank_branch_name TEXT,
    drawer_iban TEXT,
    drawer_party_id TEXT, -- صادرکننده
    payee_party_id TEXT, -- دریافت‌کننده / ذینفع
    amount TEXT NOT NULL, -- مبلغ چک (Decimal string)
    issue_date_shamsi TEXT NOT NULL,
    due_date_shamsi TEXT NOT NULL,
    current_status TEXT NOT NULL, -- AT_HAND, IN_CLEARING, CLEARED, BOUNCED, TRANSFERRED, CANCELLED
    current_holder_dimension_id TEXT, -- صندوق یا بانکی که چک نزد آن است
    posting_policy TEXT DEFAULT 'AUTO_POST', -- AUTO_POST, DRAFT_AND_APPROVE, MANUAL
    latest_journal_entry_id TEXT,
    sayad_status TEXT DEFAULT 'INQUIRED', -- INQUIRED, REGISTERED, CONFIRMED, TRANSFERRED, REJECTED
    sayad_color TEXT DEFAULT 'WHITE', -- WHITE, YELLOW, ORANGE, BROWN, RED
    is_guarantee BOOLEAN DEFAULT FALSE, -- آیا چک ضمانتی است؟
    description TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (company_id) REFERENCES companies(id),
    FOREIGN KEY (branch_id) REFERENCES branches(id),
    FOREIGN KEY (drawer_party_id) REFERENCES parties(id),
    FOREIGN KEY (payee_party_id) REFERENCES parties(id)
);

-- تاریخچه تغییر وضعیت چک و اسناد صادره
CREATE TABLE IF NOT EXISTS cheque_status_history (
    id TEXT PRIMARY KEY,
    cheque_id TEXT NOT NULL,
    from_status TEXT NOT NULL,
    to_status TEXT NOT NULL,
    action_date_shamsi TEXT NOT NULL,
    journal_entry_id TEXT,
    description TEXT,
    created_by_user_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (cheque_id) REFERENCES cheques(id) ON DELETE CASCADE
);

-- ۱۲. انتقال وجوه بین حساب‌ها (Transfer)
CREATE TABLE IF NOT EXISTS money_transfers (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    company_id TEXT NOT NULL,
    branch_id TEXT NOT NULL,
    source_type TEXT NOT NULL, -- BANK, CASH, PETTY
    source_dimension_id TEXT NOT NULL,
    dest_type TEXT NOT NULL, -- BANK, CASH, PETTY
    dest_dimension_id TEXT NOT NULL,
    amount TEXT NOT NULL,
    transfer_date_shamsi TEXT NOT NULL,
    tracking_code TEXT,
    journal_entry_id TEXT,
    description TEXT,
    created_by_user_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (company_id) REFERENCES companies(id),
    FOREIGN KEY (branch_id) REFERENCES branches(id)
);

-- ۱۳. تطبیق بانکی (Bank Statements & Reconciliation)
CREATE TABLE IF NOT EXISTS bank_statements (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    company_id TEXT NOT NULL,
    bank_account_id TEXT NOT NULL,
    statement_date_shamsi TEXT NOT NULL,
    reference_number TEXT,
    debit TEXT DEFAULT '0',
    credit TEXT DEFAULT '0',
    balance TEXT DEFAULT '0',
    description TEXT,
    is_reconciled BOOLEAN DEFAULT FALSE,
    matched_journal_line_id TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (bank_account_id) REFERENCES bank_accounts(id)
);

CREATE INDEX IF NOT EXISTS idx_parties_tenant_type ON parties(tenant_id, party_type);
CREATE INDEX IF NOT EXISTS idx_parties_national_id ON parties(tenant_id, national_id);
CREATE INDEX IF NOT EXISTS idx_cheques_tenant_direction ON cheques(tenant_id, cheque_direction);
CREATE INDEX IF NOT EXISTS idx_cheques_sayad ON cheques(sayad_id);
CREATE INDEX IF NOT EXISTS idx_cheques_due_date ON cheques(tenant_id, due_date_shamsi);

-- ==========================================================
-- فاز ۳: کالا، خدمات، انبار، کاردکس مقداری-ریالی، خرید و فروش
-- ==========================================================

-- ۱۴. دسته‌بندی و واحدهای سنجش کالا
CREATE TABLE IF NOT EXISTS product_categories (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    company_id TEXT NOT NULL,
    code TEXT NOT NULL,
    title TEXT NOT NULL,
    parent_id TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (company_id) REFERENCES companies(id),
    FOREIGN KEY (parent_id) REFERENCES product_categories(id)
);

CREATE TABLE IF NOT EXISTS product_units (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    company_id TEXT NOT NULL,
    code TEXT NOT NULL,
    title TEXT NOT NULL,
    symbol TEXT,
    is_reference BOOLEAN DEFAULT TRUE,
    created_at TEXT NOT NULL,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (company_id) REFERENCES companies(id)
);

CREATE TABLE IF NOT EXISTS unit_conversions (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    from_unit_id TEXT NOT NULL,
    to_unit_id TEXT NOT NULL,
    conversion_rate TEXT NOT NULL, -- ضریب تبدیل (Decimal string)
    created_at TEXT NOT NULL,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (from_unit_id) REFERENCES product_units(id),
    FOREIGN KEY (to_unit_id) REFERENCES product_units(id)
);

-- ۱۵. کالاها و خدمات
CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    company_id TEXT NOT NULL,
    category_id TEXT,
    unit_id TEXT NOT NULL,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL, -- GOODS, SERVICE
    barcode TEXT,
    tax_exempt BOOLEAN DEFAULT FALSE,
    vat_rate TEXT DEFAULT '0.10',
    valuation_method TEXT DEFAULT 'MOVING_AVERAGE', -- MOVING_AVERAGE, FIFO
    min_stock_alert TEXT DEFAULT '0',
    max_stock_alert TEXT DEFAULT '0',
    sell_price TEXT DEFAULT '0',
    purchase_price TEXT DEFAULT '0',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TEXT NOT NULL,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (company_id) REFERENCES companies(id),
    FOREIGN KEY (category_id) REFERENCES product_categories(id),
    FOREIGN KEY (unit_id) REFERENCES product_units(id),
    UNIQUE(tenant_id, company_id, code)
);

CREATE TABLE IF NOT EXISTS product_variants (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    sku TEXT NOT NULL,
    title TEXT NOT NULL,
    barcode TEXT,
    additional_cost TEXT DEFAULT '0',
    additional_price TEXT DEFAULT '0',
    created_at TEXT NOT NULL,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- ۱۶. انبارها
CREATE TABLE IF NOT EXISTS warehouses (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    company_id TEXT NOT NULL,
    branch_id TEXT NOT NULL,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    address TEXT,
    phone TEXT,
    keeper_name TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TEXT NOT NULL,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (company_id) REFERENCES companies(id),
    FOREIGN KEY (branch_id) REFERENCES branches(id)
);

-- ۱۷. کاردکس مقداری - ریالی انبار (Stock Ledger)
CREATE TABLE IF NOT EXISTS stock_ledger_entries (
    seq_no BIGSERIAL,
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    company_id TEXT NOT NULL,
    warehouse_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    variant_id TEXT,
    document_type TEXT NOT NULL, -- RECEIPT, ISSUE, TRANSFER_IN, TRANSFER_OUT, RETURN_PURCHASE, RETURN_SALES, COUNT_DISCREPANCY
    document_id TEXT NOT NULL,
    document_number TEXT NOT NULL,
    date_shamsi TEXT NOT NULL,
    in_quantity TEXT DEFAULT '0',
    in_unit_cost TEXT DEFAULT '0',
    in_total_cost TEXT DEFAULT '0',
    out_quantity TEXT DEFAULT '0',
    out_unit_cost TEXT DEFAULT '0',
    out_total_cost TEXT DEFAULT '0',
    balance_quantity TEXT NOT NULL,
    balance_unit_cost TEXT NOT NULL,
    balance_total_cost TEXT NOT NULL,
    fifo_layers_json TEXT, -- JSON serialization of remaining FIFO layers
    journal_entry_id TEXT,
    description TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (company_id) REFERENCES companies(id),
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
);

-- ۱۸. اسناد خرید و ورود به انبار (Purchases & Landed Cost)
CREATE TABLE IF NOT EXISTS purchase_documents (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    company_id TEXT NOT NULL,
    branch_id TEXT NOT NULL,
    warehouse_id TEXT NOT NULL,
    supplier_party_id TEXT NOT NULL,
    freight_party_id TEXT,
    document_number TEXT NOT NULL,
    date_shamsi TEXT NOT NULL,
    total_goods_amount TEXT NOT NULL,
    freight_amount TEXT DEFAULT '0',
    total_discount TEXT DEFAULT '0',
    total_vat TEXT DEFAULT '0',
    grand_total TEXT NOT NULL,
    status TEXT DEFAULT 'APPROVED', -- DRAFT, APPROVED, CANCELLED
    journal_entry_id TEXT,
    description TEXT,
    created_by_user_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (company_id) REFERENCES companies(id),
    FOREIGN KEY (branch_id) REFERENCES branches(id),
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id),
    FOREIGN KEY (supplier_party_id) REFERENCES parties(id),
    FOREIGN KEY (freight_party_id) REFERENCES parties(id)
);

CREATE TABLE IF NOT EXISTS purchase_document_items (
    id TEXT PRIMARY KEY,
    purchase_document_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    variant_id TEXT,
    quantity TEXT NOT NULL,
    unit_cost TEXT NOT NULL,
    total_amount TEXT NOT NULL,
    discount_amount TEXT DEFAULT '0',
    vat_amount TEXT DEFAULT '0',
    allocated_freight_cost TEXT DEFAULT '0',
    final_unit_cost TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (purchase_document_id) REFERENCES purchase_documents(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id)
);

-- ۱۹. اسناد فروش رسمی و حواله خروج انبار (Sales & COGS)
CREATE TABLE IF NOT EXISTS sales_documents (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    company_id TEXT NOT NULL,
    branch_id TEXT NOT NULL,
    warehouse_id TEXT,
    customer_party_id TEXT NOT NULL,
    document_number TEXT NOT NULL,
    document_type TEXT DEFAULT 'INVOICE', -- PROFORMA, INVOICE, RETURN
    date_shamsi TEXT NOT NULL,
    gross_amount TEXT NOT NULL,
    discount_amount TEXT DEFAULT '0',
    net_amount TEXT NOT NULL,
    vat_amount TEXT DEFAULT '0',
    grand_total TEXT NOT NULL,
    cogs_total TEXT DEFAULT '0',
    status TEXT DEFAULT 'APPROVED', -- DRAFT, APPROVED, CANCELLED
    sales_journal_entry_id TEXT,
    cogs_journal_entry_id TEXT,
    payment_method TEXT DEFAULT 'CREDIT', -- CREDIT, CASH, POS, MIXED
    description TEXT,
    created_by_user_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (company_id) REFERENCES companies(id),
    FOREIGN KEY (branch_id) REFERENCES branches(id),
    FOREIGN KEY (customer_party_id) REFERENCES parties(id)
);

CREATE TABLE IF NOT EXISTS sales_document_items (
    id TEXT PRIMARY KEY,
    sales_document_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    variant_id TEXT,
    quantity TEXT NOT NULL,
    unit_price TEXT NOT NULL,
    total_price TEXT NOT NULL,
    discount_amount TEXT DEFAULT '0',
    net_amount TEXT NOT NULL,
    vat_amount TEXT DEFAULT '0',
    unit_cogs TEXT DEFAULT '0',
    total_cogs TEXT DEFAULT '0',
    created_at TEXT NOT NULL,
    FOREIGN KEY (sales_document_id) REFERENCES sales_documents(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id)
);

-- ۲۰. انبارگردانی و مغایرت‌ها (Inventory Counting & Adjustments)
CREATE TABLE IF NOT EXISTS inventory_counts (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    company_id TEXT NOT NULL,
    warehouse_id TEXT NOT NULL,
    count_number TEXT NOT NULL,
    count_date_shamsi TEXT NOT NULL,
    status TEXT DEFAULT 'ADJUSTED', -- IN_PROGRESS, APPROVED, ADJUSTED
    journal_entry_id TEXT,
    description TEXT,
    created_by_user_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (company_id) REFERENCES companies(id),
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id)
);

CREATE TABLE IF NOT EXISTS inventory_count_items (
    id TEXT PRIMARY KEY,
    inventory_count_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    system_quantity TEXT NOT NULL,
    physical_quantity TEXT NOT NULL,
    discrepancy_quantity TEXT NOT NULL,
    unit_cost TEXT NOT NULL,
    total_discrepancy_value TEXT NOT NULL,
    discrepancy_type TEXT NOT NULL, -- DEFICIT, SURPLUS, NONE
    created_at TEXT NOT NULL,
    FOREIGN KEY (inventory_count_id) REFERENCES inventory_counts(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE INDEX IF NOT EXISTS idx_products_tenant_code ON products(tenant_id, code);
CREATE INDEX IF NOT EXISTS idx_stock_ledger_prod_wh ON stock_ledger_entries(tenant_id, warehouse_id, product_id);
CREATE INDEX IF NOT EXISTS idx_sales_docs_tenant ON sales_documents(tenant_id, document_number);
CREATE INDEX IF NOT EXISTS idx_purchase_docs_tenant ON purchase_documents(tenant_id, document_number);

-- ==========================================================
-- فاز ۴: سامانه مودیان و پایانه‌های فروشگاهی (صورتحساب الکترونیکی)
-- ==========================================================

-- ۲۱. تنظیمات مودیان و کلیدهای امنیتی هر شرکت
CREATE TABLE IF NOT EXISTS moadian_settings (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    company_id TEXT NOT NULL UNIQUE,
    fiscal_memory_id TEXT NOT NULL, -- شناسه ۶ کاراکتری حافظه مالیاتی
    transport_method TEXT DEFAULT 'DIRECT', -- DIRECT, TRUSTED_COMPANY, GOVERNMENT_GATEWAY
    private_key_pem TEXT NOT NULL, -- کلید خصوصی ۲۸ بیتی RSA جهت امضای دیجیتال
    public_key_pem TEXT NOT NULL, -- کلید عمومی
    public_key_base64 TEXT NOT NULL, -- کلید عمومی بدون هدر جهت کارپوشه
    tsp_provider_name TEXT, -- نام شرکت معتمد در صورت انتخاب
    tsp_api_key TEXT,
    is_sandbox_mode BOOLEAN DEFAULT TRUE, -- حالت شبیه‌ساز یا واقعی
    is_active BOOLEAN DEFAULT TRUE,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (company_id) REFERENCES companies(id)
);

-- ۲۲. نگاشت واحدهای سنجش به کدهای مودیان
CREATE TABLE IF NOT EXISTS moadian_unit_mappings (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    unit_id TEXT NOT NULL,
    moadian_unit_code TEXT NOT NULL, -- کد ۴ رقمی جدول مودیان (مثلاً 1640 عدد)
    moadian_unit_title TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (unit_id) REFERENCES product_units(id)
);

-- ۲۳. صورتحساب‌های الکترونیکی ثبت‌شده در سامانه مودیان
CREATE TABLE IF NOT EXISTS moadian_invoices (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    company_id TEXT NOT NULL,
    branch_id TEXT NOT NULL,
    sales_document_id TEXT, -- فاکتور فروش داخلی مرتبط در صورت وجود
    purchase_document_id TEXT, -- در صورت ثبت صورتحساب خرید
    tax_id TEXT UNIQUE NOT NULL, -- شماره منحصر به فرد مالیاتی ۲۲ کاراکتری
    invoice_type TEXT NOT NULL, -- TYPE_1, TYPE_2, TYPE_3
    invoice_pattern TEXT NOT NULL, -- PATTERN_1_GENERAL, PATTERN_2_GOLD, ...
    invoice_subject TEXT NOT NULL, -- MAIN, CORRECTION, CANCELLATION, RETURN
    reference_tax_id TEXT, -- شماره مالیاتی صورتحساب مرجع در فاکتورهای اصلاحی/ابطالی
    issue_date_shamsi TEXT NOT NULL,
    issue_date_timestamp BIGINT NOT NULL,
    total_gross_amount TEXT NOT NULL,
    total_discount_amount TEXT DEFAULT '0',
    total_net_amount TEXT NOT NULL,
    total_vat_amount TEXT DEFAULT '0',
    total_grand_amount TEXT NOT NULL,
    status TEXT DEFAULT 'PENDING', -- PENDING, QUEUED, SENT, IN_PROGRESS, CONFIRMED, REJECTED, FAILED
    tracking_token TEXT, -- کد پیگیری دریافت شده از کارپوشه سازمان مالیاتی
    packet_id TEXT,
    server_timestamp BIGINT,
    response_errors_json TEXT, -- لاگ کدهای خطا در صورت رد شدن
    created_by_user_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (company_id) REFERENCES companies(id),
    FOREIGN KEY (branch_id) REFERENCES branches(id),
    FOREIGN KEY (sales_document_id) REFERENCES sales_documents(id)
);

-- ۲۴. ردیف‌های صورتحساب مودیان
CREATE TABLE IF NOT EXISTS moadian_invoice_items (
    id TEXT PRIMARY KEY,
    moadian_invoice_id TEXT NOT NULL,
    row_number INTEGER NOT NULL,
    product_id TEXT,
    sstid TEXT NOT NULL, -- شناسه ۱۳ رقمی کالا یا خدمت مالیاتی
    description TEXT NOT NULL,
    quantity TEXT NOT NULL,
    unit_code TEXT NOT NULL,
    unit_price TEXT NOT NULL,
    total_price TEXT NOT NULL,
    discount_amount TEXT DEFAULT '0',
    net_price TEXT NOT NULL,
    vat_rate TEXT NOT NULL,
    vat_amount TEXT NOT NULL,
    final_amount TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (moadian_invoice_id) REFERENCES moadian_invoices(id) ON DELETE CASCADE
);

-- ۲۵. صف مقاوم ارسال صورتحساب‌ها (Outbox Queue)
CREATE TABLE IF NOT EXISTS moadian_outbox_queue (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    company_id TEXT NOT NULL,
    moadian_invoice_id TEXT NOT NULL,
    priority INTEGER DEFAULT 1,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 5,
    status TEXT DEFAULT 'PENDING', -- PENDING, PROCESSING, SENT, FAILED
    next_retry_at TEXT NOT NULL,
    last_error TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (company_id) REFERENCES companies(id),
    FOREIGN KEY (moadian_invoice_id) REFERENCES moadian_invoices(id) ON DELETE CASCADE
);

-- ۲۶. جدول مغایرت‌گیری کارپوشه مالیاتی (Reconciliation)
CREATE TABLE IF NOT EXISTS moadian_reconciliations (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    company_id TEXT NOT NULL,
    tax_id TEXT NOT NULL,
    document_type TEXT NOT NULL, -- SALES, PURCHASE
    portal_amount TEXT NOT NULL,
    internal_amount TEXT NOT NULL,
    discrepancy_amount TEXT NOT NULL,
    status TEXT NOT NULL, -- MATCHED, DISCREPANT, ONLY_IN_PORTAL, ONLY_IN_SYSTEM
    reconciled_at TEXT NOT NULL,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (company_id) REFERENCES companies(id)
);

CREATE INDEX IF NOT EXISTS idx_moadian_tax_id ON moadian_invoices(tax_id);
CREATE INDEX IF NOT EXISTS idx_moadian_status ON moadian_invoices(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_moadian_outbox_status ON moadian_outbox_queue(status, next_retry_at);

-- ==========================================================
-- فاز ۵: POS آفلاین و ماژول فروشگاه
-- ==========================================================

-- ۲۷. پایانه‌های کارتخوان متصل به پوز (POS Terminals)
CREATE TABLE IF NOT EXISTS pos_terminals (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    company_id TEXT NOT NULL,
    branch_id TEXT NOT NULL,
    code TEXT NOT NULL,
    title TEXT NOT NULL,
    terminal_number TEXT NOT NULL,
    serial_number TEXT,
    psp_name TEXT NOT NULL, -- به‌پرداخت، سامان‌کیش، سداد، آپ
    bank_account_id TEXT NOT NULL,
    floating_dimension_id TEXT NOT NULL, -- تفصیلی شناور معین ۱۱۰۴ (وجوه در راه)
    is_active BOOLEAN DEFAULT TRUE,
    created_at TEXT NOT NULL,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (company_id) REFERENCES companies(id),
    FOREIGN KEY (branch_id) REFERENCES branches(id),
    FOREIGN KEY (bank_account_id) REFERENCES bank_accounts(id),
    FOREIGN KEY (floating_dimension_id) REFERENCES floating_dimensions(id)
);

-- ۲۸. شیفت‌های صندوق (POS Shifts)
CREATE TABLE IF NOT EXISTS pos_shifts (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    company_id TEXT NOT NULL,
    branch_id TEXT NOT NULL,
    cash_desk_id TEXT NOT NULL,
    pos_terminal_id TEXT,
    cashier_user_id TEXT NOT NULL,
    shift_number TEXT NOT NULL,
    opened_at TEXT NOT NULL,
    closed_at TEXT,
    status TEXT DEFAULT 'OPEN', -- OPEN, CLOSED
    opening_cash_balance TEXT DEFAULT '0',
    cash_breakdown_opening_json TEXT,
    expected_cash_balance TEXT DEFAULT '0',
    actual_cash_balance TEXT,
    cash_discrepancy TEXT DEFAULT '0',
    cash_breakdown_closing_json TEXT,
    total_sales_count INTEGER DEFAULT 0,
    total_sales_amount TEXT DEFAULT '0',
    total_cash_sales TEXT DEFAULT '0',
    total_pos_card_sales TEXT DEFAULT '0',
    total_discount_amount TEXT DEFAULT '0',
    total_vat_amount TEXT DEFAULT '0',
    total_cogs_amount TEXT DEFAULT '0',
    daily_journal_entry_id TEXT, -- پیوند به سند تجمیعی روزانه
    cogs_journal_entry_id TEXT, -- پیوند به سند بهای تمام‌شده تجمیعی
    discrepancy_journal_entry_id TEXT, -- سند کسری/فزونی صندوق
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (company_id) REFERENCES companies(id),
    FOREIGN KEY (branch_id) REFERENCES branches(id),
    FOREIGN KEY (cash_desk_id) REFERENCES cash_desks(id),
    FOREIGN KEY (pos_terminal_id) REFERENCES pos_terminals(id),
    FOREIGN KEY (cashier_user_id) REFERENCES users(id)
);

-- ۲۹. برداشت و واریز نقدی در طول شیفت (Cash In / Cash Drop)
CREATE TABLE IF NOT EXISTS pos_cash_movements (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    shift_id TEXT NOT NULL,
    movement_type TEXT NOT NULL, -- CASH_DROP, CASH_IN, EXPENSE
    amount TEXT NOT NULL,
    date_shamsi TEXT NOT NULL,
    description TEXT,
    created_by_user_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (shift_id) REFERENCES pos_shifts(id) ON DELETE CASCADE
);

-- ۳۰. سفارش‌ها و فاکتورهای صندوق (POS Orders & Hold/Recall)
CREATE TABLE IF NOT EXISTS pos_orders (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    company_id TEXT NOT NULL,
    branch_id TEXT NOT NULL,
    warehouse_id TEXT NOT NULL,
    shift_id TEXT NOT NULL,
    cashier_user_id TEXT NOT NULL,
    order_number TEXT NOT NULL,
    date_shamsi TEXT NOT NULL,
    status TEXT DEFAULT 'COMPLETED', -- HOLD, COMPLETED, CANCELLED, REFUNDED
    customer_party_id TEXT,
    hold_reference TEXT,
    gross_amount TEXT NOT NULL,
    discount_amount TEXT DEFAULT '0',
    net_amount TEXT NOT NULL,
    vat_amount TEXT DEFAULT '0',
    grand_total TEXT NOT NULL,
    cogs_total TEXT DEFAULT '0',
    payment_method TEXT DEFAULT 'CASH', -- CASH, POS_CARD, MIXED, CREDIT
    cash_amount TEXT DEFAULT '0',
    pos_card_amount TEXT DEFAULT '0',
    idempotency_key TEXT, -- تضمین عدم ثبت تکراری در سناریوهای قطعی اینترنت
    is_offline_synced BOOLEAN DEFAULT FALSE,
    offline_created_at TEXT,
    moadian_tax_id TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (company_id) REFERENCES companies(id),
    FOREIGN KEY (branch_id) REFERENCES branches(id),
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id),
    FOREIGN KEY (shift_id) REFERENCES pos_shifts(id),
    UNIQUE(tenant_id, idempotency_key)
);

-- ۳۱. اقلام سفارش صندوق
CREATE TABLE IF NOT EXISTS pos_order_items (
    id TEXT PRIMARY KEY,
    pos_order_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    variant_id TEXT,
    quantity TEXT NOT NULL,
    unit_price TEXT NOT NULL,
    total_price TEXT NOT NULL,
    discount_amount TEXT DEFAULT '0',
    net_amount TEXT NOT NULL,
    vat_amount TEXT DEFAULT '0',
    unit_cogs TEXT DEFAULT '0',
    total_cogs TEXT DEFAULT '0',
    is_weighted BOOLEAN DEFAULT FALSE,
    weight_grams INTEGER,
    barcode_scanned TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (pos_order_id) REFERENCES pos_orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE INDEX IF NOT EXISTS idx_pos_shifts_status ON pos_shifts(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_pos_orders_shift ON pos_orders(shift_id, status);
CREATE INDEX IF NOT EXISTS idx_pos_orders_idempotency ON pos_orders(idempotency_key);

-- ====================================================================
-- فاز ۶: ماژول رستوران، کافی‌شاپ، منو، دستور پخت BOM، سالن، KDS و پیک
-- ====================================================================

-- ۳۲. بخش‌های سالن رستوران (Salon Sections)
CREATE TABLE IF NOT EXISTS restaurant_sections (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    company_id TEXT NOT NULL,
    branch_id TEXT NOT NULL,
    code TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (company_id) REFERENCES companies(id),
    FOREIGN KEY (branch_id) REFERENCES branches(id)
);

-- ۳۳. میزهای سالن رستوران (Tables)
CREATE TABLE IF NOT EXISTS restaurant_tables (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    company_id TEXT NOT NULL,
    branch_id TEXT NOT NULL,
    section_id TEXT NOT NULL,
    table_number TEXT NOT NULL,
    title TEXT NOT NULL,
    capacity INTEGER DEFAULT 4,
    status TEXT DEFAULT 'VACANT', -- VACANT, OCCUPIED, BILL_PRINTED, RESERVED, CLEANING
    merged_with_table_id TEXT,
    current_order_id TEXT,
    qr_code_token TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (company_id) REFERENCES companies(id),
    FOREIGN KEY (branch_id) REFERENCES branches(id),
    FOREIGN KEY (section_id) REFERENCES restaurant_sections(id)
);

-- ۳۴. دسته‌بندی منوی رستوران (Menu Categories)
CREATE TABLE IF NOT EXISTS restaurant_menu_categories (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    company_id TEXT NOT NULL,
    code TEXT NOT NULL,
    title TEXT NOT NULL,
    icon TEXT,
    display_order INTEGER DEFAULT 0,
    kitchen_station TEXT DEFAULT 'HOT_KITCHEN', -- HOT_KITCHEN, COLD_KITCHEN, BAR_CAFE, BAKERY_DESSERT
    is_active BOOLEAN DEFAULT TRUE,
    created_at TEXT NOT NULL,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (company_id) REFERENCES companies(id)
);

-- ۳۵. دستور پخت و فرمول ساخت غذا (Recipe / BOM)
CREATE TABLE IF NOT EXISTS restaurant_recipes (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    company_id TEXT NOT NULL,
    menu_product_id TEXT NOT NULL,
    yield_quantity TEXT DEFAULT '1',
    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (company_id) REFERENCES companies(id),
    FOREIGN KEY (menu_product_id) REFERENCES products(id)
);

-- ۳۶. اقلام و مواد اولیه دستور پخت (Recipe Ingredients)
CREATE TABLE IF NOT EXISTS restaurant_recipe_items (
    id TEXT PRIMARY KEY,
    recipe_id TEXT NOT NULL,
    raw_product_id TEXT NOT NULL,
    quantity TEXT NOT NULL,
    waste_percentage TEXT DEFAULT '0',
    created_at TEXT NOT NULL,
    FOREIGN KEY (recipe_id) REFERENCES restaurant_recipes(id) ON DELETE CASCADE,
    FOREIGN KEY (raw_product_id) REFERENCES products(id)
);

-- ۳۷. تیکت‌های نمایشگر آشپزخانه (KDS Tickets)
CREATE TABLE IF NOT EXISTS restaurant_kds_tickets (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    company_id TEXT NOT NULL,
    branch_id TEXT NOT NULL,
    restaurant_order_id TEXT NOT NULL,
    ticket_number TEXT NOT NULL,
    station TEXT NOT NULL, -- HOT_KITCHEN, COLD_KITCHEN, BAR_CAFE, BAKERY_DESSERT
    status TEXT DEFAULT 'QUEUED', -- QUEUED, PREPARING, READY, SERVED
    table_number TEXT,
    started_at TEXT,
    ready_at TEXT,
    served_at TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (company_id) REFERENCES companies(id),
    FOREIGN KEY (branch_id) REFERENCES branches(id)
);

-- ۳۸. سفارشات رستوران (Restaurant Orders)
CREATE TABLE IF NOT EXISTS restaurant_orders (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    company_id TEXT NOT NULL,
    branch_id TEXT NOT NULL,
    shift_id TEXT,
    order_number TEXT NOT NULL,
    date_shamsi TEXT NOT NULL,
    channel TEXT DEFAULT 'DINE_IN', -- DINE_IN, TAKEAWAY, DELIVERY, ONLINE_AGGREGATOR
    status TEXT DEFAULT 'OPEN', -- OPEN, KITCHEN_IN_PROGRESS, READY_TO_SERVE, SERVED, PAID, CANCELLED
    table_id TEXT,
    guest_count INTEGER DEFAULT 1,
    waiter_user_id TEXT,
    customer_party_id TEXT,
    notes TEXT,
    gross_amount TEXT NOT NULL,
    discount_amount TEXT DEFAULT '0',
    service_charge_amount TEXT DEFAULT '0',
    vat_amount TEXT DEFAULT '0',
    grand_total TEXT NOT NULL,
    food_cost_total TEXT DEFAULT '0',
    settlement_method TEXT DEFAULT 'CASH', -- CASH, POS_CARD, MIXED, ONLINE_AGGREGATOR
    cash_amount TEXT DEFAULT '0',
    pos_card_amount TEXT DEFAULT '0',
    aggregator_receivable_amount TEXT DEFAULT '0',
    journal_entry_id TEXT,
    cogs_journal_entry_id TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (company_id) REFERENCES companies(id),
    FOREIGN KEY (branch_id) REFERENCES branches(id),
    FOREIGN KEY (table_id) REFERENCES restaurant_tables(id),
    FOREIGN KEY (waiter_user_id) REFERENCES users(id),
    FOREIGN KEY (customer_party_id) REFERENCES parties(id)
);

-- ۳۹. اقلام سفارش رستوران (Order Items)
CREATE TABLE IF NOT EXISTS restaurant_order_items (
    id TEXT PRIMARY KEY,
    restaurant_order_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    quantity TEXT NOT NULL,
    unit_price TEXT NOT NULL,
    total_price TEXT NOT NULL,
    discount_amount TEXT DEFAULT '0',
    net_amount TEXT NOT NULL,
    vat_amount TEXT DEFAULT '0',
    food_cost_amount TEXT DEFAULT '0',
    modifiers_json TEXT,
    kitchen_station TEXT DEFAULT 'HOT_KITCHEN',
    kds_ticket_id TEXT,
    item_status TEXT DEFAULT 'QUEUED', -- QUEUED, PREPARING, READY, SERVED, CANCELLED
    created_at TEXT NOT NULL,
    FOREIGN KEY (restaurant_order_id) REFERENCES restaurant_orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (kds_ticket_id) REFERENCES restaurant_kds_tickets(id)
);

-- ۴۰. پیک و دلیوری سفارشات بیرون‌بر رستوران (Deliveries & Couriers)
CREATE TABLE IF NOT EXISTS restaurant_deliveries (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    company_id TEXT NOT NULL,
    branch_id TEXT NOT NULL,
    restaurant_order_id TEXT NOT NULL,
    courier_party_id TEXT,
    status TEXT DEFAULT 'PENDING_ASSIGNMENT', -- PENDING_ASSIGNMENT, DISPATCHED, DELIVERED, RETURNED
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    delivery_address TEXT NOT NULL,
    delivery_fee TEXT DEFAULT '0',
    dispatched_at TEXT,
    delivered_at TEXT,
    cash_collected TEXT DEFAULT '0',
    pos_card_collected TEXT DEFAULT '0',
    is_settled BOOLEAN DEFAULT FALSE,
    created_at TEXT NOT NULL,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (company_id) REFERENCES companies(id),
    FOREIGN KEY (branch_id) REFERENCES branches(id),
    FOREIGN KEY (restaurant_order_id) REFERENCES restaurant_orders(id),
    FOREIGN KEY (courier_party_id) REFERENCES parties(id)
);

CREATE INDEX IF NOT EXISTS idx_rest_tables_status ON restaurant_tables(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_rest_orders_status ON restaurant_orders(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_rest_kds_station ON restaurant_kds_tickets(tenant_id, station, status);

-- ۴۱. مراکز کاری تولید (Manufacturing Work Centers)
CREATE TABLE IF NOT EXISTS manufacturing_work_centers (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    company_id TEXT NOT NULL,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    department TEXT,
    capacity_hours_per_day TEXT DEFAULT '8',
    labor_hourly_rate TEXT DEFAULT '0',
    overhead_hourly_rate TEXT DEFAULT '0',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TEXT NOT NULL,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (company_id) REFERENCES companies(id)
);

-- ۴۲. فرمول‌های ساخت محصول (Bill of Materials - BOM)
CREATE TABLE IF NOT EXISTS manufacturing_boms (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    company_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    bom_code TEXT NOT NULL,
    bom_name TEXT NOT NULL,
    version TEXT DEFAULT '1.0',
    base_quantity TEXT DEFAULT '1',
    is_default BOOLEAN DEFAULT TRUE,
    is_active BOOLEAN DEFAULT TRUE,
    standard_material_cost TEXT DEFAULT '0',
    standard_labor_cost TEXT DEFAULT '0',
    standard_overhead_cost TEXT DEFAULT '0',
    standard_total_cost TEXT DEFAULT '0',
    description TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (company_id) REFERENCES companies(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
);

-- ۴۳. اقلام مواد فرمول ساخت (BOM Items)
CREATE TABLE IF NOT EXISTS manufacturing_bom_items (
    id TEXT PRIMARY KEY,
    bom_id TEXT NOT NULL,
    component_product_id TEXT NOT NULL,
    quantity TEXT NOT NULL,
    scrap_percentage TEXT DEFAULT '0',
    is_sub_assembly BOOLEAN DEFAULT FALSE,
    sub_bom_id TEXT,
    substitute_product_id TEXT,
    line_order INTEGER DEFAULT 1,
    created_at TEXT NOT NULL,
    FOREIGN KEY (bom_id) REFERENCES manufacturing_boms(id) ON DELETE CASCADE,
    FOREIGN KEY (component_product_id) REFERENCES products(id),
    FOREIGN KEY (sub_bom_id) REFERENCES manufacturing_boms(id),
    FOREIGN KEY (substitute_product_id) REFERENCES products(id)
);

-- ۴۴. مراحل و ایستگاه‌های عملیات ساخت (Manufacturing Routings)
CREATE TABLE IF NOT EXISTS manufacturing_routings (
    id TEXT PRIMARY KEY,
    bom_id TEXT NOT NULL,
    work_center_id TEXT NOT NULL,
    step_number INTEGER NOT NULL,
    operation_name TEXT NOT NULL,
    setup_time_hours TEXT DEFAULT '0',
    run_time_hours_per_unit TEXT DEFAULT '0',
    labor_hours_per_unit TEXT DEFAULT '0',
    machine_hours_per_unit TEXT DEFAULT '0',
    created_at TEXT NOT NULL,
    FOREIGN KEY (bom_id) REFERENCES manufacturing_boms(id) ON DELETE CASCADE,
    FOREIGN KEY (work_center_id) REFERENCES manufacturing_work_centers(id)
);

-- ۴۵. سفارشات تولید / دستور کار (Production Orders)
CREATE TABLE IF NOT EXISTS manufacturing_production_orders (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    company_id TEXT NOT NULL,
    branch_id TEXT NOT NULL,
    order_number TEXT NOT NULL,
    date_shamsi TEXT NOT NULL,
    product_id TEXT NOT NULL,
    bom_id TEXT NOT NULL,
    raw_material_warehouse_id TEXT NOT NULL,
    finished_goods_warehouse_id TEXT NOT NULL,
    planned_quantity TEXT NOT NULL,
    produced_quantity TEXT DEFAULT '0',
    rejected_quantity TEXT DEFAULT '0',
    normal_scrap_quantity TEXT DEFAULT '0',
    abnormal_scrap_quantity TEXT DEFAULT '0',
    status TEXT DEFAULT 'DRAFT', -- DRAFT, RELEASED, IN_PROGRESS, COMPLETED, CLOSED, CANCELLED
    costing_method TEXT DEFAULT 'JOB_ORDER', -- JOB_ORDER, PROCESS_COSTING
    actual_material_cost TEXT DEFAULT '0',
    actual_labor_cost TEXT DEFAULT '0',
    actual_overhead_cost TEXT DEFAULT '0',
    actual_total_cost TEXT DEFAULT '0',
    unit_cost TEXT DEFAULT '0',
    material_issue_journal_entry_id TEXT,
    labor_overhead_journal_entry_id TEXT,
    completion_journal_entry_id TEXT,
    abnormal_scrap_journal_entry_id TEXT,
    variance_journal_entry_id TEXT,
    stock_receipt_document_id TEXT,
    start_date_shamsi TEXT,
    completion_date_shamsi TEXT,
    notes TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (company_id) REFERENCES companies(id),
    FOREIGN KEY (branch_id) REFERENCES branches(id),
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (bom_id) REFERENCES manufacturing_boms(id),
    FOREIGN KEY (raw_material_warehouse_id) REFERENCES warehouses(id),
    FOREIGN KEY (finished_goods_warehouse_id) REFERENCES warehouses(id)
);

-- ۴۶. مواد مصرفی سفارش تولید (Production Order Materials)
CREATE TABLE IF NOT EXISTS manufacturing_order_materials (
    id TEXT PRIMARY KEY,
    production_order_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    planned_quantity TEXT NOT NULL,
    actual_issued_quantity TEXT DEFAULT '0',
    unit_cost TEXT DEFAULT '0',
    total_cost TEXT DEFAULT '0',
    stock_issue_id TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (production_order_id) REFERENCES manufacturing_production_orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id)
);

-- ۴۷. کارکرد واقعی مراکز کاری در سفارش تولید (Production Order Operations)
CREATE TABLE IF NOT EXISTS manufacturing_order_operations (
    seq_no BIGSERIAL,
    id TEXT PRIMARY KEY,
    production_order_id TEXT NOT NULL,
    work_center_id TEXT NOT NULL,
    operation_name TEXT NOT NULL,
    actual_labor_hours TEXT DEFAULT '0',
    labor_hourly_rate TEXT DEFAULT '0',
    actual_labor_cost TEXT DEFAULT '0',
    actual_machine_hours TEXT DEFAULT '0',
    overhead_hourly_rate TEXT DEFAULT '0',
    actual_overhead_cost TEXT DEFAULT '0',
    recorded_date_shamsi TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (production_order_id) REFERENCES manufacturing_production_orders(id) ON DELETE CASCADE,
    FOREIGN KEY (work_center_id) REFERENCES manufacturing_work_centers(id)
);

-- ۴۸. ضایعات تولید (Production Scraps)
CREATE TABLE IF NOT EXISTS manufacturing_scraps (
    id TEXT PRIMARY KEY,
    production_order_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    scrap_type TEXT NOT NULL, -- NORMAL, ABNORMAL
    quantity TEXT NOT NULL,
    estimated_cost TEXT DEFAULT '0',
    reason TEXT,
    date_shamsi TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (production_order_id) REFERENCES manufacturing_production_orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE INDEX IF NOT EXISTS idx_mfg_boms_product ON manufacturing_boms(tenant_id, product_id);
CREATE INDEX IF NOT EXISTS idx_mfg_orders_status ON manufacturing_production_orders(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_mfg_order_materials_order ON manufacturing_order_materials(production_order_id);

-- ۴۹. پرسنل و پرونده کارگزینی (Employees)
CREATE TABLE IF NOT EXISTS payroll_employees (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    company_id TEXT NOT NULL,
    party_id TEXT NOT NULL,
    personnel_code TEXT NOT NULL,
    national_id TEXT NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    father_name TEXT,
    birth_date_shamsi TEXT,
    hire_date_shamsi TEXT NOT NULL,
    insurance_number TEXT,
    bank_name TEXT,
    bank_account_number TEXT,
    bank_sheba_number TEXT NOT NULL,
    department TEXT,
    job_title TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TEXT NOT NULL,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (company_id) REFERENCES companies(id),
    FOREIGN KEY (party_id) REFERENCES parties(id)
);

-- ۵۰. احکام کارگزینی و قراردادهای پرسنل (Employment Contracts)
CREATE TABLE IF NOT EXISTS payroll_contracts (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    company_id TEXT NOT NULL,
    employee_id TEXT NOT NULL,
    contract_type TEXT NOT NULL, -- PERMANENT, TEMPORARY, PROJECT, HOURLY, COMMISSION
    start_date_shamsi TEXT NOT NULL,
    end_date_shamsi TEXT,
    monthly_base_salary TEXT NOT NULL,
    monthly_housing_allowance TEXT NOT NULL,
    monthly_grocery_allowance TEXT NOT NULL,
    monthly_seniority_bonus TEXT DEFAULT '0',
    child_count INTEGER DEFAULT 0,
    monthly_child_allowance_per_child TEXT DEFAULT '0',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TEXT NOT NULL,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (company_id) REFERENCES companies(id),
    FOREIGN KEY (employee_id) REFERENCES payroll_employees(id) ON DELETE CASCADE
);

-- ۵۱. دوره‌های حقوق و دستمزد ماهانه (Payroll Periods)
CREATE TABLE IF NOT EXISTS payroll_periods (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    company_id TEXT NOT NULL,
    branch_id TEXT NOT NULL,
    title TEXT NOT NULL,
    year_shamsi TEXT NOT NULL,
    month_number INTEGER NOT NULL,
    start_date_shamsi TEXT NOT NULL,
    end_date_shamsi TEXT NOT NULL,
    status TEXT DEFAULT 'DRAFT', -- DRAFT, CALCULATED, APPROVED, PAID, CLOSED
    total_gross_pay TEXT DEFAULT '0',
    total_deductions TEXT DEFAULT '0',
    total_net_pay TEXT DEFAULT '0',
    total_employer_insurance TEXT DEFAULT '0',
    journal_entry_id TEXT,
    payment_journal_entry_id TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (company_id) REFERENCES companies(id),
    FOREIGN KEY (branch_id) REFERENCES branches(id)
);

-- ۵۲. فیش‌های حقوقی پرسنل (Payroll Slips)
CREATE TABLE IF NOT EXISTS payroll_slips (
    id TEXT PRIMARY KEY,
    period_id TEXT NOT NULL,
    employee_id TEXT NOT NULL,
    worked_days INTEGER NOT NULL,
    overtime_hours TEXT DEFAULT '0',
    base_pay TEXT NOT NULL,
    housing_pay TEXT NOT NULL,
    grocery_pay TEXT NOT NULL,
    child_pay TEXT DEFAULT '0',
    seniority_pay TEXT DEFAULT '0',
    overtime_pay TEXT DEFAULT '0',
    bonus_pay TEXT DEFAULT '0',
    gross_pay TEXT NOT NULL,
    insured_wage TEXT NOT NULL,
    employee_insurance TEXT NOT NULL,
    employer_insurance TEXT NOT NULL,
    unemployment_insurance TEXT NOT NULL,
    income_tax TEXT NOT NULL,
    salary_advance_deduction TEXT DEFAULT '0',
    loan_installment_deduction TEXT DEFAULT '0',
    other_deductions TEXT DEFAULT '0',
    total_deductions TEXT NOT NULL,
    net_payable TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (period_id) REFERENCES payroll_periods(id) ON DELETE CASCADE,
    FOREIGN KEY (employee_id) REFERENCES payroll_employees(id)
);

-- ۵۳. دارایی‌های ثابت مشهود (Fixed Assets)
CREATE TABLE IF NOT EXISTS fixed_assets (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    company_id TEXT NOT NULL,
    branch_id TEXT NOT NULL,
    asset_code TEXT NOT NULL,
    title TEXT NOT NULL,
    category TEXT NOT NULL, -- FURNITURE_OFFICE, VEHICLES, MACHINERY_TECHNICAL
    purchase_date_shamsi TEXT NOT NULL,
    historical_cost TEXT NOT NULL,
    salvage_value TEXT DEFAULT '0',
    depreciation_method TEXT NOT NULL, -- STRAIGHT_LINE, DECLINING_BALANCE
    annual_rate_percentage TEXT,
    useful_life_years INTEGER,
    accumulated_depreciation TEXT DEFAULT '0',
    book_value TEXT NOT NULL,
    status TEXT DEFAULT 'ACTIVE', -- ACTIVE, DEPRECIATED, SOLD, SCRAPPED
    cost_center_dimension_id TEXT,
    keeper_party_id TEXT,
    location TEXT,
    acquisition_journal_entry_id TEXT,
    disposal_journal_entry_id TEXT,
    disposal_date_shamsi TEXT,
    disposal_sale_price TEXT,
    disposal_gain_or_loss TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (company_id) REFERENCES companies(id),
    FOREIGN KEY (branch_id) REFERENCES branches(id)
);

-- ۵۴. سوابق استهلاک دوره‌ای دارایی‌های ثابت (Asset Depreciation Records)
CREATE TABLE IF NOT EXISTS fixed_asset_depreciation_records (
    id TEXT PRIMARY KEY,
    asset_id TEXT NOT NULL,
    period_date_shamsi TEXT NOT NULL,
    months_count INTEGER DEFAULT 1,
    opening_book_value TEXT NOT NULL,
    depreciation_amount TEXT NOT NULL,
    accumulated_depreciation_after TEXT NOT NULL,
    closing_book_value TEXT NOT NULL,
    journal_entry_id TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (asset_id) REFERENCES fixed_assets(id) ON DELETE CASCADE
);

-- ۵۵. گزارش‌های قانونی و مالیاتی (Tax & Statutory Reports)
CREATE TABLE IF NOT EXISTS tax_statutory_reports (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    company_id TEXT NOT NULL,
    year_shamsi TEXT NOT NULL,
    quarter TEXT, -- SPRING, SUMMER, AUTUMN, WINTER
    report_type TEXT NOT NULL, -- ARTICLE_169, VAT_RETURN, CORPORATE_TAX
    payload_json TEXT NOT NULL,
    net_payable_amount TEXT DEFAULT '0',
    journal_entry_id TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (company_id) REFERENCES companies(id)
);

CREATE INDEX IF NOT EXISTS idx_payroll_emp_code ON payroll_employees(tenant_id, personnel_code);
CREATE INDEX IF NOT EXISTS idx_fixed_assets_code ON fixed_assets(tenant_id, asset_code);
CREATE INDEX IF NOT EXISTS idx_tax_reports_quarter ON tax_statutory_reports(tenant_id, year_shamsi, quarter, report_type);

-- ۵۶. ویجت‌های داشبورد شخصی‌سازی‌شده کاربر (Dashboard Widgets)
CREATE TABLE IF NOT EXISTS dashboard_widgets (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    widget_type TEXT NOT NULL, -- KPI_CARD, CASH_FLOW_CHART, AGING_BAR, TOP_PRODUCTS_TABLE, RATIOS_RADAR, ALERTS_LIST
    title TEXT NOT NULL,
    position_x INTEGER DEFAULT 0,
    position_y INTEGER DEFAULT 0,
    width INTEGER DEFAULT 4,
    height INTEGER DEFAULT 3,
    config_json TEXT,
    is_visible BOOLEAN DEFAULT TRUE,
    created_at TEXT NOT NULL,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- ۵۷. قوانین هشدارهای هوشمند مالی و نقدینگی (Financial Alert Rules)
CREATE TABLE IF NOT EXISTS financial_alert_rules (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    company_id TEXT NOT NULL,
    rule_code TEXT NOT NULL, -- CASH_DEFICIT, OVERDUE_RECEIVABLES, TAX_DEADLINE, INVENTORY_SHORTAGE
    title TEXT NOT NULL,
    threshold_amount TEXT DEFAULT '0',
    severity TEXT NOT NULL, -- INFO, WARNING, CRITICAL
    is_active BOOLEAN DEFAULT TRUE,
    created_at TEXT NOT NULL,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (company_id) REFERENCES companies(id)
);

-- ۵۸. لاگ هشدارهای مالیاتی، بانکی و نقدینگی (Financial Alerts Log)
CREATE TABLE IF NOT EXISTS financial_alerts (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    company_id TEXT NOT NULL,
    rule_id TEXT,
    severity TEXT NOT NULL, -- INFO, WARNING, CRITICAL
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    due_date_shamsi TEXT,
    action_required TEXT,
    is_resolved BOOLEAN DEFAULT FALSE,
    resolved_at TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (company_id) REFERENCES companies(id),
    FOREIGN KEY (rule_id) REFERENCES financial_alert_rules(id)
);

CREATE INDEX IF NOT EXISTS idx_dashboard_widgets_user ON dashboard_widgets(tenant_id, user_id);
CREATE INDEX IF NOT EXISTS idx_financial_alerts_active ON financial_alerts(tenant_id, company_id, is_resolved);

-- ============================================================================
-- بخش دهم: فروشگاه آنلاین و چندکاناله، سخت‌افزار، ویزیتور و تردد (Phase 10)
-- ============================================================================

-- ۵۹. سفارش‌های فروش آنلاین و اینترنتی (Online Orders)
CREATE TABLE IF NOT EXISTS online_orders (
    seq_no BIGSERIAL,
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    company_id TEXT NOT NULL,
    branch_id TEXT NOT NULL,
    order_number TEXT NOT NULL,
    customer_party_id TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    customer_mobile TEXT NOT NULL,
    shipping_address TEXT NOT NULL,
    total_goods_amount TEXT NOT NULL,
    discount_amount TEXT DEFAULT '0',
    vat_amount TEXT DEFAULT '0',
    shipping_fee TEXT DEFAULT '0',
    grand_total TEXT NOT NULL,
    status TEXT DEFAULT 'PENDING', -- PENDING, PAID, PREPARING, SHIPPED, DELIVERED, CANCELLED
    payment_status TEXT DEFAULT 'UNPAID', -- UNPAID, PAID, REFUNDED
    courier_provider TEXT DEFAULT 'INTERNAL', -- SNAPP_BOX, ALOPEYK, MIARE, INTERNAL
    courier_tracking_code TEXT,
    sales_document_id TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (company_id) REFERENCES companies(id),
    FOREIGN KEY (branch_id) REFERENCES branches(id),
    FOREIGN KEY (customer_party_id) REFERENCES parties(id),
    FOREIGN KEY (sales_document_id) REFERENCES sales_documents(id)
);

-- ۶۰. اقلام سفارش آنلاین (Online Order Items)
CREATE TABLE IF NOT EXISTS online_order_items (
    id TEXT PRIMARY KEY,
    online_order_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    quantity NUMERIC(28, 4) NOT NULL,
    unit_price TEXT NOT NULL,
    discount_amount TEXT DEFAULT '0',
    net_amount TEXT NOT NULL,
    vat_amount TEXT DEFAULT '0',
    unit_cogs TEXT DEFAULT '0',
    total_cogs TEXT DEFAULT '0',
    FOREIGN KEY (online_order_id) REFERENCES online_orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id)
);

-- ۶۱. تراکنش‌های درگاه پرداخت اینترنتی شاپرک IPG (Payment Gateway Transactions)
CREATE TABLE IF NOT EXISTS online_payment_transactions (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    company_id TEXT NOT NULL,
    online_order_id TEXT NOT NULL,
    gateway_type TEXT NOT NULL, -- BEHPARDAKHT, SADAD, SAMAN, ZARINPAL
    amount TEXT NOT NULL,
    status TEXT DEFAULT 'INITIATED', -- INITIATED, VERIFIED, FAILED, REFUNDED
    token TEXT NOT NULL,
    rrn TEXT, -- Retrieval Reference Number
    card_pan_masked TEXT,
    gateway_fee TEXT DEFAULT '0',
    verified_at TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (company_id) REFERENCES companies(id),
    FOREIGN KEY (online_order_id) REFERENCES online_orders(id)
);

-- ۶۲. سوابق ویزیت و ردیابی بازاریاب میدانی (Visitor Visits & Field Sales GPS)
CREATE TABLE IF NOT EXISTS visitor_visits (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    company_id TEXT NOT NULL,
    visitor_user_id TEXT NOT NULL,
    customer_party_id TEXT NOT NULL,
    visit_date_shamsi TEXT NOT NULL,
    latitude NUMERIC(10, 7) NOT NULL,
    longitude NUMERIC(10, 7) NOT NULL,
    is_within_geofence BOOLEAN DEFAULT TRUE,
    visit_notes TEXT,
    sales_document_id TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (company_id) REFERENCES companies(id),
    FOREIGN KEY (visitor_user_id) REFERENCES users(id),
    FOREIGN KEY (customer_party_id) REFERENCES parties(id),
    FOREIGN KEY (sales_document_id) REFERENCES sales_documents(id)
);

-- ۶۳. تجهیزات سخت‌افزاری فروشگاهی و IoT (Hardware Terminals)
CREATE TABLE IF NOT EXISTS hardware_terminals (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    company_id TEXT NOT NULL,
    branch_id TEXT NOT NULL,
    device_type TEXT NOT NULL, -- PRINTER_ESC_POS, PC_POS, DIGITAL_SCALE, CASH_DRAWER, ATTENDANCE_TERMINAL
    title TEXT NOT NULL,
    ip_address TEXT,
    port INTEGER,
    serial_number TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    config_json TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (company_id) REFERENCES companies(id),
    FOREIGN KEY (branch_id) REFERENCES branches(id)
);

-- ۶۴. لاگ‌های خام تردد دستگاه حضور و غیاب (Biometric Attendance Logs)
CREATE TABLE IF NOT EXISTS attendance_logs (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    company_id TEXT NOT NULL,
    employee_id TEXT NOT NULL,
    terminal_id TEXT NOT NULL,
    log_date_shamsi TEXT NOT NULL,
    log_time TEXT NOT NULL,
    log_type TEXT NOT NULL, -- CLOCK_IN, CLOCK_OUT
    is_processed BOOLEAN DEFAULT FALSE,
    created_at TEXT NOT NULL,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (company_id) REFERENCES companies(id),
    FOREIGN KEY (employee_id) REFERENCES payroll_employees(id),
    FOREIGN KEY (terminal_id) REFERENCES hardware_terminals(id)
);

CREATE INDEX IF NOT EXISTS idx_online_orders_lookup ON online_orders(tenant_id, company_id, order_number);
CREATE INDEX IF NOT EXISTS idx_online_orders_status ON online_orders(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_visitor_visits_user ON visitor_visits(tenant_id, visitor_user_id, visit_date_shamsi);
CREATE INDEX IF NOT EXISTS idx_attendance_logs_emp ON attendance_logs(tenant_id, employee_id, log_date_shamsi);

-- =========================================================================
-- بخش یازدهم: زیرساخت ابری SaaS، اشتراک، امنیت، مهاجرت و چندمستاجری (Phase 11)
-- =========================================================================

-- ۶۵. پلن‌های اشتراک ابری پلتفرم (SaaS Plans)
CREATE TABLE IF NOT EXISTS saas_plans (
    id TEXT PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    name_fa TEXT NOT NULL,
    tier TEXT NOT NULL, -- FREE, STARTER, PRO, ENTERPRISE
    monthly_price TEXT NOT NULL DEFAULT '0',
    yearly_price TEXT NOT NULL DEFAULT '0',
    max_users INTEGER NOT NULL DEFAULT 1,
    max_branches INTEGER NOT NULL DEFAULT 1,
    max_monthly_transactions INTEGER NOT NULL DEFAULT 500,
    allowed_modules_json TEXT NOT NULL, -- JSON array of module names
    has_api_access BOOLEAN NOT NULL DEFAULT FALSE,
    has_audit_chain_verification BOOLEAN NOT NULL DEFAULT TRUE,
    storage_quota_mb INTEGER NOT NULL DEFAULT 100,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TEXT NOT NULL
);

-- ۶۶. اشتراک‌های سازمان‌ها (Tenant Subscriptions)
CREATE TABLE IF NOT EXISTS tenant_subscriptions (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL,
    plan_id TEXT NOT NULL,
    status TEXT NOT NULL, -- TRIAL, ACTIVE, EXPIRED, CANCELLED, GRACE_PERIOD
    started_at TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    auto_renew BOOLEAN NOT NULL DEFAULT TRUE,
    billing_cycle TEXT NOT NULL DEFAULT 'MONTHLY', -- MONTHLY, YEARLY
    payment_reference TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (organization_id) REFERENCES tenants(id),
    FOREIGN KEY (plan_id) REFERENCES saas_plans(id)
);

-- ۶۷. ردیابی مصرف سهمیه‌های ماه جاری مستاجرین (Tenant Usage Quotas)
CREATE TABLE IF NOT EXISTS tenant_usage_quotas (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL,
    period_month TEXT NOT NULL, -- YYYY-MM
    current_transactions INTEGER NOT NULL DEFAULT 0,
    current_users INTEGER NOT NULL DEFAULT 1,
    current_storage_mb INTEGER NOT NULL DEFAULT 10,
    last_updated_at TEXT NOT NULL,
    FOREIGN KEY (organization_id) REFERENCES tenants(id),
    UNIQUE (organization_id, period_month)
);

-- ۶۸. تاریخچه و لاگ دسته‌های مهاجرت داده از سیستم‌های سنتی (Data Migration Batches)
CREATE TABLE IF NOT EXISTS data_migration_batches (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL,
    source_system TEXT NOT NULL, -- SEPIDAR, RAHKARAN, CUSTOM_EXCEL
    entity_type TEXT NOT NULL, -- ACCOUNTS, PARTIES, PRODUCTS, OPENING_BALANCES
    file_name TEXT,
    total_rows INTEGER NOT NULL DEFAULT 0,
    imported_rows INTEGER NOT NULL DEFAULT 0,
    failed_rows INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL, -- PENDING, COMPLETED, FAILED, PARTIAL
    error_log_json TEXT,
    created_by TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (organization_id) REFERENCES tenants(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- ۶۹. تنظیمات امنیتی کاربران و تایید دومرحله‌ای (User Security Settings & 2FA)
CREATE TABLE IF NOT EXISTS user_security_settings (
    id TEXT PRIMARY KEY,
    user_id TEXT UNIQUE NOT NULL,
    two_factor_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    two_factor_secret TEXT,
    backup_codes_json TEXT,
    last_password_change TEXT,
    failed_login_attempts INTEGER NOT NULL DEFAULT 0,
    locked_until TEXT,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- ۷۰. لاگ وقایع امنیتی حساس (Security Audit Logs)
CREATE TABLE IF NOT EXISTS security_audit_logs (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    action_type TEXT NOT NULL, -- LOGIN, FAILED_LOGIN, 2FA_ENABLED, 2FA_DISABLED, PASSWORD_RESET, DATA_EXPORT, SETTINGS_CHANGE
    ip_address TEXT NOT NULL,
    user_agent TEXT,
    status TEXT NOT NULL, -- SUCCESS, FAILED, BLOCKED
    details_json TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (organization_id) REFERENCES tenants(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_tenant_sub_org ON tenant_subscriptions(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_tenant_usage_period ON tenant_usage_quotas(organization_id, period_month);
CREATE INDEX IF NOT EXISTS idx_migration_batch_org ON data_migration_batches(organization_id, entity_type);
CREATE INDEX IF NOT EXISTS idx_sec_audit_org_user ON security_audit_logs(organization_id, user_id, action_type);








