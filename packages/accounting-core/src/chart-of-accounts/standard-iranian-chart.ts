import { AccountGroup, AccountHead, AccountSubsidiary, AccountNature, FloatingDimensionType } from './types';

export const STANDARD_IRANIAN_GROUPS: AccountGroup[] = [
  { id: 'grp-1', code: '1', title: 'دارایی‌های جاری', nature: AccountNature.DEBIT },
  { id: 'grp-2', code: '2', title: 'دارایی‌های غیرجاری (ثابت)', nature: AccountNature.DEBIT },
  { id: 'grp-3', code: '3', title: 'بدهی‌های جاری', nature: AccountNature.CREDIT },
  { id: 'grp-4', code: '4', title: 'بدهی‌های بلندمدت', nature: AccountNature.CREDIT },
  { id: 'grp-5', code: '5', title: 'حقوق مالکانه و سرمایه', nature: AccountNature.CREDIT },
  { id: 'grp-6', code: '6', title: 'درآمدها و فروش', nature: AccountNature.CREDIT },
  { id: 'grp-7', code: '7', title: 'بهای تمام‌شده کالای فروش‌رفته و خدمات', nature: AccountNature.DEBIT },
  { id: 'grp-8', code: '8', title: 'هزینه‌های عملیاتی، عمومی و اداری', nature: AccountNature.DEBIT },
  { id: 'grp-9', code: '9', title: 'حساب‌های انتظامی و آماری', nature: AccountNature.EITHER }
];

export const STANDARD_IRANIAN_HEADS: AccountHead[] = [
  // گروه ۱: دارایی‌های جاری
  { id: 'head-11', groupId: 'grp-1', code: '11', title: 'موجودی نقد و بانک', nature: AccountNature.DEBIT },
  { id: 'head-12', groupId: 'grp-1', code: '12', title: 'اسناد دریافتنی تجاری', nature: AccountNature.DEBIT },
  { id: 'head-13', groupId: 'grp-1', code: '13', title: 'حساب‌های دریافتنی تجاری (بدهکاران)', nature: AccountNature.DEBIT },
  { id: 'head-14', groupId: 'grp-1', code: '14', title: 'سایر حساب‌ها و اسناد دریافتنی', nature: AccountNature.DEBIT },
  { id: 'head-15', groupId: 'grp-1', code: '15', title: 'موجودی مواد و کالا', nature: AccountNature.DEBIT },

  // گروه ۲: دارایی‌های غیرجاری
  { id: 'head-21', groupId: 'grp-2', code: '21', title: 'دارایی‌های ثابت مشهود', nature: AccountNature.DEBIT },
  { id: 'head-22', groupId: 'grp-2', code: '22', title: 'استهلاک انباشته دارایی‌های ثابت', nature: AccountNature.CREDIT },

  // گروه ۳: بدهی‌های جاری
  { id: 'head-31', groupId: 'grp-3', code: '31', title: 'اسناد پرداختنی تجاری', nature: AccountNature.CREDIT },
  { id: 'head-32', groupId: 'grp-3', code: '32', title: 'حساب‌های پرداختنی تجاری (بستانکاران)', nature: AccountNature.CREDIT },
  { id: 'head-33', groupId: 'grp-3', code: '33', title: 'سایر بدهی‌ها، پیش‌دریافت‌ها و مالیات', nature: AccountNature.CREDIT },

  // گروه ۴: بدهی‌های بلندمدت
  { id: 'head-41', groupId: 'grp-4', code: '41', title: 'تسهیلات مالی دریافتی بلندمدت', nature: AccountNature.CREDIT },

  // گروه ۵: حقوق مالکانه
  { id: 'head-51', groupId: 'grp-5', code: '51', title: 'سرمایه اولیه', nature: AccountNature.CREDIT },
  { id: 'head-52', groupId: 'grp-5', code: '52', title: 'سود و زیان انباشته سنواتی', nature: AccountNature.EITHER },
  { id: 'head-53', groupId: 'grp-5', code: '53', title: 'سود و زیان دوره جاری', nature: AccountNature.EITHER },

  // گروه ۶: درآمدها
  { id: 'head-61', groupId: 'grp-6', code: '61', title: 'درآمد فروش کالا و خدمات', nature: AccountNature.CREDIT },
  { id: 'head-62', groupId: 'grp-6', code: '62', title: 'تخفیفات و برگشت از فروش', nature: AccountNature.DEBIT },

  // گروه ۷: بهای تمام‌شده
  { id: 'head-71', groupId: 'grp-7', code: '71', title: 'بهای تمام‌شده کالای فروش‌رفته و خدمات', nature: AccountNature.DEBIT },

  // گروه ۸: هزینه‌ها
  { id: 'head-81', groupId: 'grp-8', code: '81', title: 'هزینه‌های عمومی، اداری و فروش', nature: AccountNature.DEBIT },

  // گروه ۹: انتظامی
  { id: 'head-91', groupId: 'grp-9', code: '91', title: 'حساب‌های انتظامی به نفع شرکت', nature: AccountNature.DEBIT },
  { id: 'head-92', groupId: 'grp-9', code: '92', title: 'طرف حساب‌های انتظامی به نفع شرکت', nature: AccountNature.CREDIT }
];

