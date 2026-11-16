'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Utensils,
  Store,
  Factory,
  Briefcase,
  HardHat,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Building2,
  AlertCircle,
} from 'lucide-react';
import Link from 'next/link';
import { fetchApi } from '../../lib/api';

const INDUSTRIES = [
  {
    id: 'RESTAURANT',
    title: 'رستوران، فست‌فود و کافه',
    desc: 'کدینگ مواد اولیه، ضایعات، منوی غذا، انبار آشپزخانه و اتصال KDS',
    icon: Utensils,
    badge: 'صنف پیشنهادی',
  },
  {
    id: 'COMMERCIAL',
    title: 'فروشگاه عمومی و بازرگانی',
    desc: 'کدینگ خرید و فروش کالا، سود ناویژه، تخفیفات نقدی، کاردکس میانگین موزون',
    icon: Store,
  },
  {
    id: 'MANUFACTURING',
    title: 'تولیدی و کارگاهی',
    desc: 'سربار جذب شده، دستمزد مستقیم، بهای تمام شده کالای ساخته شده (BOM)',
    icon: Factory,
  },
  {
    id: 'SERVICE',
    title: 'خدماتی، کلینیک و آرایشگاه',
    desc: 'درآمد خدمات، پکیج‌ها، دستمزد کارشناسان و پرسنل',
    icon: Briefcase,
  },
  {
    id: 'CONTRACTING',
    title: 'پیمانکاری و ساختمانی',
    desc: 'حساب‌های پیمان، صورت‌وضعیت‌ها، سپرده حسن انجام کار و بیمه پروژه',
    icon: HardHat,
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // فرم اطلاعات
  const [industry, setIndustry] = useState('RESTAURANT');
  const [orgName, setOrgName] = useState('رستوران و کترینگ ترنج');
  const [storeName, setStoreName] = useState('شعبه ونک');
  const [nationalId, setNationalId] = useState('10103456789'); // ۱۱ رقمی معتبر شرکتی
  const [economicCode, setEconomicCode] = useState('411122223333');
  const [currency, setCurrency] = useState<'IRR' | 'IRT'>('IRR');
  const [adminFullName, setAdminFullName] = useState('مدیر رستوران ترنج');
  const [adminMobile, setAdminMobile] = useState('09121112233');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);

  const handleSubmit = async () => {
    setError(null);
    setLoading(true);

    try {
      const payload = {
        organizationName: orgName.trim(),
        storeName: storeName.trim(),
        nationalId: nationalId.trim(),
        economicCode: economicCode.trim(),
        industry,
        defaultCurrency: currency,
        initialFiscalYearTitle: 'سال مالی ۱۴۰۳',
        fiscalYearStartDate: '1403/01/01',
        fiscalYearEndDate: '1403/12/29',
        adminFullName: adminFullName.trim(),
        adminMobile: adminMobile.trim(),
      };

      const res = await fetchApi('/saas/onboarding', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (res.data) {
        setResult(res.data);
        if (res.data.accessToken) {
          localStorage.setItem('access_token', res.data.accessToken);
        }
        if (res.data.user) {
          localStorage.setItem('user', JSON.stringify(res.data.user));
        }
        localStorage.setItem('tenant_id', res.data.organizationId);
        if (res.data.companyId) {
          localStorage.setItem('company_id', res.data.companyId);
        }
        localStorage.setItem('company_name', orgName);
        localStorage.setItem('active_preset', industry);
        setStep(3);
      } else {
        setError(res.message || 'خطا در ایجاد سازمان.');
      }
    } catch (err: any) {
      setError(err.message || 'خطا در برقراری ارتباط با سرویس Onboarding.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 py-10 px-4 flex flex-col justify-center items-center">
      <div className="w-full max-w-2xl bg-slate-800/90 border border-slate-700 rounded-3xl p-6 sm:p-10 shadow-2xl backdrop-blur-md">
        {/* نوار پیشرفت */}
        <div className="flex items-center justify-between border-b border-slate-700/80 pb-5 mb-8">
          <div>
            <h1 className="text-xl font-black text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-400" />
              <span>راه‌اندازی صنف و سازمان جدید</span>
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              ساخت خودکار کدینگ حساب‌ها، انبار پیش‌فرض و دوره‌های مالی بر اساس صنف کاری
            </p>
          </div>
          <div className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20">
            مرحله {step} از ۳
          </div>
        </div>

        {error && (
          <div className="mb-6 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* مرحله ۱: انتخاب صنف کاری */}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-slate-200 mb-2">
              ۱. صنف یا الگوی کاری کسب‌وکار خود را انتخاب کنید:
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {INDUSTRIES.map((ind) => {
                const isSelected = industry === ind.id;
                return (
                  <button
                    key={ind.id}
                    type="button"
                    onClick={() => setIndustry(ind.id)}
                    className={`text-right p-4 rounded-2xl border transition-all relative ${
                      isSelected
                        ? 'bg-emerald-600/15 border-emerald-500 ring-2 ring-emerald-500/40 text-white'
                        : 'bg-slate-900/60 border-slate-700/80 text-slate-300 hover:border-slate-600'
                    }`}
                  >
                    {ind.badge && (
                      <span className="absolute top-3 left-3 text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                        {ind.badge}
                      </span>
                    )}
                    <div className="flex items-center gap-3 mb-2">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                          isSelected ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        <ind.icon className="w-5 h-5" />
                      </div>
                      <span className="font-bold text-sm">{ind.title}</span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">{ind.desc}</p>
                  </button>
                );
              })}
            </div>

            <div className="pt-6 flex justify-between items-center border-t border-slate-700/80 mt-6">
              <Link
                href="/auth/login"
                className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1"
              >
                <ArrowRight className="w-3.5 h-3.5" />
                <span>بازگشت به ورود</span>
              </Link>
              <button
                type="button"
                onClick={() => setStep(2)}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 px-6 rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-emerald-900/40"
              >
                <span>مرحله بعد: اطلاعات شرکت</span>
                <ArrowLeft className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* مرحله ۲: اطلاعات پایه سازمان و ثبت نهایی */}
        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-slate-200 mb-2">
              ۲. مشخصات هویتی و ثبتی شرکت را وارد کنید:
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  نام قانونی شرکت یا سازمان *
                </label>
                <input
                  type="text"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-slate-100 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  نام فروشگاه یا برند تجاری
                </label>
                <input
                  type="text"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-slate-100 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  شناسه ملی (۱۰ یا ۱۱ رقم) *
                </label>
                <input
                  type="text"
                  dir="ltr"
                  value={nationalId}
                  onChange={(e) => setNationalId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-slate-100 rounded-xl px-3 py-2 text-xs font-mono text-left focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  کد اقتصادی (اختیاری)
                </label>
                <input
                  type="text"
                  dir="ltr"
                  value={economicCode}
                  onChange={(e) => setEconomicCode(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-slate-100 rounded-xl px-3 py-2 text-xs font-mono text-left focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  نام کامل مدیر سیستم *
                </label>
                <input
                  type="text"
                  value={adminFullName}
                  onChange={(e) => setAdminFullName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-slate-100 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  موبایل مدیر ارشد *
                </label>
                <input
                  type="text"
                  dir="ltr"
                  value={adminMobile}
                  onChange={(e) => setAdminMobile(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-slate-100 rounded-xl px-3 py-2 text-xs font-mono text-left focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="pt-6 flex justify-between items-center border-t border-slate-700/80 mt-6">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1"
              >
                <ArrowRight className="w-3.5 h-3.5" />
                <span>مرحله قبل</span>
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={handleSubmit}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 px-6 rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-emerald-900/40 disabled:opacity-50"
              >
                {loading ? (
                  <span>در حال پیکربندی و راه‌اندازی...</span>
                ) : (
                  <>
                    <span>راه‌اندازی کامل سازمان و کدینگ</span>
                    <CheckCircle2 className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* مرحله ۳: پایان و گزارش راه‌اندازی */}
        {step === 3 && result && (
          <div className="text-center py-4 space-y-5">
            <div className="w-16 h-16 rounded-3xl bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center border border-emerald-500/30">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <h2 className="text-lg font-black text-white">سازمان با موفقیت راه‌اندازی شد!</h2>
              <p className="text-xs text-slate-400 mt-1">
                کدینگ حساب‌ها، انبار پیش‌فرض و تقویم مالیاتی با موفقیت پیکربندی شدند.
              </p>
            </div>

            {/* کارت خلاصه مشخصات */}
            <div className="bg-slate-900/80 border border-slate-700/80 rounded-2xl p-4 text-xs space-y-2 text-right">
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">شناسه تنانت:</span>
                <span className="font-mono text-emerald-400">{result.organizationId}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">تعداد حساب‌های اولیه‌ی تولیدشده:</span>
                <span className="font-bold text-white">{result.initialAccountsCount} حساب</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">طرح اشتراک تخصیص‌یافته:</span>
                <span className="text-emerald-300 font-bold">{result.assignedPlanId}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">انبار پیش‌فرض ایجادشده:</span>
                <span className="font-mono text-slate-300">{result.defaultWarehouseId}</span>
              </div>
            </div>

            {/* کارت مشخصات ورود */}
            <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-2xl p-4 text-xs space-y-2 text-right">
              <div className="text-emerald-300 font-bold mb-1 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>اطلاعات ورود مدیر ارشد به سامانه:</span>
              </div>
              <div className="flex justify-between py-1 border-b border-emerald-800/40">
                <span className="text-slate-300">شماره موبایل:</span>
                <span className="font-mono text-emerald-400 font-bold">{adminMobile}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-300">کلمه عبور اختصاص‌یافته:</span>
                <span className="font-mono text-amber-300 font-bold">Admin@2026!Sec</span>
              </div>
            </div>

            <div className="pt-4">
              <button
                type="button"
                onClick={() => router.push('/dashboard')}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-6 rounded-xl text-sm flex items-center justify-center gap-2 shadow-xl shadow-emerald-900/50"
              >
                <span>ورود به داشبورد حسابداری</span>
                <ArrowLeft className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
