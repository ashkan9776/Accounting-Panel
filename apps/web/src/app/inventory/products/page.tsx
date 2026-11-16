'use client';

import React, { useEffect, useState } from 'react';
import {
  Package,
  Plus,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertCircle,
  Tag,
  Barcode,
  Layers,
} from 'lucide-react';
import { fetchApi, formatMoney } from '../../../lib/api';

export default function ProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  // فرم افزودن کالا
  const [code, setCode] = useState(`PRD-${Date.now().toString().slice(-4)}`);
  const [name, setName] = useState('');
  const [sellPrice, setSellPrice] = useState('15000000');
  const [purchasePrice, setPurchasePrice] = useState('10000000');
  const [taxExempt, setTaxExempt] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const res = await fetchApi('/inventory/products');
      if (res.data) {
        setProducts(res.data);
      }
    } catch (e) {
      console.warn('Failed loading products:', e);
      setProducts([
        {
          id: 'prod-sample-1',
          code: 'PRD-1001',
          name: 'روغن نباتی ۵ لیتری لادن',
          type: 'GOODS',
          sell_price: 18500000,
          purchase_price: 15000000,
          tax_exempt: 0,
        },
        {
          id: 'prod-sample-2',
          code: 'PRD-1002',
          name: 'برنج طارم درجه یک هاشمی (۱۰ کیلوگرم)',
          type: 'GOODS',
          sell_price: 125000000,
          purchase_price: 105000000,
          tax_exempt: 1,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError('نام کالا الزامی است.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        code,
        name: name.trim(),
        unitId: 'unit-piece-1',
        type: 'GOODS',
        sellPrice: Number(sellPrice),
        purchasePrice: Number(purchasePrice),
        taxExempt,
        vatRate: taxExempt ? 0 : 10,
      };

      const res = await fetchApi('/inventory/products', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (res.data) {
        setShowAddModal(false);
        setName('');
        setCode(`PRD-${Date.now().toString().slice(-4)}`);
        loadProducts();
      } else {
        setError(res.message || 'خطا در ثبت کالا.');
      }
    } catch (err: any) {
      setError(err.message || 'خطا در برقراری ارتباط.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* هدر صفحه */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <Package className="w-6 h-6 text-emerald-600" />
            <span>کاتالوگ کالا و خدمات</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            مدیریت محصولات، قیمت‌گذاری، بارکد، وضعیت معافیت ارزش افزوده و روش ارزش‌گذاری کاردکس
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadProducts}
            disabled={loading}
            className="p-2 text-slate-600 hover:text-emerald-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-xs"
            title="بروزرسانی"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>تعریف کالای جدید</span>
          </button>
        </div>
      </div>

      {/* مودال افزودن کالا */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 text-xs space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h2 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-600" />
                <span>تعریف کالای جدید</span>
              </h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 text-base font-bold"
              >
                ✕
              </button>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700">
                {error}
              </div>
            )}

            <form onSubmit={handleCreateProduct} className="space-y-3">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">کد کالا *</label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-mono text-left"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">نام و عنوان کالا *</label>
                <input
                  type="text"
                  placeholder="مثال: برنج طارم محلی..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">قیمت فروش (ریال)</label>
                  <input
                    type="number"
                    value={sellPrice}
                    onChange={(e) => setSellPrice(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-left font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">قیمت خرید (ریال)</label>
                  <input
                    type="number"
                    value={purchasePrice}
                    onChange={(e) => setPurchasePrice(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-left font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="taxExemptCheck"
                  checked={taxExempt}
                  onChange={(e) => setTaxExempt(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded"
                />
                <label htmlFor="taxExemptCheck" className="text-slate-700 font-medium">
                  معاف از مالیات بر ارزش افزوده (مواد غذایی خام و دارویی)
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-700 disabled:opacity-50"
                >
                  {saving ? 'در حال ذخیره...' : 'ذخیره کالا'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* جدول فهرست کالاها */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-bold">
              <tr>
                <th className="py-2.5 px-3 w-12 text-center">ردیف</th>
                <th className="py-2.5 px-3 w-28 text-left">کد کالا</th>
                <th className="py-2.5 px-3">نام و شرح کالا</th>
                <th className="py-2.5 px-3 w-32 text-left">قیمت فروش (ریال)</th>
                <th className="py-2.5 px-3 w-32 text-left">قیمت خرید (ریال)</th>
                <th className="py-2.5 px-3 w-28 text-center">وضعیت مالیاتی</th>
                <th className="py-2.5 px-3 w-28 text-center">نوع</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {products.map((p, idx) => (
                <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                  <td className="py-3 px-3 font-mono font-bold text-slate-700 text-left">{p.code}</td>
                  <td className="py-3 px-3 font-semibold text-slate-900">{p.name}</td>
                  <td className="py-3 px-3 text-left font-mono font-bold text-emerald-700">
                    {formatMoney(p.sell_price || p.sellPrice)}
                  </td>
                  <td className="py-3 px-3 text-left font-mono text-slate-600">
                    {formatMoney(p.purchase_price || p.purchasePrice)}
                  </td>
                  <td className="py-3 px-3 text-center">
                    {p.tax_exempt || p.taxExempt ? (
                      <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full">
                        معاف ارزش افزوده
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full">
                        ۱۰٪ ارزش افزوده
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span className="text-[10px] font-medium bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full">
                      {p.type || 'GOODS'}
                    </span>
                  </td>
                </tr>
              ))}
              {products.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    کالایی یافت نشد. برای شروع کالای جدیدی ثبت نمایید.
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
