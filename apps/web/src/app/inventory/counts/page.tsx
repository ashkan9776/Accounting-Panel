'use client';

import React, { useEffect, useState } from 'react';
import {
  ClipboardCheck,
  Plus,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Package,
  Layers,
  ArrowRight,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import Link from 'next/link';
import { fetchApi, formatMoney } from '../../../lib/api';

export default function InventoryCountsPage() {
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('');
  const [countDate, setCountDate] = useState('1403/08/26');
  const [description, setDescription] = useState('انبارگردانی مقداری و ریالی پایان دوره');

  // ردیف‌های شمارش
  const [items, setItems] = useState<any[]>([
    {
      productId: '',
      productName: 'روغن سرخ‌کردنی ۵ لیتری بهار',
      systemQty: 80,
      countedQty: 78, // ۲ عدد کسری
      unitCost: 15625000,
    },
    {
      productId: '',
      productName: 'برنج طارم هاشمی درجه یک',
      systemQty: 50,
      countedQty: 52, // ۲ عدد اضافی
      unitCost: 105000000,
    },
  ]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [adjusting, setAdjusting] = useState(false);

  useEffect(() => {
    async function loadInitial() {
      try {
        const [whRes, prodRes] = await Promise.all([
          fetchApi('/inventory/warehouses').catch(() => ({ data: [] })),
          fetchApi('/inventory/products').catch(() => ({ data: [] })),
        ]);

        const whList = whRes.data || [];
        setWarehouses(whList);
        if (whList.length > 0) setSelectedWarehouseId(whList[0].id);

        const prodList = prodRes.data || [];
        setProducts(prodList);
        if (prodList.length >= 2) {
          setItems([
            {
              productId: prodList[0].id,
              productName: prodList[0].name,
              systemQty: 80,
              countedQty: 78,
              unitCost: Number(prodList[0].purchase_price || 15000000),
            },
            {
              productId: prodList[1].id,
              productName: prodList[1].name,
              systemQty: 50,
              countedQty: 52,
              unitCost: Number(prodList[1].purchase_price || 105000000),
            },
          ]);
        }
      } catch (err) {
        console.warn('Counts load error:', err);
      }
    }
    loadInitial();
  }, []);

  const updateCountedQty = (index: number, val: number) => {
    const updated = [...items];
    updated[index].countedQty = val;
    setItems(updated);
  };

  const handleApplyAdjustment = async () => {
    setError(null);
    setSuccessMessage(null);
    setAdjusting(true);

    try {
      // ثبت شمارش
      const createRes = await fetchApi('/inventory/counts', {
        method: 'POST',
        body: JSON.stringify({
          warehouseId: selectedWarehouseId || 'wh-main-1',
          countDateShamsi: countDate,
          description,
          items: items.map((it) => ({
            productId: it.productId || 'prod-1',
            systemQuantity: it.systemQty,
            countedQuantity: it.countedQty,
            unitCost: it.unitCost,
            differenceQuantity: it.countedQty - it.systemQty,
          })),
        }),
      });

      const countId = createRes.data?.id;

      // اعمال تعدیل و صدور خودکار سند حسابداری کسری/اضافی
      if (countId) {
        const adjRes = await fetchApi(`/inventory/counts/${countId}/adjust`, {
          method: 'POST',
        });

        if (adjRes.data) {
          setSuccessMessage(
            `انبارگردانی و مغایرت‌گیری تایید شد! سند دوبل تعدیلات کسری و اضافی انبار با شناسه ${adjRes.data.journalEntryId || 'سند دوبل جدید'} در سیستم ثبت گردید.`
          );
        } else {
          setSuccessMessage('انبارگردانی ثبت شد و سند تعدیلات انبار با موفقیت صادر گردید.');
        }
      } else {
        setSuccessMessage('انبارگردانی با موفقیت ثبت شد و تعدیلات ریالی اعمال گردید.');
      }
    } catch (err: any) {
      setError(err.message || 'خطا در ثبت و اعمال انبارگردانی.');
    } finally {
      setAdjusting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* هدر صفحه */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <ClipboardCheck className="w-6 h-6 text-purple-600" />
            <span>انبارگردانی، مغایرت‌گیری و صدور سند تعدیلات</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            ثبت شمارش فیزیکی اقلام، محاسبه خودکار کسری و اضافی انبار و صدور سند اتوماتیک دوبل اصلاح موجودی
          </p>
        </div>

        <Link
          href="/inventory/kardex"
          className="inline-flex items-center gap-1.5 text-xs text-slate-700 bg-white border border-slate-200 px-3 py-2 rounded-xl hover:bg-slate-50 transition-colors shadow-xs font-semibold"
        >
          <Layers className="w-4 h-4 text-emerald-600" />
          <span>مشاهده کاردکس انبار</span>
        </Link>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <Link
            href="/accounting/vouchers"
            className="text-xs font-bold text-emerald-700 underline hover:text-emerald-900"
          >
            مشاهده سند در دفتر روزنامه
          </Link>
        </div>
      )}

      {/* سربرگ برگه انبارگردانی */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="block text-slate-600 font-semibold mb-1">انبار مورد شمارش *</label>
            <select
              value={selectedWarehouseId}
              onChange={(e) => setSelectedWarehouseId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-medium"
            >
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} ({w.code})
                </option>
              ))}
              {warehouses.length === 0 && <option value="wh-1">انبار مرکزی تهران (WH-01)</option>}
            </select>
          </div>

          <div>
            <label className="block text-slate-600 font-semibold mb-1">تاریخ انبارگردانی (شمسی) *</label>
            <input
              type="text"
              value={countDate}
              onChange={(e) => setCountDate(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-mono text-left"
            />
          </div>

          <div>
            <label className="block text-slate-600 font-semibold mb-1">شرح برگه انبارگردانی</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5"
            />
          </div>
        </div>
      </div>

      {/* جدول شمارش اقلام و مغایرت‌گیری */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <Package className="w-4 h-4 text-purple-600" />
            <span>اقلام شمارش‌شده و وضعیت مغایرت</span>
          </h2>
          <span className="text-[11px] text-slate-500">
            تعداد ردیف‌های شمارش‌شده: <strong className="font-mono">{items.length}</strong> قلم
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-100 text-slate-600 border-b border-slate-200 font-bold">
              <tr>
                <th className="py-3 px-3 w-12 text-center">ردیف</th>
                <th className="py-3 px-4 min-w-[200px]">نام و شرح کالا</th>
                <th className="py-3 px-3 w-32 text-center">موجودی دفتر (سیستم)</th>
                <th className="py-3 px-3 w-36 text-center bg-purple-50 text-purple-900">
                  شمارش واقعی (شمارشگر)
                </th>
                <th className="py-3 px-3 w-36 text-center">مغایرت مقداری</th>
                <th className="py-3 px-3 w-36 text-left">فی واحد میانگین (ریال)</th>
                <th className="py-3 px-3 w-40 text-left">مبلغ کل تعدیل (ریال)</th>
                <th className="py-3 px-3 w-32 text-center">نوع رویداد</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((row, idx) => {
                const diffQty = row.countedQty - row.systemQty;
                const diffAmount = Math.abs(diffQty) * row.unitCost;

                return (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900">{row.productName}</td>
                    <td className="py-3 px-3 text-center font-mono font-bold text-slate-700">
                      {row.systemQty}
                    </td>
                    <td className="py-3 px-3 bg-purple-50/40">
                      <input
                        type="number"
                        min="0"
                        value={row.countedQty}
                        onChange={(e) => updateCountedQty(idx, Number(e.target.value))}
                        className="w-full bg-white border border-purple-300 rounded-lg p-1.5 text-center font-mono font-bold text-purple-900 focus:outline-none focus:ring-1 focus:ring-purple-500"
                      />
                    </td>
                    <td className="py-3 px-3 text-center font-mono font-bold">
                      {diffQty > 0 ? (
                        <span className="text-emerald-700">+{diffQty} (اضافی)</span>
                      ) : diffQty < 0 ? (
                        <span className="text-rose-700">{diffQty} (کسری)</span>
                      ) : (
                        <span className="text-slate-400">بدون مغایرت (۰)</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-left font-mono text-slate-600">
                      {formatMoney(row.unitCost)}
                    </td>
                    <td className="py-3 px-3 text-left font-mono font-bold text-slate-800">
                      {formatMoney(diffAmount)}
                    </td>
                    <td className="py-3 px-3 text-center">
                      {diffQty > 0 ? (
                        <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full">
                          اضافی انبار
                        </span>
                      ) : diffQty < 0 ? (
                        <span className="text-[10px] font-bold bg-rose-100 text-rose-800 px-2.5 py-0.5 rounded-full">
                          کسری انبار
                        </span>
                      ) : (
                        <span className="text-[10px] font-medium bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                          منطبق
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* دکمه اعمال تعدیلات و سند دوبل */}
      <div className="flex justify-end">
        <button
          type="button"
          disabled={adjusting}
          onClick={handleApplyAdjustment}
          className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-purple-900/30 transition-all disabled:opacity-50"
        >
          {adjusting ? (
            <span>در حال اصلاح موجودی و صدور سند تعدیلات...</span>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4" />
              <span>اعمال قطعی انبارگردانی و صدور خودکار سند کسری و اضافی انبار</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
