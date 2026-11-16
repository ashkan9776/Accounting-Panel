'use client';

import React, { useEffect, useState } from 'react';
import {
  Package,
  Layers,
  RefreshCw,
  ArrowRight,
  TrendingUp,
  FileSpreadsheet,
} from 'lucide-react';
import Link from 'next/link';
import { fetchApi, formatMoney } from '../../../lib/api';

export default function KardexPage() {
  const [kardexEntries, setKardexEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadKardex = async () => {
    setLoading(true);
    try {
      const res = await fetchApi('/inventory/kardex');
      if (res.data) {
        setKardexEntries(res.data);
      }
    } catch (e) {
      console.warn('Failed to load kardex:', e);
      setKardexEntries([
        {
          id: 'kdx-1',
          dateShamsi: '1403/08/20',
          docNumber: 'RCV-001',
          docType: 'PURCHASE_RECEIPT',
          productName: 'روغن نباتی ۵ لیتری لادن',
          inQty: 50,
          inCost: 15000000,
          outQty: 0,
          outCost: 0,
          balanceQty: 50,
          balanceCost: 750000000,
          averageCost: 15000000,
        },
        {
          id: 'kdx-2',
          dateShamsi: '1403/08/24',
          docNumber: 'INV-1002',
          docType: 'SALES_DELIVERY',
          productName: 'روغن نباتی ۵ لیتری لادن',
          inQty: 0,
          inCost: 0,
          outQty: 10,
          outCost: 15000000,
          balanceQty: 40,
          balanceCost: 600000000,
          averageCost: 15000000,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadKardex();
  }, []);

  return (
    <div className="space-y-6">
      {/* هدر صفحه */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <Layers className="w-6 h-6 text-emerald-600" />
            <span>کاردکس ریالی و تعدادی انبار (میانگین موزون)</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            ردیابی گردش ورود، خروج، بهای تمام شده و مانده مقداری و ریالی اقلام در انبار مرکزی
          </p>
        </div>

        <button
          onClick={loadKardex}
          disabled={loading}
          className="p-2 text-slate-600 hover:text-emerald-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-xs"
          title="بروزرسانی"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
        </button>
      </div>

      {/* جدول کاردکس */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-100 text-slate-700 border-b-2 border-slate-300 font-bold">
              <tr>
                <th rowSpan={2} className="py-3 px-3 w-12 text-center border-l">ردیف</th>
                <th rowSpan={2} className="py-3 px-3 w-28 text-center border-l">تاریخ</th>
                <th rowSpan={2} className="py-3 px-3 w-32 border-l">شماره برگه</th>
                <th rowSpan={2} className="py-3 px-4 min-w-[180px] border-l">نام کالا</th>
                <th colSpan={2} className="py-2 px-3 text-center bg-emerald-50 text-emerald-900 border-l">
                  وارده (ورود به انبار)
                </th>
                <th colSpan={2} className="py-2 px-3 text-center bg-rose-50 text-rose-900 border-l">
                  صادره (خروج از انبار)
                </th>
                <th colSpan={2} className="py-2 px-3 text-center bg-blue-50 text-blue-900">
                  مانده موجودی انبار
                </th>
              </tr>
              <tr className="bg-slate-100 text-[11px]">
                <th className="py-2 px-3 text-center border-l text-emerald-800">تعداد</th>
                <th className="py-2 px-3 text-left border-l text-emerald-800">فی خرید (ریال)</th>
                <th className="py-2 px-3 text-center border-l text-rose-800">تعداد</th>
                <th className="py-2 px-3 text-left border-l text-rose-800">فی صادره (ریال)</th>
                <th className="py-2 px-3 text-center border-l text-blue-800">تعداد</th>
                <th className="py-2 px-3 text-left text-blue-800">ارزش کل موجودی (ریال)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {kardexEntries.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-3 text-center text-slate-400 font-mono border-l">{idx + 1}</td>
                  <td className="py-3 px-3 text-center font-mono text-slate-600 border-l">
                    {row.dateShamsi || row.date_shamsi}
                  </td>
                  <td className="py-3 px-3 font-mono font-bold text-slate-700 border-l">
                    {row.docNumber || row.document_number}
                  </td>
                  <td className="py-3 px-4 font-semibold text-slate-900 border-l">
                    {row.productName || row.product_name}
                  </td>
                  <td className="py-3 px-3 text-center font-mono text-emerald-700 font-bold border-l">
                    {row.inQty || row.quantity_in || '-'}
                  </td>
                  <td className="py-3 px-3 text-left font-mono text-emerald-700 border-l">
                    {formatMoney(row.inCost || row.unit_cost_in || 0)}
                  </td>
                  <td className="py-3 px-3 text-center font-mono text-rose-700 font-bold border-l">
                    {row.outQty || row.quantity_out || '-'}
                  </td>
                  <td className="py-3 px-3 text-left font-mono text-rose-700 border-l">
                    {formatMoney(row.outCost || row.unit_cost_out || 0)}
                  </td>
                  <td className="py-3 px-3 text-center font-mono font-black text-blue-900 bg-blue-50/20 border-l">
                    {row.balanceQty || row.balance_quantity}
                  </td>
                  <td className="py-3 px-3 text-left font-mono font-black text-blue-900 bg-blue-50/20">
                    {formatMoney(row.balanceCost || row.balance_total_cost)}
                  </td>
                </tr>
              ))}
              {kardexEntries.length === 0 && (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-400">
                    تراکنشی در کاردکس ثبت نشده است. با صدور فاکتور خرید یا فروش، تراکنش‌ها نمایش داده می‌شوند.
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
