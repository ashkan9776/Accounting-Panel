'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Lock,
  Unlock,
  ArrowRight,
  ShieldCheck,
  Calendar,
  Layers,
  Sparkles,
  Play,
  RotateCcw,
  Check,
} from 'lucide-react';

interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  isReady: boolean;
}

export default function YearEndClosingPage() {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [fiscalYear, setFiscalYear] = useState('1403');
  const [closingDate, setClosingDate] = useState('1403/12/29');
  const [newFiscalYearTitle, setNewFiscalYearTitle] = useState('سال مالی ۱۴۰۴');
  const [newStart, setNewStart] = useState('1404/01/01');
  const [newEnd, setNewEnd] = useState('1404/12/29');

  // لاگ اسناد صادرشده
  const [profitLossVoucherId, setProfitLossVoucherId] = useState<string | null>(null);
  const [closingVoucherId, setClosingVoucherId] = useState<string | null>(null);
  const [openingVoucherId, setOpeningVoucherId] = useState<string | null>(null);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const checklist: ChecklistItem[] = [
    {
      id: 'c1',
      title: 'کنترل عدم وجود اسناد پیش‌نویس (DRAFT)',
      description: 'تمامی اسناد سال مالی بررسی شده و وضعیت همگی قطعی و تایید شده است.',
      isReady: true,
    },
    {
      id: 'c2',
      title: 'تراز ۱۰۰٪ دفاتر در تراز آزمایشی ۴ ستونی',
      description: 'مجموع گردش بدهکار و بستانکار دفاتر با هم کاملاً برابر است (مغایرت = ۰).',
      isReady: true,
    },
    {
      id: 'c3',
      title: 'محاسبه و صدور سند استهلاک دارایی‌های ثابت',
      description: 'سند استهلاک پایان سال طبق ماده ۱۴۹ ق.م.م صادر و در دفتر کل ثبت گردیده است.',
      isReady: true,
    },
    {
      id: 'c4',
      title: 'انبارگردانی پایان سال و ثبت کسری/اضافی',
      description: 'شمارش فیزیکی موجودی انبارها نهایی و سند تعدیلات انبار صادر شده است.',
      isReady: true,
    },
    {
      id: 'c5',
      title: 'ثبت قطعی هزینه‌های حقوق، عیدی و پاداش پرسنل',
      description: 'حقوق و دستمزد اسفندماه و ذخیره سنوات و عیدی پرسنل محاسبه و سند زده شده است.',
      isReady: true,
    },
  ];

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleCloseTemporary = () => {
    const vouId = `vou-pl-${Date.now().toString().slice(-4)}`;
    setProfitLossVoucherId(vouId);
    setCurrentStep(3);
    showToast(`سند بستن حساب‌های موقت (سود و زیان) با شماره ${vouId} صادر و سود خالص به سود انباشته منتقل گردید.`);
  };

  const handleClosePermanent = () => {
    const vouId = `vou-close-${Date.now().toString().slice(-4)}`;
    setClosingVoucherId(vouId);
    setCurrentStep(4);
    showToast(`سند اختتامیه با شماره ${vouId} صادر و سال مالی ۱۴۰۳ قفل و بسته شد.`);
  };

  const handleOpenNextYear = () => {
    const vouId = `vou-open-${Date.now().toString().slice(-4)}`;
    setOpeningVoucherId(vouId);
    showToast(`سال مالی ۱۴۰۴ ایجاد و سند افتتاحیه (سند شماره ۱) با شماره ${vouId} با موفقیت صادر گردید.`);
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 left-5 z-50 bg-emerald-700 text-white px-5 py-3 rounded-lg shadow-xl flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-emerald-200" />
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <Link href="/accounting/vouchers" className="hover:text-emerald-600 transition-colors">
              حسابداری دوبل و دفاتر
            </Link>
            <span>/</span>
            <span className="text-slate-800 font-semibold">بستن حساب‌های پایان سال</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2.5">
            <FileSpreadsheet className="w-7 h-7 text-emerald-600" />
            کارتابل بستن حساب‌های پایان سال مالی و افتتاح سال جدید
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            فرآیند گام‌به‌گام بستن حساب‌های موقت، انتقال سود/زیان به حساب انباشته، صدور سند اختتامیه و سند افتتاحیه سال جدید
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold border flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-500" />
            سال مالی جاری: <span className="font-mono text-emerald-700">{fiscalYear}</span>
          </div>
        </div>
      </div>

      {/* Steps Indicator */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div
            onClick={() => setCurrentStep(1)}
            className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center gap-3 ${
              currentStep === 1
                ? 'bg-emerald-50 border-emerald-400 ring-1 ring-emerald-300'
                : 'bg-slate-50 border-slate-200'
            }`}
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
              currentStep >= 1 ? 'bg-emerald-600 text-white' : 'bg-slate-300 text-slate-700'
            }`}>
              ۱
            </div>
            <div>
              <div className="text-xs font-bold text-slate-800">کنترل‌های قبل از بستن</div>
              <div className="text-[11px] text-slate-400">چک‌لیست تطابق دفاتر</div>
            </div>
          </div>

          <div
            onClick={() => setCurrentStep(2)}
            className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center gap-3 ${
              currentStep === 2
                ? 'bg-emerald-50 border-emerald-400 ring-1 ring-emerald-300'
                : 'bg-slate-50 border-slate-200'
            }`}
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
              currentStep >= 2 ? 'bg-emerald-600 text-white' : 'bg-slate-300 text-slate-700'
            }`}>
              ۲
            </div>
            <div>
              <div className="text-xs font-bold text-slate-800">بستن حساب‌های موقت</div>
              <div className="text-[11px] text-slate-400">سند سود و زیان (P&L)</div>
            </div>
          </div>

          <div
            onClick={() => setCurrentStep(3)}
            className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center gap-3 ${
              currentStep === 3
                ? 'bg-emerald-50 border-emerald-400 ring-1 ring-emerald-300'
                : 'bg-slate-50 border-slate-200'
            }`}
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
              currentStep >= 3 ? 'bg-emerald-600 text-white' : 'bg-slate-300 text-slate-700'
            }`}>
              ۳
            </div>
            <div>
              <div className="text-xs font-bold text-slate-800">صدور سند اختتامیه</div>
              <div className="text-[11px] text-slate-400">قفل سال مالی جاری</div>
            </div>
          </div>

          <div
            onClick={() => setCurrentStep(4)}
            className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center gap-3 ${
              currentStep === 4
                ? 'bg-emerald-50 border-emerald-400 ring-1 ring-emerald-300'
                : 'bg-slate-50 border-slate-200'
            }`}
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
              openingVoucherId ? 'bg-emerald-600 text-white' : 'bg-slate-300 text-slate-700'
            }`}>
              ۴
            </div>
            <div>
              <div className="text-xs font-bold text-slate-800">سند افتتاحیه سال جدید</div>
              <div className="text-[11px] text-slate-400">انتقال مانده‌ها به ۱۴۰۴</div>
            </div>
          </div>
        </div>
      </div>

      {/* Step Content */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        {/* Step 1: Pre-Closing Checklist */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                چک‌لیست کنترل‌های ضروری قبل از بستن حساب‌ها
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                برای جلوگیری از هرگونه مغایرت مالی، صحت موارد ذیل توسط سیستم به صورت خودکار بررسی شده است:
              </p>
            </div>

            <div className="space-y-3">
              {checklist.map((item) => (
                <div key={item.id} className="p-4 rounded-lg border border-slate-200 bg-slate-50/50 flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-xs text-slate-800">{item.title}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">{item.description}</div>
                  </div>
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                    تایید شده
                  </span>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-4 border-t">
              <button
                onClick={() => setCurrentStep(2)}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-5 py-2.5 rounded-lg transition-colors shadow-sm"
              >
                تایید چک‌لیست و رفتن به مرحله بستن حساب‌های موقت
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Temporary Accounts Closing */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-emerald-600" />
                مرحله دوم: بستن حساب‌های موقت (درآمدها و هزینه‌ها)
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                در این مرحله مانده حساب‌های گروه ۶ (درآمدها)، گروه ۷ (بهای تمام‌شده) و گروه ۸ (هزینه‌ها) صفر شده و مانده سود خالص دوره به حساب «سود و زیان انباشته سنواتی» منتقل می‌شود.
              </p>
            </div>

            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-3 text-xs">
              <div className="flex justify-between font-medium">
                <span>مجموع درآمدهای عملیاتی و غیرعملیاتی (بدهکار می‌شود):</span>
                <span className="font-mono font-bold text-slate-800">۳,۴۸۵,۰۰۰,۰۰۰ ریال</span>
              </div>
              <div className="flex justify-between font-medium">
                <span>مجموع هزینه‌ها و بهای تمام‌شده دوره (بستانکار می‌شود):</span>
                <span className="font-mono font-bold text-rose-600">۲,۸۸۷,۲۵۰,۰۰۰ ریال</span>
              </div>
              <div className="pt-2 border-t flex justify-between font-black text-sm text-emerald-800">
                <span>سود خالص منتقله به حساب سود و زیان انباشته (sub-5201):</span>
                <span className="font-mono">۵۹۷,۷۵۰,۰۰۰ ریال</span>
              </div>
            </div>

            {profitLossVoucherId ? (
              <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-lg text-xs text-emerald-900 flex items-center justify-between">
                <span>سند بستن حساب‌های موقت با شماره <strong>{profitLossVoucherId}</strong> با موفقیت در دفتر کل ثبت شد.</span>
                <button
                  onClick={() => setCurrentStep(3)}
                  className="bg-emerald-700 text-white px-3 py-1.5 rounded font-bold"
                >
                  رفتن به مرحله سند اختتامیه
                </button>
              </div>
            ) : (
              <div className="flex justify-end pt-4 border-t gap-2">
                <button
                  onClick={() => setCurrentStep(1)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  بازگشت
                </button>
                <button
                  onClick={handleCloseTemporary}
                  className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-5 py-2.5 rounded-lg transition-colors shadow-sm"
                >
                  <Play className="w-4 h-4" />
                  صدور سند بستن حساب‌های موقت (PROFIT_LOSS)
                </button>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Closing Permanent Accounts */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2 text-rose-700">
                <Lock className="w-5 h-5 text-rose-600" />
                مرحله سوم: صدور سند اختتامیه و قفل سال مالی {fiscalYear}
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                کلیه حساب‌های دارایی، بدهی و حقوق صاحبان سهام به حساب تراز اختتامیه بسته شده و سال مالی جاری به صورت دائمی قفل می‌شود.
              </p>
            </div>

            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 leading-relaxed">
              <strong>توجه:</strong> پس از صدور سند اختتامیه، سال مالی جاری به حالت قفل (Locked) درآمده و هیچ‌گونه سند یا تغییری در اسناد این سال مجاز نخواهد بود.
            </div>

            {closingVoucherId ? (
              <div className="p-4 bg-purple-50 border border-purple-300 rounded-lg text-xs text-purple-900 flex items-center justify-between">
                <span>سند اختتامیه با شماره <strong>{closingVoucherId}</strong> ثبت و سال مالی ۱۴۰۳ قفل گردید.</span>
                <button
                  onClick={() => setCurrentStep(4)}
                  className="bg-purple-700 text-white px-3 py-1.5 rounded font-bold"
                >
                  ایجاد سال مالی جدید و سند افتتاحیه
                </button>
              </div>
            ) : (
              <div className="flex justify-end pt-4 border-t gap-2">
                <button
                  onClick={() => setCurrentStep(2)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  بازگشت
                </button>
                <button
                  onClick={handleClosePermanent}
                  className="flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold px-5 py-2.5 rounded-lg transition-colors shadow-sm"
                >
                  <Lock className="w-4 h-4" />
                  صدور قطعی سند اختتامیه (CLOSING) و قفل سال مالی
                </button>
              </div>
            )}
          </div>
        )}

        {/* Step 4: Opening Next Fiscal Year */}
        {currentStep === 4 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2 text-emerald-700">
                <Sparkles className="w-5 h-5 text-emerald-600" />
                مرحله چهارم: ایجاد سال مالی جدید و صدور خودکار سند افتتاحیه
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                مانده‌های تراز اختتامیه به عنوان مانده اول دوره بانک‌ها، صندوق‌ها، کالا و طرف‌حساب‌ها به سال مالی جدید منتقل می‌شود.
              </p>
            </div>

            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">عنوان سال مالی جدید</label>
                <input
                  type="text"
                  value={newFiscalYearTitle}
                  onChange={(e) => setNewFiscalYearTitle(e.target.value)}
                  className="w-full text-xs p-2.5 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">تاریخ شروع (سند افتتاحیه)</label>
                <input
                  type="text"
                  value={newStart}
                  onChange={(e) => setNewStart(e.target.value)}
                  className="w-full text-xs p-2.5 border rounded-lg font-mono focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">تاریخ پایان</label>
                <input
                  type="text"
                  value={newEnd}
                  onChange={(e) => setNewEnd(e.target.value)}
                  className="w-full text-xs p-2.5 border rounded-lg font-mono focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
            </div>

            {openingVoucherId ? (
              <div className="p-6 bg-emerald-50 border border-emerald-300 rounded-xl text-center space-y-3">
                <div className="w-12 h-12 bg-emerald-600 text-white rounded-full flex items-center justify-center mx-auto">
                  <Check className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-emerald-950">
                  عملیات بستن سال مالی با موفقیت ۱۰۰٪ پایان یافت!
                </h3>
                <p className="text-xs text-emerald-800 max-w-lg mx-auto">
                  سال مالی ۱۴۰۴ آغاز گردید و سند افتتاحیه با شناسه <strong>{openingVoucherId}</strong> به عنوان سند شماره ۱ در سال جدید به دفاتر منتقل شد.
                </p>
                <div className="pt-2">
                  <Link
                    href="/accounting/vouchers"
                    className="inline-flex items-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors"
                  >
                    مشاهده دفاتر و اسناد حسابداری
                  </Link>
                </div>
              </div>
            ) : (
              <div className="flex justify-end pt-4 border-t gap-2">
                <button
                  onClick={handleOpenNextYear}
                  className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-5 py-2.5 rounded-lg transition-colors shadow-sm"
                >
                  <Sparkles className="w-4 h-4" />
                  افتتاح سال مالی جدید و صدور سند افتتاحیه (OPENING)
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
