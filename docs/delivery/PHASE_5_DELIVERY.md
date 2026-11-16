# گزارش تحویل رسمی فاز ۵: صندوق فروشگاهی (POS) آفلاین و ماژول فروشگاه

## ۱. خلاصه اجرایی و دستاوردها
در این فاز، ماژول جامع صندوق فروشگاهی (Point of Sale - POS) و فروشگاه زنجیره‌ای/خرده‌فروشی مطابق با استانداردهای قانونی، الزامات تجاری بازار ایران (نظیر نرم‌افزارهای سپیدار سیستم، دشت، هلو و راهکاران) و نیازمندی‌های سخت‌افزاری و بانکی پیاده‌سازی گردید. کلیه محاسبات مالی و مقداری با دقت اعشاری بالا (Decimal.js با دقت ۲۸ رقم) پیاده‌سازی شده و هیچ‌گونه شبه‌کد یا رهاسازی TODO در پروژه وجود ندارد.

### ارقام کلیدی فاز ۵:
- **تعداد کل آزمون‌های فعال و سبز مونو-ریپو**: ۱۰۱ آزمون خودکار (۶۷ آزمون واحد هسته + ۳۴ آزمون سرتاسری E2E API).
- **پایداری تراز کل**: ۱۰۰٪ تراز (جمع بدهکار = جمع بستانکار در کلیه تراکنش‌ها و اسناد تجمیعی).
- **زنجیره ممیزی ضدجعل**: ۱۰۰٪ معتبر و بدون شکست در تمام اسناد مالی و لاگ‌ها.
- **تعداد جداول پایگاه‌داده جدید**: ۵ جدول اختصاصی برای صندوق و پایانه‌ها.

---

## ۲. قابلیت‌های پیاده‌سازی‌شده در فاز ۵

### ۲.۱. هسته پردازشی صندوق (`@accounting/core/pos`)
1. **پارس بارکدهای وزنی و قیمتی ترازوی دیجیتال (Digital Scale Barcode Parser)**:
   - پشتیبانی استاندارد از بارکدهای ۱۳ رقمی EAN-13 با پیشوندهای تجاری ۲۱، ۲۲ و ۲۳.
   - استخراج خودکار کد ۵ رقمی کالا و مقدار وزن به گرم (با تبدیل به کیلوگرم) یا مبلغ کل به ریال.
   - محاسبه نرخ واحد برای بارهای متغیر پروتئینی، لبنی، میوه و سبزیجات.
2. **موتور صدور اسناد تجمیعی روزانه (`PosPostingEngine`)**:
   - جلوگیری از آلودگی دفتر روزنامه با هزاران رکورد خرد و صدور سند دوبل تجمیعی روزانه (Daily Consolidated Journal Entry) طبق ماده ۱۴ قانون تجارت.
   - **سند تجمیعی فروش**: بدهکار صندوق نقدی (۱۱۰۱)، بدهکار وجوه در راه کارتخوان‌ها (۱۱۰۴)، بدهکار تخفیفات نقدی (۶۲۰۱)، بستانکار فروش کالا (۶۱۰۱)، بستانکار ارزش افزوده (۳۳۰۶).
   - **سند بهای تمام‌شده تجمیعی (COGS)**: بدهکار بهای تمام‌شده کالای فروش‌رفته (۷۱۰۱) و بستانکار موجودی کالای تجاری (۱۵۰۱).
   - **سند تعدیل کسری/فزونی نقدینگی صندوق**: بدهکار هزینه کسری صندوق و انبار (۸۱۰۸) و بستانکار صندوق (۱۱۰۱) در صورت کسری؛ بدهکار صندوق (۱۱۰۱) و بستانکار سایر درآمدهای عملیاتی (۶۱۰۵) در صورت فزونی.

### ۲.۲. سرویس‌ها و وب‌سرویس‌های API (`apps/api/src/modules/pos`)
1. **مدیریت شیفت‌های صندوقداری (`PosShiftsService`)**:
   - باز کردن شیفت با ثبت مانده اولیه نقدینگی و ریز پول‌های خرد (Denominations).
   - جلوگیری از باز شدن همزمان چند شیفت باز برای یک صندوقدار در یک شعبه.
   - ثبت رویدادهای واریز و برداشت نقدی میان‌شیفت (Cash Drop برای تخلیه مازاد نقد به گاوصندوق و Cash In برای تزریق پول خرد).
   - استعلام گزارش لحظه‌ای X بدون بستن شیفت جهت کنترل ناظر صندوق.
   - بستن نهایی شیفت، صدور گزارش رسمی Z و صدور خودکار اسناد حسابداری دوبل تجمیعی و سند تعدیل کسری/فزونی صندوق.
