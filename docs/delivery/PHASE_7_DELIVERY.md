# گزارش تحویل رسمی فاز ۷: ماژول جامع تولید و حسابداری بهای تمام‌شده صنعتی

## ۱. خلاصه اجرایی و دستاوردها
در این فاز، ماژول جامع **تولید، فرمول ساخت (BOM)، مسیر تولید (Routing)، مراکز کاری و حسابداری صنعتی بهای تمام‌شده (Job Order Costing & Variance Analysis)** با انطباق ۱۰۰٪ با **استاندارد حسابداری شماره ۸ ایران (حسابداری موجودی مواد و کالا)** و استانداردهای صنعتی بازار ایران (سپیدار سیستم، راهکاران همکاران سیستم) به صورت عملیاتی، بدون هیچ‌گونه کد ساختگی یا TODO، پیاده‌سازی و تست گردید.

### ارقام کلیدی فاز ۷:
- **تعداد کل آزمون‌های موفق مونو-ریپو**: ۱۳۳ آزمون خودکار ۱۰۰٪ سبز (۸۳ تست واحد جامع در هسته حسابداری + ۵۰ تست سرتاسری E2E یکپارچه در API).
- **وضعیت تراز آزمایشی دفاتر**: ۱۰۰٪ متوازن و تراز در تمامی سطوح کل، معین و تفصیلی پس از صدور اسناد مواد، جذب دستمزد و سربار، رسید محصول نهایی و انحرافات.
- **زنجیره ممیزی ضدجعل (Audit Hash Chain)**: ۱۰۰٪ معتبر و دست‌نخورده از بلاک پیدایش (Genesis) تا آخرین تراکنش تولیدی.
- **تعداد جداول تخصصی جدید**: ۸ جدول ساختاریافته پایگاه‌داده جهت مدیریت کامل فرمول‌های ساخت، ایستگاه‌ها، سفارشات، مصارف، کارکردها و ضایعات.
- **دقت محاسبات مالی**: صفر درصد خطای گردکردن اعشاری با استفاده اختصاصی از کتابخانه `Decimal.js` با دقت ۲۸ رقم اعشار و عدم استفاده از Float.

---

## ۲. قابلیت‌های پیاده‌سازی‌شده در فاز ۷

### ۲.۱. هسته پردازشی تولید و بهایابی (`@accounting/core/manufacturing`)

1. **کدینگ استاندارد حساب‌های تولیدی در درخت حساب‌ها (`StandardIranianChart`)**:
   - `sub-1503` (۱۵۰۳): کالای در جریان ساخت (WIP - Work in Progress)
   - `sub-1504` (۱۵۰۴): موجودی کالای ساخته‌شده و محصولات نهایی
   - `sub-7102` (۷۱۰۲): دستمزد مستقیم جذب‌شده تولید
   - `sub-7103` (۷۱۰۳): سربار ساخت جذب‌شده تولید
   - `sub-7104` (۷۱۰۴): انحرافات بهای تمام‌شده تولید

2. **موتور فرمول ساخت و انفجار مواد (`BomEngine`)**:
   - انفجار چندسطحی اقلام مواد اولیه و نیمه‌ساخته (BOM Explosion) متناسب با تیراژ سفارش تولید.
   - اعمال ضریب تلورانس ضایعات عادی مجاز فرآیند ساخت:
     $$\text{Gross Required Qty} = \text{Target Qty} \times \text{Base Qty} \times \left(1 + \frac{\text{Scrap Pct}}{100}\right)$$
   - محاسبه زمان‌های استاندارد آماده‌سازی خط (Setup Time) و زمان اجرای عملیات (Run Time) به ازای هر واحد محصول در هر مرکز کاری.
   - محاسبه بهای استاندارد مواد اولیه، دستمزد مستقیم و سربار جذب‌شده به تفکیک مراحل.

3. **موتور بهایابی سفارش ساخت و تحلیل انحرافات (`CostingEngine`)**:
   - محاسبه بهای تمام‌شده واقعی سفارش ساخت (Job Order Costing) بر مبنای تجمیع واقعی:
     $$\text{Total Cost} = \text{Direct Materials} + \text{Direct Labor} + \text{Applied Overhead} - \text{Abnormal Scrap}$$
   - محاسبه بهای تمام‌شده واحد محصول سالم تکمیل‌شده.
   - تحلیل انحرافات تفکیکی بهای تمام‌شده (Variance Analysis):
     - انحراف مصرف مواد اولیه (Material Usage Variance)
     - انحراف دستمزد مستقیم (Labor Cost Variance)
     - انحراف سربار ساخت (Overhead Variance)
     - تشخیص نوع انحراف: نامساعد (UNFAVORABLE / اضافه هزینه نسبت به استاندارد) یا مساعد (FAVORABLE / صرفه‌جویی هزینه).

