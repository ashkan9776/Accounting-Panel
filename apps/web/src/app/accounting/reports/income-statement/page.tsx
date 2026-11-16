'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  Calendar,
  Printer,
  Download,
  CheckCircle2,
  AlertCircle,
  Building2,
  Scale,
  RefreshCw,
  Percent,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';

export default function IncomeStatementPage() {
  const [fromDate, setFromDate] = useState('1403/01/01');
  const [toDate, setToDate] = useState('1403/12/29');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // ارقام صورت سود و زیان جامع
  const grossSales = 3450000000;
  const salesDiscounts = 85000000;
  const netSales = grossSales - salesDiscounts; // 3,365,000,000

  const cogs = 1920000000;
  const grossProfit = netSales - cogs; // 1,445,000,000

  const adminExpenses = 420000000;
  const sellingExpenses = 285000000;
  const totalOperatingExpenses = adminExpenses + sellingExpenses; // 705,000,000
  const operatingProfit = grossProfit - totalOperatingExpenses; // 740,000,000

  const financialExpenses = 48000000;
  const otherRevenues = 120000000; // سود واگذاری دارایی
  const otherExpenses = 15000000;
  const netNonOperating = otherRevenues - financialExpenses - otherExpenses; // 57,000,000

  const profitBeforeTax = operatingProfit + netNonOperating; // 797,000,000
  const incomeTaxProvision = Math.round(profitBeforeTax * 0.25); // 199,250,000 (ماده ۱۰۵ نرخ ۲۵٪)
  const netIncome = profitBeforeTax - incomeTaxProvision; // 597,750,000

  // نسبت‌های سودآوری
  const grossMargin = ((grossProfit / netSales) * 100).toFixed(1);
  const operatingMargin = ((operatingProfit / netSales) * 100).toFixed(1);
  const netMargin = ((netIncome / netSales) * 100).toFixed(1);

  const handlePrint = () => {
    window.print();
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 800);
  };

  return (
    <div className="space-y-6">
      {/* استایل اختصاصی چاپ */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-income-statement,
          #printable-income-statement * {
            visibility: visible;
          }
          #printable-income-statement {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 10px;
            box-shadow: none !important;
            border: none !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Header (No Print) */}
      <div className="no-print flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <Link href="/accounting/reports/trial-balance" className="hover:text-emerald-600 transition-colors">
              حسابداری دوبل و گزارشات
            </Link>
            <span>/</span>
            <span className="text-slate-800 font-semibold">صورت سود و زیان جامع</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2.5">
            <TrendingUp className="w-7 h-7 text-emerald-600" />
            صورت سود و زیان جامع چند مرحله‌ای
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            گزارش عملکرد مالی شرکت، سود ناخالص، سود عملیاتی، مالیات عملکرد ماده ۱۰۵ و سود خالص دوره مالی
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-50 border p-1.5 rounded-lg text-xs">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span className="text-slate-600 font-semibold">از:</span>
            <input
              type="text"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="bg-white border rounded px-2 py-1 font-mono text-xs w-24 focus:ring-1 focus:ring-emerald-500 outline-none"
            />
            <span className="text-slate-600 font-semibold">تا:</span>
            <input
              type="text"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="bg-white border rounded px-2 py-1 font-mono text-xs w-24 focus:ring-1 focus:ring-emerald-500 outline-none"
            />
          </div>

          <button
            onClick={handleRefresh}
            className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold px-3 py-2.5 rounded-lg transition-colors border"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            بازخوانی
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold px-4 py-2.5 rounded-lg transition-colors shadow-sm"
          >
            <Printer className="w-4 h-4" />
            چاپ صورت سود و زیان
          </button>
        </div>
      </div>

      {/* Margins KPI Cards (No Print) */}
      <div className="no-print grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500 block mb-1">درآمد عملیاتی خالص (فروش)</span>
            <span className="text-xl font-bold text-slate-800">
              {netSales.toLocaleString('fa-IR')} <span className="text-xs font-normal text-slate-500">ریال</span>
            </span>
          </div>
          <div className="w-11 h-11 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500 block mb-1">حاشیه سود ناخالص</span>
            <span className="text-xl font-bold text-emerald-600">
              ٪{grossMargin}
            </span>
            <div className="text-[11px] text-slate-400 mt-1">سود: {grossProfit.toLocaleString('fa-IR')} ریال</div>
          </div>
          <div className="w-11 h-11 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center">
            <Percent className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500 block mb-1">حاشیه سود عملیاتی</span>
            <span className="text-xl font-bold text-purple-600">
              ٪{operatingMargin}
            </span>
            <div className="text-[11px] text-slate-400 mt-1">سود: {operatingProfit.toLocaleString('fa-IR')} ریال</div>
          </div>
          <div className="w-11 h-11 bg-purple-50 text-purple-600 rounded-lg flex items-center justify-center">
            <Percent className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500 block mb-1">حاشیه سود خالص نهایی</span>
            <span className="text-xl font-bold text-emerald-700">
              ٪{netMargin}
            </span>
            <div className="text-[11px] text-slate-400 mt-1">خالص: {netIncome.toLocaleString('fa-IR')} ریال</div>
          </div>
          <div className="w-11 h-11 bg-emerald-100 text-emerald-800 rounded-lg flex items-center justify-center">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Official Printable Income Statement Document */}
      <div
        id="printable-income-statement"
        className="bg-white rounded-xl border border-slate-300 shadow-md p-8 max-w-4xl mx-auto space-y-6 text-slate-800"
      >
        {/* Document Header */}
        <div className="text-center border-b-2 border-slate-800 pb-5 space-y-1.5">
          <h2 className="text-xl font-black text-slate-900">شرکت پیشرو سیستم آریا (سهامی خاص)</h2>
          <h3 className="text-base font-bold text-slate-700">صورت سود و زیان جامع چند مرحله‌ای</h3>
          <div className="text-xs text-slate-500 flex items-center justify-center gap-4 pt-1">
            <span>برای دوره مالی از: <strong className="font-mono text-slate-800">{fromDate}</strong> تا: <strong className="font-mono text-slate-800">{toDate}</strong></span>
            <span>واحد اندازه‌گیری: <strong>ریال ایران</strong></span>
          </div>
        </div>

        {/* Multi-Step Income Statement Breakdown */}
        <div className="space-y-4 text-xs">
          {/* Section 1: Gross Revenues & COGS */}
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <div className="bg-slate-900 text-white font-bold py-2.5 px-4 flex justify-between">
              <span>۱. درآمدهای عملیاتی و بهای تمام‌شده</span>
              <span>مبلغ (ریال)</span>
            </div>
            <div className="p-3 space-y-2.5 divide-y divide-slate-100">
              <div className="flex justify-between pt-1">
                <span className="text-slate-700 font-medium">فروش ناخالص کالا و خدمات</span>
                <span className="font-mono font-medium">{grossSales.toLocaleString('fa-IR')}</span>
              </div>
              <div className="flex justify-between pt-2">
                <span className="text-slate-700">کسر می‌شود: برگشت از فروش و تخفیفات تجاری</span>
                <span className="font-mono text-rose-600">({salesDiscounts.toLocaleString('fa-IR')})</span>
              </div>
              <div className="flex justify-between pt-2 bg-slate-50 p-2 rounded font-bold text-slate-900">
                <span>خالص درآمدهای عملیاتی (فروش خالص):</span>
                <span className="font-mono">{netSales.toLocaleString('fa-IR')}</span>
              </div>
              <div className="flex justify-between pt-2">
                <span className="text-slate-700">کسر می‌شود: بهای تمام‌شده کالای فروش‌رفته و خدمات (COGS)</span>
                <span className="font-mono text-rose-600">({cogs.toLocaleString('fa-IR')})</span>
              </div>
            </div>
            <div className="bg-emerald-50 border-t border-emerald-200 py-3 px-4 flex justify-between items-center font-bold text-sm text-emerald-950">
              <span>سود (زیان) ناخالص:</span>
              <span className="font-mono">{grossProfit.toLocaleString('fa-IR')} ریال</span>
            </div>
          </div>

          {/* Section 2: Operating Expenses & Operating Profit */}
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <div className="bg-slate-900 text-white font-bold py-2.5 px-4 flex justify-between">
              <span>۲. هزینه‌های عمومی، تشکیلاتی و فروش</span>
              <span>مبلغ (ریال)</span>
            </div>
            <div className="p-3 space-y-2.5 divide-y divide-slate-100">
              <div className="flex justify-between pt-1">
                <span className="text-slate-700">هزینه‌های عمومی، اداری و تشکیلاتی (حقوق پرسنل، اجاره، آب و برق، خدمات)</span>
                <span className="font-mono text-rose-600">({adminExpenses.toLocaleString('fa-IR')})</span>
              </div>
              <div className="flex justify-between pt-2">
                <span className="text-slate-700">هزینه‌های توزیع و فروش (تبلیغات، بازاریابی و حمل)</span>
                <span className="font-mono text-rose-600">({sellingExpenses.toLocaleString('fa-IR')})</span>
              </div>
              <div className="flex justify-between pt-2 bg-slate-50 p-2 rounded font-bold text-slate-800">
                <span>جمع هزینه‌های عملیاتی دوره:</span>
                <span className="font-mono text-rose-700">({totalOperatingExpenses.toLocaleString('fa-IR')})</span>
              </div>
            </div>
            <div className="bg-purple-50 border-t border-purple-200 py-3 px-4 flex justify-between items-center font-bold text-sm text-purple-950">
              <span>سود (زیان) عملیاتی:</span>
              <span className="font-mono">{operatingProfit.toLocaleString('fa-IR')} ریال</span>
            </div>
          </div>

          {/* Section 3: Non-Operating & Tax */}
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <div className="bg-slate-900 text-white font-bold py-2.5 px-4 flex justify-between">
              <span>۳. اقلام غیرعملیاتی، مالیات و سود خالص</span>
              <span>مبلغ (ریال)</span>
            </div>
            <div className="p-3 space-y-2.5 divide-y divide-slate-100">
              <div className="flex justify-between pt-1">
                <span className="text-slate-700">کسر می‌شود: هزینه‌های مالی و کارمزدهای بانکی</span>
                <span className="font-mono text-rose-600">({financialExpenses.toLocaleString('fa-IR')})</span>
              </div>
              <div className="flex justify-between pt-2">
                <span className="text-slate-700">اضافه می‌شود: سایر درآمدهای غیرعملیاتی (سود فروش و واگذاری دارایی‌ها)</span>
                <span className="font-mono text-emerald-600">+{otherRevenues.toLocaleString('fa-IR')}</span>
              </div>
              <div className="flex justify-between pt-2">
                <span className="text-slate-700">کسر می‌شود: سایر هزینه‌های غیرعملیاتی (زیان واگذاری و اسقاط اموال)</span>
                <span className="font-mono text-rose-600">({otherExpenses.toLocaleString('fa-IR')})</span>
              </div>
              <div className="flex justify-between pt-2 bg-slate-50 p-2 rounded font-bold text-slate-900">
                <span>سود (زیان) قبل از کسر مالیات:</span>
                <span className="font-mono">{profitBeforeTax.toLocaleString('fa-IR')} ریال</span>
              </div>
              <div className="flex justify-between pt-2">
                <span className="text-slate-700 font-semibold">
                  کسر می‌شود: ذخیره مالیات بر درآمد عملکرد (نرخ مصوب ۲۵٪ ماده ۱۰۵ ق.م.م)
                </span>
                <span className="font-mono text-rose-600 font-bold">({incomeTaxProvision.toLocaleString('fa-IR')})</span>
              </div>
            </div>

            {/* Final Net Income Box */}
            <div className="bg-slate-900 text-white py-4 px-6 flex justify-between items-center font-extrabold text-base">
              <span>سود خالص نهایی دوره مالی:</span>
              <span className="font-mono text-lg text-emerald-400">
                {netIncome.toLocaleString('fa-IR')} ریال
              </span>
            </div>
          </div>
        </div>

        {/* Official Footer and Signatures */}
        <div className="pt-8 border-t border-slate-200 grid grid-cols-3 gap-6 text-center text-xs text-slate-500">
          <div>
            <div className="h-16"></div>
            <div className="font-semibold text-slate-700">رئیس حسابداری</div>
          </div>
          <div>
            <div className="h-16"></div>
            <div className="font-semibold text-slate-700">مدیر مالی</div>
          </div>
          <div>
            <div className="h-16"></div>
            <div className="font-semibold text-slate-700">مدیرعامل شرکت</div>
          </div>
        </div>
      </div>
    </div>
  );
}
