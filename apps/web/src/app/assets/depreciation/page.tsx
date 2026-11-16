'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  TrendingDown,
  Calendar,
  Play,
  CheckCircle2,
  FileText,
  Landmark,
  ArrowRight,
  Layers,
  DollarSign,
  AlertCircle,
  HelpCircle,
  ShieldCheck,
} from 'lucide-react';

interface DepreciationRow {
  assetId: string;
  assetCode: string;
  title: string;
  category: string;
  method: 'STRAIGHT_LINE' | 'DECLINING_BALANCE';
  openingBookValue: number;
  periodDepreciation: number;
  accumulatedAfter: number;
  closingBookValue: number;
  isFullyDepreciated: boolean;
}

const SAMPLE_DEPRECIATION_ROWS: DepreciationRow[] = [
  {
    assetId: 'asset-1',
    assetCode: 'FA-1403-M01',
    title: 'دستگاه تراش CNC صنعتی ۴ محور Haas',
    category: 'ماشین‌آلات تولیدی',
    method: 'STRAIGHT_LINE',
    openingBookValue: 1196250000,
    periodDepreciation: 11250000, // (1,500,000,000 - 150,000,000) / (10 * 12)
    accumulatedAfter: 326250000,
    closingBookValue: 1185000000,
    isFullyDepreciated: false,
  },
  {
    assetId: 'asset-2',
    assetCode: 'FA-1403-V01',
    title: 'وانت پراید ۱۵۱ مسقف (پخش و توزیع)',
    category: 'وسایط نقلیه',
    method: 'DECLINING_BALANCE',
    openingBookValue: 216416666,
    periodDepreciation: 4416666, // (212,000,000 * 25%) / 12
    accumulatedAfter: 112416666,
    closingBookValue: 212000000,
    isFullyDepreciated: false,
  },
  {
    assetId: 'asset-3',
    assetCode: 'FA-1403-F01',
    title: 'سرور محاسباتی HPE ProLiant DL380 G10',
    category: 'اثاثه و IT',
    method: 'STRAIGHT_LINE',
    openingBookValue: 367500000,
    periodDepreciation: 7500000, // 450,000,000 / (5 * 12)
    accumulatedAfter: 97500000,
    closingBookValue: 360000000,
    isFullyDepreciated: false,
  },
];