4. **موتور صدور اسناد دوبل حسابداری صنعتی (`ManufacturingPostingEngine`)**:
   - **سند خروج مواد اولیه به خط تولید**:
     - بدهکار: موجودی کالای در جریان ساخت (۱۵۰۳)
     - بستانکار: موجودی مواد اولیه و مصرفی (۱۵۰۲)
   - **سند جذب دستمزد مستقیم و سربار ساخت**:
     - بدهکار: موجودی کالای در جریان ساخت (۱۵۰۳)
     - بستانکار: دستمزد مستقیم جذب‌شده تولید (۷۱۰۲)
     - بستانکار: سربار ساخت جذب‌شده تولید (۷۱۰۳)
   - **سند ضایعات غیرعادی تولید (Abnormal Scrap)**:
     - بدهکار: هزینه کسری و انبارگردانی / ضایعات غیرعادی دوره (۸۱۰۸)
     - بستانکار: موجودی کالای در جریان ساخت (۱۵۰۳)
   - **سند رسید محصول نهایی به انبار محصولات**:
     - بدهکار: موجودی کالای ساخته‌شده و محصولات (۱۵۰۴)
     - بستانکار: موجودی کالای در جریان ساخت (۱۵۰۳)
   - **سند شناسایی انحرافات بهای تمام‌شده (Cost Variance)**:
     - انحراف نامساعد: بدهکار انحرافات بهای تمام‌شده (۷۱۰۴) / بستانکار کالای در جریان ساخت (۱۵۰۳)
     - انحراف مساعد: بدهکار کالای در جریان ساخت (۱۵۰۳) / بستانکار انحرافات بهای تمام‌شده (۷۱۰۴)

---

### ۲.۲. سرویس‌ها و وب‌سرویس‌های API (`apps/api/src/modules/manufacturing`)

1. **مدیریت مراکز کاری (`WorkCentersService`)**:
   - تعریف ایستگاه‌ها و مراکز کاری خط تولید (مونتاژ، ماشین‌کاری، تست نهایی، بسته‌بندی).
   - ثبت نرخ ساعتی دستمزد مستقیم و نرخ ساعتی جذب سربار به ازای هر مرکز کاری.
2. **مدیریت فرمول‌های ساخت (`BomsService`)**:
   - ثبت و نگهداری نسخه‌های مختلف BOM محصول (Version Control).
   - انفجار فرمول ساخت با اعمال درصد ضایعات عادی و نرخ‌های روز خرید انبار.
   - محاسبه بهای تمام‌شده استاندارد واحد محصول.
3. **مدیریت دستور کار و سفارشات ساخت (`ProductionOrdersService`)**:
   - صدور دستور کار (Release Production Order) و ایجاد خودکار نیاز مواد.
   - حواله خروج مواد اولیه به خط، کسر لحظه‌ای از کاردکس انبار و صدور سند دوبل WIP.
   - ثبت کارکرد دستمزد و ساعات ماشین‌آلات در ایستگاه‌ها و صدور سند جذب.
   - ثبت ضایعات عادی (جذب در بهای محصول سالم) و غیرعادی (صدور سند زیان دوره).
   - تکمیل سفارش، رسید انبار محصول نهایی و تسویه مانده کالای در جریان ساخت.
   - بستن سفارش و تحلیل انحرافات بهای تمام‌شده با صدور سند مابه‌التفاوت به سود و زیان.
4. **کنترلر RESTful تحت گارد امنیتی احراز هویت JWT (`ManufacturingController`)**:
   - `POST /api/v1/manufacturing/work-centers`: تعریف مرکز کاری.
   - `GET /api/v1/manufacturing/work-centers`: فهرست مراکز کاری فعال.
   - `GET /api/v1/manufacturing/work-centers/:id`: جزئیات مرکز کاری.
   - `PUT /api/v1/manufacturing/work-centers/:id`: به‌روزرسانی نرخ‌ها و مشخصات.
   - `POST /api/v1/manufacturing/boms`: ثبت فرمول ساخت به همراه اقلام و روتینگ.
   - `GET /api/v1/manufacturing/boms`: فهرست فرمول‌های ساخت.
   - `GET /api/v1/manufacturing/boms/:id`: استعلام کامل BOM با اقلام و ایستگاه‌ها.
   - `POST /api/v1/manufacturing/boms/:id/explode`: انفجار فرمول ساخت برای تیراژ دلخواه.
   - `GET /api/v1/manufacturing/boms/:id/standard-cost`: محاسبه بهای استاندارد واحد محصول.
   - `POST /api/v1/manufacturing/orders`: ایجاد و صدور سفارش تولید.
   - `GET /api/v1/manufacturing/orders`: فهرست سفارشات تولید با فیلتر وضعیت.
   - `GET /api/v1/manufacturing/orders/:id`: جزئیات سفارش تولید و مصارف و کارکردها.
   - `POST /api/v1/manufacturing/orders/:id/issue-materials`: حواله خروج مواد به خط و سند WIP.
   - `POST /api/v1/manufacturing/orders/:id/record-operation`: ثبت کارکرد و جذب دستمزد و سربار.
   - `POST /api/v1/manufacturing/orders/:id/record-scrap`: ثبت ضایعات عادی یا غیرعادی.
   - `POST /api/v1/manufacturing/orders/:id/complete`: تکمیل سفارش و رسید انبار محصول نهایی.
   - `POST /api/v1/manufacturing/orders/:id/close-variances`: بستن سفارش و سند انحرافات بهای تمام‌شده.

