'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  BarChart3,
  Calendar,
  RefreshCw,
  Printer,
  ShieldCheck,
  TrendingUp,
  Percent,
  Activity,
  Layers,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
} from 'lucide-react';

export default function FinancialRatiosPage() {
  const [asOfDate, setAsOfDate] = useState('1403/12/29');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 800);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <Link href="/accounting/reports/trial-balance" className="hover:text-emerald-600 transition-colors">
              حسابداری دوبل و گزارشات
            </Link>
            <span>/</span>
            <span className="text-slate-800 font-semibold">نسبت‌های مالی و سلامت</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2.5">
            <BarChart3 className="w-7 h-7 text-emerald-600" />
            داشبورد نسبت‌های مالی و سنجش سلامت شرکت
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            تحلیل جامع شاخص‌های نقدینگی، سودآوری، فعالیت و اهرم‌های مالی همراه با نمره‌دهی هوشمند سلامت تجاری
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-50 border p-1.5 rounded-lg text-xs">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span className="text-slate-600 font-semibold">مبنای تاریخ:</span>
            <input
              type="text"
              value={asOfDate}
              onChange={(e) => setAsOfDate(e.target.value)}
              className="bg-white border rounded px-2 py-1 font-mono text-xs w-28 focus:ring-1 focus:ring-emerald-500 outline-none"
            />
          </div>

          <button
            onClick={handleRefresh}
            className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold px-3 py-2.5 rounded-lg transition-colors border"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            محاسبه مجدد
          </button>
        </div>
      </div>

      {/* Health Score Overview Card */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 text-white rounded-xl p-6 shadow-lg flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-2 text-center md:text-right">
          <div className="inline-flex items-center gap-1.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold px-3 py-1 rounded-full">
            <Sparkles className="w-3.5 h-3.5" />
            ارزیابی سلامت مالی جامع
          </div>
          <h2 className="text-2xl font-black">وضعیت بنیادین: عالی (EXCELLENT)</h2>
          <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
            شرکت با نسبت جاری ۲.۳۵ و حاشیه سود خالص ۱۷.۸٪، توان بازپرداخت تعهدات کوتاه‌مدت بالا و ساختار سرمایه امن با ضریب اهرمی پایدار دارد.
          </p>
        </div>

        <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/15">
          <div className="text-center">
            <div className="text-3xl font-black text-emerald-400 font-mono">۸۸ <span className="text-sm font-normal text-slate-300">/ ۱۰۰</span></div>
            <div className="text-[11px] text-slate-300 font-medium mt-1">نمره سلامت کسب‌وکار</div>
          </div>
          <div className="w-px h-12 bg-white/20"></div>
          <div className="text-center">
            <div className="text-sm font-bold text-white">ریسک نقدینگی</div>
            <div className="text-xs font-bold text-emerald-400 mt-1">بسیار پایین (کم)</div>
          </div>
        </div>
      </div>

      {/* 4 Pillars of Financial Ratios */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Pillar 1: Liquidity Ratios */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              ۱. نسبت‌های نقدینگی (توان ایفای تعهدات جاری)
            </h3>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">وضعیت مطلوب</span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-800 block">نسبت جاری (Current Ratio)</span>
                <span className="text-slate-400 text-[11px]">دارایی‌های جاری تقسیم بر بدهی‌های جاری (استاندارد: بالای ۱.۵)</span>
              </div>
              <div className="text-left font-mono font-black text-sm text-emerald-600">۲.۳۵</div>
            </div>

            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-800 block">نسبت آنی / سریع (Quick Ratio)</span>
                <span className="text-slate-400 text-[11px]">کسر موجودی کالا از دارایی جاری به بدهی جاری (استاندارد: بالای ۱.۰)</span>
              </div>
              <div className="text-left font-mono font-black text-sm text-emerald-600">۱.۴۵</div>
            </div>

            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-800 block">نسبت وجه نقد (Cash Ratio)</span>
                <span className="text-slate-400 text-[11px]">موجودی نقد و بانک به بدهی جاری (استاندارد: بالای ۰.۲)</span>
              </div>
              <div className="text-left font-mono font-black text-sm text-blue-600">۰.۵۵</div>
            </div>
          </div>
        </div>

        {/* Pillar 2: Profitability Ratios */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <Percent className="w-4 h-4 text-purple-600" />
              ۲. نسبت‌های سودآوری (کارایی تبدیل درآمد به سود)
            </h3>
            <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200">سودآوری بالا</span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-800 block">حاشیه سود ناخالص (Gross Margin)</span>
                <span className="text-slate-400 text-[11px]">سود ناخالص به فروش خالص</span>
              </div>
              <div className="text-left font-mono font-black text-sm text-purple-600">٪۴۲.۹</div>
            </div>

            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-800 block">حاشیه سود عملیاتی (Operating Margin)</span>
                <span className="text-slate-400 text-[11px]">سود عملیاتی قبل از اقلام مالی و مالیات به فروش</span>
              </div>
              <div className="text-left font-mono font-black text-sm text-purple-600">٪۲۲.۰</div>
            </div>

            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-800 block">بازده حقوق صاحبان سهام (ROE)</span>
                <span className="text-slate-400 text-[11px]">سود خالص به مجموع حقوق مالکانه</span>
              </div>
              <div className="text-left font-mono font-black text-sm text-emerald-600">٪۲۶.۴</div>
            </div>
          </div>
        </div>

        {/* Pillar 3: Activity & Turnover Ratios */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-600" />
              ۳. نسبت‌های فعالیت (بهره‌وری دارایی‌ها و کالا)
            </h3>
            <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">گردش منظم</span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-800 block">گردش موجودی کالا (Inventory Turnover)</span>
                <span className="text-slate-400 text-[11px]">بهای تمام‌شده به میانگین موجودی انبار</span>
              </div>
              <div className="text-left font-mono font-black text-sm text-blue-700">۳.۲ مرتبه</div>
            </div>

            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-800 block">دوره گردش موجودی انبار (Days in Inventory)</span>
                <span className="text-slate-400 text-[11px]">میانگین روزهای توقف کالا تا فروش</span>
              </div>
              <div className="text-left font-mono font-black text-sm text-slate-700">۱۱۴ روز</div>
            </div>

            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-800 block">دوره وصول مطالبات (DSO)</span>
                <span className="text-slate-400 text-[11px]">میانگین روزهای وصول نقد از فاکتورهای نسیه مشتریان</span>
              </div>
              <div className="text-left font-mono font-black text-sm text-slate-700">۶۷ روز</div>
            </div>
          </div>
        </div>

        {/* Pillar 4: Financial Leverage Ratios */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-600" />
              ۴. نسبت‌های اهرمی و ساختار سرمایه
            </h3>
            <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">اهرم ایمن</span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-800 block">نسبت بدهی (Debt Ratio)</span>
                <span className="text-slate-400 text-[11px]">کل بدهی‌ها به کل دارایی‌ها (سقف ایمن: زیر ۶۰٪)</span>
              </div>
              <div className="text-left font-mono font-black text-sm text-emerald-600">٪۴۴.۶</div>
            </div>

            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-800 block">نسبت بدهی به حقوق صاحبان سهام (Debt to Equity)</span>
                <span className="text-slate-400 text-[11px]">مجموع بدهی‌ها تقسیم بر حقوق مالکانه</span>
              </div>
              <div className="text-left font-mono font-black text-sm text-slate-700">۰.۸۰</div>
            </div>

            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-800 block">ضریب مالکیت سهامداران (Equity Ratio)</span>
                <span className="text-slate-400 text-[11px]">سهم سهامداران از کل دارایی‌های شرکت</span>
              </div>
              <div className="text-left font-mono font-black text-sm text-emerald-700">٪۵۵.۴</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
