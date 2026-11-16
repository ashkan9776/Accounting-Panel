# گزارش تحویل رسمی فاز ۶: ماژول جامع رستوران، کافی‌شاپ و فست‌فود

## ۱. خلاصه اجرایی و دستاوردها
در این فاز، ماژول جامع مدیریت رستوران، کافه و فست‌فود به صورت کاملاً حرفه‌ای و متصل به هسته حسابداری دوبل و انبارداری مقداری-ریالی پیاده‌سازی گردید. کلیه فرآیندهای تخصصی این صنف اعم از **دستور پخت (Recipe / BOM) و محاسبه بهای مواد (Food Cost)، مهندسی منو بر اساس ماتریس سودآوری و محبوبیت، نقشه‌ی بخش‌ها و میزهای سالن، ادغام و انتقال میزها، سفارش‌گیری چندکاناله (سالن، بیرون‌بر، پیک و پلتفرم آنلاین)، نمایشگر آشپزخانه (KDS)، تقسیم صورتحساب (Split Bill) و مدیریت پیک و دلیوری** به صورت عملیاتی، بدون شبه‌کد و با تست‌های خودکار سبز پیاده‌سازی شدند.

### ارقام کلیدی فاز ۶:
- **تعداد کل تست‌های موفق مونو-ریپو**: ۱۱۶ آزمون خودکار (۷۳ تست واحد هسته حسابداری + ۴۳ تست یکپارچگی سرتاسری E2E API).
- **وضعیت تراز دفاتر**: ۱۰۰٪ تراز (تطابق کامل جمع بدهکار و بستانکار در اسناد فروش غذا و اسناد مصرف مواد اولیه).
- **زنجیره ممیزی ضدجعل**: ۱۰۰٪ معتبر و غیرقابل تغییر.
- **تعداد جداول اختصاصی جدید**: ۹ جدول تخصصی رستورانی.

---

## ۲. قابلیت‌های پیاده‌سازی‌شده در فاز ۶

### ۲.۱. هسته پردازشی رستوران (`@accounting/core/restaurant`)
1. **موتور دستور پخت و محاسبه Food Cost (`RecipeEngine`)**:
   - محاسبه دقیق بهای تمام‌شده مواد اولیه برای هر پرس غذا بر مبنای BOM چند ردیفه.
   - اعمال درصد ضایعات استاندارد آماده‌سازی مواد (Scrap / Waste Factor) در محاسبه مصرف موثر.
   - تحلیل مهندسی منو بر اساس ماتریس ۴ گانه بوستون/کاساوانا و اسمیت (Menu Engineering Matrix):
     - **Star (ستاره)**: سود ناخالص بالا (حاشیه سود بالای ۶۵٪) و محبوبیت بالا.
     - **Plowhorse (اسب کاری)**: محبوبیت بالا اما سود ناخالص پایین.
     - **Puzzle (معما)**: سود ناخالص بالا اما محبوبیت پایین.
     - **Dog (سگ)**: هم سود ناخالص پایین و هم محبوبیت پایین.
   - محاسبه مقادیر ناخالص مواد اولیه جهت کسر خودکار و لحظه‌ای از کاردکس انبار متناسب با تعداد پرس سفارش.
2. **موتور صدور اسناد دوبل حسابداری رستوران (`RestaurantPostingEngine`)**:
   - **سند دوبل فروش غذا**: بدهکار صندوق نقدی (۱۱۰۱)، بدهکار کارتخوان سالن (۱۱۰۴)، بدهکار مطالبات اسنپ‌فود/پلتفرم آنلاین (۱۲۰۱)، بدهکار تخفیفات نقدی (۶۲۰۱)، بستانکار فروش غذا و محصولات (۶۱۰۱)، بستانکار درآمد حق سرویس سالن (۶۱۰۵)، بستانکار مالیات ارزش افزوده (۳۳۰۶).
   - **سند بهای تمام‌شده غذا (Food Cost)**: بدهکار بهای تمام‌شده کالای فروش‌رفته (۷۱۰۱) و بستانکار موجودی مواد اولیه و قطعات (۱۵۰۲).
   - **سند هدررفت و ضایعات غذا (Food Waste / Spoilage)**: بدهکار هزینه ضایعات و افت مواد (۸۱۰۸) و بستانکار موجودی مواد اولیه (۱۵۰۲).

### ۲.۲. سرویس‌ها و وب‌سرویس‌های API (`apps/api/src/modules/restaurant`)
1. **مدیریت سالن و میزها (`TablesService`)**:
   - تعریف بخش‌های سالن (بخش اصلی، تراس، VIP) و ظرفیت میزها.
   - مدیریت چرخه‌حیات وضعیت میز: خالی (VACANT)، اشغال (OCCUPIED)، رزرو (RESERVED)، صدور صورتحساب (BILL_PRINTED)، و تمیزکاری (CLEANING).
   - ادغام دو میز همجوار (Merge Tables) برای میهمانی‌ها و گروه‌های بزرگ.
   - انتقال سفارش فعال از یک میز به میز دیگر (Move / Transfer Table).