export default function AssetDepreciationPage() {
  const [periodDate, setPeriodDate] = useState('1403/08/30');
  const [monthsCount, setMonthsCount] = useState(1);
  const [rows, setRows] = useState<DepreciationRow[]>(SAMPLE_DEPRECIATION_ROWS);
  const [isPosted, setIsPosted] = useState(false);
  const [journalEntryId, setJournalEntryId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const totalPeriodDepreciation = rows.reduce((sum, r) => sum + r.periodDepreciation, 0);
  const totalClosingBookValue = rows.reduce((sum, r) => sum + r.closingBookValue, 0);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handlePostDepreciation = () => {
    const vouId = `vou-dep-${Date.now().toString().slice(-4)}`;
    setIsPosted(true);
    setJournalEntryId(vouId);
    showToast(`سند دوبل شناسایی هزینه استهلاک به شماره ${vouId} در دفتر کل صادر گردید.`);
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
            <Link href="/assets" className="hover:text-emerald-600 transition-colors flex items-center gap-1">
              <Landmark className="w-3.5 h-3.5" />
              اموال و دارایی‌های ثابت
            </Link>
            <span>/</span>
            <span className="text-slate-800 font-semibold">محاسبه استهلاک دوره</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2.5">
            <TrendingDown className="w-7 h-7 text-emerald-600" />
            کارتابل محاسبه و صدور سند استهلاک (ماده ۱۴۹ ق.م.م)
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            محاسبه استهلاک دوره‌ای با روش‌های خط مستقیم و مانده نزولی و صدور خودکار سند حسابداری هزینه و استهلاک انباشته
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handlePostDepreciation}
            disabled={isPosted}
            className={`flex items-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors shadow-sm ${
              isPosted
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed border'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            {isPosted ? 'سند استهلاک صادر شده' : 'تایید و صدور سند دوبل استهلاک'}
          </button>
        </div>
      </div>

      {/* Settings & KPIs Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-slate-600 block mb-2">تنظیمات دوره استهلاک</span>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] text-slate-500 block mb-1">تاریخ پایان دوره</label>
              <input
                type="text"
                value={periodDate}
                onChange={(e) => setPeriodDate(e.target.value)}
                className="w-full text-xs p-2 border rounded-lg font-mono focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-500 block mb-1">تعداد ماه</label>
              <input
                type="number"
                min={1}
                max={12}
                value={monthsCount}
                onChange={(e) => setMonthsCount(Number(e.target.value))}
                className="w-full text-xs p-2 border rounded-lg font-mono focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500 block mb-1">مجموع هزینه استهلاک این دوره</span>
            <span className="text-xl font-bold text-rose-600">
              {totalPeriodDepreciation.toLocaleString('fa-IR')} <span className="text-xs font-normal text-slate-500">ریال</span>
            </span>
            <div className="text-[11px] text-slate-400 mt-1">بدهکار: حساب ۷۲۰۱ هزینه استهلاک</div>
          </div>
          <div className="w-11 h-11 bg-rose-50 text-rose-600 rounded-lg flex items-center justify-center">
            <TrendingDown className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500 block mb-1">ارزش دفتری پایان دوره اموال</span>
            <span className="text-xl font-bold text-emerald-600">
              {totalClosingBookValue.toLocaleString('fa-IR')} <span className="text-xs font-normal text-slate-500">ریال</span>
            </span>
            <div className="text-[11px] text-slate-400 mt-1">پس از کسر استهلاک دوره</div>
          </div>
          <div className="w-11 h-11 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center">
            <ShieldCheck className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Notice & Voucher Badge */}
      {journalEntryId && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-xs text-emerald-900 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-600" />
            <span>
              سند حسابداری استهلاک دوره‌ای با شناسه <strong>{journalEntryId}</strong> در دفاتر ثبت گردید.
              (بدهکار: هزینه استهلاک / بستانکار: استهلاک انباشته)
            </span>
          </div>
          <span className="bg-emerald-200 text-emerald-900 font-bold px-2.5 py-1 rounded">ثبت قطعی در دفتر کل</span>
        </div>
      )}

      {/* Depreciation Calculation Breakdown Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-800">
            ریز اقلام محاسباتی استهلاک دارایی‌های مشمول ({rows.length} فقره)
          </h2>
          <span className="text-xs text-slate-500">
            بر اساس جدول استهلاک ماده ۱۴۹ قانون مالیات‌های مستقیم
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold">
              <tr>
                <th className="py-3 px-4">پلاک اموال</th>
                <th className="py-3 px-4">شرح دارایی</th>
                <th className="py-3 px-3">روش محاسبه</th>
                <th className="py-3 px-3">ارزش دفتری ابتدای دوره</th>
                <th className="py-3 px-3 text-rose-700 font-bold">استهلاک دوره (هزینه)</th>
                <th className="py-3 px-3">استهلاک انباشته پس از دوره</th>
                <th className="py-3 px-3 text-emerald-700 font-bold">ارزش دفتری پایان دوره</th>
                <th className="py-3 px-3 text-center">وضعیت</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => (
                <tr key={r.assetId} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-4 font-mono font-bold text-slate-700 bg-slate-50/50">{r.assetCode}</td>
                  <td className="py-3.5 px-4 font-bold text-slate-800">
                    <div>{r.title}</div>
                    <div className="text-[11px] text-slate-400 font-normal">{r.category}</div>
                  </td>
                  <td className="py-3.5 px-3 text-slate-600">
                    {r.method === 'STRAIGHT_LINE' ? 'خط مستقیم' : 'مانده نزولی'}
                  </td>
                  <td className="py-3.5 px-3 font-mono text-slate-700">
                    {r.openingBookValue.toLocaleString('fa-IR')}
                  </td>
                  <td className="py-3.5 px-3 font-mono font-bold text-rose-600">
                    {r.periodDepreciation.toLocaleString('fa-IR')}
                  </td>
                  <td className="py-3.5 px-3 font-mono text-slate-600">
                    {r.accumulatedAfter.toLocaleString('fa-IR')}
                  </td>
                  <td className="py-3.5 px-3 font-mono font-bold text-emerald-600">
                    {r.closingBookValue.toLocaleString('fa-IR')}
                  </td>
                  <td className="py-3.5 px-3 text-center">
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                      محاسبه‌شده
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-50 border-t border-slate-200 font-bold text-xs">
              <tr>
                <td colSpan={4} className="py-3 px-4 text-slate-700">مجموع محاسبات استهلاک دوره:</td>
                <td className="py-3 px-3 font-mono text-rose-600 text-sm">
                  {totalPeriodDepreciation.toLocaleString('fa-IR')} ریال
                </td>
                <td className="py-3 px-3"></td>
                <td className="py-3 px-3 font-mono text-emerald-600 text-sm">
                  {totalClosingBookValue.toLocaleString('fa-IR')} ریال
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