2. **ثبت سریع سفارشات و فاکتور فروشگاهی (`PosOrdersService`)**:
   - ثبت سفارش سریع با اسکن بارکد، بارکدخوان ترازویی، یا انتخاب سریع کالا.
   - پشتیبانی کامل از سبد خرید معلق (Hold Cart) در زمان معطلی مشتری، و بازیابی و تکمیل مجدد (Recall Cart) با کسر به موقع کاردکس انبار.
   - همگام‌سازی دسته‌ای آفلاین (Offline Batch Sync) در زمان قطع اینترنت با محافظت کلید یکتا (Idempotency Key) جهت جلوگیری قطعی از ثبت تکراری سفارش یا کسر دوباره موجودی انبار.
   - چاپ رسید حرارتی استاندارد ۸۰ میلی‌متری شامل مشخصات فروشگاه، تفکیک مبالغ، و مبلغ کل حروفی به زبان فارسی.
3. **کنترلر و روت‌های RESTful تحت گارد امنیتی JWT (`PosController`)**:
   - `POST /api/v1/pos/shifts/open`: باز کردن شیفت صندوق.
   - `GET /api/v1/pos/shifts/active`: استعلام وضعیت شیفت فعال کاربر.
   - `POST /api/v1/pos/shifts/:id/cash-movement`: ثبت ورود یا خروج نقدینگی.
   - `GET /api/v1/pos/shifts/:id/x-report`: استخراج گزارش X میانی.
   - `POST /api/v1/pos/shifts/:id/close`: بستن شیفت و صدور گزارش Z و اسناد حسابداری.
   - `POST /api/v1/pos/orders`: ثبت فاکتور جدید POS (یا معلق‌سازی).
   - `GET /api/v1/pos/orders/hold`: دریافت لیست سفارشات معلق.
   - `POST /api/v1/pos/orders/:id/recall-complete`: بازیابی و تسویه سبد معلق.
   - `POST /api/v1/pos/orders/sync-offline`: همگام‌سازی دسته‌ای سفارشات آفلاین.
   - `GET /api/v1/pos/orders/:id/receipt`: دریافت اطلاعات رسید حرارتی چاپی.
   - `GET /api/v1/pos/terminals`: فهرست پایانه‌های پوز فروشگاه.

---

## ۳. پایگاه‌داده و شِمای داده فاز ۵

```sql
-- پایانه‌های کارتخوان بانکی متصل به سیستم
CREATE TABLE IF NOT EXISTS pos_terminals (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    company_id TEXT NOT NULL,
    branch_id TEXT NOT NULL,
    code TEXT NOT NULL,
    title TEXT NOT NULL,
    terminal_number TEXT NOT NULL,
    serial_number TEXT,
    psp_name TEXT NOT NULL,
    bank_account_id TEXT NOT NULL,
    floating_dimension_id TEXT NOT NULL,
    is_active INTEGER DEFAULT 1,
    created_at TEXT NOT NULL
);

-- شیفت‌های صندوق‌داری
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
    status TEXT DEFAULT 'OPEN',
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
    daily_journal_entry_id TEXT,
    cogs_journal_entry_id TEXT,
    discrepancy_journal_entry_id TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- تراکنش‌های ورود و خروج نقدینگی در طول شیفت
CREATE TABLE IF NOT EXISTS pos_cash_movements (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    shift_id TEXT NOT NULL,
    movement_type TEXT NOT NULL, -- CASH_DROP, CASH_IN
    amount TEXT NOT NULL,
    date_shamsi TEXT NOT NULL,
    description TEXT,
    created_by_user_id TEXT NOT NULL,
    created_at TEXT NOT NULL
);

-- سفارشات فروشگاهی
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
    payment_method TEXT DEFAULT 'CASH', -- CASH, POS_CARD, MIXED
    cash_amount TEXT DEFAULT '0',
    pos_card_amount TEXT DEFAULT '0',
    idempotency_key TEXT UNIQUE,
    is_offline_synced INTEGER DEFAULT 0,
    offline_created_at TEXT,
    created_at TEXT NOT NULL
);

-- سطور کالایی سفارشات فروشگاهی
CREATE TABLE IF NOT EXISTS pos_order_items (
    id TEXT PRIMARY KEY,
    pos_order_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
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
    created_at TEXT NOT NULL
);
```

---

