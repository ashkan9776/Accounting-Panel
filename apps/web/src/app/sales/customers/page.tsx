'use client';

import React, { useEffect, useState } from 'react';
import {
  Users,
  Plus,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertCircle,
  Building,
  Phone,
} from 'lucide-react';
import { fetchApi, formatMoney } from '../../../lib/api';

export default function CustomersPage() {
  const [parties, setParties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // فرم ایجاد مشتری
  const [name, setName] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [mobile, setMobile] = useState('');
  const [creditLimit, setCreditLimit] = useState('500000000');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const res = await fetchApi('/parties?type=customer');
      if (res.data) {
        setParties(res.data);
      }
    } catch (e) {
      console.warn('Failed loading parties:', e);
      setParties([
        {
          id: 'party-customer-1',
          name: 'شرکت توزیع و پخش البرز (سهامی خاص)',
          party_type: 'LEGAL',
          national_id: '10103456789',
          mobile: '09123456789',
          credit_limit: 1000000000,
          is_customer: 1,
        },
        {
          id: 'party-customer-2',
          name: 'فروشگاه زنجیره‌ای رفاه نوین',
          party_type: 'LEGAL',
          national_id: '10109876543',
          mobile: '09129876543',
          credit_limit: 800000000,
          is_customer: 1,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError('نام مشتری الزامی است.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        partyType: 'LEGAL',
        nationalId: nationalId.trim() || undefined,
        mobile: mobile.trim() || undefined,
        creditLimit: Number(creditLimit),
        isCustomer: true,
        isSupplier: false,
      };

      const res = await fetchApi('/parties', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (res.data) {
        setShowModal(false);
        setName('');
        setNationalId('');
        setMobile('');
        loadCustomers();
      } else {
        setError(res.message || 'خطا در ثبت مشتری.');
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
            <Users className="w-6 h-6 text-emerald-600" />
            <span>طرف‌حساب‌ها و مشتریان</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            تعریف اشخاص حقیقی و حقوقی، سقف اعتبار، شناسه ملی جهت صدور فاکتور رسمی و اتصال به تفصیلی شناور
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadCustomers}
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
            <span>تعریف طرف‌حساب جدید</span>
          </button>
        </div>
      </div>

      {/* مودال افزودن مشتری */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 text-xs space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h2 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-600" />
                <span>تعریف مشتری جدید</span>
              </h2>
              <button
                onClick={() => setShowModal(false)}
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

            <form onSubmit={handleCreateCustomer} className="space-y-3">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">نام طرف‌حساب / شرکت *</label>
                <input
                  type="text"
                  placeholder="مثال: شرکت بازرگانی سپهر..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">شناسه ملی / کد ملی</label>
                <input
                  type="text"
                  dir="ltr"
                  placeholder="۱۰ یا ۱۱ رقمی"
                  value={nationalId}
                  onChange={(e) => setNationalId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-mono text-left"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">شماره موبایل یا تماس</label>
                <input
                  type="text"
                  dir="ltr"
                  placeholder="0912xxxxxxx"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-mono text-left"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">سقف اعتبار نسیه (ریال)</label>
                <input
                  type="number"
                  value={creditLimit}
                  onChange={(e) => setCreditLimit(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-left font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-700 disabled:opacity-50"
                >
                  {saving ? 'در حال ثبت...' : 'ثبت مشتری'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* جدول مشتریان */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-bold">
              <tr>
                <th className="py-2.5 px-3 w-12 text-center">ردیف</th>
                <th className="py-2.5 px-3">نام و مشخصات شخص</th>
                <th className="py-2.5 px-3 w-36 text-center">شناسه ملی / کد اقتصادی</th>
                <th className="py-2.5 px-3 w-32 text-center">موبایل</th>
                <th className="py-2.5 px-3 w-36 text-left">سقف اعتبار (ریال)</th>
                <th className="py-2.5 px-3 w-28 text-center">نوع</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {parties.map((c, idx) => (
                <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                  <td className="py-3 px-3 font-semibold text-slate-900">{c.name}</td>
                  <td className="py-3 px-3 text-center font-mono text-slate-600">
                    {c.national_id || c.nationalId || '-'}
                  </td>
                  <td className="py-3 px-3 text-center font-mono text-slate-600">
                    {c.mobile || '-'}
                  </td>
                  <td className="py-3 px-3 text-left font-mono font-bold text-slate-800">
                    {formatMoney(c.credit_limit || c.creditLimit || 0)}
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span className="text-[10px] font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-200">
                      {c.party_type === 'LEGAL' ? 'حقوقی' : 'حقیقی'}
                    </span>
                  </td>
                </tr>
              ))}
              {parties.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    مشتری یافت نشد. برای صدور فاکتور، یک طرف‌حساب جدید اضافه کنید.
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
