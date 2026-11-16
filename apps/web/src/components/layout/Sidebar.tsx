'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FileSpreadsheet,
  Network,
  Scale,
  Receipt,
  Users,
  Package,
  Layers,
  Utensils,
  CreditCard,
  Building2,
  Settings,
  Sparkles,
  Wallet,
  ShoppingCart,
  ShieldCheck,
  Factory,
  Briefcase,
  Landmark,
  BarChart3,
  TrendingUp,
  Globe,
} from 'lucide-react';

interface MenuItemType {
  title: string;
  href?: string;
  icon: any;
  items?: Array<{ title: string; href: string }>;
  applicablePresets?: string[];
}

const MENU_ITEMS: MenuItemType[] = [
  {
    title: 'داشبورد مدیریتی',
    href: '/dashboard',
    icon: LayoutDashboard,
    applicablePresets: ['ALL'],
  },
  {
    title: 'رستوران و صنایع غذایی',
    icon: Utensils,
    applicablePresets: ['RESTAURANT', 'ENTERPRISE'],
    items: [
      { title: 'نقشه سالن و میزها', href: '/restaurant/tables' },
      { title: 'نمایشگر آشپزخانه (KDS)', href: '/restaurant/kds' },
      { title: 'دستور پخت و Food Cost', href: '/restaurant/recipes' },
    ],
  },
  {
    title: 'صندوق فروشگاهی (POS)',
    icon: CreditCard,
    applicablePresets: ['RESTAURANT', 'RETAIL', 'COMMERCIAL', 'ENTERPRISE'],
    items: [
      { title: 'پایانه فروش سریع', href: '/pos' },
      { title: 'مدیریت شیفت‌ها و تحویل صندوق', href: '/pos/shifts' },
      { title: 'چاپ فیش حرارتی', href: '/pos/receipt' },
    ],
  },
  {
    title: 'تولید و بهای تمام‌شده',
    icon: Factory,
    applicablePresets: ['MANUFACTURING', 'ENTERPRISE'],
    items: [
      { title: 'فرمول‌های ساخت (BOM)', href: '/manufacturing/boms' },
      { title: 'سفارشات تولید (Work Orders)', href: '/manufacturing/orders' },
      { title: 'مراکز کاری و خطوط', href: '/manufacturing/work-centers' },
    ],
  },
  {
    title: 'فروش آنلاین و سخت‌افزار',
    icon: Globe,
    applicablePresets: ['RETAIL', 'COMMERCIAL', 'RESTAURANT', 'ENTERPRISE'],
    items: [
      { title: 'سفارشات اینترنتی و پیک', href: '/omnichannel/orders' },
      { title: 'کارتخوان و سخت‌افزار (IoT)', href: '/omnichannel/hardware' },
      { title: 'ویزیتوری و ردیابی GPS', href: '/omnichannel/visitors' },
    ],
  },
  {
    title: 'خزانه‌داری و چک صیاد',
    icon: Wallet,
    applicablePresets: ['COMMERCIAL', 'RETAIL', 'MANUFACTURING', 'SERVICE', 'ENTERPRISE'],
    items: [
      { title: 'کارتابل چک‌های صیادی', href: '/treasury/cheques' },
      { title: 'دریافت و پرداخت وجوه', href: '/treasury/receipts' },
      { title: 'انتقال وجه بین حساب‌ها', href: '/treasury/transfers' },
      { title: 'بانک‌ها و صندوق‌ها', href: '/treasury/banks' },
    ],
  },
  {
    title: 'خرید و تدارکات',
    icon: ShoppingCart,
    applicablePresets: ['COMMERCIAL', 'RETAIL', 'MANUFACTURING', 'RESTAURANT', 'ENTERPRISE'],
    items: [
      { title: 'صدور فاکتور خرید', href: '/purchases/invoices/new' },
      { title: 'فهرست فاکتورهای خرید', href: '/purchases/invoices' },
    ],
  },
  {
    title: 'فروش و مشتریان',
    icon: Receipt,
    applicablePresets: ['COMMERCIAL', 'RETAIL', 'MANUFACTURING', 'SERVICE', 'ENTERPRISE'],
    items: [
      { title: 'صدور فاکتور فروش', href: '/sales/invoices/new' },
      { title: 'فهرست فاکتورهای فروش', href: '/sales/invoices' },
      { title: 'طرف‌حساب‌ها و مشتریان', href: '/sales/customers' },
    ],
  },
  {
    title: 'سامانه مودیان',
    icon: ShieldCheck,
    applicablePresets: ['COMMERCIAL', 'RETAIL', 'MANUFACTURING', 'SERVICE', 'ENTERPRISE'],
    items: [
      { title: 'کارتابل صورتحساب‌ها', href: '/moadian/invoices' },
      { title: 'تنظیمات و کلیدهای مودیان', href: '/moadian/config' },
    ],
  },
  {
    title: 'انبار و موجودی کالا',
    icon: Package,
    applicablePresets: ['COMMERCIAL', 'RETAIL', 'MANUFACTURING', 'RESTAURANT', 'ENTERPRISE'],
    items: [
      { title: 'فهرست کالا و خدمات', href: '/inventory/products' },
      { title: 'کاردکس و گردش کالا', href: '/inventory/kardex' },
      { title: 'انبارها و موجودی', href: '/inventory/warehouses' },
      { title: 'انبارگردانی و مغایرت', href: '/inventory/counts' },
    ],
  },
  {
    title: 'حسابداری دوبل و دفاتر',
    icon: FileSpreadsheet,
    applicablePresets: ['ALL'],
    items: [
      { title: 'ثبت سند دوبل', href: '/accounting/vouchers' },
      { title: 'درخت کدینگ حساب‌ها', href: '/accounting/chart' },
      { title: 'تراز آزمایشی', href: '/accounting/reports/trial-balance' },
      { title: 'بستن حساب‌های پایان سال', href: '/accounting/closing' },
    ],
  },
  {
    title: 'صورت‌های مالی و BI',
    icon: BarChart3,
    applicablePresets: ['ALL'],
    items: [
      { title: 'ترازنامه (استاندارد ۱)', href: '/accounting/reports/balance-sheet' },
      { title: 'صورت سود و زیان جامع', href: '/accounting/reports/income-statement' },
      { title: 'جریان وجوه نقد (استاندارد ۲)', href: '/accounting/reports/cash-flow' },
      { title: 'نسبت‌های مالی و سلامت', href: '/accounting/reports/ratios' },
      { title: 'سن‌سنجی مطالبات مشتریان', href: '/analytics/receivables' },
    ],
  },
  {
    title: 'حقوق و دستمزد',
    icon: Briefcase,
    applicablePresets: ['ALL'],
    items: [
      { title: 'کارتابل دوره‌های حقوق', href: '/payroll/periods' },
      { title: 'احکام کارگزینی و پرسنل', href: '/payroll/employees' },
      { title: 'فیش حقوقی رسمی', href: '/payroll/slips' },
    ],
  },
  {
    title: 'اموال و دارایی‌های ثابت',
    icon: Landmark,
    applicablePresets: ['MANUFACTURING', 'COMMERCIAL', 'SERVICE', 'ENTERPRISE'],
    items: [
      { title: 'فهرست اموال و پلاک‌کوبی', href: '/assets' },
      { title: 'استهلاک دوره (ماده ۱۴۹)', href: '/assets/depreciation' },
    ],
  },
  {
    title: 'تنظیمات ابری و امنیت',
    icon: Settings,
    applicablePresets: ['ALL'],
    items: [
      { title: 'طرح‌ها و اشتراک SaaS', href: '/settings/subscription' },
      { title: 'امنیت و ورود دومرحله‌ای (2FA)', href: '/settings/security' },
      { title: 'انتقال داده‌ها (Migration)', href: '/settings/migration' },
    ],
  },
  {
    title: 'راه‌اندازی صنف (Onboarding)',
    href: '/onboarding',
    icon: Sparkles,
    applicablePresets: ['ALL'],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [activePreset, setActivePreset] = React.useState<string>('RESTAURANT');

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('active_preset');
      if (stored) setActivePreset(stored);

      const handlePresetChange = (e: any) => {
        if (e.detail) setActivePreset(e.detail);
      };
      window.addEventListener('industryPresetChanged', handlePresetChange);
      return () => window.removeEventListener('industryPresetChanged', handlePresetChange);
    }
  }, []);

  const visibleMenuItems = MENU_ITEMS.filter((item) => {
    if (!item.applicablePresets || item.applicablePresets.includes('ALL')) return true;
    if (activePreset === 'ENTERPRISE') return true;
    return item.applicablePresets.includes(activePreset);
  });

  return (
    <aside className="w-64 bg-slate-900 text-slate-200 h-screen max-h-screen shrink-0 flex flex-col shadow-xl select-none no-print print:hidden">
      {/* برند و لوگو */}
      <div className="h-16 flex items-center gap-3 px-6 border-b border-slate-800">
        <div className="w-9 h-9 rounded-lg bg-emerald-600 flex items-center justify-center font-bold text-white shadow-md shadow-emerald-900/50">
          <Scale className="w-5 h-5" />
        </div>
        <div>
          <h1 className="font-bold text-base text-white leading-none">حسابداری پیشرو</h1>
          <span className="text-[11px] text-emerald-400 font-medium">نسخه سازمانی ۳.۰</span>
        </div>
      </div>

      {/* لیست منوها بر اساس صنف فعال */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {visibleMenuItems.map((item, idx) => {
          if (item.items) {
            const hasActiveChild = item.items.some((sub) => pathname === sub.href);
            return (
              <div key={idx} className="mb-2">
                <div className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  <item.icon className="w-4 h-4 text-slate-400" />
                  <span>{item.title}</span>
                </div>
                <div className="space-y-0.5 pe-1 ps-6">
                  {item.items.map((sub, sIdx) => {
                    const isActive = pathname === sub.href;
                    return (
                      <Link
                        key={sIdx}
                        href={sub.href}
                        className={`block px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                          isActive
                            ? 'bg-emerald-600/20 text-emerald-300 font-bold border-r-2 border-emerald-500'
                            : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                        }`}
                      >
                        {sub.title}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          }

          const isActive = pathname === item.href;
          return (
            <Link
              key={idx}
              href={item.href || '#'}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                isActive
                  ? 'bg-emerald-600 text-white font-bold shadow-md shadow-emerald-900/40'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <item.icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              <span>{item.title}</span>
            </Link>
          );
        })}
      </nav>

      {/* پانوشت وضعیت شرکت، کاربر و صنف فعال */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/40 text-xs">
        <div className="flex items-center gap-2 text-slate-400">
          <Building2 className="w-4 h-4 text-slate-400" />
          <span className="truncate">شرکت صنایع پیشرو پارسیان</span>
        </div>
        <div className="mt-1 text-[11px] text-emerald-400 flex items-center justify-between">
          <span>سال مالی: ۱۴۰۳ (فعال)</span>
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
        </div>
        <div className="mt-1.5 flex items-center justify-between text-[10px] bg-slate-800/70 px-2 py-1 rounded border border-slate-700/60">
          <span className="text-slate-400">صنف فعال:</span>
          <span className="text-purple-300 font-bold">
            {activePreset === 'RESTAURANT'
              ? 'رستوران و کافی‌شاپ'
              : activePreset === 'RETAIL'
              ? 'فروشگاه و سوپرمارکت'
              : activePreset === 'MANUFACTURING'
              ? 'تولیدی و بهای تمام‌شده'
              : activePreset === 'COMMERCIAL'
              ? 'بازرگانی، پخش و چک'
              : 'نمای جامع هلدینگ'}
          </span>
        </div>
      </div>
    </aside>
  );
}
