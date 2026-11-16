'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Wallet,
  Calendar,
  Printer,
  Download,
  Building2,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  DollarSign,
  ArrowUpRight,
  ArrowDownLeft,
} from 'lucide-react';

export default function CashFlowStatementPage() {
  const [fromDate, setFromDate] = useState('1403/01/01');
  const [toDate, setToDate] = useState('1403/12/29');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // فعالیت‌های عملیاتی
  const netIncome = 597750000;
  const depreciationAdjustment = 185000000;
  const gainOnDisposalAdjustment = -120000000;
  const lossOnDisposalAdjustment = 15000000;

  // تغییرات سرمایه در گردش
  const arChange = -110000000; // افزایش در دریافتنی‌ها (خروج نقد)
  const inventoryChange = -180000000; // افزایش در موجودی کالا
  const apChange = 145000000; // افزایش در بستانکاران (ورود نقد)
  const netWorkingCapitalImpact = arChange + inventoryChange + apChange; // -145,000,000

  const netOperatingCash =
    netIncome +
    depreciationAdjustment +
    gainOnDisposalAdjustment +
    lossOnDisposalAdjustment +
    netWorkingCapitalImpact; // 532,750,000

  // فعالیت‌های سرمایه‌گذاری
  const assetPurchases = -450000000;
  const assetSaleProceeds = 320000000;
  const netInvestingCash = assetPurchases + assetSaleProceeds; // -130,000,000

  // فعالیت‌های تامین مالی
  const capitalInjections = 0;
  const loanNetBorrowing = -150000000; // بازپرداخت اقساط وام بانکی
  const dividendsPaid = -100000000;
  const netFinancingCash = capitalInjections + loanNetBorrowing + dividendsPaid; // -250,000,000

  // تطبیق با مانده پایان دوره
  const netChangeInCash = netOperatingCash + netInvestingCash + netFinancingCash; // 152,750,000
  const beginningCash = 367250000;
  const endingCash = beginningCash + netChangeInCash; // 520,000,000

  const handlePrint = () => {
    window.print();
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 800);
  };

  return (
    <div className="space-y-6 print:space-y-2">
      {/* Header (No Print) */}
      <div className="no-print print:hidden flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <Link href="/accounting/reports/trial-balance" className="hover:text-emerald-600 transition-colors">
              حسابداری دوبل و گزارشات
            </Link>
            <span>/</span>
            <span className="text-slate-800 font-semibold">صورت جریان وجوه نقد</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2.5">
            <Wallet className="w-7 h-7 text-emerald-600" />
            صورت جریان وجوه نقد (استاندارد حسابداری ۲ ایران)
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            تفکیک جریان‌های نقد عملیاتی (روش غیرمستقیم)، سرمایه‌گذاری و تامین مالی به همراه تطبیق با مانده پایان دوره
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
            چاپ صورت جریان نقد
          </button>
        </div>
      </div>

      {/* KPI Cards (No Print) */}
      <div className="no-print grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500 block mb-1">جریان نقد عملیاتی</span>
            <span className="text-xl font-bold text-emerald-600">
              +{netOperatingCash.toLocaleString('fa-IR')} <span className="text-xs font-normal text-slate-500">ریال</span>
            </span>
          </div>
          <div className="w-11 h-11 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center">
            <ArrowUpRight className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500 block mb-1">جریان نقد سرمایه‌گذاری</span>
            <span className="text-xl font-bold text-rose-600">
              {netInvestingCash.toLocaleString('fa-IR')} <span className="text-xs font-normal text-slate-500">ریال</span>
            </span>
          </div>
          <div className="w-11 h-11 bg-rose-50 text-rose-600 rounded-lg flex items-center justify-center">
            <ArrowDownLeft className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500 block mb-1">جریان نقد تامین مالی</span>
            <span className="text-xl font-bold text-purple-600">
              {netFinancingCash.toLocaleString('fa-IR')} <span className="text-xs font-normal text-slate-500">ریال</span>
            </span>
          </div>
          <div className="w-11 h-11 bg-purple-50 text-purple-600 rounded-lg flex items-center justify-center">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500 block mb-1">مانده وجه نقد پایان دوره</span>
            <span className="text-xl font-bold text-slate-800">
              {endingCash.toLocaleString('fa-IR')} <span className="text-xs font-normal text-slate-500">ریال</span>
            </span>
          </div>
          <div className="w-11 h-11 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
            <Wallet className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Official Printable Cash Flow Document */}
      <div
        id="printable-cash-flow"
        className="bg-white rounded-xl border border-slate-300 shadow-md p-8 max-w-4xl mx-auto space-y-6 text-slate-800 print:border-none print:shadow-none print:p-0 print:m-0 print:max-w-none"
      >
        {/* Document Header */}
        <div className="text-center border-b-2 border-slate-800 pb-5 space-y-1.5">
          <h2 className="text-xl font-black text-slate-900">شرکت پیشرو سیستم آریا (سهامی خاص)</h2>
          <h3 className="text-base font-bold text-slate-700">صورت جریان وجوه نقد (روش غیرمستقیم)</h3>
          <div className="text-xs text-slate-500 flex items-center justify-center gap-4 pt-1">
            <span>برای دوره مالی از: <strong className="font-mono text-slate-800">{fromDate}</strong> تا: <strong className="font-mono text-slate-800">{toDate}</strong></span>
            <span>واحد اندازه‌گیری: <strong>ریال ایران</strong></span>
            <span>مرجع: <strong>استاندارد حسابداری شماره ۲ ایران</strong></span>
          </div>
        </div>

        {/* Cash Flow Detailed Sections */}
        <div className="space-y-4 text-xs">
          {/* Section 1: Operating Activities */}
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <div className="bg-slate-900 text-white font-bold py-2.5 px-4 flex justify-between">
              <span>۱. جریان وجوه نقد ناشی از فعالیت‌های عملیاتی</span>
              <span>مبلغ (ریال)</span>
            </div>
            <div className="p-3 space-y-2 divide-y divide-slate-100">
              <div className="flex justify-between pt-1">
                <span className="text-slate-800 font-medium">سود خالص دوره مالی</span>
                <span className="font-mono font-medium">{netIncome.toLocaleString('fa-IR')}</span>
              </div>
              <div className="pt-2 text-slate-500 font-semibold">تعدیلات مربوط به اقلام غیرنقدی:</div>
              <div className="flex justify-between pr-3">
                <span>اضافه می‌شود: هزینه استهلاک دارایی‌های ثابت</span>
                <span className="font-mono text-emerald-600">+{depreciationAdjustment.toLocaleString('fa-IR')}</span>
              </div>
              <div className="flex justify-between pr-3">
                <span>کسر می‌شود: سود ناشی از واگذاری و فروش دارایی‌ها</span>
                <span className="font-mono text-rose-600">({Math.abs(gainOnDisposalAdjustment).toLocaleString('fa-IR')})</span>
              </div>
              <div className="flex justify-between pr-3">
                <span>اضافه می‌شود: زیان ناشی از واگذاری دارایی‌ها</span>
                <span className="font-mono text-emerald-600">+{lossOnDisposalAdjustment.toLocaleString('fa-IR')}</span>
              </div>
              <div className="pt-2 text-slate-500 font-semibold">تغییرات در اقلام سرمایه در گردش:</div>
              <div className="flex justify-between pr-3">
                <span>(افزایش) در حساب‌ها و اسناد دریافتنی تجاری</span>
                <span className="font-mono text-rose-600">({Math.abs(arChange).toLocaleString('fa-IR')})</span>
              </div>
              <div className="flex justify-between pr-3">
                <span>(افزایش) در موجودی مواد و کالا</span>
                <span className="font-mono text-rose-600">({Math.abs(inventoryChange).toLocaleString('fa-IR')})</span>
              </div>
              <div className="flex justify-between pr-3">
                <span>افزایش در حساب‌ها و اسناد پرداختنی تجاری</span>
                <span className="font-mono text-emerald-600">+{apChange.toLocaleString('fa-IR')}</span>
              </div>
            </div>
            <div className="bg-emerald-50 border-t border-emerald-200 py-3 px-4 flex justify-between items-center font-bold text-sm text-emerald-950">
              <span>خالص جریان وجوه نقد ناشی از فعالیت‌های عملیاتی:</span>
              <span className="font-mono">+{netOperatingCash.toLocaleString('fa-IR')} ریال</span>
            </div>
          </div>

          {/* Section 2: Investing Activities */}
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <div className="bg-slate-900 text-white font-bold py-2.5 px-4 flex justify-between">
              <span>۲. جریان وجوه نقد ناشی از فعالیت‌های سرمایه‌گذاری</span>
              <span>مبلغ (ریال)</span>
            </div>
            <div className="p-3 space-y-2 divide-y divide-slate-100">
              <div className="flex justify-between pt-1">
                <span>وجوه پرداختی بابت خرید و تحصیل دارایی‌های ثابت مشهود</span>
                <span className="font-mono text-rose-600">({Math.abs(assetPurchases).toLocaleString('fa-IR')})</span>
              </div>
              <div className="flex justify-between pt-2">
                <span>وجوه دریافتی حاصل از واگذاری و فروش دارایی‌های ثابت</span>
                <span className="font-mono text-emerald-600">+{assetSaleProceeds.toLocaleString('fa-IR')}</span>
              </div>
            </div>
            <div className="bg-rose-50 border-t border-rose-200 py-3 px-4 flex justify-between items-center font-bold text-sm text-rose-950">
              <span>خالص جریان وجوه نقد ناشی از فعالیت‌های سرمایه‌گذاری:</span>
              <span className="font-mono">{netInvestingCash.toLocaleString('fa-IR')} ریال</span>
            </div>
          </div>

          {/* Section 3: Financing Activities */}
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <div className="bg-slate-900 text-white font-bold py-2.5 px-4 flex justify-between">
              <span>۳. جریان وجوه نقد ناشی از فعالیت‌های تامین مالی</span>
              <span>مبلغ (ریال)</span>
            </div>
            <div className="p-3 space-y-2 divide-y divide-slate-100">
              <div className="flex justify-between pt-1">
                <span>بازپرداخت اصل تسهیلات مالی بانکی</span>
                <span className="font-mono text-rose-600">({Math.abs(loanNetBorrowing).toLocaleString('fa-IR')})</span>
              </div>
              <div className="flex justify-between pt-2">
                <span>سود سهام پرداخت‌شده به سهامداران</span>
                <span className="font-mono text-rose-600">({Math.abs(dividendsPaid).toLocaleString('fa-IR')})</span>
              </div>
            </div>
            <div className="bg-purple-50 border-t border-purple-200 py-3 px-4 flex justify-between items-center font-bold text-sm text-purple-950">
              <span>خالص جریان وجوه نقد ناشی از فعالیت‌های تامین مالی:</span>
              <span className="font-mono">{netFinancingCash.toLocaleString('fa-IR')} ریال</span>
            </div>
          </div>

          {/* Section 4: Cash Reconciliation */}
          <div className="border border-slate-300 rounded-lg bg-slate-50 p-4 space-y-2">
            <div className="flex justify-between font-semibold text-slate-800">
              <span>خالص افزایش (کاهش) در وجوه نقد دوره:</span>
              <span className="font-mono font-bold text-emerald-700">+{netChangeInCash.toLocaleString('fa-IR')} ریال</span>
            </div>
            <div className="flex justify-between text-slate-600 pt-1 border-t">
              <span>مانده وجوه نقد در ابتدای دوره مالی:</span>
              <span className="font-mono">{beginningCash.toLocaleString('fa-IR')} ریال</span>
            </div>
            <div className="flex justify-between font-black text-sm text-slate-900 pt-2 border-t-2 border-slate-300">
              <span>مانده وجوه نقد در انتهای دوره مالی (مطابق با دفاتر نقد و بانک):</span>
              <span className="font-mono text-emerald-800">{endingCash.toLocaleString('fa-IR')} ریال</span>
            </div>
          </div>
        </div>

        {/* Signatures */}
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
