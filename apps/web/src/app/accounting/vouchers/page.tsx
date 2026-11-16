'use client';

import React, { useEffect, useState } from 'react';
import {
  FileSpreadsheet,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Scale,
  Calendar,
  Layers,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import Link from 'next/link';
import { fetchApi, formatMoney } from '../../../lib/api';

interface VoucherLine {
  subsidiaryId: string;
  subsidiaryCode: string;
  subsidiaryTitle: string;
  floatingDimensionId?: string;
  description: string;
  debit: number;
  credit: number;
}

export default function JournalVouchersPage() {
  const [dateShamsi, setDateShamsi] = useState('1403/08/26');
  const [entryType, setEntryType] = useState('NORMAL');
  const [description, setDescription] = useState('ثبت سند افتتاحیه و فعالیت‌های جاری');

  // داده‌های کاتالوگ حساب‌ها
  const [subsidiaries, setSubsidiaries] = useState<any[]>([]);
  const [dimensions, setDimensions] = useState<any[]>([]);
  const [recentEntries, setRecentEntries] = useState<any[]>([]);

  // سطرهای سند جاری
  const [lines, setLines] = useState<VoucherLine[]>([
    {
      subsidiaryId: '',
      subsidiaryCode: '10101',
      subsidiaryTitle: 'موجودی نزد بانک‌ها',
      description: 'واریز وجه فروش نقدی به حساب بانک سامان',
      debit: 110000000,
      credit: 0,
    },
    {
      subsidiaryId: '',
      subsidiaryCode: '60101',
      subsidiaryTitle: 'درآمد حاصل از فروش کالا',
      description: 'فروش کالا طبق فاکتور دوره جاری',
      debit: 0,
      credit: 100000000,
    },
    {
      subsidiaryId: '',
      subsidiaryCode: '20104',
      subsidiaryTitle: 'مالیات و عوارض ارزش افزوده پرداختنی',
      description: '۱۰٪ ارزش افزوده قانونی فروش',
      debit: 0,
      credit: 10000000,
    },
  ]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // لود حساب‌های معین، تفصیلی‌ها و لیست اسناد اخیر
  const loadData = async () => {
    try {
      const [subsRes, dimsRes, entriesRes] = await Promise.all([
        fetchApi('/accounting/chart/subsidiaries').catch(() => ({ data: [] })),
        fetchApi('/accounting/chart/floating-dimensions').catch(() => ({ data: [] })),
        fetchApi('/accounting/journal-entries').catch(() => ({ data: [] })),
      ]);

      const subList = subsRes.data || [];
      setSubsidiaries(subList);

      const dimList = dimsRes.data || [];
      setDimensions(dimList);

      const entList = entriesRes.data || [];
      setRecentEntries(entList);

      // اتصال سرفصل‌های اولیه به شناسه‌های واقعی اگر موجود باشند
      if (subList.length > 0) {
        setLines((prev) =>
          prev.map((line, idx) => {
            const found = subList.find(
              (s: any) => s.code === line.subsidiaryCode || s.code.startsWith(line.subsidiaryCode)
            );
            return {
              ...line,
              subsidiaryId: found ? found.id : subList[idx % subList.length]?.id || 'sub-1',
            };
          })
        );
      }
    } catch (e) {
      console.warn('Voucher initial load error:', e);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // افزودن سطر جدید
  const addLine = () => {
    const firstSub = subsidiaries[0];
    setLines([
      ...lines,
      {
        subsidiaryId: firstSub?.id || 'sub-default',
        subsidiaryCode: firstSub?.code || '10101',
        subsidiaryTitle: firstSub?.title || 'صندوق مرکزی',
        description: description,
        debit: 0,
        credit: 0,
      },
    ]);
  };

  // حذف سطر
  const removeLine = (index: number) => {
    if (lines.length <= 2) return;
    setLines(lines.filter((_, idx) => idx !== index));
  };

  // بروزرسانی سطر
  const updateLine = (index: number, field: keyof VoucherLine, value: any) => {
    const updated = [...lines];
    if (field === 'subsidiaryId') {
      const sub = subsidiaries.find((s) => s.id === value);
      updated[index].subsidiaryId = value;
      if (sub) {
        updated[index].subsidiaryCode = sub.code;
        updated[index].subsidiaryTitle = sub.title;
      }
    } else {
      (updated[index] as any)[field] = value;
    }
    setLines(updated);
  };

  // جمع بدهکار و بستانکار و اختلاف تراز
  const sumDebit = lines.reduce((acc, l) => acc + Number(l.debit || 0), 0);
  const sumCredit = lines.reduce((acc, l) => acc + Number(l.credit || 0), 0);
  const diff = Math.abs(sumDebit - sumCredit);
  const isBalanced = sumDebit > 0 && diff === 0;

  // ثبت سند دوبل
  const handleSaveEntry = async () => {
    setError(null);
    setSuccessMessage(null);

    if (!isBalanced) {
      setError(`سند حسابداری نامتعادل است! اختلاف تراز: ${formatMoney(diff)} ریال`);
      return;
    }

    setLoading(true);
    try {
      const payload = {
        entryDateShamsi: dateShamsi,
        entryType,
        description,
        lines: lines.map((l) => ({
          subsidiaryAccountId: l.subsidiaryId || subsidiaries[0]?.id || 'sub-default',
          floatingDimensionId: l.floatingDimensionId || undefined,
          description: l.description,
          debitAmount: l.debit.toString(),
          creditAmount: l.credit.toString(),
        })),
      };

      const res = await fetchApi('/accounting/journal-entries', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (res.data) {
        setSuccessMessage(`سند دوبل شماره ${res.data.entryNumber || 'جدید'} با موفقیت قطعی و تراز شد.`);
        loadData();
      } else {
        setError(res.message || 'خطا در ثبت سند.');
      }
    } catch (err: any) {
      setError(err.message || 'خطا در برقراری ارتباط با سرویس اسناد دوبل.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* هدر صفحه */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6 text-emerald-600" />
            <span>ثبت و مدیریت اسناد دوبل حسابداری</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            دفتر روزنامه، تراز زنده دوطرفه، تفصیلی‌های شناور (سطح ۴) و زنجیره هش SHA-256
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/accounting/reports/trial-balance"
            className="inline-flex items-center gap-1.5 text-xs text-slate-700 bg-white border border-slate-200 px-3 py-2 rounded-xl hover:bg-slate-50 transition-colors shadow-xs font-semibold"
          >
            <Scale className="w-4 h-4 text-purple-600" />
            <span>مشاهده تراز آزمایشی</span>
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
          <span className="font-bold">{successMessage}</span>
        </div>
      )}

      {/* سربرگ سند */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="block text-slate-600 font-semibold mb-1">تاریخ سند (شمسی) *</label>
            <input
              type="text"
              value={dateShamsi}
              onChange={(e) => setDateShamsi(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-mono text-left focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-slate-600 font-semibold mb-1">نوع سند حسابداری</label>
            <select
              value={entryType}
              onChange={(e) => setEntryType(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
            >
              <option value="NORMAL">عمومی و جاری (NORMAL)</option>
              <option value="OPENING">سند افتتاحیه (OPENING)</option>
              <option value="CLOSING">سند اختتامیه / بستن حساب‌ها (CLOSING)</option>
              <option value="ADJUSTMENT">سند تعدیلات و اصلاحی (ADJUSTMENT)</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-600 font-semibold mb-1">شرح کلی سند *</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>
      </div>

      {/* گرید سطرهای سند دوبل */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-emerald-600" />
              <span>سطرهای سند حسابداری (گرید دوبل)</span>
            </h2>
            {isBalanced ? (
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>سند کاملاً تراز و متعادل است</span>
              </span>
            ) : (
              <span className="text-[11px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full border border-rose-200 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>اختلاف تراز: {formatMoney(diff)} ریال</span>
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={addLine}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>افزودن سطر</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-100 text-slate-600 border-b border-slate-200 font-bold">
              <tr>
                <th className="py-2.5 px-3 w-12 text-center">ردیف</th>
                <th className="py-2.5 px-3 min-w-[200px]">حساب معین (سطح ۳)</th>
                <th className="py-2.5 px-3 w-48">تفصیلی شناور (سطح ۴)</th>
                <th className="py-2.5 px-3 min-w-[200px]">شرح سطر</th>
                <th className="py-2.5 px-3 w-40 text-left bg-emerald-50/50 text-emerald-900">
                  بدهکار (ریال)
                </th>
                <th className="py-2.5 px-3 w-40 text-left bg-blue-50/50 text-blue-900">
                  بستانکار (ریال)
                </th>
                <th className="py-2.5 px-3 w-12 text-center">حذف</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {lines.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-2.5 px-3 text-center text-slate-400 font-mono font-medium">
                    {idx + 1}
                  </td>
                  <td className="py-2.5 px-3">
                    <select
                      value={row.subsidiaryId}
                      onChange={(e) => updateLine(idx, 'subsidiaryId', e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 focus:ring-1 focus:ring-emerald-500 font-medium"
                    >
                      {subsidiaries.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.code} - {s.title}
                        </option>
                      ))}
                      {subsidiaries.length === 0 && (
                        <option value="sub-fallback">
                          {row.subsidiaryCode} - {row.subsidiaryTitle}
                        </option>
                      )}
                    </select>
                  </td>
                  <td className="py-2.5 px-3">
                    <select
                      value={row.floatingDimensionId || ''}
                      onChange={(e) => updateLine(idx, 'floatingDimensionId', e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 focus:ring-1 focus:ring-emerald-500 font-medium"
                    >
                      <option value="">بدون تفصیلی</option>
                      {dimensions.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.code} - {d.title} ({d.dimension_type})
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-2.5 px-3">
                    <input
                      type="text"
                      value={row.description}
                      onChange={(e) => updateLine(idx, 'description', e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 focus:ring-1 focus:ring-emerald-500"
                    />
                  </td>
                  <td className="py-2.5 px-3 bg-emerald-50/30">
                    <input
                      type="number"
                      value={row.debit}
                      onChange={(e) => updateLine(idx, 'debit', Number(e.target.value))}
                      className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-left font-mono font-bold text-emerald-900 focus:ring-1 focus:ring-emerald-500"
                    />
                  </td>
                  <td className="py-2.5 px-3 bg-blue-50/30">
                    <input
                      type="number"
                      value={row.credit}
                      onChange={(e) => updateLine(idx, 'credit', Number(e.target.value))}
                      className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-left font-mono font-bold text-blue-900 focus:ring-1 focus:ring-blue-500"
                    />
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <button
                      type="button"
                      onClick={() => removeLine(idx)}
                      disabled={lines.length <= 2}
                      className="p-1 text-slate-400 hover:text-rose-600 disabled:opacity-30 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            {/* ردیف جمع کل و اعتبارسنجی تراز */}
            <tfoot className="bg-slate-100 border-t-2 border-slate-300 font-bold">
              <tr>
                <td colSpan={4} className="py-3 px-4 text-left font-bold text-slate-700">
                  جمع کل ستون‌ها و تراز سند:
                </td>
                <td className="py-3 px-3 text-left font-mono text-emerald-900 bg-emerald-100/60 font-black">
                  {formatMoney(sumDebit)} ریال
                </td>
                <td className="py-3 px-3 text-left font-mono text-blue-900 bg-blue-100/60 font-black">
                  {formatMoney(sumCredit)} ریال
                </td>
                <td className="py-3 px-3 text-center">
                  {isBalanced ? (
                    <ShieldCheck className="w-5 h-5 text-emerald-600 mx-auto" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-rose-600 mx-auto" />
                  )}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* دکمه ثبت نهایی سند */}
      <div className="flex justify-end">
        <button
          type="button"
          disabled={loading || !isBalanced}
          onClick={handleSaveEntry}
          className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-emerald-900/30 transition-all disabled:opacity-40"
        >
          {loading ? (
            <span>در حال ثبت سند دوبل...</span>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4" />
              <span>ثبت و قطعی‌سازی سند دوبل در دفتر روزنامه</span>
            </>
          )}
        </button>
      </div>

      {/* اسناد اخیراً ثبت شده */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-4">
        <h3 className="text-xs font-bold text-slate-800 flex items-center gap-2">
          <FileSpreadsheet className="w-4 h-4 text-slate-600" />
          <span>اسناد حسابداری اخیر (دفتر روزنامه)</span>
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold">
              <tr>
                <th className="py-2 px-3">شماره سند</th>
                <th className="py-2 px-3">تاریخ</th>
                <th className="py-2 px-3">شرح سند</th>
                <th className="py-2 px-3 text-left">مبلغ کل (ریال)</th>
                <th className="py-2 px-3 text-center">ماژول مبدا</th>
                <th className="py-2 px-3 text-center">وضعیت</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentEntries.map((ent: any) => (
                <tr key={ent.id} className="hover:bg-slate-50">
                  <td className="py-2.5 px-3 font-mono font-bold text-slate-800">
                    {ent.entry_number || ent.entryNumber}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-slate-600">
                    {ent.entry_date_shamsi || ent.entryDateShamsi}
                  </td>
                  <td className="py-2.5 px-3 text-slate-700">{ent.description}</td>
                  <td className="py-2.5 px-3 text-left font-mono font-bold text-slate-800">
                    {formatMoney(ent.total_debit || ent.totalDebit)}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <span className="text-[10px] font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full">
                      {ent.source_module || ent.sourceModule || 'MANUAL'}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                      {ent.status || 'APPROVED'}
                    </span>
                  </td>
                </tr>
              ))}
              {recentEntries.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-slate-400">
                    هنوز سندی ثبت نشده است. با کلیک بر روی دکمه بالا اولین سند خود را ثبت کنید.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