export const STANDARD_IRANIAN_SUBSIDIARIES: AccountSubsidiary[] = [
  // معین‌های موجودی نقد و بانک (۱۱)
  {
    id: 'sub-1101',
    headId: 'head-11',
    code: '1101',
    title: 'صندوق‌ها',
    nature: AccountNature.DEBIT,
    requiresFloatingDimension1: true,
    allowedDimension1Type: FloatingDimensionType.CASH_DESK,
    requiresFloatingDimension2: false,
    requiresFloatingDimension3: false,
    isCurrencyDependent: false,
    isActive: true
  },
  {
    id: 'sub-1102',
    headId: 'head-11',
    code: '1102',
    title: 'تنخواه‌گردان‌ها',
    nature: AccountNature.DEBIT,
    requiresFloatingDimension1: true,
    allowedDimension1Type: FloatingDimensionType.PARTY,
    requiresFloatingDimension2: false,
    requiresFloatingDimension3: false,
    isCurrencyDependent: false,
    isActive: true
  },
  {
    id: 'sub-1103',
    headId: 'head-11',
    code: '1103',
    title: 'موجودی نزد بانک‌ها (ریالی)',
    nature: AccountNature.DEBIT,
    requiresFloatingDimension1: true,
    allowedDimension1Type: FloatingDimensionType.BANK_ACCOUNT,
    requiresFloatingDimension2: false,
    requiresFloatingDimension3: false,
    isCurrencyDependent: false,
    isActive: true
  },
  {
    id: 'sub-1104',
    headId: 'head-11',
    code: '1104',
    title: 'وجوه در راه (کارتخوان‌های POS و درگاه)',
    nature: AccountNature.DEBIT,
    requiresFloatingDimension1: true,
    allowedDimension1Type: FloatingDimensionType.BANK_ACCOUNT,
    requiresFloatingDimension2: false,
    requiresFloatingDimension3: false,
    isCurrencyDependent: false,
    isActive: true
  },

  // اسناد دریافتنی (۱۲)
  {
    id: 'sub-1201',
    headId: 'head-12',
    code: '1201',
    title: 'اسناد دریافتنی نزد صندوق (چک‌های دریافتی)',
    nature: AccountNature.DEBIT,
    requiresFloatingDimension1: true,
    allowedDimension1Type: FloatingDimensionType.PARTY,
    requiresFloatingDimension2: false,
    requiresFloatingDimension3: false,
    isCurrencyDependent: false,
    isActive: true
  },
  {
    id: 'sub-1202',
    headId: 'head-12',
    code: '1202',
    title: 'اسناد دریافتنی در جریان وصول (واگذار به بانک)',
    nature: AccountNature.DEBIT,
    requiresFloatingDimension1: true,
    allowedDimension1Type: FloatingDimensionType.BANK_ACCOUNT,
    requiresFloatingDimension2: false,
    requiresFloatingDimension3: false,
    isCurrencyDependent: false,
    isActive: true
  },
  {
    id: 'sub-1203',
    headId: 'head-12',
    code: '1203',
    title: 'اسناد دریافتنی برگشتی',
    nature: AccountNature.DEBIT,
    requiresFloatingDimension1: true,
    allowedDimension1Type: FloatingDimensionType.PARTY,
    requiresFloatingDimension2: false,
    requiresFloatingDimension3: false,
    isCurrencyDependent: false,
    isActive: true
  },

  // حساب‌های دریافتنی تجاری (۱۳)
  {
    id: 'sub-1301',
    headId: 'head-13',
    code: '1301',
    title: 'بدهکاران تجاری (مشتریان)',
    nature: AccountNature.DEBIT,
    requiresFloatingDimension1: true,
    allowedDimension1Type: FloatingDimensionType.PARTY,
    requiresFloatingDimension2: false,
    requiresFloatingDimension3: false,
    isCurrencyDependent: false,
    isActive: true
  },

  // سایر حساب‌های دریافتنی و اعتبار مالیاتی (۱۴)
  {
    id: 'sub-1401',
    headId: 'head-14',
    code: '1401',
    title: 'مساعده و وام پرسنل',
    nature: AccountNature.DEBIT,
    requiresFloatingDimension1: true,
    allowedDimension1Type: FloatingDimensionType.PARTY,
    requiresFloatingDimension2: false,
    requiresFloatingDimension3: false,
    isCurrencyDependent: false,
    isActive: true
  },
  {
    id: 'sub-1402',
    headId: 'head-14',
    code: '1402',
    title: 'پیش‌پرداخت خرید کالا و خدمات',
    nature: AccountNature.DEBIT,
    requiresFloatingDimension1: true,
    allowedDimension1Type: FloatingDimensionType.PARTY,
    requiresFloatingDimension2: false,
    requiresFloatingDimension3: false,
    isCurrencyDependent: false,
    isActive: true
  },
  {
    id: 'sub-1403',
    headId: 'head-14',
    code: '1403',
    title: 'مالیات بر ارزش افزوده خرید (اعتبار مالیاتی)',
    nature: AccountNature.DEBIT,
    requiresFloatingDimension1: false,
    requiresFloatingDimension2: false,
    requiresFloatingDimension3: false,
    isCurrencyDependent: false,
    isActive: true
  },

  // موجودی کالا و مواد (۱۵)
  {
    id: 'sub-1501',
    headId: 'head-15',
    code: '1501',
    title: 'موجودی کالای تجاری',
    nature: AccountNature.DEBIT,
    requiresFloatingDimension1: false,
    requiresFloatingDimension2: false,
    requiresFloatingDimension3: false,
    isCurrencyDependent: false,
    isActive: true
  },
  {
    id: 'sub-1502',
    headId: 'head-15',
    code: '1502',
    title: 'موجودی مواد اولیه و مصرفی',
    nature: AccountNature.DEBIT,
    requiresFloatingDimension1: false,
    requiresFloatingDimension2: false,
    requiresFloatingDimension3: false,
    isCurrencyDependent: false,
    isActive: true
  },
  {
    id: 'sub-1503',
    headId: 'head-15',
    code: '1503',
    title: 'موجودی کالای در جریان ساخت (WIP)',
    nature: AccountNature.DEBIT,
    requiresFloatingDimension1: false,
    requiresFloatingDimension2: false,
    allowedDimension2Type: FloatingDimensionType.COST_CENTER,
    requiresFloatingDimension3: false,
    isCurrencyDependent: false,
    isActive: true
  },
  {
    id: 'sub-1504',
    headId: 'head-15',
    code: '1504',
    title: 'موجودی کالای ساخته‌شده و محصولات',
    nature: AccountNature.DEBIT,
    requiresFloatingDimension1: false,
    requiresFloatingDimension2: false,
    requiresFloatingDimension3: false,
    isCurrencyDependent: false,
    isActive: true
  },
  {
    id: 'sub-1505',
    headId: 'head-15',
    code: '1505',
    title: 'موجودی طلای خام و ساخته‌شده',
    nature: AccountNature.DEBIT,
    requiresFloatingDimension1: false,
    requiresFloatingDimension2: false,
    requiresFloatingDimension3: false,
    isCurrencyDependent: false,
    isActive: true
  },

  // دارایی‌های ثابت (۲۱) و استهلاک (۲۲)
  {
    id: 'sub-2101',
    headId: 'head-21',
    code: '2101',
    title: 'اثاثه و تجهیزات اداری و کامپیوتری',
    nature: AccountNature.DEBIT,
    requiresFloatingDimension1: false,
    requiresFloatingDimension2: true,
    allowedDimension2Type: FloatingDimensionType.COST_CENTER,
    requiresFloatingDimension3: false,
    isCurrencyDependent: false,
    isActive: true
  },
  {
    id: 'sub-2201',
    headId: 'head-22',
    code: '2201',
    title: 'استهلاک انباشته اثاثه و تجهیزات',
    nature: AccountNature.CREDIT,
    requiresFloatingDimension1: false,
    requiresFloatingDimension2: true,
    allowedDimension2Type: FloatingDimensionType.COST_CENTER,
    requiresFloatingDimension3: false,
    isCurrencyDependent: false,
    isActive: true
  },

  // اسناد پرداختنی (۳۱)
  {
    id: 'sub-3101',
    headId: 'head-31',
    code: '3101',
    title: 'اسناد پرداختنی تجاری عهده بانک‌ها (چک‌های صادره)',
    nature: AccountNature.CREDIT,
    requiresFloatingDimension1: true,
    allowedDimension1Type: FloatingDimensionType.PARTY,
    requiresFloatingDimension2: false,
    requiresFloatingDimension3: false,
    isCurrencyDependent: false,
    isActive: true
  },

  // بستانکاران تجاری (۳۲)
  {
    id: 'sub-3201',
    headId: 'head-32',
    code: '3201',
    title: 'بستانکاران تجاری (تامین‌کنندگان)',
    nature: AccountNature.CREDIT,
    requiresFloatingDimension1: true,
    allowedDimension1Type: FloatingDimensionType.PARTY,
    requiresFloatingDimension2: false,
    requiresFloatingDimension3: false,
    isCurrencyDependent: false,
    isActive: true
  },

  // سایر بدهی‌ها، پیش‌دریافت‌ها، بیمه، مالیات (۳۳)
  {
    id: 'sub-3301',
    headId: 'head-33',
    code: '3301',
    title: 'پیش‌دریافت از مشتریان',
    nature: AccountNature.CREDIT,
    requiresFloatingDimension1: true,
    allowedDimension1Type: FloatingDimensionType.PARTY,
    requiresFloatingDimension2: false,
    requiresFloatingDimension3: false,
    isCurrencyDependent: false,
    isActive: true
  },
  {
    id: 'sub-3302',
    headId: 'head-33',
    code: '3302',
    title: 'جاری شرکا و سهامداران',
    nature: AccountNature.EITHER,
    requiresFloatingDimension1: true,
    allowedDimension1Type: FloatingDimensionType.PARTY,
    requiresFloatingDimension2: false,
    requiresFloatingDimension3: false,
    isCurrencyDependent: false,
    isActive: true
  },
  {
    id: 'sub-3303',
    headId: 'head-33',
    code: '3303',
    title: 'جاری پرسنل و حقوق پرداختنی',
    nature: AccountNature.CREDIT,
    requiresFloatingDimension1: true,
    allowedDimension1Type: FloatingDimensionType.PARTY,
    requiresFloatingDimension2: false,
    requiresFloatingDimension3: false,
    isCurrencyDependent: false,
    isActive: true
  },
  {
    id: 'sub-3304',
    headId: 'head-33',
    code: '3304',
    title: 'بیمه پرداختنی (تامین اجتماعی ۷٪ و ۲۳٪)',
    nature: AccountNature.CREDIT,
    requiresFloatingDimension1: false,
    requiresFloatingDimension2: false,
    requiresFloatingDimension3: false,
    isCurrencyDependent: false,
    isActive: true
  },
  {
    id: 'sub-3305',
    headId: 'head-33',
    code: '3305',
    title: 'مالیات تکلیفی حقوق پرداختنی (ماده ۸۶)',
    nature: AccountNature.CREDIT,
    requiresFloatingDimension1: false,
    requiresFloatingDimension2: false,
    requiresFloatingDimension3: false,
    isCurrencyDependent: false,
    isActive: true
  },
  {
    id: 'sub-3306',
    headId: 'head-33',
    code: '3306',
    title: 'مالیات بر ارزش افزوده فروش',
    nature: AccountNature.CREDIT,
    requiresFloatingDimension1: false,
    requiresFloatingDimension2: false,
    requiresFloatingDimension3: false,
    isCurrencyDependent: false,
    isActive: true
  },

  // حقوق مالکانه (۵۱، ۵۲، ۵۳)
  {
    id: 'sub-5101',
    headId: 'head-51',
    code: '5101',
    title: 'سرمایه ثبت‌شده',
    nature: AccountNature.CREDIT,
    requiresFloatingDimension1: false,
    requiresFloatingDimension2: false,
    requiresFloatingDimension3: false,
    isCurrencyDependent: false,
    isActive: true
  },
  {
    id: 'sub-5201',
    headId: 'head-52',
    code: '5201',
    title: 'سود و زیان انباشته سنواتی',
    nature: AccountNature.EITHER,
    requiresFloatingDimension1: false,
    requiresFloatingDimension2: false,
    requiresFloatingDimension3: false,
    isCurrencyDependent: false,
    isActive: true
  },
  {
    id: 'sub-5301',
    headId: 'head-53',
    code: '5301',
    title: 'سود و زیان دوره جاری',
    nature: AccountNature.EITHER,
    requiresFloatingDimension1: false,
    requiresFloatingDimension2: false,
    requiresFloatingDimension3: false,
    isCurrencyDependent: false,
    isActive: true
  },

  // درآمدها (۶۱)
  {
    id: 'sub-6101',
    headId: 'head-61',
    code: '6101',
    title: 'فروش کالا و محصولات',
    nature: AccountNature.CREDIT,
    requiresFloatingDimension1: false,
    requiresFloatingDimension2: false,
    allowedDimension2Type: FloatingDimensionType.COST_CENTER,
    requiresFloatingDimension3: false,
    isCurrencyDependent: false,
    isActive: true
  },
  {
    id: 'sub-6102',
    headId: 'head-61',
    code: '6102',
    title: 'درآمد فروش غذا و خدمات رستوران',
    nature: AccountNature.CREDIT,
    requiresFloatingDimension1: false,
    requiresFloatingDimension2: false,
    allowedDimension2Type: FloatingDimensionType.COST_CENTER,
    requiresFloatingDimension3: false,
    isCurrencyDependent: false,
    isActive: true
  },
  {
    id: 'sub-6104',
    headId: 'head-61',
    code: '6104',
    title: 'درآمد اجرت ساخت و خدمات طلا',
    nature: AccountNature.CREDIT,
    requiresFloatingDimension1: false,
    requiresFloatingDimension2: false,
    requiresFloatingDimension3: false,
    isCurrencyDependent: false,
    isActive: true
  },
  {
    id: 'sub-6105',
    headId: 'head-61',
    code: '6105',
    title: 'سایر درآمدهای عملیاتی (فزونی انبار و متفرقه)',
    nature: AccountNature.CREDIT,
    requiresFloatingDimension1: false,
    requiresFloatingDimension2: false,
    requiresFloatingDimension3: false,
    isCurrencyDependent: false,
    isActive: true
  },
  {
    id: 'sub-6201',
    headId: 'head-62',
    code: '6201',
    title: 'تخفیفات نقدی فروش',
    nature: AccountNature.DEBIT,
    requiresFloatingDimension1: false,
    requiresFloatingDimension2: false,
    requiresFloatingDimension3: false,
    isCurrencyDependent: false,
    isActive: true
  },
  {
    id: 'sub-6202',
    headId: 'head-62',
    code: '6202',
    title: 'برگشت از فروش و تخفیفات تجاری',
    nature: AccountNature.DEBIT,
    requiresFloatingDimension1: false,
    requiresFloatingDimension2: false,
    requiresFloatingDimension3: false,
    isCurrencyDependent: false,
    isActive: true
  },

  // بهای تمام‌شده (۷۱)
  {
    id: 'sub-7101',
    headId: 'head-71',
    code: '7101',
    title: 'بهای تمام‌شده کالای فروش‌رفته (COGS)',
    nature: AccountNature.DEBIT,
    requiresFloatingDimension1: false,
    requiresFloatingDimension2: false,
    allowedDimension2Type: FloatingDimensionType.COST_CENTER,
    requiresFloatingDimension3: false,
    isCurrencyDependent: false,
    isActive: true
  },
  {
    id: 'sub-7102',
    headId: 'head-71',
    code: '7102',
    title: 'دستمزد مستقیم جذب‌شده تولید',
    nature: AccountNature.CREDIT,
    requiresFloatingDimension1: false,
    requiresFloatingDimension2: false,
    allowedDimension2Type: FloatingDimensionType.COST_CENTER,
    requiresFloatingDimension3: false,
    isCurrencyDependent: false,
    isActive: true
  },
  {
    id: 'sub-7103',
    headId: 'head-71',
    code: '7103',
    title: 'سربار ساخت جذب‌شده تولید',
    nature: AccountNature.CREDIT,
    requiresFloatingDimension1: false,
    requiresFloatingDimension2: false,
    allowedDimension2Type: FloatingDimensionType.COST_CENTER,
    requiresFloatingDimension3: false,
    isCurrencyDependent: false,
    isActive: true
  },
  {
    id: 'sub-7104',
    headId: 'head-71',
    code: '7104',
    title: 'انحرافات بهای تمام‌شده تولید',
    nature: AccountNature.EITHER,
    requiresFloatingDimension1: false,
    requiresFloatingDimension2: false,
    allowedDimension2Type: FloatingDimensionType.COST_CENTER,
    requiresFloatingDimension3: false,
    isCurrencyDependent: false,
    isActive: true
  },

  // هزینه‌ها (۸۱)
  {
    id: 'sub-8101',
    headId: 'head-81',
    code: '8101',
    title: 'هزینه حقوق و دستمزد پرسنل',
    nature: AccountNature.DEBIT,
    requiresFloatingDimension1: false,
    requiresFloatingDimension2: true,
    allowedDimension2Type: FloatingDimensionType.COST_CENTER,
    requiresFloatingDimension3: false,
    isCurrencyDependent: false,
    isActive: true
  },
  {
    id: 'sub-8102',
    headId: 'head-81',
    code: '8102',
    title: 'هزینه بیمه سهم کارفرما (۲۳٪)',
    nature: AccountNature.DEBIT,
    requiresFloatingDimension1: false,
    requiresFloatingDimension2: true,
    allowedDimension2Type: FloatingDimensionType.COST_CENTER,
    requiresFloatingDimension3: false,
    isCurrencyDependent: false,
    isActive: true
  },
  {
    id: 'sub-8103',
    headId: 'head-81',
    code: '8103',
    title: 'هزینه اجاره محل',
    nature: AccountNature.DEBIT,
    requiresFloatingDimension1: false,
    requiresFloatingDimension2: true,
    allowedDimension2Type: FloatingDimensionType.COST_CENTER,
    requiresFloatingDimension3: false,
    isCurrencyDependent: false,
    isActive: true
  },
  {
    id: 'sub-8104',
    headId: 'head-81',
    code: '8104',
    title: 'هزینه استهلاک دارایی‌های ثابت',
    nature: AccountNature.DEBIT,
    requiresFloatingDimension1: false,
    requiresFloatingDimension2: true,
    allowedDimension2Type: FloatingDimensionType.COST_CENTER,
    requiresFloatingDimension3: false,
    isCurrencyDependent: false,
    isActive: true
  },
  {
    id: 'sub-8108',
    headId: 'head-81',
    code: '8108',
    title: 'هزینه کسری و انبارگردانی کالا',
    nature: AccountNature.DEBIT,
    requiresFloatingDimension1: false,
    requiresFloatingDimension2: false,
    allowedDimension2Type: FloatingDimensionType.COST_CENTER,
    requiresFloatingDimension3: false,
    isCurrencyDependent: false,
    isActive: true
  }
];