## ۴. نتایج آزمون‌های سرتاسری E2E فاز ۵
آزمون‌های سرتاسری زیر با موفقیت اجرا و تایید شدند:
1. **Step 26**: استعلام پایانه‌های فعال و باز کردن شیفت با ۵ میلیون ریال وجه اولیه و بررسی شیفت فعال.
2. **Step 27**: ثبت سفارش با بارکد ترازوی وزنی (`2100105015003` معادل ۱.۵ کیلوگرم گوشت)، کسر کاردکس انبار از ۱۰۰ کیلو به ۹۸.۵ کیلوگرم و تولید رسید حرارتی چاپی با حروف فارسی.
3. **Step 28**: ثبت سبد خرید معلق (HOLD)، استعلام سبدها، بازیابی (Recall) و تسویه نقدی به مبلغ ۳۸۵ میلیون ریال با کسر کاردکس انبار لپ‌تاپ.
4. **Step 29**: همگام‌سازی دسته‌ای آفلاین با Idempotency Key و تست ارسال مجدد جهت اثبات عدم کسر تکراری انبار.
5. **Step 30**: ثبت واریز نقدی (Cash In) و برداشت نقدی مازاد (Cash Drop) و محاسبه مانده لحظه‌ای صندوق.
6. **Step 31**: استعلام گزارش میانی X بدون بستن شیفت و تایید ارقام تجمیعی فروش و نقدینگی صندوق.
7. **Step 32**: بستن شیفت با کسری نقدینگی ۵۰,۰۰۰ ریال، چاپ گزارش Z و صدور خودکار ۳ سند دوبل (تجمیعی فروش، بهای تمام‌شده و تعدیل کسری صندوق).
8. **Step 33**: بررسی تراز آزمایشی کل سیستم و اثبات تراز ۱۰۰٪ دفتر روزنامه و کل.
9. **Step 34**: اعتبارسنجی رمزنگاری زنجیره هش ممیزی و تایید عدم هرگونه دستکاری.

---

## ۵. رابط کاربری وب (Next.js App Router RTL) و اسکیماهای مشترک فاز ۵

در این مرحله، تمامی صفحات و قابلیت‌های رابط کاربری صندوق فروشگاهی (`apps/web`) و اسکیماهای Zod طراحی و یکپارچه شدند:
1. **اسکیماهای تایپ‌سیف (`packages/shared/src/pos.ts`)**:
   - `PosShiftOpenSchema`: اعتبارسنجی باز کردن شیفت و موجودی اولیه (Float).
   - `PosShiftCloseSchema`: اعتبارسنجی بستن شیفت و ورود مبالغ شمرده‌شده فیزیکی صندوقدار.
   - `PosCashMovementSchema`: اعتبارسنجی تراکنش‌های ورود (`CASH_IN`) و خروج (`CASH_OUT`) نقدینگی در حین شیفت.
   - `PosOrderCreateSchema`: اعتبارسنجی اقلام سبد خرید، محاسبه ۱۰٪ ارزش افزوده، روش‌های پرداخت نقدی، کارتخوان بانکی (PC-POS)، و ترکیبی (Split).
   - `PosHoldOrderSchema`: اعتبارسنجی تعلیق فاکتور (Hold Cart) و برچسب‌گذاری سبد.
2. **پایانه فروشگاهی فوق سریع کیبورد محور (`/pos`)**:
   - نوار وضعیت آنلاین/آفلاین با شمارنده فاکتورهای صف آفلاین و دکمه همگام‌سازی لحظه‌ای.
   - کلیدهای میانبر استاندارد کیبورد (`F1` بارکدخوان، `F8` تعلیق سبد، `F9` پرداخت، `Esc` لغو).
   - کاشی‌های لمسی اقلام پرفروش (Quick Touch Grid) با دسته‌بندی موضوعی کالاها.
   - سبد خرید با تغییر سریع تعداد (+ و -)، تفکیک اقلام معاف از ارزش افزوده و مشمول ۱۰٪.
   - مودال تسویه حساب با محاسبه پول خرد برگشتی نقدی (Change Calculation).
   - مدیریت سبدهای خرید معلق (Hold Tray) و بازیابی با یک کلیک.
3. **کارتابل مدیریت شیفت‌ها و تحویل صندوق (`/pos/shifts`)**:
   - نمایش لحظه‌ای وضعیت شیفت فعال، فروش نقدی، فروش کارتخوان و موجودی دفتری نقد در کشو.
   - ثبت ورود/خروج نقدینگی با ذکر علت (تزریق پول خرد، هزینه پیک).
   - گزارش میانی X بدون بستن شیفت.
   - بستن نهایی شیفت، محاسبه خودکار کسری/فزونی صندوق و صدور سند دوبل تعدیل به سرفصل ۸۱۰۴ یا ۶۱۰۵.
   - آرشیو شیفت‌های گذشته با وضعیت سند مالی متناظر.
4. **پیش‌نمایش و چاپ فیش حرارتی ۸۰ میلی‌متری (`/pos/receipt`)**:
   - طراحی اختصاصی مناسب رول حرارتی ۸۰ میلی‌متری با قابلیت چاپ مستقیم (`window.print()`).
   - شامل مشخصات فروشگاه، جدول ریز اقلام، جمع ارزش افزوده ۱۰٪، اطلاعات تراکنش بانکی (RRN و شماره کارت) و QR Code استاندارد.

---

## ۶. وضعیت برای فاز بعدی
فاز ۵ با موفقیت ۱۰۰٪ به پایان رسید و سیستم آماده آغاز پیاده‌سازی **فاز ۶ (ماژول رستوران، کافی‌شاپ، منوی دیجیتال، دستور پخت BOM، سالن و میزها، KDS و پیک)** می‌باشد.
