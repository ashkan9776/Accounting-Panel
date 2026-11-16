'use client';

import React, { useEffect, useState } from 'react';
import {
  Building,
  Plus,
  RefreshCw,
  Wallet,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Landmark,
  ArrowRight,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';
import Link from 'next/link';
import { fetchApi, formatMoney } from '../../../lib/api';

export default function BanksAndCashPage() {
  const [activeTab, setActiveTab] = useState<'BANKS' | 'CASH' | 'PETTY'>('BANKS');
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [cashDesks, setCashDesks] = useState<any[]>([]);
  const [pettyCashFunds, setPettyCashFunds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // مودال افزودن حساب بانکی
  const [showBankModal, setShowBankModal] = useState(false);
  const [bankName, setBankName] = useState('بانک ملت');
  const [branchName, setBranchName] = useState('شعبه مرکزی ونک');
  const [accountNumber, setAccountNumber] = useState('4455667788');
  const [iban, setIban] = useState('IR120120000000004455667788');
  const [cardNumber, setCardNumber] = useState('6104337890123456');
  const [initialBalance, setInitialBalance] = useState('500000000');
  const [bankSaving, setBankSaving] = useState(false);

  // مودال افزودن صندوق
  const [showCashModal, setShowCashModal] = useState(false);
  const [cashCode, setCashCode] = useState(`CSH-${Date.now().toString().slice(-3)}`);
  const [cashTitle, setCashTitle] = useState('صندوق شماره ۲ فروشگاه');
  const [cashInitialBalance, setCashInitialBalance] = useState('50000000');
  const [cashSaving, setCashSaving] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [banksRes, cashRes, pettyRes] = await Promise.all([
        fetchApi('/treasury/bank-accounts').catch(() => ({ data: [] })),
        fetchApi('/treasury/cash-desks').catch(() => ({ data: [] })),
        fetchApi('/treasury/petty-cash').catch(() => ({ data: [] })),
      ]);

      setBankAccounts(banksRes.data || []);
      setCashDesks(cashRes.data || []);
      setPettyCashFunds(pettyRes.data || []);
    } catch (e: any) {
      console.warn('Banks load error:', e);
      // Fallback data
      setBankAccounts([
        {
          id: 'bank-1',
          bank_name: 'بانک ملت',
          branch_name: 'شعبه مرکزی ونک',
          account_number: '4455667788',
          iban: 'IR120120000000004455667788',
          card_number: '6104337890123456',
          dimension_code: '300001',
          initial_balance: 750000000,
        },
        {
          id: 'bank-2',
          bank_name: 'بانک سامان',
          branch_name: 'سعادت‌آباد',
          account_number: '8899001122',
          iban: 'IR560560000000008899001122',
          card_number: '6219861012345678',
          dimension_code: '300002',
          initial_balance: 420000000,
        },
      ]);
      setCashDesks([
        {
          id: 'cash-1',
          code: 'CSH-01',
          title: 'صندوق مرکزی هلدینگ',
          dimension_code: '400001',
          initial_balance: 85000000,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateBankAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setBankSaving(true);
    setError(null);
    try {
      const payload = {
        bankName,
        branchName,
        accountNumber,
        iban,
        cardNumber,
        initialBalance: Number(initialBalance),
      };

      const res = await fetchApi('/treasury/bank-accounts', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (res.data) {
        setShowBankModal(false);
        loadData();
      } else {
        setError(res.message || 'خطا در ثبت حساب بانکی.');
      }
    } catch (err: any) {
      setError(err.message || 'خطا در ایجاد حساب بانکی.');
    } finally {
      setBankSaving(false);
    }
  };

  const handleCreateCashDesk = async (e: React.FormEvent) => {
    e.preventDefault();
    setCashSaving(true);
    setError(null);
    try {
      const payload = {
        code: cashCode,
        title: cashTitle,
        initialBalance: Number(cashInitialBalance),
      };

      const res = await fetchApi('/treasury/cash-desks', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (res.data) {
        setShowCashModal(false);
        setCashCode(`CSH-${Date.now().toString().slice(-3)}`);
        loadData();
      } else {
        setError(res.message || 'خطا در ثبت صندوق.');
      }
    } catch (err: any) {
      setError(err.message || 'خطا در ایجاد صندوق.');
    } finally {
      setCashSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* هدر صفحه */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <Landmark className="w-6 h-6 text-emerald-600" />
            <span>حساب‌های بانکی، صندوق‌ها و تنخواه‌گردان‌ها</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            مدیریت حساب‌های بانکی شرکتی، شماره شبا، کارتخوان‌های متصل، صندوق‌ها و تفصیلی‌های شناور سطح ۴
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
            onClick={() => setShowBankModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>افتتاح حساب بانکی جدید</span>
          </button>
          <button
            onClick={() => setShowCashModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>تعریف صندوق جدید</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* تب‌ها */}
      <div className="flex rounded-2xl bg-white p-1.5 border border-slate-200 shadow-xs max-w-lg text-xs font-bold">
        <button
          type="button"
          onClick={() => setActiveTab('BANKS')}
          className={`flex-1 py-2 px-3 rounded-xl transition-all ${
            activeTab === 'BANKS'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          حساب‌های بانکی ({bankAccounts.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('CASH')}
          className={`flex-1 py-2 px-3 rounded-xl transition-all ${
            activeTab === 'CASH'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          صندوق‌ها ({cashDesks.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('PETTY')}
          className={`flex-1 py-2 px-3 rounded-xl transition-all ${
            activeTab === 'PETTY'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          تنخواه‌گردان‌ها ({pettyCashFunds.length})
        </button>
      </div>

      {/* محتوای تب حساب‌های بانکی */}
      {activeTab === 'BANKS' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-bold">
                <tr>
                  <th className="py-3 px-3 w-12 text-center">ردیف</th>
                  <th className="py-3 px-3 w-36">نام بانک و شعبه</th>
                  <th className="py-3 px-3 w-32 font-mono text-left">شماره حساب</th>
                  <th className="py-3 px-3 w-56 font-mono text-left">شماره شبا (IBAN)</th>
                  <th className="py-3 px-3 w-40 font-mono text-left">شماره کارت</th>
                  <th className="py-3 px-3 w-28 text-center">کد تفصیلی</th>
                  <th className="py-3 px-3 w-40 text-left">موجودی اولیه (ریال)</th>
                  <th className="py-3 px-3 w-24 text-center">وضعیت</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {bankAccounts.map((b, idx) => (
                  <tr key={b.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                    <td className="py-3 px-3 font-bold text-slate-900">
                      {b.bank_name} {b.branch_name ? `(${b.branch_name})` : ''}
                    </td>
                    <td className="py-3 px-3 font-mono font-semibold text-slate-700 text-left">
                      {b.account_number}
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-600 text-left">{b.iban || '-'}</td>
                    <td className="py-3 px-3 font-mono text-slate-600 text-left">{b.card_number || '-'}</td>
                    <td className="py-3 px-3 text-center">
                      <span className="font-mono text-[11px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">
                        {b.dimension_code || '300001'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-left font-mono font-bold text-emerald-800">
                      {formatMoney(b.initial_balance)}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full">
                        فعال
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* محتوای تب صندوق‌ها */}
      {activeTab === 'CASH' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-bold">
                <tr>
                  <th className="py-3 px-3 w-12 text-center">ردیف</th>
                  <th className="py-3 px-3 w-28 text-left">کد صندوق</th>
                  <th className="py-3 px-3">عنوان و نام صندوق</th>
                  <th className="py-3 px-3 w-28 text-center">کد تفصیلی</th>
                  <th className="py-3 px-3 w-40 text-left">موجودی اولیه (ریال)</th>
                  <th className="py-3 px-3 w-24 text-center">وضعیت</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {cashDesks.map((c, idx) => (
                  <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                    <td className="py-3 px-3 font-mono font-bold text-slate-700 text-left">{c.code}</td>
                    <td className="py-3 px-3 font-semibold text-slate-900">{c.title}</td>
                    <td className="py-3 px-3 text-center">
                      <span className="font-mono text-[11px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">
                        {c.dimension_code || '400001'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-left font-mono font-bold text-emerald-800">
                      {formatMoney(c.initial_balance)}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full">
                        فعال
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* محتوای تب تنخواه‌گردان‌ها */}
      {activeTab === 'PETTY' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 text-xs text-center text-slate-500">
          تنخواه‌گردان‌های تعریف‌شده بر اساس آیین‌نامه تنخواه شرکت با سقف اعتبار و شارژ دوره‌ای در این بخش مدیریت می‌شوند.
        </div>
      )}

      {/* مودال افزودن حساب بانکی */}
      {showBankModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 text-xs space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h2 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                <Landmark className="w-4 h-4 text-emerald-600" />
                <span>افتتاح حساب بانکی جدید</span>
              </h2>
              <button
                onClick={() => setShowBankModal(false)}
                className="text-slate-400 hover:text-slate-600 text-base font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateBankAccount} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">نام بانک *</label>
                  <input
                    type="text"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">نام شعبه</label>
                  <input
                    type="text"
                    value={branchName}
                    onChange={(e) => setBranchName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">شماره حساب *</label>
                <input
                  type="text"
                  dir="ltr"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 font-mono text-left"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">شماره شبا (IBAN)</label>
                <input
                  type="text"
                  dir="ltr"
                  placeholder="IR..."
                  value={iban}
                  onChange={(e) => setIban(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 font-mono text-left"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">شماره کارت متصل</label>
                <input
                  type="text"
                  dir="ltr"
                  placeholder="۱۶ رقمی"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 font-mono text-left"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">موجودی اولیه (ریال)</label>
                <input
                  type="number"
                  value={initialBalance}
                  onChange={(e) => setInitialBalance(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 font-mono text-left text-sm font-bold text-emerald-800"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowBankModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={bankSaving}
                  className="px-5 py-2 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 disabled:opacity-50"
                >
                  {bankSaving ? 'در حال افتتاح حساب...' : 'ثبت و اتصال به تفصیلی شناور'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* مودال افزودن صندوق */}
      {showCashModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 text-xs space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h2 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                <Wallet className="w-4 h-4 text-slate-800" />
                <span>تعریف صندوق جدید</span>
              </h2>
              <button
                onClick={() => setShowCashModal(false)}
                className="text-slate-400 hover:text-slate-600 text-base font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCashDesk} className="space-y-3">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">کد صندوق *</label>
                <input
                  type="text"
                  value={cashCode}
                  onChange={(e) => setCashCode(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 font-mono text-left"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">عنوان صندوق *</label>
                <input
                  type="text"
                  value={cashTitle}
                  onChange={(e) => setCashTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">موجودی اولیه (ریال)</label>
                <input
                  type="number"
                  value={cashInitialBalance}
                  onChange={(e) => setCashInitialBalance(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 font-mono text-left font-bold"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowCashModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={cashSaving}
                  className="px-5 py-2 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 disabled:opacity-50"
                >
                  {cashSaving ? 'در حال ثبت...' : 'ثبت صندوق و اتصال به تفصیلی'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
