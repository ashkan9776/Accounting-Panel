'use client';

import React, { useEffect, useState } from 'react';
import {
  Package,
  Plus,
  RefreshCw,
  Building,
  Phone,
  User,
  CheckCircle2,
  AlertCircle,
  Layers,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import Link from 'next/link';
import { fetchApi, formatMoney } from '../../../lib/api';

export default function WarehousesPage() {
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [stockSummary, setStockSummary] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // فرم ایجاد انبار جدید
  const [showModal, setShowModal] = useState(false);
  const [code, setCode] = useState(`WH-0${Date.now().toString().slice(-2)}`);
  const [name, setName] = useState('');
  const [keeperName, setKeeperName] = useState('رضا اکبری');
  const [phone, setPhone] = useState('02188880000');
  const [address, setAddress] = useState('تهران، جاده مخصوص کرج، کیلومتر ۱۱، سوله ۴');
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [whRes, summaryRes] = await Promise.all([
        fetchApi('/inventory/warehouses').catch(() => ({ data: [] })),
        fetchApi('/inventory/stock-summary').catch(() => ({ data: [] })),
      ]);

      const whList = whRes.data || [];
      setWarehouses(whList);
      setStockSummary(summaryRes.data || []);
    } catch (e: any) {
      console.warn('Warehouses fetch error:', e);
      setWarehouses([
        {
          id: 'wh-main-1',
          code: 'WH-01',
          name: 'انبار مرکزی مواد و کالا',
          keeper_name: 'رضا انباردار',
          phone: '02188880001',
          address: 'تهران، جاده مخصوص کرج، سوله مرکزی ۱',
        },
        {
          id: 'wh-shop-1',
          code: 'WH-02',
          name: 'انبار فروشگاه و ویترین',
          keeper_name: 'محمد رضایی',
          phone: '02188880002',
          address: 'تهران، میدان ونک، برج پیشرو، طبقه همکف',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateWarehouse = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError('نام انبار الزامی است.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        code,
        name: name.trim(),
        keeperName: keeperName.trim(),
        phone: phone.trim(),
        address: address.trim(),
      };

      const res = await fetchApi('/inventory/warehouses', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (res.data) {
        setShowModal(false);
        setName('');
        setCode(`WH-0${Date.now().toString().slice(-2)}`);
        loadData();
      } else {
        setError(res.message || 'خطا در ثبت انبار.');
      }
    } catch (err: any) {
      setError(err.message || 'خطا در ذخیره‌سازی.');
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
            <span>مدیریت انبارها و موجودی شعب</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            تعریف انبارهای فیزیکی و مجازی (مرکزی، فروشگاهی، ضایعات، امانی) و نظارت بر کاردکس و تحویل کالا
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            disabled={loading}
            className="p-2 text-slate-600 hover:text-emerald-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-xs"
            title="بروزرسانی"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>تعریف انبار جدید</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* کارت‌های خلاصه انبارها */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {warehouses.map((wh) => (
          <div
            key={wh.id}
            className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-3 relative overflow-hidden"
          >
            <div className="flex items-center justify-between">
              <span className="font-mono font-bold text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">
                {wh.code}
              </span>
              <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                فعال و عملیاتی
              </span>
            </div>

            <div>
              <h2 className="text-base font-black text-slate-900">{wh.name}</h2>
              <div className="text-xs text-slate-500 flex items-center gap-1.5 mt-1">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span>انباردار مسئول: {wh.keeper_name || wh.keeperName || 'تعیین‌نشده'}</span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 text-xs text-slate-500 space-y-1">
              <div className="flex items-center gap-1.5 truncate">
                <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate">{wh.address || 'نشانی ثبت نشده است'}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="font-mono">{wh.phone || '-'}</span>
              </div>
            </div>

            <div className="pt-2">
              <Link
                href={`/inventory/kardex?warehouseId=${wh.id}`}
                className="w-full py-1.5 px-3 bg-slate-50 hover:bg-emerald-50 text-emerald-700 border border-slate-200 hover:border-emerald-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>مشاهده کاردکس کالاها در این انبار</span>
              </Link>
            </div>
          </div>
        ))}
      </div>

      {/* مودال افزودن انبار جدید */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 text-xs space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h2 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-600" />
                <span>تعریف انبار جدید</span>
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 text-base font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateWarehouse} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">کد انبار *</label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 font-mono text-left"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">نام انبار *</label>
                  <input
                    type="text"
                    placeholder="مثال: انبار قطعات یدکی..."
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">نام انباردار مسئول</label>
                  <input
                    type="text"
                    value={keeperName}
                    onChange={(e) => setKeeperName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">تلفن انبار</label>
                  <input
                    type="text"
                    dir="ltr"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 font-mono text-left"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">نشانی و موقعیت فیزیکی</label>
                <textarea
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 disabled:opacity-50"
                >
                  {saving ? 'در حال ثبت...' : 'ثبت انبار'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
