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
    is_active INTEGER DEFAULT 1,
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
    is_central INTEGER DEFAULT 0,
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
    is_closed INTEGER DEFAULT 0,
    is_locked INTEGER DEFAULT 0,
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
    is_closed INTEGER DEFAULT 0,
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
    is_super_admin INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    created_at TEXT NOT NULL,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id)
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
    FOREIGN KEY (tenant_id) REFERENCES tenants(id)
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
    FOREIGN KEY (group_id) REFERENCES account_groups(id)
);

CREATE TABLE IF NOT EXISTS account_subsidiaries (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    company_id TEXT NOT NULL,
    head_id TEXT NOT NULL,
    code TEXT NOT NULL,
    title TEXT NOT NULL,
    nature TEXT NOT NULL,
    requires_floating_dimension_1 INTEGER DEFAULT 0,
    allowed_dimension_1_type TEXT,
    requires_floating_dimension_2 INTEGER DEFAULT 0,
    allowed_dimension_2_type TEXT,
    requires_floating_dimension_3 INTEGER DEFAULT 0,
    allowed_dimension_3_type TEXT,
    is_currency_dependent INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    description TEXT,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (head_id) REFERENCES account_heads(id)
);

CREATE TABLE IF NOT EXISTS floating_dimensions (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    company_id TEXT NOT NULL,
    dimension_type TEXT NOT NULL,
    code TEXT NOT NULL,
    title TEXT NOT NULL,
    reference_id TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TEXT NOT NULL,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id)
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
    FOREIGN KEY (fiscal_year_id) REFERENCES fiscal_years(id)
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
    is_active INTEGER DEFAULT 1,
    created_at TEXT NOT NULL,
    FOREIGN KEY (rule_definition_id) REFERENCES rule_definitions(id)
);

-- ۶. زنجیره ممیزی امن (Audit Trail with Cryptographic Hash Chaining)
CREATE TABLE IF NOT EXISTS audit_logs (
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
    is_customer INTEGER DEFAULT 1,
    is_supplier INTEGER DEFAULT 0,
    is_employee INTEGER DEFAULT 0,
    is_shareholder INTEGER DEFAULT 0,
    floating_dimension_id TEXT, -- لینک خودکار به تفصیلی شناور
    is_active INTEGER DEFAULT 1,
    created_at TEXT NOT NULL,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (company_id) REFERENCES companies(id),
    FOREIGN KEY (floating_dimension_id) REFERENCES floating_dimensions(id)
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
    is_active INTEGER DEFAULT 1,
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
    is_active INTEGER DEFAULT 1,
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
    is_active INTEGER DEFAULT 1,
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
    is_guarantee INTEGER DEFAULT 0, -- آیا چک ضمانتی است؟
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
    is_reconciled INTEGER DEFAULT 0,
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
    is_reference INTEGER DEFAULT 1,
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
    tax_exempt INTEGER DEFAULT 0,
    vat_rate TEXT DEFAULT '0.10',
    valuation_method TEXT DEFAULT 'MOVING_AVERAGE', -- MOVING_AVERAGE, FIFO
    min_stock_alert TEXT DEFAULT '0',
    max_stock_alert TEXT DEFAULT '0',
    sell_price TEXT DEFAULT '0',
    purchase_price TEXT DEFAULT '0',
    is_active INTEGER DEFAULT 1,
    created_at TEXT NOT NULL,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (company_id) REFERENCES companies(id),
    FOREIGN KEY (category_id) REFERENCES product_categories(id),
    FOREIGN KEY (unit_id) REFERENCES product_units(id)
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
    is_active INTEGER DEFAULT 1,
    created_at TEXT NOT NULL,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (company_id) REFERENCES companies(id),
    FOREIGN KEY (branch_id) REFERENCES branches(id)
);

-- ۱۷. کاردکس مقداری - ریالی انبار (Stock Ledger)
CREATE TABLE IF NOT EXISTS stock_ledger_entries (
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
    is_sandbox_mode INTEGER DEFAULT 1, -- حالت شبیه‌ساز یا واقعی
    is_active INTEGER DEFAULT 1,
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
    issue_date_timestamp INTEGER NOT NULL,
    total_gross_amount TEXT NOT NULL,
    total_discount_amount TEXT DEFAULT '0',
    total_net_amount TEXT NOT NULL,
    total_vat_amount TEXT DEFAULT '0',
    total_grand_amount TEXT NOT NULL,
    status TEXT DEFAULT 'PENDING', -- PENDING, QUEUED, SENT, IN_PROGRESS, CONFIRMED, REJECTED, FAILED
    tracking_token TEXT, -- کد پیگیری دریافت شده از کارپوشه سازمان مالیاتی
    packet_id TEXT,
    server_timestamp INTEGER,
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
    is_active INTEGER DEFAULT 1,
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
    idempotency_key TEXT UNIQUE, -- تضمین عدم ثبت تکراری در سناریوهای قطعی اینترنت
    is_offline_synced INTEGER DEFAULT 0,
    offline_created_at TEXT,
    moadian_tax_id TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (company_id) REFERENCES companies(id),
    FOREIGN KEY (branch_id) REFERENCES branches(id),
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id),
    FOREIGN KEY (shift_id) REFERENCES pos_shifts(id)
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
    is_weighted INTEGER DEFAULT 0,
    weight_grams INTEGER,
    barcode_scanned TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (pos_order_id) REFERENCES pos_orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE INDEX IF NOT EXISTS idx_pos_shifts_status ON pos_shifts(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_pos_orders_shift ON pos_orders(shift_id, status);
CREATE INDEX IF NOT EXISTS idx_pos_orders_idempotency ON pos_orders(idempotency_key);



