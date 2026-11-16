'use client';

import React, { useEffect, useState } from 'react';
import {
  ShoppingCart,
  Plus,
  RefreshCw,
  Search,
  FileSpreadsheet,
  CheckCircle2,
  Calendar,
  Building,
  ArrowRight,
} from 'lucide-react';
import Link from 'next/link';
import { fetchApi, formatMoney } from '../../../lib/api';

export default function PurchasesListPage() {
  const [purchases, setPurchases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadPurchases = async () => {
    setLoading(true);
    try {
      const res = await fetchApi('/purchases');
      if (res.data) {
        setPurchases(res.data);
      }
    } catch (e) {
      console.warn('Purchases fetch error:', e);
      setPurchases([
        {
          id: 'pur-1',
          document_number: 'PUR-1403-0001',
          date_shamsi: '1403/08/20',
          supplier_name: 'شرکت بازرگانی سپهر',
          warehouse_name: 'انبار مرکزی تهران',
          total_amount: 1550000000,
          vat_amount: 150000000,
          journal_entry_id: 'entry-pur-1',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPurchases();
  }, []);

  return (
    <div className="space-y-6">
      {/* هدر صفحه */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <ShoppingCart className="w-6 h-6 text-blue-600" />
            <span>فهرست فاکتورهای خرید کالا و تدارکات</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            مشاهده خریدهای رسمی ثبت شده، رسیدهای ورود به انبار و اسناد دوبل متناظر
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadPurchases}
            disabled={loading}
            className="p-2 text-slate-600 hover:text-blue-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-xs"
            title="بروزرسانی"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-600' : ''}`} />
          </button>
          <Link
            href="/purchases/invoices/new"
            className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>صدور فاکتور خرید جدید</span>
          </Link>
        </div>
      </div>

      {/* جدول فاکتورهای خرید */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-bold">
              <tr>
                <th className="py-3 px-3 w-12 text-center">ردیف</th>
                <th className="py-3 px-3 w-36 text-center font-mono">شماره فاکتور</th>
                <th className="py-3 px-3 w-28 text-center">تاریخ</th>
                <th className="py-3 px-3">تامین‌کننده / فروشنده</th>
                <th className="py-3 px-3 w-36">انبار مقصد</th>
                <th className="py-3 px-3 w-36 text-left">مبلغ کل خرید (ریال)</th>
                <th className="py-3 px-3 w-32 text-left">اعتبار ارزش افزوده</th>
                <th className="py-3 px-3 w-28 text-center">سند دوبل</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {purchases.map((p, idx) => (
                <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                  <td className="py-3 px-3 font-mono font-bold text-slate-800 text-center">
                    {p.document_number || p.documentNumber}
                  </td>
                  <td className="py-3 px-3 text-center font-mono text-slate-600">
                    {p.date_shamsi || p.dateShamsi}
                  </td>
                  <td className="py-3 px-3 font-semibold text-slate-900">
                    {p.supplier_name || 'تامین‌کننده طرف معامله'}
                  </td>
                  <td className="py-3 px-3 text-slate-600">
                    {p.warehouse_name || 'انبار مرکزی'}
                  </td>
                  <td className="py-3 px-3 text-left font-mono font-bold text-blue-900">
                    {formatMoney(p.total_amount || p.totalAmount)}
                  </td>
                  <td className="py-3 px-3 text-left font-mono text-emerald-700 font-semibold">
                    {formatMoney(p.vat_amount || p.vatAmount || 0)}
                  </td>
                  <td className="py-3 px-3 text-center">
                    <Link
                      href="/accounting/vouchers"
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200 hover:bg-blue-100"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      <span>مشاهده سند</span>
                    </Link>
                  </td>
                </tr>
              ))}
              {purchases.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    هنوز فاکتور خریدی ثبت نشده است. با کلیک بر روی دکمه بالا، فاکتور خرید جدید ثبت کنید.
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
