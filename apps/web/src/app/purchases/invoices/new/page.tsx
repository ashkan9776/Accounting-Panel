'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Trash2,
  ShoppingCart,
  Building,
  Calendar,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  ArrowRight,
  Package,
  Truck,
  Calculator,
} from 'lucide-react';
import Link from 'next/link';
import { fetchApi, formatMoney } from '../../../../lib/api';

interface PurchaseRow {
  productId: string;
  quantity: number;
  unitCost: number;
  discountAmount: number;
  taxExempt: boolean;
}

export default function NewPurchaseInvoicePage() {
  const router = useRouter();

  const [docNumber, setDocNumber] = useState(`PUR-${Date.now().toString().slice(-6)}`);
  const [docDate, setDocDate] = useState('1403/08/26');
  const [supplierId, setSupplierId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [freightAmount, setFreightAmount] = useState('5000000'); // ۵ میلیون ریال هزینه حمل
  const [discountAmount, setDiscountAmount] = useState('0');
  const [description, setDescription] = useState('خرید مواد اولیه و کالای تجاری دوره جاری');

  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);

  const [items, setItems] = useState<PurchaseRow[]>([
    {
      productId: '',
      quantity: 50,
      unitCost: 15000000,
      discountAmount: 0,
      taxExempt: false,
    },
  ]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<any>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [partiesRes, whRes, prodRes] = await Promise.all([
          fetchApi('/parties').catch(() => ({ data: [] })),
          fetchApi('/inventory/warehouses').catch(() => ({ data: [] })),
          fetchApi('/inventory/products').catch(() => ({ data: [] })),
        ]);

        const pList = partiesRes.data || [];
        setSuppliers(pList);
        if (pList.length > 0) setSupplierId(pList[0].id);

        const wList = whRes.data || [];
        setWarehouses(wList);
        if (wList.length > 0) setWarehouseId(wList[0].id);

        const prList = prodRes.data || [];
        setProducts(prList);
        if (prList.length > 0) {
          setItems([
            {
              productId: prList[0].id,
              quantity: 50,
              unitCost: Number(prList[0].purchase_price || 15000000),
              discountAmount: 0,
              taxExempt: Boolean(prList[0].tax_exempt),
            },
          ]);
        }
      } catch (e) {
        console.warn('Purchase initial load error:', e);
      }
    }
    loadData();
  }, []);

  const addRow = () => {
    const firstProd = products[0];
    setItems([
      ...items,
      {
        productId: firstProd?.id || '',
        quantity: 10,
        unitCost: Number(firstProd?.purchase_price || 15000000),
        discountAmount: 0,
        taxExempt: Boolean(firstProd?.tax_exempt),
      },
    ]);
  };

  const removeRow = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, idx) => idx !== index));
  };

  const updateRow = (index: number, field: keyof PurchaseRow, value: any) => {
    const updated = [...items];
    if (field === 'productId') {
      const p = products.find((x) => x.id === value);
      updated[index].productId = value;
      if (p) {
        updated[index].unitCost = Number(p.purchase_price || 15000000);
        updated[index].taxExempt = Boolean(p.tax_exempt);
      }
    } else {
      (updated[index] as any)[field] = value;
    }
    setItems(updated);
  };

  // محاسبات مالی فاکتور خرید
  const subtotal = items.reduce((sum, it) => sum + it.quantity * it.unitCost, 0);
  const totalItemDiscount = items.reduce((sum, it) => sum + Number(it.discountAmount || 0), 0);
  const netBeforeTax = Math.max(0, subtotal - totalItemDiscount);
  const totalTax = items.reduce((sum, it) => {
    if (it.taxExempt) return sum;
    const rowNet = Math.max(0, it.quantity * it.unitCost - Number(it.discountAmount || 0));
    return sum + Math.round(rowNet * 0.1);
  }, 0);
  const freight = Number(freightAmount || 0);
  const grandTotal = netBeforeTax + totalTax + freight;

  const handleSavePurchase = async () => {
    setError(null);
    if (!supplierId && suppliers.length > 0) {
      setError('لطفاً تامین‌کننده را انتخاب کنید.');
      return;
    }

    if (items.some((it) => !it.productId || it.quantity <= 0)) {
      setError('تمامی سطرهای خرید باید کالا و تعداد معتبر داشته باشند.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        documentNumber: docNumber,
        dateShamsi: docDate,
        supplierPartyId: supplierId || suppliers[0]?.id || 'party-supplier-1',
        warehouseId: warehouseId || warehouses[0]?.id || 'wh-main-1',
        freightAmount: freight,
        discountAmount: Number(discountAmount || 0),
        description,
        items: items.map((it) => ({
          productId: it.productId,
          quantity: it.quantity,
          unitCost: it.unitCost,
          discountAmount: it.discountAmount,
          taxExempt: it.taxExempt,
          vatRate: it.taxExempt ? 0 : 10,
        })),
      };

      const res = await fetchApi('/purchases', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (res.data) {
        setSuccessResult(res.data);
      } else {
        setError(res.message || 'خطا در ثبت فاکتور خرید.');
      }
    } catch (err: any) {
      setError(err.message || 'خطا در برقراری ارتباط با سرویس خرید.');
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
            <ShoppingCart className="w-6 h-6 text-blue-600" />
            <span>صدور فاکتور خرید کالا و مواد اولیه</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            ثبت خرید رسمی، تسهیم هزینه حمل بر بهای تمام شده، محاسبه ۱۰٪ ارزش افزوده و صدور رسید ورود به انبار
          </p>
        </div>

        <Link
          href="/purchases/invoices"
          className="inline-flex items-center gap-1.5 text-xs text-slate-700 bg-white border border-slate-200 px-3 py-2 rounded-xl hover:bg-slate-50 transition-colors shadow-xs font-semibold"
        >
          <ArrowRight className="w-4 h-4" />
          <span>مشاهده فهرست فاکتورهای خرید</span>
        </Link>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* نتیجه ثبت خرید */}
      {successResult && (
        <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs space-y-3">
          <div className="flex items-center gap-2 font-bold text-sm text-emerald-800">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>فاکتور خرید با موفقیت در سیستم قطعی شد!</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white/80 p-3.5 rounded-xl border border-emerald-100">
            <div>
              <span className="text-slate-500 block text-[11px]">شناسه فاکتور خرید:</span>
              <span className="font-mono font-bold text-slate-800">{successResult.purchaseId || successResult.id}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">سند دوبل خودکار حسابداری:</span>
              <span className="font-mono font-bold text-emerald-700">{successResult.journalEntryId || 'سند دوبل تراز صادر شد'}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">رسید ورود به انبار:</span>
              <span className="font-semibold text-blue-700">موجودی کاردکس انبار افزایش یافت</span>
            </div>
          </div>

          <div className="pt-2 flex gap-3">
            <Link
              href="/accounting/vouchers"
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold flex items-center gap-1.5 transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>مشاهده سند خرید در دفتر روزنامه</span>
            </Link>
            <Link
              href="/inventory/kardex"
              className="px-4 py-2 bg-white text-emerald-800 border border-emerald-300 rounded-lg font-medium hover:bg-emerald-50 transition-colors flex items-center gap-1.5"
            >
              <Package className="w-4 h-4" />
              <span>مشاهده کاردکس کالا</span>
            </Link>
          </div>
        </div>
      )}

      {/* سربرگ فاکتور خرید */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div>
            <label className="block text-slate-600 font-semibold mb-1">شماره فاکتور خرید</label>
            <input
              type="text"
              value={docNumber}
              onChange={(e) => setDocNumber(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 font-mono text-left focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-slate-600 font-semibold mb-1">تاریخ فاکتور (شمسی)</label>
            <input
              type="text"
              value={docDate}
              onChange={(e) => setDocDate(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 font-mono text-left focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-slate-600 font-semibold mb-1">تامین‌کننده / فروشنده *</label>
            <select
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 font-medium"
            >
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} {s.national_id ? `(${s.national_id})` : ''}
                </option>
              ))}
              {suppliers.length === 0 && <option value="sup-1">شرکت پخش البرز (تامین‌کننده)</option>}
            </select>
          </div>

          <div>
            <label className="block text-slate-600 font-semibold mb-1">انبار مقصد (ورود کالا) *</label>
            <select
              value={warehouseId}
              onChange={(e) => setWarehouseId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 font-medium"
            >
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} ({w.code})
                </option>
              ))}
              {warehouses.length === 0 && <option value="wh-1">انبار مرکزی تهران (WH-01)</option>}
            </select>
          </div>
        </div>
      </div>

      {/* جدول اقلام فاکتور خرید */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <Package className="w-4 h-4 text-blue-600" />
            <span>ردیف‌های اقلام خریداری‌شده</span>
          </h2>
          <button
            type="button"
            onClick={addRow}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>افزودن قلم کالا</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-100 text-slate-600 border-b border-slate-200 font-bold">
              <tr>
                <th className="py-2.5 px-3 w-12 text-center">ردیف</th>
                <th className="py-2.5 px-3 min-w-[220px]">شرح کالا یا مواد اولیه</th>
                <th className="py-2.5 px-3 w-28 text-center">تعداد / مقدار</th>
                <th className="py-2.5 px-3 w-36 text-left">فی خرید واحد (ریال)</th>
                <th className="py-2.5 px-3 w-28 text-left">تخفیف (ریال)</th>
                <th className="py-2.5 px-3 w-24 text-center">معاف ارزش افزوده</th>
                <th className="py-2.5 px-3 w-32 text-left">ارزش افزوده (۱۰٪)</th>
                <th className="py-2.5 px-3 w-36 text-left">بهای کل سطر (ریال)</th>
                <th className="py-2.5 px-3 w-12 text-center">حذف</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((row, idx) => {
                const rowNet = Math.max(0, row.quantity * row.unitCost - Number(row.discountAmount || 0));
                const rowVat = row.taxExempt ? 0 : Math.round(rowNet * 0.1);
                const rowTotal = rowNet + rowVat;

                return (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 px-3 text-center text-slate-400 font-mono font-medium">
                      {idx + 1}
                    </td>
                    <td className="py-2.5 px-3">
                      <select
                        value={row.productId}
                        onChange={(e) => updateRow(idx, 'productId', e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg p-1.5 font-medium"
                      >
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.code} - {p.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2.5 px-3">
                      <input
                        type="number"
                        min="1"
                        value={row.quantity}
                        onChange={(e) => updateRow(idx, 'quantity', Number(e.target.value))}
                        className="w-full bg-white border border-slate-300 rounded-lg p-1.5 text-center font-mono font-bold"
                      />
                    </td>
                    <td className="py-2.5 px-3">
                      <input
                        type="number"
                        value={row.unitCost}
                        onChange={(e) => updateRow(idx, 'unitCost', Number(e.target.value))}
                        className="w-full bg-white border border-slate-300 rounded-lg p-1.5 text-left font-mono"
                      />
                    </td>
                    <td className="py-2.5 px-3">
                      <input
                        type="number"
                        value={row.discountAmount}
                        onChange={(e) => updateRow(idx, 'discountAmount', Number(e.target.value))}
                        className="w-full bg-white border border-slate-300 rounded-lg p-1.5 text-left font-mono"
                      />
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <input
                        type="checkbox"
                        checked={row.taxExempt}
                        onChange={(e) => updateRow(idx, 'taxExempt', e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                      />
                    </td>
                    <td className="py-2.5 px-3 text-left font-mono text-slate-600">
                      {formatMoney(rowVat)}
                    </td>
                    <td className="py-2.5 px-3 text-left font-mono font-bold text-slate-900">
                      {formatMoney(rowTotal)}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => removeRow(idx)}
                        disabled={items.length <= 1}
                        className="p-1 text-slate-400 hover:text-rose-600 disabled:opacity-30"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* جمع‌بندی مالی فاکتور خرید */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-3 text-xs">
          <div>
            <label className="block text-slate-700 font-bold mb-1">
              هزینه حمل و باربری (تسهیم بر بهای تمام شده خرید کالا)
            </label>
            <div className="relative">
              <input
                type="number"
                value={freightAmount}
                onChange={(e) => setFreightAmount(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-mono text-left font-bold text-blue-900"
              />
              <Truck className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              طبق استاندارد حسابداری شماره ۸، هزینه حمل مستقیماً به ارزش ریالی موجودی انبار افزوده می‌شود.
            </p>
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1">توضیحات فاکتور خرید</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5"
            />
          </div>
        </div>

        {/* سرجمع مبالغ خرید */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-2.5 text-xs">
          <div className="flex justify-between py-1 text-slate-600">
            <span>جمع ناخالص خرید:</span>
            <span className="font-mono">{formatMoney(subtotal)} ریال</span>
          </div>
          <div className="flex justify-between py-1 text-slate-600">
            <span>مجموع تخفیفات خرید:</span>
            <span className="font-mono text-rose-600">({formatMoney(totalItemDiscount)}) ریال</span>
          </div>
          <div className="flex justify-between py-1 text-slate-600">
            <span>کرایه حمل تسهیم‌شده:</span>
            <span className="font-mono font-semibold text-blue-700">+{formatMoney(freight)} ریال</span>
          </div>
          <div className="flex justify-between py-1 text-slate-600">
            <span>مالیات و عوارض ارزش افزوده خرید (۱۰٪ اعتبار مالیاتی):</span>
            <span className="font-mono font-semibold">{formatMoney(totalTax)} ریال</span>
          </div>
          <div className="flex justify-between py-2 border-t-2 border-slate-200 text-sm font-black text-slate-900">
            <span>مبلغ نهایی پرداختنی به فروشنده:</span>
            <span className="font-mono text-blue-700 text-base">{formatMoney(grandTotal)} ریال</span>
          </div>

          <div className="pt-3">
            <button
              type="button"
              disabled={loading}
              onClick={handleSavePurchase}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-900/30 transition-all disabled:opacity-50"
            >
              {loading ? (
                <span>در حال ثبت فاکتور خرید و رسید انبار...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>تایید و صدور فاکتور خرید، رسید انبار و سند دوبل</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
