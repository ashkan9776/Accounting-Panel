'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Scale,
  Calendar,
  Printer,
  Download,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Building2,
  FileSpreadsheet,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';

interface BalanceItem {
  code: string;
  title: string;
  amount: number;
}

export default function BalanceSheetPage() {
  const [asOfDate, setAsOfDate] = useState('1403/12/29');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // داده‌های استاندارد ترازنامه شرکت نمونه
  const currentAssets: BalanceItem[] = [
    { code: '۱۱۰۱', title: 'موجودی نقد و بانک‌ها', amount: 485000000 },
    { code: '۱۱۰۳', title: 'صندوق‌ها و تنخواه‌گردان‌ها', amount: 35000000 },
    { code: '۱۳۰۱', title: 'حساب‌ها و اسناد دریافتنی تجاری (مشتریان)', amount: 620000000 },
    { code: '۱۳۰۲', title: 'اسناد دریافتنی در جریان وصول (چک صیادی)', amount: 410000000 },
    { code: '۱۴۰۱', title: 'سایر حساب‌ها و دریافتنی‌های غیرتجاری', amount: 45000000 },
    { code: '۱۵۰۱', title: 'موجودی کالای ساخته‌شده و انبار بازرگانی', amount: 780000000 },
    { code: '۱۵۰۲', title: 'موجودی مواد اولیه و قطعات یدکی', amount: 350000000 },
    { code: '۱۵۰۳', title: 'کالای در جریان ساخت (WIP)', amount: 165000000 },
    { code: '۱۶۰۱', title: 'پیش‌پرداخت‌های خرید کالا و خدمات', amount: 90000000 },
  ];

  const nonCurrentAssets: BalanceItem[] = [
    { code: '۲۱۰۱', title: 'اثاثه، اداری و تجهیزات رایانه‌ای', amount: 450000000 },
    { code: '۲۱۰۲', title: 'وسایط نقلیه سواری و باری', amount: 320000000 },
    { code: '۲۱۰۳', title: 'ماشین‌آلات و تجهیزات فنی و صنعتی', amount: 1500000000 },
    { code: '۲۲۰۱', title: 'کسر می‌شود: استهلاک انباشته دارایی‌های ثابت', amount: -513000000 },
    { code: '۲۳۰۱', title: 'دارایی‌های نامشهود (نرم‌افزارها و پروانه‌ها)', amount: 120000000 },
  ];

  const currentLiabilities: BalanceItem[] = [
    { code: '۳۱۰۱', title: 'حساب‌ها و اسناد پرداختنی تجاری (تامین‌کنندگان)', amount: 540000000 },
    { code: '۳۱۰۲', title: 'اسناد پرداختنی نزد اشخاص (چک صیادی عهده)', amount: 320000000 },
    { code: '۳۲۰۱', title: 'سایر حساب‌ها و اسناد پرداختنی', amount: 85000000 },
    { code: '۳۳۰۱', title: 'پیش‌دریافت‌ها از مشتریان', amount: 110000000 },
    { code: '۳۳۰۴', title: 'بیمه پرداختنی سازمان تامین اجتماعی', amount: 52900000 },
    { code: '۳۳۰۵', title: 'مالیات تکلیفی و مالیات حقوق پرداختنی', amount: 18500000 },
    { code: '۳۳۰۶', title: 'مالیات بر ارزش افزوده پرداختنی', amount: 92600000 },
    { code: '۳۳۰۷', title: 'ذخیره مالیات بر درآمد عملکرد (ماده ۱۰۵)', amount: 215000000 },
    { code: '۳۴۰۱', title: 'تسهیلات مالی کوتاه‌مدت بانکی', amount: 250000000 },
  ];

  const nonCurrentLiabilities: BalanceItem[] = [
    { code: '۴۱۰۱', title: 'تسهیلات مالی بلندمدت بانکی', amount: 400000000 },
    { code: '۴۲۰۱', title: 'ذخیره مزایای پایان خدمت کارکنان (سنوات)', amount: 185000000 },
  ];

  const equity: BalanceItem[] = [
    { code: '۵۱۰۱', title: 'سرمایه پرداخت‌شده و ثبت‌شده', amount: 1500000000 },
    { code: '۵۲۰۱', title: 'اندوخته قانونی و احتیاطی', amount: 150000000 },
    { code: '۵۳۰۱', title: 'سود و زیان انباشته سنواتی', amount: 488000000 },
    { code: '۵۴۰۱', title: 'سود خالص دوره جاری', amount: 450000000 },
  ];

  const totalCurrentAssets = currentAssets.reduce((sum, i) => sum + i.amount, 0);
  const totalNonCurrentAssets = nonCurrentAssets.reduce((sum, i) => sum + i.amount, 0);
  const totalAssets = totalCurrentAssets + totalNonCurrentAssets;

  const totalCurrentLiab = currentLiabilities.reduce((sum, i) => sum + i.amount, 0);
  const totalNonCurrentLiab = nonCurrentLiabilities.reduce((sum, i) => sum + i.amount, 0);
  const totalLiabilities = totalCurrentLiab + totalNonCurrentLiab;

  const totalEquity = equity.reduce((sum, i) => sum + i.amount, 0);
  const totalLiabAndEquity = totalLiabilities + totalEquity;

  const isBalanced = totalAssets === totalLiabAndEquity;

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
            <span className="text-slate-800 font-semibold">ترازنامه رسمی</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2.5">
            <Scale className="w-7 h-7 text-emerald-600" />
            ترازنامه رسمی (صورت وضعیت مالی)
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            تهیه شده مطابق با استاندارد حسابداری شماره ۱ ایران و اصل تطابق دارایی‌ها با مجموع بدهی‌ها و حقوق مالکانه
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-50 border p-1.5 rounded-lg text-xs">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span className="text-slate-600 font-semibold">تا تاریخ:</span>
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
            بازخوانی
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold px-4 py-2.5 rounded-lg transition-colors shadow-sm"
          >
            <Printer className="w-4 h-4" />
            چاپ ترازنامه رسمی
          </button>
        </div>
      </div>

      {/* Balance Verification Banner (No Print) */}
      <div className={`no-print p-4 rounded-xl border flex items-center justify-between ${
        isBalanced
          ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
          : 'bg-rose-50 border-rose-300 text-rose-900'
      }`}>
        <div className="flex items-center gap-3">
          {isBalanced ? (
            <div className="w-9 h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
          ) : (
            <div className="w-9 h-9 rounded-full bg-rose-600 text-white flex items-center justify-center shrink-0">
              <AlertCircle className="w-5 h-5" />
            </div>
          )}
          <div>
            <div className="text-sm font-bold">
              {isBalanced
                ? 'معادله اساسی حسابداری ۱۰۰٪ متوازن و تراز است'
                : 'هشدار: مغایرت در معادله ترازنامه شناسایی شد!'}
            </div>
            <div className="text-xs opacity-80 mt-0.5">
              مجموع کل دارایی‌ها ({totalAssets.toLocaleString('fa-IR')} ریال) = مجموع بدهی‌ها و حقوق صاحبان سهام ({totalLiabAndEquity.toLocaleString('fa-IR')} ریال)
            </div>
          </div>
        </div>
        <div className="text-xs font-mono font-bold bg-white/80 px-3 py-1.5 rounded-lg border">
          مغایرت: ۰ ریال
        </div>
      </div>

      {/* Official Printable Balance Sheet Document */}
      <div
        id="printable-balance-sheet"
        className="bg-white rounded-xl border border-slate-300 shadow-md p-8 max-w-6xl mx-auto space-y-6 text-slate-800 print:border-none print:shadow-none print:p-0 print:m-0 print:max-w-none"
      >
        {/* Document Header */}
        <div className="text-center border-b-2 border-slate-800 pb-5 space-y-1.5">
          <h2 className="text-xl font-black text-slate-900">شرکت پیشرو سیستم آریا (سهامی خاص)</h2>
          <h3 className="text-base font-bold text-slate-700">ترازنامه (صورت وضعیت مالی)</h3>
          <div className="text-xs text-slate-500 flex items-center justify-center gap-4 pt-1">
            <span>در تاریخ: <strong className="font-mono text-slate-800">{asOfDate}</strong></span>
            <span>واحد اندازه‌گیری: <strong>ریال ایران</strong></span>
            <span>استاندارد مرجع: <strong>استاندارد حسابداری شماره ۱ ایران</strong></span>
          </div>
        </div>

        {/* Dual-Column Layout: Assets on Right, Liabilities & Equity on Left */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          {/* Right Column: Assets (دارایی‌ها) */}
          <div className="space-y-4">
            <div className="bg-slate-900 text-white py-2.5 px-4 rounded-t-lg font-bold text-xs flex justify-between items-center">
              <span>دارایی‌ها (Assets)</span>
              <span>مبلغ (ریال)</span>
            </div>

            {/* Current Assets */}
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="bg-emerald-50 text-emerald-950 font-bold text-xs py-2 px-3 border-b border-emerald-100 flex justify-between">
                <span>دارایی‌های جاری</span>
                <span className="font-mono">{totalCurrentAssets.toLocaleString('fa-IR')}</span>
              </div>
              <div className="divide-y divide-slate-100 text-xs p-1">
                {currentAssets.map((item) => (
                  <div key={item.code} className="flex justify-between py-2 px-3 hover:bg-slate-50">
                    <span className="text-slate-700">
                      <span className="font-mono text-[11px] text-slate-400 ml-1.5">{item.code}</span>
                      {item.title}
                    </span>
                    <span className="font-mono font-medium text-slate-800">
                      {item.amount.toLocaleString('fa-IR')}
                    </span>
                  </div>
                ))}
              </div>
              <div className="bg-slate-50 border-t border-slate-200 py-2 px-3 text-xs font-bold flex justify-between text-slate-800">
                <span>جمع دارایی‌های جاری:</span>
                <span className="font-mono">{totalCurrentAssets.toLocaleString('fa-IR')}</span>
              </div>
            </div>

            {/* Non-Current Assets */}
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="bg-blue-50 text-blue-950 font-bold text-xs py-2 px-3 border-b border-blue-100 flex justify-between">
                <span>دارایی‌های غیرجاری</span>
                <span className="font-mono">{totalNonCurrentAssets.toLocaleString('fa-IR')}</span>
              </div>
              <div className="divide-y divide-slate-100 text-xs p-1">
                {nonCurrentAssets.map((item) => (
                  <div key={item.code} className="flex justify-between py-2 px-3 hover:bg-slate-50">
                    <span className="text-slate-700">
                      <span className="font-mono text-[11px] text-slate-400 ml-1.5">{item.code}</span>
                      {item.title}
                    </span>
                    <span className={`font-mono font-medium ${item.amount < 0 ? 'text-rose-600' : 'text-slate-800'}`}>
                      {item.amount < 0 ? `(${Math.abs(item.amount).toLocaleString('fa-IR')})` : item.amount.toLocaleString('fa-IR')}
                    </span>
                  </div>
                ))}
              </div>
              <div className="bg-slate-50 border-t border-slate-200 py-2 px-3 text-xs font-bold flex justify-between text-slate-800">
                <span>جمع دارایی‌های غیرجاری:</span>
                <span className="font-mono">{totalNonCurrentAssets.toLocaleString('fa-IR')}</span>
              </div>
            </div>

            {/* Total Assets Summary Box */}
            <div className="bg-emerald-700 text-white rounded-lg p-3.5 flex justify-between items-center font-bold text-sm shadow-sm">
              <span>جمع کل دارایی‌ها:</span>
              <span className="font-mono text-base">{totalAssets.toLocaleString('fa-IR')} ریال</span>
            </div>
          </div>

          {/* Left Column: Liabilities & Equity (بدهی‌ها و حقوق مالکانه) */}
          <div className="space-y-4">
            <div className="bg-slate-900 text-white py-2.5 px-4 rounded-t-lg font-bold text-xs flex justify-between items-center">
              <span>بدهی‌ها و حقوق مالکانه (Liabilities & Equity)</span>
              <span>مبلغ (ریال)</span>
            </div>

            {/* Current Liabilities */}
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="bg-rose-50 text-rose-950 font-bold text-xs py-2 px-3 border-b border-rose-100 flex justify-between">
                <span>بدهی‌های جاری</span>
                <span className="font-mono">{totalCurrentLiab.toLocaleString('fa-IR')}</span>
              </div>
              <div className="divide-y divide-slate-100 text-xs p-1">
                {currentLiabilities.map((item) => (
                  <div key={item.code} className="flex justify-between py-2 px-3 hover:bg-slate-50">
                    <span className="text-slate-700">
                      <span className="font-mono text-[11px] text-slate-400 ml-1.5">{item.code}</span>
                      {item.title}
                    </span>
                    <span className="font-mono font-medium text-slate-800">
                      {item.amount.toLocaleString('fa-IR')}
                    </span>
                  </div>
                ))}
              </div>
              <div className="bg-slate-50 border-t border-slate-200 py-2 px-3 text-xs font-bold flex justify-between text-slate-800">
                <span>جمع بدهی‌های جاری:</span>
                <span className="font-mono">{totalCurrentLiab.toLocaleString('fa-IR')}</span>
              </div>
            </div>

            {/* Non-Current Liabilities */}
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="bg-amber-50 text-amber-950 font-bold text-xs py-2 px-3 border-b border-amber-100 flex justify-between">
                <span>بدهی‌های غیرجاری</span>
                <span className="font-mono">{totalNonCurrentLiab.toLocaleString('fa-IR')}</span>
              </div>
              <div className="divide-y divide-slate-100 text-xs p-1">
                {nonCurrentLiabilities.map((item) => (
                  <div key={item.code} className="flex justify-between py-2 px-3 hover:bg-slate-50">
                    <span className="text-slate-700">
                      <span className="font-mono text-[11px] text-slate-400 ml-1.5">{item.code}</span>
                      {item.title}
                    </span>
                    <span className="font-mono font-medium text-slate-800">
                      {item.amount.toLocaleString('fa-IR')}
                    </span>
                  </div>
                ))}
              </div>
              <div className="bg-slate-50 border-t border-slate-200 py-2 px-3 text-xs font-bold flex justify-between text-slate-800">
                <span>جمع بدهی‌های غیرجاری:</span>
                <span className="font-mono">{totalNonCurrentLiab.toLocaleString('fa-IR')}</span>
              </div>
            </div>

            {/* Equity */}
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="bg-purple-50 text-purple-950 font-bold text-xs py-2 px-3 border-b border-purple-100 flex justify-between">
                <span>حقوق مالکانه و سرمایه</span>
                <span className="font-mono">{totalEquity.toLocaleString('fa-IR')}</span>
              </div>
              <div className="divide-y divide-slate-100 text-xs p-1">
                {equity.map((item) => (
                  <div key={item.code} className="flex justify-between py-2 px-3 hover:bg-slate-50">
                    <span className="text-slate-700">
                      <span className="font-mono text-[11px] text-slate-400 ml-1.5">{item.code}</span>
                      {item.title}
                    </span>
                    <span className="font-mono font-medium text-purple-900">
                      {item.amount.toLocaleString('fa-IR')}
                    </span>
                  </div>
                ))}
              </div>
              <div className="bg-slate-50 border-t border-slate-200 py-2 px-3 text-xs font-bold flex justify-between text-slate-800">
                <span>جمع حقوق صاحبان سرمایه:</span>
                <span className="font-mono">{totalEquity.toLocaleString('fa-IR')}</span>
              </div>
            </div>

            {/* Total Liabilities & Equity Summary Box */}
            <div className="bg-slate-800 text-white rounded-lg p-3.5 flex justify-between items-center font-bold text-sm shadow-sm">
              <span>جمع کل بدهی‌ها و حقوق صاحبان سهام:</span>
              <span className="font-mono text-base">{totalLiabAndEquity.toLocaleString('fa-IR')} ریال</span>
            </div>
          </div>
        </div>

        {/* Official Footer and Signatures */}
        <div className="pt-8 border-t border-slate-200 grid grid-cols-3 gap-6 text-center text-xs text-slate-500">
          <div>
            <div className="h-16"></div>
            <div className="font-semibold text-slate-700">رئیس حسابداری و امور مالی</div>
          </div>
          <div>
            <div className="h-16"></div>
            <div className="font-semibold text-slate-700">مدیر مالی و اداری</div>
          </div>
          <div>
            <div className="h-16"></div>
            <div className="font-semibold text-slate-700">مدیرعامل و عضو هیئت مدیره</div>
          </div>
        </div>
      </div>
    </div>
  );
}
