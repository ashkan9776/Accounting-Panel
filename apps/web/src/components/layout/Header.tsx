'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bell,
  Building,
  Calendar,
  ChevronDown,
  LogOut,
  Plus,
  Search,
  User,
  ShieldCheck,
} from 'lucide-react';
import Link from 'next/link';

export function Header() {
  const router = useRouter();
  const [userName, setUserName] = useState<string>('مدیر ارشد مالی');
  const [userRole, setUserRole] = useState<string>('مدیر سیستم (SUPER_ADMIN)');
  const [companyName, setCompanyName] = useState<string>('شرکت صنایع پیشرو پارس');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        try {
          const parsed = JSON.parse(storedUser);
          if (parsed.fullName) setUserName(parsed.fullName);
        } catch {
          // fallback
        }
      }
      const storedComp = localStorage.getItem('company_name');
      if (storedComp) setCompanyName(storedComp);
    }
  }, []);

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
    }
    router.push('/auth/login');
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shadow-xs sticky top-0 z-30">
      {/* اطلاعات شرکت، شعبه و سال مالی */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-xs text-slate-700 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
          <Building className="w-3.5 h-3.5 text-slate-500" />
          <span className="font-semibold text-slate-800">{companyName}</span>
          <span className="text-slate-300">|</span>
          <span className="text-slate-600">شعبه مرکزی</span>
        </div>

        <div className="hidden md:flex items-center gap-1.5 text-xs text-emerald-800 bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-200">
          <Calendar className="w-3.5 h-3.5 text-emerald-600" />
          <span>سال مالی ۱۴۰۳</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block mr-1"></span>
        </div>
      </div>

      {/* جستجو و دکمه‌های اقدام سریع */}
      <div className="flex items-center gap-3">
        {/* دکمه‌های سریع */}
        <div className="hidden lg:flex items-center gap-2">
          <Link
            href="/sales/invoices/new"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>فاکتور فروش جدید</span>
          </Link>
          <Link
            href="/accounting/vouchers"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-medium shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>ثبت سند دوبل</span>
          </Link>
        </div>

        <div className="h-5 w-px bg-slate-200 mx-1 hidden sm:block"></div>

        {/* پروفایل کاربر و خروج */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5 text-right">
            <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-300 flex items-center justify-center text-slate-700 font-bold text-xs">
              <User className="w-4 h-4 text-slate-600" />
            </div>
            <div className="hidden sm:block">
              <div className="text-xs font-bold text-slate-800 flex items-center gap-1">
                <span>{userName}</span>
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 inline" />
              </div>
              <div className="text-[10px] text-slate-500">{userRole}</div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            title="خروج از سیستم"
            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