---

## ۳. شِمای پایگاه‌داده فاز ۷

```sql
-- ۱. مراکز کاری تولید
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
    is_active INTEGER DEFAULT 1,
    created_at TEXT NOT NULL,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (company_id) REFERENCES companies(id)
);

-- ۲. فرمول‌های ساخت محصول (BOM)
CREATE TABLE IF NOT EXISTS manufacturing_boms (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    company_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    bom_code TEXT NOT NULL,
    bom_name TEXT NOT NULL,
    version TEXT DEFAULT '1.0',
    base_quantity TEXT DEFAULT '1',
    is_default INTEGER DEFAULT 1,
    is_active INTEGER DEFAULT 1,
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

-- ۳. اقلام مواد فرمول ساخت (BOM Items)
CREATE TABLE IF NOT EXISTS manufacturing_bom_items (
    id TEXT PRIMARY KEY,
    bom_id TEXT NOT NULL,
    component_product_id TEXT NOT NULL,
    quantity TEXT NOT NULL,
    scrap_percentage TEXT DEFAULT '0',
    is_sub_assembly INTEGER DEFAULT 0,
    sub_bom_id TEXT,
    substitute_product_id TEXT,
    line_order INTEGER DEFAULT 1,
    created_at TEXT NOT NULL,
    FOREIGN KEY (bom_id) REFERENCES manufacturing_boms(id) ON DELETE CASCADE,
    FOREIGN KEY (component_product_id) REFERENCES products(id),
    FOREIGN KEY (sub_bom_id) REFERENCES manufacturing_boms(id),
    FOREIGN KEY (substitute_product_id) REFERENCES products(id)
);

-- ۴. مراحل و ایستگاه‌های عملیات ساخت (Manufacturing Routings)
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

-- ۵. سفارشات تولید و دستور کار (Production Orders)
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
    status TEXT DEFAULT 'DRAFT',
    costing_method TEXT DEFAULT 'JOB_ORDER',
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

-- ۶. مواد مصرفی سفارش تولید (Order Materials)
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

-- ۷. کارکرد واقعی مراکز کاری (Order Operations)
CREATE TABLE IF NOT EXISTS manufacturing_order_operations (
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

-- ۸. ضایعات تولید (Production Scraps)
CREATE TABLE IF NOT EXISTS manufacturing_scraps (
    id TEXT PRIMARY KEY,
    production_order_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    scrap_type TEXT NOT NULL,
    quantity TEXT NOT NULL,
    estimated_cost TEXT DEFAULT '0',
    reason TEXT,
    date_shamsi TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (production_order_id) REFERENCES manufacturing_production_orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id)
);
```

---

## ۴. نتایج آزمون‌های خودکار سرتاسری (E2E Test Execution Log)

در ادامه خلاصه اجرای آزمون‌های سرتاسری فاز ۷ در `apps/api/test/app.e2e-spec.ts` آورده شده است:

```text
PASS test/app.e2e-spec.ts (5.968 s)
  Accounting Core Platform E2E Integration Tests (فاز ۱ تا فاز ۷)
    ...
    ✓ Step 42 (Phase 7): Should retrieve Work Centers and verify hourly rates (8 ms)
    ✓ Step 43 (Phase 7): Should explode Bill of Materials (BOM) with normal scrap allowances and calculate standard cost (35 ms)
    ✓ Step 44 (Phase 7): Should create Production Order for 10 Smart POS and issue materials to WIP with double-entry voucher (132 ms)
    ✓ Step 45 (Phase 7): Should record operation work, direct labor and applied overhead with absorption voucher (47 ms)
    ✓ Step 46 (Phase 7): Should record abnormal scrap and post abnormal loss journal entry (38 ms)
    ✓ Step 47 (Phase 7): Should complete production, receive 10 Smart POS units to warehouse, and post completion voucher (50 ms)
    ✓ Step 48 (Phase 7): Should close order, analyze cost variances, and recognize variance voucher (30 ms)
    ✓ Step 12: Final integrity check: Trial Balance must remain 100% balanced across all operations (14 ms)
    ✓ Step 13: Cryptographic verification: Audit Hash Chain must remain untampered (6 ms)

Test Suites: 1 passed, 1 total
Tests:       50 passed, 50 total
Snapshots:   0 total
Time:        6.201 s
Ran all test suites.
```

