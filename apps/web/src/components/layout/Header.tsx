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
  Utensils,
  Store,
  Factory,
  ShoppingCart,
  Sparkles,
  Layers,
  GitBranch,
} from 'lucide-react';
import Link from 'next/link';
import { fetchApi } from '../../lib/api';
import { toPersianDigits } from '../../lib/formatters';

export const INDUSTRY_PRESETS = [
  { id: 'ENTERPRISE', title: 'نمای جامع هلدینگ (تمام ماژول‌ها)', icon: Sparkles, color: 'text-purple-600', badge: 'جامع' },
  { id: 'RESTAURANT', title: 'رستوران، فست‌فود و کافه', icon: Utensils, color: 'text-amber-600', badge: 'رستوران' },
  { id: 'RETAIL', title: 'فروشگاه عمومی و سوپرمارکت', icon: Store, color: 'text-emerald-600', badge: 'فروشگاهی' },
  { id: 'MANUFACTURING', title: 'تولیدی و بهای تمام‌شده', icon: Factory, color: 'text-blue-600', badge: 'تولیدی' },
  { id: 'COMMERCIAL', title: 'بازرگانی، پخش و چک صیاد', icon: ShoppingCart, color: 'text-indigo-600', badge: 'بازرگانی' },
];

export function Header() {
  const router = useRouter();
  const [userName, setUserName] = useState<string>('مدیر ارشد مالی');
  const [userRole, setUserRole] = useState<string>('مدیر سیستم (SUPER_ADMIN)');
  const [companyName, setCompanyName] = useState<string>('شرکت صنایع پیشرو پارس');
  const [activePreset, setActivePreset] = useState<string>('RESTAURANT');
  const [showPresetDropdown, setShowPresetDropdown] = useState(false);

  const [branches, setBranches] = useState<any[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const [fiscalYears, setFiscalYears] = useState<any[]>([]);
  const [selectedFiscalYearId, setSelectedFiscalYearId] = useState<string>('');

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

      const storedBranch = localStorage.getItem('branch_id');
      if (storedBranch) setSelectedBranchId(storedBranch);

      const storedFy = localStorage.getItem('fiscal_year_id');
      if (storedFy) setSelectedFiscalYearId(storedFy);

      const storedPreset = localStorage.getItem('active_preset');
      if (storedPreset) {
        setActivePreset(storedPreset);
      } else {
        localStorage.setItem('active_preset', 'RESTAURANT');
        setActivePreset('RESTAURANT');
      }

      // بارگذاری داده‌های چندمستاجری از سرور
      Promise.all([
        fetchApi('/tenancy/company').catch(() => null),
        fetchApi('/tenancy/branches').catch(() => null),
        fetchApi('/tenancy/fiscal-years').catch(() => null),
      ]).then(([compRes, branchRes, fyRes]) => {
        if (compRes?.data) {
          const name = compRes.data.legal_name || compRes.data.trade_name;
          if (name) {
            setCompanyName(name);
            localStorage.setItem('company_name', name);
          }
        }
        if (branchRes?.data && Array.isArray(branchRes.data)) {
          setBranches(branchRes.data);
          if (!storedBranch && branchRes.data.length > 0) {
            const defBranch = branchRes.data.find((b: any) => b.is_central) || branchRes.data[0];
            setSelectedBranchId(defBranch.id);
            localStorage.setItem('branch_id', defBranch.id);
          }
        }
        if (fyRes?.data && Array.isArray(fyRes.data)) {
          setFiscalYears(fyRes.data);
          if (!storedFy && fyRes.data.length > 0) {
            const defFy = fyRes.data.find((f: any) => !f.is_closed) || fyRes.data[0];
            setSelectedFiscalYearId(defFy.id);
            localStorage.setItem('fiscal_year_id', defFy.id);
          }
        }
      });
    }
  }, []);

  const handleSwitchBranch = (branchId: string) => {
    setSelectedBranchId(branchId);
    if (typeof window !== 'undefined') {
      localStorage.setItem('branch_id', branchId);
      window.dispatchEvent(new CustomEvent('branchChanged', { detail: branchId }));
      window.location.reload();
    }
  };

  const handleSwitchFiscalYear = (fyId: string) => {
    setSelectedFiscalYearId(fyId);
    if (typeof window !== 'undefined') {
      localStorage.setItem('fiscal_year_id', fyId);
      window.dispatchEvent(new CustomEvent('fiscalYearChanged', { detail: fyId }));
      window.location.reload();
    }
  };

  const handleSwitchPreset = (presetId: string) => {
    setActivePreset(presetId);
    setShowPresetDropdown(false);
    if (typeof window !== 'undefined') {
      localStorage.setItem('active_preset', presetId);
      window.dispatchEvent(new CustomEvent('industryPresetChanged', { detail: presetId }));
    }
  };

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
    }
    router.push('/auth/login');
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shadow-xs sticky top-0 z-30 no-print print:hidden">
      {/* اطلاعات شرکت، شعبه و سال مالی */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-xs text-slate-700 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
          <Building className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <span className="font-semibold text-slate-800">{companyName}</span>
        </div>

        {/* انتخاب شعبه */}
        <div className="hidden sm:flex items-center gap-1.5 text-xs bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
          <GitBranch className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <select
            value={selectedBranchId}
            onChange={(e) => handleSwitchBranch(e.target.value)}
            className="bg-transparent text-slate-700 font-semibold focus:outline-none cursor-pointer"
          >
            {branches.length > 0 ? (
              branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))
            ) : (
              <option value="branch-central-1">شعبه مرکزی</option>
            )}
          </select>
        </div>

        {/* انتخاب سال مالی */}
        <div className="hidden md:flex items-center gap-1.5 text-xs text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
          <Calendar className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <select
            value={selectedFiscalYearId}
            onChange={(e) => handleSwitchFiscalYear(e.target.value)}
            className="bg-transparent text-emerald-900 font-bold focus:outline-none cursor-pointer"
          >
            {fiscalYears.length > 0 ? (
              fiscalYears.map((fy) => (
                <option key={fy.id} value={fy.id}>
                  سال مالی {toPersianDigits(fy.title || fy.year)}
                </option>
              ))
            ) : (
              <option value="fy-1403">سال مالی ۱۴۰۳</option>
            )}
          </select>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block mr-1"></span>
        </div>

        {/* انتخاب‌گر هوشمند صنف کسب‌وکار (Context-Aware Business Preset) */}
        <div className="relative">
          <button
            onClick={() => setShowPresetDropdown(!showPresetDropdown)}
            className="flex items-center gap-1.5 text-xs bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 px-3 py-1.5 rounded-xl font-bold transition shadow-xs"
            title="تغییر صنف کسب‌وکار و انطباق خودکار ماژول‌ها و چیدمان داشبورد"
          >
            {INDUSTRY_PRESETS.find((p) => p.id === activePreset)?.icon ? (
              React.createElement(
                INDUSTRY_PRESETS.find((p) => p.id === activePreset)!.icon,
                { className: `w-3.5 h-3.5 ${INDUSTRY_PRESETS.find((p) => p.id === activePreset)!.color}` }
              )
            ) : (
              <Sparkles className="w-3.5 h-3.5 text-purple-600" />
            )}
            <span>
              صنف: {INDUSTRY_PRESETS.find((p) => p.id === activePreset)?.badge || 'رستوران'}
            </span>
            <ChevronDown className="w-3 h-3 text-purple-600 mr-0.5" />
          </button>

          {showPresetDropdown && (
            <div className="absolute top-full right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-50 text-xs space-y-1">
              <div className="px-3 py-1.5 text-[11px] font-bold text-slate-400 border-b">
                تغییر چیدمان و ماژول‌ها متناسب با صنف:
              </div>
              {INDUSTRY_PRESETS.map((p) => {
                const isSelected = activePreset === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => handleSwitchPreset(p.id)}
                    className={`w-full flex items-center justify-between p-2 rounded-xl text-right transition ${
                      isSelected
                        ? 'bg-purple-600 text-white font-bold shadow-xs'
                        : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <p.icon className={`w-4 h-4 ${isSelected ? 'text-white' : p.color}`} />
                      <span>{p.title}</span>
                    </div>
                    {isSelected && (
                      <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-mono">فعال</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
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