2. **سرویس دستور پخت و کسر انبار (`RecipesService`)**:
   - استعلام اقلام تشکیل‌دهنده، مقادیر، درصد ضایعات و بهای تمام‌شده هر غذا.
   - کسر خودکار مواد اولیه از کاردکس انبار مواد مصرفی در زمان ثبت/تسویه سفارش با روش میانگین موزون متحرک (Moving Average).
3. **نمایشگر آشپزخانه (`KdsService`)**:
   - تفکیک خودکار اقلام یک فاکتور به تیکت‌های ایستگاه‌های مختلف کاری: آشپزخانه گرم (HOT_KITCHEN)، بار کافه و نوشیدنی (BAR_CAFE)، و آشپزخانه سرد (COLD_KITCHEN).
   - تغییر وضعیت تیکت‌ها توسط سرآشپز: در صف (QUEUED) -> در حال پخت (PREPARING) -> آماده تحویل (READY) -> تحویل شده (SERVED).
   - تغییر خودکار وضعیت کلی سفارش به «آماده تحویل» (READY_TO_SERVE) پس از آماده‌سازی تمامی تیکت‌های ایستگاه‌ها.
4. **سفارشات، تسویه و تقسیم صورتحساب (`RestaurantOrdersService`)**:
   - ثبت سفارش برای کانال‌های مختلف (سالن، بیرون‌بر، دلیوری، آنلاین).
   - محاسبه ۵٪ حق سرویس سالن و ۱۰٪ مالیات ارزش افزوده.
   - تقسیم صورتحساب (Split Bill) به سهم‌های مساوی با دقت ریالی.
   - تسویه نهایی، آزادسازی میز و صدور همزمان سند فروش و سند بهای تمام‌شده غذا.
5. **پیک و دلیوری (`DeliveriesService`)**:
   - ایجاد ماموریت ارسال با پیک و ثبت آدرس، تلفن و هزینه ارسال.
   - تخصیص پیک موتوری به سفارش و رهگیری وضعیت.
   - وصول مبالغ درب منزل و تسویه حساب تجمیعی پایان روز پیک با صندوق رستوران.
6. **کنترلر RESTful تحت گارد امنیتی JWT (`RestaurantController`)**:
   - `GET /api/v1/restaurant/sections`: فهرست بخش‌های سالن.
   - `GET /api/v1/restaurant/tables`: وضعیت زنده میزها.
   - `POST /api/v1/restaurant/tables/:id/status`: تغییر وضعیت میز.
   - `POST /api/v1/restaurant/tables/merge`: ادغام دو میز.
   - `POST /api/v1/restaurant/tables/transfer`: انتقال سفارش به میز دیگر.
   - `GET /api/v1/restaurant/recipes/:productId`: استعلام دستور پخت.
   - `GET /api/v1/restaurant/recipes/:productId/analysis`: تحلیل مهندسی منو و Food Cost.
   - `POST /api/v1/restaurant/orders`: ثبت سفارش رستوران.
   - `GET /api/v1/restaurant/orders/:id`: جزئیات سفارش.
   - `POST /api/v1/restaurant/orders/:id/split`: تقسیم صورتحساب (Split Bill).
   - `POST /api/v1/restaurant/orders/:id/settle`: تسویه فاکتور و صدور اسناد دوبل حسابداری.
   - `GET /api/v1/restaurant/kds/tickets`: نمایشگر تیکت‌های آشپزخانه.
   - `POST /api/v1/restaurant/kds/tickets/:id/status`: تغییر وضعیت تیکت آشپزخانه.
   - `POST /api/v1/restaurant/deliveries`: ایجاد ماموریت دلیوری.
   - `POST /api/v1/restaurant/deliveries/:id/assign`: تخصیص پیک.
   - `POST /api/v1/restaurant/deliveries/:id/complete`: ثبت تحویل درب منزل.
   - `POST /api/v1/restaurant/deliveries/settle-courier`: تسویه حساب پایان روز پیک.

---

## ۳. شِمای پایگاه‌داده فاز ۶