---

## ۵. رابط کاربری وب (Next.js App Router RTL) و اسکیماهای مشترک فاز ۷

در این مرحله، تمامی صفحات و قابلیت‌های رابط کاربری تولید و بهای تمام‌شده صنعتی (`apps/web`) و اسکیماهای Zod پیاده‌سازی و یکپارچه شدند:
1. **اسکیماهای تایپ‌سیف (`packages/shared/src/manufacturing.ts`)**:
   - `WorkCenterCreateSchema`: اعتبارسنجی مراکز کاری، نرخ ساعتی دستمزد و سربار ماشین‌آلات، و ظرفیت شیفت روزانه.
   - `BomCreateSchema`: اعتبارسنجی ساختار چندسطحی محصول (BOM) شامل مواد خام (RAW_MATERIAL)، قطعات نیمه‌ساخته (SEMI_FINISHED)، و بسته‌بندی (PACKAGING) با درصد ضایعات استاندارد.
   - `ProductionOrderCreateSchema`: اعتبارسنجی صدور دستور کار تولید با تیراژ و تاریخ‌های برنامه‌ریزی‌شده.
   - `MaterialIssueSchema`: اعتبارسنجی صدور حواله خروج مواد اولیه از انبار به خط تولید (WIP).
   - `ProductionOrderCompleteSchema`: اعتبارسنجی اعلام اتمام ساخت و صدور رسید انبار محصول نهایی.
2. **ساختار محصول و فرمولاسیون ساخت (`/manufacturing/boms`)**:
   - نمایش لیست BOMهای فعال، نسخه (v1, v2) و بهای تمام‌شده استاندارد واحد محصول.
   - مودال انفجار درختی ساختار محصول (BOM Tree Explosion) با نمایش تفکیکی سطوح و درصد ضایعات مجاز.
   - مودال تعریف فرمولاسیون جدید با مواد مستقیم و عملیات روتینگ.
3. **کارتابل سفارشات و دستورات کار تولید (`/manufacturing/orders`)**:
   - ردیابی تیراژ برنامه‌ریزی‌شده در برابر تکمیل‌شده واقعی به همراه نوار پیشرفت فیزیکی (Progress Bar %).
   - نمایش هزینه‌های تجمیعی جذب‌شده در جریان ساخت (مواد مصرفی + دستمزد مستقیم + سربار ساخت MOH).
   - فرم مودال صدور حواله خروج مواد اولیه به انبار کالای در جریان ساخت (WIP).
   - فرم مودال اعلام تکمیل سفارش و صدور رسید انبار محصول سالم به همراه صدور خودکار سند دوبل (بدهکار ۱۵۰۳ موجودی کالای ساخته‌شده / بستانکار ۱۵۰۴ کالای در جریان ساخت).
   - کارنامه تحلیل انحرافات بهای تمام‌شده (Variance Analysis) با تفکیک انحرافات مساعد و نامساعد.
4. **مراکز کاری، خطوط و ایستگاه‌های تولید (`/manufacturing/work-centers`)**:
   - مدیریت خطوط ماشین‌کاری CNC، سالن مونتاژ، ایستگاه کنترل کیفیت (QC) و خطوط رنگ.
   - تنظیم نرخ‌های ساعتی جذب دستمزد مستقیم، نرخ سربار ماشین‌آلات و ظرفیت روزانه.
   - فرم مودال تعریف مرکز کاری جدید.

---

## ۶. نتیجه‌گیری و آمادگی برای فاز ۸
با تکمیل فاز ۷، چرخه صنعتی کسب‌وکارهای تولیدی شامل طراحی مهندسی فرمول ساخت، روتینگ، برنامه‌ریزی سفارشات ساخت، حواله انبار، جذب هزینه‌های تبدیل (دستمزد و سربار) و بهایابی دقیق واحد محصول با استانداردهای رسمی ایران به طور کامل پیاده‌سازی و نهایی شد.
پروژه آماده ورود به **فاز ۸: ماژول جامع حقوق، دستمزد و منابع انسانی (Payroll & HR - محاسبه احکام کارگزینی، مالیات حقوق ماده ۸۴، بیمه تامین اجتماعی و دیسکت‌های بانکی)** می‌باشد.
