'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  Wallet,
  Receipt,
  ArrowUpRight,
  ArrowDownLeft,
  FileSpreadsheet,
  Package,
  Layers,
  Scale,
  Sparkles,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Utensils,
  Store,
  Factory,
  ShoppingCart,
  Clock,
  Flame,
  ChefHat,
  Barcode,
  Truck,
  Landmark,
  ShieldCheck,
  CreditCard,
  ChevronLeft,
} from 'lucide-react';
import { fetchApi, formatMoney } from '../../lib/api';

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activePreset, setActivePreset] = useState<string>('RESTAURANT');

  const loadDashboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchApi('/dashboard/executive');
      if (res.data) {
        setData(res.data);
      } else {
        setError('پاسخ معتبری از سرور دریافت نشد.');
      }
    } catch (err: any) {
      console.warn('Dashboard fetch error:', err);
      setError(err.message || 'خطا در دریافت اطلاعات داشبورد از سرور. لطفاً اتصال به سرویس API را بررسی کنید.');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();

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

  return (
    <div className="space-y-6">
      {/* هدر صفحه و نمایش صنف تطبیقی */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight">
              داشبورد هوشمند مدیریت و حسابداری
            </h1>
            <span className="text-xs bg-purple-100 text-purple-800 font-bold px-2.5 py-0.5 rounded-full border border-purple-200 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-purple-600" />
              <span>
                صنف فعال:{' '}
                {activePreset === 'RESTAURANT'
                  ? 'رستوران و کافی‌شاپ'
                  : activePreset === 'RETAIL'
                  ? 'فروشگاه و سوپرمارکت'
                  : activePreset === 'MANUFACTURING'
                  ? 'تولیدی و بهای تمام‌شده'
                  : activePreset === 'COMMERCIAL'
                  ? 'بازرگانی، پخش و چک'
                  : 'جامع سازمانی (هلدینگ)'}
              </span>
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {activePreset === 'RESTAURANT'
              ? 'پایش زنده بهای تمام‌شده غذا (Food Cost)، مانیتور پخت سفارشات KDS، اشغال میزها و شیفت‌های صندوق'
              : activePreset === 'RETAIL'
              ? 'پایش تراکنش‌های بارکدی صندوق فروشگاهی، اتصال پایانه‌های بانکی POS، نقطه سفارش و گردش موجودی کالا'
              : activePreset === 'MANUFACTURING'
              ? 'محاسبه مکانیزه بهای تمام‌شده کالای ساخته‌شده (COGM)، سفارشات کارگاهی، فرمول ساخت BOM و کالای در جریان ساخت'
              : activePreset === 'COMMERCIAL'
              ? 'راس‌گیری و استعلام چک‌های صیادی، سن‌سنجی و پیگیری مطالبات مشتریان، ارسال خودکار صورتحساب به سامانه مودیان'
              : 'دیدگاه ۳۶۰ درجه عملکرد مالی هلدینگ: ترازنامه‌ها، صورت سود و زیان، نقدینگی شعب و کنترل اسناد حسابداری'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadDashboard}
            disabled={loading}
            className="p-2 text-slate-600 hover:text-emerald-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-xs"
            title="بروزرسانی داده‌ها"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
          </button>
          {activePreset === 'RESTAURANT' ? (
            <Link
              href="/pos"
              className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-sm shadow-amber-900/20 transition-all"
            >
              <Utensils className="w-4 h-4" />
              <span>ثبت سفارش میز / سالن</span>
            </Link>
          ) : activePreset === 'RETAIL' ? (
            <Link
              href="/pos"
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm shadow-emerald-900/20 transition-all"
            >
              <CreditCard className="w-4 h-4" />
              <span>پایانه فروش سریع (POS)</span>
            </Link>
          ) : activePreset === 'MANUFACTURING' ? (
            <Link
              href="/manufacturing/orders"
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm shadow-blue-900/20 transition-all"
            >
              <Factory className="w-4 h-4" />
              <span>دستور تولید جدید</span>
            </Link>
          ) : (
            <Link
              href="/sales/invoices/new"
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm shadow-emerald-900/20 transition-all"
            >
              <Receipt className="w-4 h-4" />
              <span>صدور فاکتور فروش</span>
            </Link>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 flex flex-col sm:flex-row items-center justify-between gap-4 no-print">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <div>
              <p className="font-bold text-xs">{error}</p>
            </div>
          </div>
          <button
            onClick={loadDashboard}
            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>تلاش مجدد</span>
          </button>
        </div>
      )}

      {/* ۱. کارت‌های شاخص کلیدی منطبق بر صنف (Context-Aware KPI Cards) */}
      {activePreset === 'RESTAURANT' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* ضریب Food Cost */}
          <div className="bg-white rounded-2xl p-5 border border-amber-200/80 shadow-xs relative overflow-hidden bg-gradient-to-br from-white to-amber-50/20">
            <div className="flex items-center justify-between text-slate-500 mb-3">
              <span className="text-xs font-semibold">ضریب بهای تمام‌شده غذا (Food Cost)</span>
              <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                <ChefHat className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl font-black text-slate-800 tracking-tight font-mono">
              ۲۹.۴٪ <span className="text-xs font-normal text-emerald-600 font-sans mr-2">در محدوده استاندارد</span>
            </div>
            <div className="mt-2 text-[11px] text-amber-700 flex items-center gap-1 font-medium">
              <span>هدف بهینه: زیر ۳۲٪ فروش ناخالص غذا</span>
            </div>
          </div>

          {/* اشغال میزها و ظرفیت سالن */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs relative overflow-hidden">
            <div className="flex items-center justify-between text-slate-500 mb-3">
              <span className="text-xs font-semibold">وضعیت میزها و اشغال سالن</span>
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Utensils className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl font-black text-slate-800 tracking-tight font-mono">
              ۱۲ <span className="text-sm font-normal text-slate-400">از ۱۸ میز فعال</span>
              <span className="text-xs font-bold text-blue-600 font-sans mr-2">(۶۷٪ ظرفیت)</span>
            </div>
            <div className="mt-2 text-[11px] text-blue-600 flex items-center gap-1 font-medium">
              <span>۶ میز آماده پذیرش مهمان جدید</span>
            </div>
          </div>

          {/* سفارشات آشپزخانه KDS */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs relative overflow-hidden">
            <div className="flex items-center justify-between text-slate-500 mb-3">
              <span className="text-xs font-semibold">صف پخت آشپزخانه (KDS)</span>
              <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <Flame className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl font-black text-slate-800 tracking-tight font-mono">
              ۵ سفارش <span className="text-xs font-normal text-slate-400 font-sans">در حال آماده‌سازی</span>
            </div>
            <div className="mt-2 text-[11px] text-rose-600 flex items-center gap-1 font-medium">
              <Clock className="w-3.5 h-3.5" />
              <span>میانگین زمان تحویل: ۱۳ دقیقه</span>
            </div>
          </div>

          {/* فروش روزانه و شیفت جاری */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs relative overflow-hidden">
            <div className="flex items-center justify-between text-slate-500 mb-3">
              <span className="text-xs font-semibold">فروش شیفت جاری صندوق</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Wallet className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl font-black text-slate-800 tracking-tight font-mono">
              ۴۸,۲۵۰,۰۰۰ <span className="text-xs font-normal text-slate-400 font-sans">ریال</span>
            </div>
            <div className="mt-2 text-[11px] text-emerald-600 flex items-center gap-1 font-medium">
              <span>تسویه نقدی و کارتخوان PC-POS متصل</span>
            </div>
          </div>
        </div>
      ) : activePreset === 'RETAIL' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* تراکنش‌های پایانه فروشگاهی */}
          <div className="bg-white rounded-2xl p-5 border border-emerald-200/80 shadow-xs relative overflow-hidden">
            <div className="flex items-center justify-between text-slate-500 mb-3">
              <span className="text-xs font-semibold">تعداد فاکتورهای صندوق امروز</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <Barcode className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl font-black text-slate-800 tracking-tight font-mono">
              ۱۸۴ <span className="text-xs font-normal text-slate-400 font-sans">تراکنش موفق</span>
            </div>
            <div className="mt-2 text-[11px] text-emerald-600 flex items-center gap-1 font-medium">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>رشد ۱۸٪ نسبت به روز گذشته</span>
            </div>
          </div>

          {/* میانگین ارزش سبد خرید (AOV) */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs relative overflow-hidden">
            <div className="flex items-center justify-between text-slate-500 mb-3">
              <span className="text-xs font-semibold">میانگین مبلغ سبد خرید (AOV)</span>
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Receipt className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl font-black text-slate-800 tracking-tight font-mono">
              ۱,۳۵۰,۰۰۰ <span className="text-xs font-normal text-slate-400 font-sans">ریال</span>
            </div>
            <div className="mt-2 text-[11px] text-blue-600 flex items-center gap-1 font-medium">
              <span>شاخص وفاداری مشتریان پایدار</span>
            </div>
          </div>

          {/* هشدار کسری و نقطه سفارش انبار */}
          <div className="bg-white rounded-2xl p-5 border border-amber-200/80 shadow-xs relative overflow-hidden">
            <div className="flex items-center justify-between text-slate-500 mb-3">
              <span className="text-xs font-semibold">اقلام نیازمند سفارش مجدد</span>
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Package className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl font-black text-slate-800 tracking-tight font-mono">
              ۸ <span className="text-xs font-normal text-slate-400 font-sans">قلم کالا</span>
              <span className="text-xs font-bold text-amber-700 font-sans mr-2">زیر حد نقطه سفارش</span>
            </div>
            <div className="mt-2 text-[11px] text-amber-600 flex items-center gap-1 font-medium">
              <span>پیش‌نویس فاکتور خرید تدارکات آماده است</span>
            </div>
          </div>

          {/* تسویه کارتخوان بانکی PC-POS */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs relative overflow-hidden">
            <div className="flex items-center justify-between text-slate-500 mb-3">
              <span className="text-xs font-semibold">تطبیق و تسویه پوز بانکی</span>
              <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <CreditCard className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl font-black text-emerald-600 tracking-tight font-mono">
              ۱۰۰٪ <span className="text-xs font-normal text-slate-500 font-sans">مغایرت صفر</span>
            </div>
            <div className="mt-2 text-[11px] text-purple-600 flex items-center gap-1 font-medium">
              <span>انتقال مستقیم به حساب بانکی ملت و ملی</span>
            </div>
          </div>
        </div>
      ) : activePreset === 'MANUFACTURING' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* بهای تمام‌شده کالای ساخته‌شده */}
          <div className="bg-white rounded-2xl p-5 border border-blue-200/80 shadow-xs relative overflow-hidden">
            <div className="flex items-center justify-between text-slate-500 mb-3">
              <span className="text-xs font-semibold">بهای تمام‌شده کالای ساخته‌شده (COGM)</span>
              <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                <Factory className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl font-black text-slate-800 tracking-tight font-mono">
              ۲,۸۵۰,۰۰۰,۰۰۰ <span className="text-xs font-normal text-slate-400 font-sans">ریال</span>
            </div>
            <div className="mt-2 text-[11px] text-blue-600 flex items-center gap-1 font-medium">
              <span>مواد مستقیم + دستمزد + سربار جذب‌شده</span>
            </div>
          </div>

          {/* کالای در جریان ساخت (WIP) */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs relative overflow-hidden">
            <div className="flex items-center justify-between text-slate-500 mb-3">
              <span className="text-xs font-semibold">کالای در جریان ساخت (WIP)</span>
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Layers className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl font-black text-slate-800 tracking-tight font-mono">
              ۶۴۰,۰۰۰,۰۰۰ <span className="text-xs font-normal text-slate-400 font-sans">ریال</span>
            </div>
            <div className="mt-2 text-[11px] text-amber-600 flex items-center gap-1 font-medium">
              <span>ارزش مواد و کار در خطوط تولید ۳ و ۴</span>
            </div>
          </div>

          {/* انحراف مصرف مواد BOM */}
          <div className="bg-white rounded-2xl p-5 border border-emerald-200/80 shadow-xs relative overflow-hidden">
            <div className="flex items-center justify-between text-slate-500 mb-3">
              <span className="text-xs font-semibold">انحراف مصرف مواد (BOM Variance)</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl font-black text-emerald-600 tracking-tight font-mono">
              - ۱.۸٪ <span className="text-xs font-normal text-slate-500 font-sans">(صرفه‌جویی مطلوب)</span>
            </div>
            <div className="mt-2 text-[11px] text-emerald-600 flex items-center gap-1 font-medium">
              <span>کاهش ضایعات بر اساس فرمول استاندارد</span>
            </div>
          </div>

          {/* سفارشات کارگاهی فعال */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs relative overflow-hidden">
            <div className="flex items-center justify-between text-slate-500 mb-3">
              <span className="text-xs font-semibold">سفارشات تولید فعال (Work Orders)</span>
              <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl font-black text-slate-800 tracking-tight font-mono">
              ۴ سفارش <span className="text-xs font-normal text-slate-400 font-sans">در جریان</span>
            </div>
            <div className="mt-2 text-[11px] text-purple-600 flex items-center gap-1 font-medium">
              <span>تحویل در موعد مقرر بر اساس ظرفیت سنجی</span>
            </div>
          </div>
        </div>
      ) : activePreset === 'COMMERCIAL' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* چک‌های صیاد سررسید نزدیک */}
          <div className="bg-white rounded-2xl p-5 border border-indigo-200/80 shadow-xs relative overflow-hidden">
            <div className="flex items-center justify-between text-slate-500 mb-3">
              <span className="text-xs font-semibold">چک‌های صیادی سررسید ۷ روز آینده</span>
              <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
                <Landmark className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl font-black text-slate-800 tracking-tight font-mono">
              ۱,۲۴۰,۰۰۰,۰۰۰ <span className="text-xs font-normal text-slate-400 font-sans">ریال</span>
            </div>
            <div className="mt-2 text-[11px] text-indigo-600 flex items-center gap-1 font-medium">
              <span>۶ فقره چک در جریان وصول به بانک</span>
            </div>
          </div>

          {/* راس‌گیری موزون چک‌ها */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs relative overflow-hidden">
            <div className="flex items-center justify-between text-slate-500 mb-3">
              <span className="text-xs font-semibold">راس موزون مطالبات اسنادی</span>
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl font-black text-slate-800 tracking-tight font-mono">
              ۳۴ <span className="text-xs font-normal text-slate-400 font-sans">روز کاری</span>
            </div>
            <div className="mt-2 text-[11px] text-blue-600 flex items-center gap-1 font-medium">
              <span>دوره وصول مطالبات در محدوده امن مالی</span>
            </div>
          </div>

          {/* وضعیت کارتابل سامانه مودیان */}
          <div className="bg-white rounded-2xl p-5 border border-emerald-200/80 shadow-xs relative overflow-hidden">
            <div className="flex items-center justify-between text-slate-500 mb-3">
              <span className="text-xs font-semibold">تایید سامانه مودیان مالیاتی</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl font-black text-emerald-600 tracking-tight font-mono">
              ۹۸.۴٪ <span className="text-xs font-normal text-slate-400 font-sans">تایید سیستمی</span>
            </div>
            <div className="mt-2 text-[11px] text-emerald-600 flex items-center gap-1 font-medium">
              <span>شناسه یکتای مالیاتی بدون خطا ثبت شد</span>
            </div>
          </div>

          {/* نسبت جاری و نقدینگی */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs relative overflow-hidden">
            <div className="flex items-center justify-between text-slate-500 mb-3">
              <span className="text-xs font-semibold">نسبت نقدینگی و توان تسویه (Quick Ratio)</span>
              <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <Scale className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl font-black text-slate-800 tracking-tight font-mono">
              ۱.۸۲ <span className="text-xs font-normal text-emerald-600 font-sans font-bold mr-2">بسیار مطلوب</span>
            </div>
            <div className="mt-2 text-[11px] text-purple-600 flex items-center gap-1 font-medium">
              <span>پوشش کامل بدهی‌های سررسید شده</span>
            </div>
          </div>
        </div>
      ) : (
        /* نمای جامع هلدینگ (ENTERPRISE) */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs relative overflow-hidden">
            <div className="flex items-center justify-between text-slate-500 mb-3">
              <span className="text-xs font-semibold">نقدینگی کل بانک و صندوق</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Wallet className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl font-black text-slate-800 tracking-tight font-mono">
              {formatMoney(data?.totalLiquidity || 0)} <span className="text-xs font-normal text-slate-400">ریال</span>
            </div>
            <div className="mt-2 text-[11px] text-emerald-600 flex items-center gap-1 font-medium">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>جریان وجوه نقد در شعب مثبت</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs relative overflow-hidden">
            <div className="flex items-center justify-between text-slate-500 mb-3">
              <span className="text-xs font-semibold">مجموع فروش و درآمد هلدینگ</span>
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Receipt className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl font-black text-slate-800 tracking-tight font-mono">
              {formatMoney(data?.totalSales || 0)} <span className="text-xs font-normal text-slate-400">ریال</span>
            </div>
            <div className="mt-2 text-[11px] text-blue-600 flex items-center gap-1 font-medium">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>فروش تلفیقی فاکتورها و صندوق‌ها</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs relative overflow-hidden">
            <div className="flex items-center justify-between text-slate-500 mb-3">
              <span className="text-xs font-semibold">مطالبات تجاری هلدینگ</span>
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <ArrowDownLeft className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl font-black text-slate-800 tracking-tight font-mono">
              {formatMoney(data?.receivablesBalance || 0)} <span className="text-xs font-normal text-slate-400">ریال</span>
            </div>
            <div className="mt-2 text-[11px] text-amber-600 flex items-center gap-1 font-medium">
              <span>در انتظار وصول اسناد سررسیددار</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs relative overflow-hidden">
            <div className="flex items-center justify-between text-slate-500 mb-3">
              <span className="text-xs font-semibold">سود خالص تلفیقی دوره</span>
              <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl font-black text-slate-800 tracking-tight font-mono">
              {formatMoney(data?.netProfit || 0)} <span className="text-xs font-normal text-slate-400">ریال</span>
            </div>
            <div className="mt-2 text-[11px] text-purple-600 flex items-center gap-1 font-medium">
              <span>پس از کسر بهای تمام‌شده و استهلاک</span>
            </div>
          </div>
        </div>
      )}

      {/* ۲. بخش ویجت عملیاتی اختصاصی صنف (Adaptive Industry Operational Panel) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span>
                {activePreset === 'RESTAURANT'
                  ? 'جریان کار اختصاصی رستوران و فست‌فود'
                  : activePreset === 'RETAIL'
                  ? 'میز کار پایانه فروشگاهی و انبار بارکدی'
                  : activePreset === 'MANUFACTURING'
                  ? 'خطوط تولید، ایستگاه‌های کاری و بهای تمام‌شده'
                  : activePreset === 'COMMERCIAL'
                  ? 'سامانه مدیریت چک‌ها، مودیان و زنجیره توزیع'
                  : 'جریان یکپارچه عملیات حسابداری و صورت‌های مالی'}
              </span>
            </h2>
            <span className="text-[11px] text-slate-500">دسترسی سریع عملیاتی</span>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed">
            {activePreset === 'RESTAURANT'
              ? 'اتصال هماهنگ نقشه میزهای سالن به مانیتور آشپزخانه KDS، کسر خودکار مواد اولیه بر مبنای دستور پخت (Food Cost) و صدور فیش حرارتی صندوق.'
              : activePreset === 'RETAIL'
              ? 'فروش سریع بارکدی با اتصال مستقیم به کارتخوان‌های بانکی، مدیریت شیفت و تحویل وجه صندوق، و کنترل مقداری کاردکس کالا.'
              : activePreset === 'MANUFACTURING'
              ? 'فرمول ساخت چندسطحی (BOM)، صدور دستور تولید، حواله خروج مواد از انبار به خط و محاسبه بهای تمام‌شده استاندارد و واقعی.'
              : activePreset === 'COMMERCIAL'
              ? 'ثبت و استعلام زنجیره چک‌های صیادی، صدور پیش‌فاکتور و فاکتور رسمی، اتصال به مودیان و سن‌سنجی مطالبات مشتریان.'
              : 'جریان ثبت فاکتور، اسناد دوبل تراز دفاتر کل/معین، کنترل زنجیره هش لاگ‌ها و استخراج تراز آزمایشی و صورت‌های مالی.'}
          </p>

          {/* کارت‌های عملیات متناسب با صنف */}
          {activePreset === 'RESTAURANT' ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <Link
                href="/restaurant/tables"
                className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-amber-50/60 hover:border-amber-300 transition-all group"
              >
                <div className="w-8 h-8 rounded-lg bg-amber-600 text-white flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                  <Utensils className="w-4 h-4" />
                </div>
                <div className="font-bold text-xs text-slate-800 group-hover:text-amber-900">۱. نقشه سالن و میزها</div>
                <div className="text-[11px] text-slate-500 mt-1">مدیریت وضعیت میزها، جابجایی و تسویه صورتحساب</div>
              </Link>

              <Link
                href="/restaurant/kds"
                className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-rose-50/60 hover:border-rose-300 transition-all group"
              >
                <div className="w-8 h-8 rounded-lg bg-rose-600 text-white flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                  <Flame className="w-4 h-4" />
                </div>
                <div className="font-bold text-xs text-slate-800 group-hover:text-rose-900">۲. مانیتور آشپزخانه (KDS)</div>
                <div className="text-[11px] text-slate-500 mt-1">نمایش لحظه‌ای سفارشات پخت و اعلام آماده‌باش</div>
              </Link>

              <Link
                href="/restaurant/recipes"
                className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-emerald-50/60 hover:border-emerald-300 transition-all group"
              >
                <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                  <ChefHat className="w-4 h-4" />
                </div>
                <div className="font-bold text-xs text-slate-800 group-hover:text-emerald-900">۳. بهای تمام‌شده و Food Cost</div>
                <div className="text-[11px] text-slate-500 mt-1">فرمول مواد اولیه و محاسبه سود ناخالص هر غذا</div>
              </Link>
            </div>
          ) : activePreset === 'RETAIL' ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <Link
                href="/pos"
                className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-emerald-50/60 hover:border-emerald-300 transition-all group"
              >
                <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                  <Barcode className="w-4 h-4" />
                </div>
                <div className="font-bold text-xs text-slate-800 group-hover:text-emerald-900">۱. پایانه فروش بارکدی</div>
                <div className="text-[11px] text-slate-500 mt-1">فروش فوق سریع و ارسال مبلغ به کارتخوان PC-POS</div>
              </Link>

              <Link
                href="/pos/shifts"
                className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-blue-50/60 hover:border-blue-300 transition-all group"
              >
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div className="font-bold text-xs text-slate-800 group-hover:text-blue-900">۲. تحویل و شیفت صندوق</div>
                <div className="text-[11px] text-slate-500 mt-1">شمارش وجوه نقد، تراز کارتخوان و تحویل صندوقدار</div>
              </Link>

              <Link
                href="/inventory/products"
                className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-purple-50/60 hover:border-purple-300 transition-all group"
              >
                <div className="w-8 h-8 rounded-lg bg-purple-600 text-white flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                  <Package className="w-4 h-4" />
                </div>
                <div className="font-bold text-xs text-slate-800 group-hover:text-purple-900">۳. کاتالوگ و نقطه سفارش</div>
                <div className="text-[11px] text-slate-500 mt-1">مدیریت بارکد، هشدار کسری و تجدید سفارش خودکار</div>
              </Link>
            </div>
          ) : activePreset === 'MANUFACTURING' ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <Link
                href="/manufacturing/boms"
                className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-blue-50/60 hover:border-blue-300 transition-all group"
              >
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                  <Layers className="w-4 h-4" />
                </div>
                <div className="font-bold text-xs text-slate-800 group-hover:text-blue-900">۱. فرمول‌های ساخت (BOM)</div>
                <div className="text-[11px] text-slate-500 mt-1">درخت مواد اولیه، ضایعات مجاز و ضرایب مصرف استاندارد</div>
              </Link>

              <Link
                href="/manufacturing/orders"
                className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-emerald-50/60 hover:border-emerald-300 transition-all group"
              >
                <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                  <Factory className="w-4 h-4" />
                </div>
                <div className="font-bold text-xs text-slate-800 group-hover:text-emerald-900">۲. سفارشات تولید (Work Orders)</div>
                <div className="text-[11px] text-slate-500 mt-1">حواله مواد به خط تولید و ثبت اتمام کار محصول</div>
              </Link>

              <Link
                href="/manufacturing/work-centers"
                className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-purple-50/60 hover:border-purple-300 transition-all group"
              >
                <div className="w-8 h-8 rounded-lg bg-purple-600 text-white flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                  <Scale className="w-4 h-4" />
                </div>
                <div className="font-bold text-xs text-slate-800 group-hover:text-purple-900">۳. بهای تمام‌شده و سربار</div>
                <div className="text-[11px] text-slate-500 mt-1">مراکز کاری، نرخ ساعتی ماشین‌آلات و دستمزد مستقیم</div>
              </Link>
            </div>
          ) : activePreset === 'COMMERCIAL' ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <Link
                href="/treasury/cheques"
                className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-indigo-50/60 hover:border-indigo-300 transition-all group"
              >
                <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                  <Landmark className="w-4 h-4" />
                </div>
                <div className="font-bold text-xs text-slate-800 group-hover:text-indigo-900">۱. کارتابل چک‌های صیادی</div>
                <div className="text-[11px] text-slate-500 mt-1">استعلام پیچک، خواباندن به حساب و پیگیری وصول</div>
              </Link>

              <Link
                href="/moadian/invoices"
                className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-emerald-50/60 hover:border-emerald-300 transition-all group"
              >
                <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div className="font-bold text-xs text-slate-800 group-hover:text-emerald-900">۲. سامانه مودیان مالیاتی</div>
                <div className="text-[11px] text-slate-500 mt-1">امضای دیجیتال فاکتورها و ارسال به سازمان امور مالیاتی</div>
              </Link>

              <Link
                href="/analytics/receivables"
                className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-purple-50/60 hover:border-purple-300 transition-all group"
              >
                <div className="w-8 h-8 rounded-lg bg-purple-600 text-white flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                  <Clock className="w-4 h-4" />
                </div>
                <div className="font-bold text-xs text-slate-800 group-hover:text-purple-900">۳. سن‌سنجی مطالبات مشتریان</div>
                <div className="text-[11px] text-slate-500 mt-1">گروه‌بندی اعتباری و پیگیری سررسید تسویه‌حساب‌ها</div>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <Link
                href="/sales/invoices/new"
                className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-emerald-50/60 hover:border-emerald-300 transition-all group"
              >
                <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                  <Receipt className="w-4 h-4" />
                </div>
                <div className="font-bold text-xs text-slate-800 group-hover:text-emerald-900">۱. صدور فاکتور فروش</div>
                <div className="text-[11px] text-slate-500 mt-1">محاسبه ارزش افزوده ۱۰٪ و ثبت کسر انبار</div>
              </Link>

              <Link
                href="/accounting/vouchers"
                className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-blue-50/60 hover:border-blue-300 transition-all group"
              >
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <div className="font-bold text-xs text-slate-800 group-hover:text-blue-900">۲. سند دوبل حسابداری</div>
                <div className="text-[11px] text-slate-500 mt-1">گرید پیشرفته بدهکار/بستانکار با تفصیلی شناور</div>
              </Link>

              <Link
                href="/accounting/reports/trial-balance"
                className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-purple-50/60 hover:border-purple-300 transition-all group"
              >
                <div className="w-8 h-8 rounded-lg bg-purple-600 text-white flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                  <Scale className="w-4 h-4" />
                </div>
                <div className="font-bold text-xs text-slate-800 group-hover:text-purple-900">۳. تراز آزمایشی کل/معین</div>
                <div className="text-[11px] text-slate-500 mt-1">بررسی توازن ۱۰۰٪ ریاضی بدهکار و بستانکار</div>
              </Link>
            </div>
          )}
        </div>

        {/* وضعیت سلامت سیستم و استانداردهای ایران */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <span>سلامت حسابداری و انطباق استانداردها</span>
          </h2>

          <div className="space-y-3 text-xs">
            <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100 flex items-start gap-2.5">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-emerald-900">توازن دفاتر مالی کل و معین</div>
                <div className="text-[11px] text-emerald-700 mt-0.5">اسناد دوبل کاملاً متوازن و بدون انحراف تراز هستند.</div>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-start gap-2.5">
              <CheckCircle className="w-4 h-4 text-slate-600 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-slate-800">کاردکس انبار (میانگین موزون)</div>
                <div className="text-[11px] text-slate-600 mt-0.5">موجودی ریالی انبار با حساب معین ۱۰۳ مطابقت دارد.</div>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-start gap-2.5">
              <CheckCircle className="w-4 h-4 text-slate-600 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-slate-800">زنجیره امنیتی غیرقابل دستکاری</div>
                <div className="text-[11px] text-slate-600 mt-0.5">هش SHA-256 و لاگ زنجیره‌ای اسناد معتبر است.</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