```sql
-- بخش‌های سالن
CREATE TABLE IF NOT EXISTS restaurant_sections (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    company_id TEXT NOT NULL,
    branch_id TEXT NOT NULL,
    code TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    created_at TEXT NOT NULL
);

-- میزهای رستوران
CREATE TABLE IF NOT EXISTS restaurant_tables (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    company_id TEXT NOT NULL,
    branch_id TEXT NOT NULL,
    section_id TEXT NOT NULL,
    table_number TEXT NOT NULL,
    title TEXT NOT NULL,
    capacity INTEGER DEFAULT 4,
    status TEXT DEFAULT 'VACANT',
    merged_with_table_id TEXT,
    current_order_id TEXT,
    qr_code_token TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- دسته‌بندی‌های منو
CREATE TABLE IF NOT EXISTS restaurant_menu_categories (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    company_id TEXT NOT NULL,
    code TEXT NOT NULL,
    title TEXT NOT NULL,
    icon TEXT,
    display_order INTEGER DEFAULT 0,
    kitchen_station TEXT DEFAULT 'HOT_KITCHEN',
    is_active INTEGER DEFAULT 1,
    created_at TEXT NOT NULL
);

-- فرمول ساخت و دستور پخت (Recipe / BOM)
CREATE TABLE IF NOT EXISTS restaurant_recipes (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    company_id TEXT NOT NULL,
    menu_product_id TEXT NOT NULL,
    yield_quantity TEXT DEFAULT '1',
    notes TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- اقلام مواد اولیه دستور پخت
CREATE TABLE IF NOT EXISTS restaurant_recipe_items (
    id TEXT PRIMARY KEY,
    recipe_id TEXT NOT NULL,
    raw_product_id TEXT NOT NULL,
    quantity TEXT NOT NULL,
    waste_percentage TEXT DEFAULT '0',
    created_at TEXT NOT NULL
);

-- تیکت‌های KDS نمایشگر آشپزخانه
CREATE TABLE IF NOT EXISTS restaurant_kds_tickets (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    company_id TEXT NOT NULL,
    branch_id TEXT NOT NULL,
    restaurant_order_id TEXT NOT NULL,
    ticket_number TEXT NOT NULL,
    station TEXT NOT NULL,
    status TEXT DEFAULT 'QUEUED',
    table_number TEXT,
    started_at TEXT,
    ready_at TEXT,
    served_at TEXT,
    created_at TEXT NOT NULL
);

-- سفارشات رستوران
CREATE TABLE IF NOT EXISTS restaurant_orders (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    company_id TEXT NOT NULL,
    branch_id TEXT NOT NULL,
    shift_id TEXT,
    order_number TEXT NOT NULL,
    date_shamsi TEXT NOT NULL,
    channel TEXT DEFAULT 'DINE_IN',
    status TEXT DEFAULT 'OPEN',
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
    settlement_method TEXT DEFAULT 'CASH',
    cash_amount TEXT DEFAULT '0',
    pos_card_amount TEXT DEFAULT '0',
    aggregator_receivable_amount TEXT DEFAULT '0',
    journal_entry_id TEXT,
    cogs_journal_entry_id TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- اقلام سفارش رستوران
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
    item_status TEXT DEFAULT 'QUEUED',
    created_at TEXT NOT NULL
);

-- ماموریت‌های دلیوری و پیک
CREATE TABLE IF NOT EXISTS restaurant_deliveries (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    company_id TEXT NOT NULL,
    branch_id TEXT NOT NULL,
    restaurant_order_id TEXT NOT NULL,
    courier_party_id TEXT,
    status TEXT DEFAULT 'PENDING_ASSIGNMENT',
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    delivery_address TEXT NOT NULL,
    delivery_fee TEXT DEFAULT '0',
    dispatched_at TEXT,
    delivered_at TEXT,
    cash_collected TEXT DEFAULT '0',
    pos_card_collected TEXT DEFAULT '0',
    is_settled INTEGER DEFAULT 0,
    created_at TEXT NOT NULL
);
```

---

## ۴. سناریوهای تاییدشده در آزمون‌های E2E فاز ۶
- **Step 33**: دریافت لیست بخش‌ها و میزها و تغییر وضعیت میز.
- **Step 34**: ادغام میزهای همجوار (T01 و T02).
- **Step 35**: تحلیل مهندسی منو و Food Cost پیتزا پپرونی (بهای مواد ۴۹۳,۴۰۰ ریال با حاشیه سود ۷۲.۶٪ در طبقه STAR).
- **Step 36**: ثبت سفارش سالن (۲ پیتزا + ۲ اسپرسو) با تفکیک ۲ تیکت KDS به ایستگاه‌های Hot Kitchen و Bar Cafe، محاسبه ۵٪ حق سرویس و ۱۰٪ ارزش افزوده و تغییر وضعیت میز به OCCUPIED.
- **Step 37**: تغییر وضعیت تیکت‌های آشپزخانه KDS از QUEUED به PREPARING و READY و ثبت زمان شروع و اتمام پخت.
- **Step 38**: انتقال سفارش از میز معمولی به میز VIP (Move Table) و بررسی خالی شدن میز مبدا و اشغال میز مقصد.
- **Step 39**: تقسیم صورتحساب (Split Bill) به ۳ سهم مساوی دقیقاً ۱,۷۲۵,۰۰۰ ریال برای هر نفر.
- **Step 40**: تسویه کامل فاکتور سالن با کارتخوان، کسر خودکار مواد اولیه (خمیر، پنیر، سس، پپرونی، دانه قهوه) از کاردکس انبار و صدور سند فروش و سند بهای تمام‌شده غذا (Food Cost).
- **Step 41**: ثبت سفارش بیرون‌بر / دلیوری، ایجاد ماموریت، تخصیص پیک، تحویل و وصول وجه درب منزل و تسویه حساب پایان روز پیک با صندوق.
- **Step 42 & 43**: ممیزی سلامت کل سیستم: تراز آزمایشی ۱۰۰٪ متوازن و زنجیره هش ممیزی کاملاً سالم و معتبر.

