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
} from 'lucide-react';

const MENU_ITEMS = [
  {
    title: 'داشبورد مدیریتی',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: 'خزانه‌داری و چک صیاد',
    icon: Wallet,
    items: [
      { title: 'کارتابل چک‌های صیادی', href: '/treasury/cheques' },
      { title: 'دریافت و پرداخت وجوه', href: '/treasury/receipts' },
      { title: 'انتقال وجه بین حساب‌ها', href: '/treasury/transfers' },
      { title: 'بانک‌ها و صندوق‌ها', href: '/treasury/banks' },
    ],
  },
  {
    title: 'حسابداری دوبل',
    icon: FileSpreadsheet,
    items: [
      { title: 'ثبت سند دوبل', href: '/accounting/vouchers' },
      { title: 'درخت کدینگ حساب‌ها', href: '/accounting/chart' },
      { title: 'تراز آزمایشی', href: '/accounting/reports/trial-balance' },
    ],
  },
  {
    title: 'فروش و مشتریان',
    icon: Receipt,
    items: [
      { title: 'صدور فاکتور فروش', href: '/sales/invoices/new' },
      { title: 'طرف‌حساب‌ها', href: '/sales/customers' },
    ],
  },
  {
    title: 'انبار و کالا',
    icon: Package,
    items: [
      { title: 'فهرست کالا و خدمات', href: '/inventory/products' },
      { title: 'کاردکس انبار', href: '/inventory/kardex' },
    ],
  },
  {
    title: 'صندوق فروشگاهی (POS)',
    href: '/pos',
    icon: CreditCard,
  },
  {
    title: 'رستوران و صنایع غذایی',
    href: '/restaurant/tables',
    icon: Utensils,
  },
  {
    title: 'راه‌اندازی صنف (Onboarding)',
    href: '/onboarding',
    icon: Sparkles,
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-slate-900 text-slate-200 min-h-screen flex flex-col shadow-xl select-none">
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

      {/* لیست منوها */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {MENU_ITEMS.map((item, idx) => {
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
              href={item.href}
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

      {/* پانوشت وضعیت شرکت و کاربر */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/40 text-xs">
        <div className="flex items-center gap-2 text-slate-400">
          <Building2 className="w-4 h-4 text-slate-400" />
          <span className="truncate">شرکت صنایع پیشرو پارسیان</span>
        </div>
        <div className="mt-1 text-[11px] text-emerald-400 flex items-center justify-between">
          <span>سال مالی: ۱۴۰۳ (فعال)</span>
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
        </div>
      </div>
    </aside>
  );
}
