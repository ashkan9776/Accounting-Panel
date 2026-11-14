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