---

## ۵. رابط کاربری وب (Next.js App Router RTL) و اسکیماهای مشترک فاز ۶

در این مرحله، تمامی صفحات رابط کاربری رستوران و صنایع غذایی (`apps/web`) و اسکیماهای Zod پیاده‌سازی و یکپارچه شدند:
1. **اسکیماهای تایپ‌سیف (`packages/shared/src/restaurant.ts`)**:
   - `RestaurantTableCreateSchema`: اعتبارسنجی ثبت میزهای سالن، بخش و ظرفیت.
   - `RestaurantTableTransferSchema`: اعتبارسنجی انتقال سفارش از میز مبدا به میز مقصد.
   - `RestaurantTableMergeSchema`: اعتبارسنجی ادغام دو میز همجوار.
   - `RestaurantRecipeCreateSchema`: اعتبارسنجی فرمولاسیون چند ردیفه BOM غذاها به همراه مقادیر مصرف، واحد و ضایعات (Waste %).
   - `RestaurantOrderCreateSchema`: اعتبارسنجی ثبت سفارش رستوران، ایستگاه‌های آشپزخانه، ۵٪ حق سرویس، انعام و ۱۰٪ ارزش افزوده.
2. **نقشه زنده سالن و مدیریت میزها (`/restaurant/tables`)**:
   - فیلتر بخش‌های رستوران (سالن اصلی، سالن VIP، فضای باز، بالکن).
   - اندیکاتورهای رنگی وضعیت میزها (سبز: آماده/خالی، قرمز: مشغول/سرو، زرد: فاکتور صادر شده، آبی: رزرو).
   - کارت هر میز با ظرفیت، زمان نشستن، مبلغ فاکتور جاری و تعداد اقلام.
   - مودال پذیرش مهمان جدید و مودال انتقال میز به میز دیگر.
   - عملیات صدور صورتحساب موقت، تسویه حساب و آزادسازی میز.
3. **نمایشگر هوشمند آشپزخانه (`/restaurant/kds`)**:
   - فیلتر بر اساس ایستگاه‌های پخت (آشپزخانه گرم، گریل/پیتزا، بار سرد و کافه، قنادی و دسر).
   - تیکت‌های زنده با تایمر ثانیه‌شمار و هشدار تاخیر (رنگ قرمز چشمک‌زن برای سفارشات بالای ۱۵ دقیقه).
   - نمایش توضیحات ویژه مهمان (بدون پیاز، کم‌نمک، سس مخصوص).
   - دکمه‌های پیشروی وضعیت تیکت: شروع پخت، آماده شد (تحویل به سالن/پیک)، و تحویل داده شد.
4. **دستور پخت، فرمولاسیون (BOM) و آنالیز Food Cost (`/restaurant/recipes`)**:
   - شاخص‌های کلیدی: متوسط درصد بهای تمام شده (Food Cost %) و حاشیه سود ناخالص غذاها.
   - ماتریس ۴ خانه مهندسی منو (Menu Engineering: Star, Plowhorse, Puzzle, Dog).
   - جدول آنالیز سود ناخالص هر پرس، بهای مواد اولیه و قیمت فروش منو.
   - مودال مشاهده و تفکیک ریز مواد تشکیل‌دهنده (BOM Breakdown) با محاسبه ضایعات آماده‌سازی.

---

## ۶. وضعیت برای فاز بعدی
فاز ۶ با بالاترین کیفیت مهندسی و تجاری به اتمام رسید. سیستم آماده آغاز **فاز ۷: ماژول جامع تولید و بهای تمام‌شده (BOM چندسطحی، سفارش تولید، ثبت مصرف و ضایعات، تخصیص سربار و دستمزد مستقیم، انحراف از استاندارد)** می‌باشد.
