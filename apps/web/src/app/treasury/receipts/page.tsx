'use client';

import React, { useEffect, useState } from 'react';
import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  Plus,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Building,
  CreditCard,
  Banknote,
  DollarSign,
} from 'lucide-react';
import Link from 'next/link';
import { fetchApi, formatMoney } from '../../../lib/api';

export default function ReceiptsAndPaymentsPage() {
  const [mode, setMode] = useState<'RECEIPT' | 'PAYMENT'>('RECEIPT');
  const [docDate, setDocDate] = useState('1403/08/26');
  const [selectedPartyId, setSelectedPartyId] = useState('');
  const [amount, setAmount] = useState('85000000');
  const [method, setMethod] = useState<'CASH' | 'BANK' | 'CHEQUE'>('BANK');
  const [targetId, setTargetId] = useState('');
  const [trackingCode, setTrackingCode] = useState(`TRK-${Date.now().toString().slice(-6)}`);
  const [description, setDescription] = useState('دریافت وجه از مشتری بابت تسویه مطالبات');

  const [parties, setParties] = useState<any[]>([]);
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [cashDesks, setCashDesks] = useState<any[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<any>(null);

  const loadInitialData = async () => {
    try {
      const [partiesRes, banksRes, cashRes] = await Promise.all([
        fetchApi('/parties').catch(() => ({ data: [] })),
        fetchApi('/treasury/bank-accounts').catch(() => ({ data: [] })),
        fetchApi('/treasury/cash-desks').catch(() => ({ data: [] })),
      ]);

      const pList = partiesRes.data || [];
      setParties(pList);
      if (pList.length > 0) setSelectedPartyId(pList[0].id);

      const bList = banksRes.data || [];
      setBankAccounts(bList);

      const cList = cashRes.data || [];
      setCashDesks(cList);

      if (bList.length > 0) setTargetId(bList[0].id);
      else if (cList.length > 0) setTargetId(cList[0].id);
    } catch (e) {
      console.warn('Receipts data loading error:', e);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessResult(null);

    if (!selectedPartyId && parties.length > 0) {
      setError('لطفاً طرف‌حساب را انتخاب کنید.');
      return;
    }

    if (!amount || Number(amount) <= 0) {
      setError('مبلغ باید بزرگتر از صفر باشد.');
      return;
    }

    setLoading(true);
    try {
      // پیدا کردن تفصیلی‌های حساب
      const party = parties.find((p) => p.id === selectedPartyId);
      const partyDimId = party?.floating_dimension_id || 'dim-party-1';

      let assetSub = '10102'; // موجودی نزد بانک‌ها
      let assetDimId: string | undefined;

      if (method === 'CASH') {
        assetSub = '10101'; // صندوق
        assetDimId = cashDesks[0]?.floating_dimension_id;
      } else if (method === 'BANK') {
        assetSub = '10102'; // بانک
        assetDimId = bankAccounts[0]?.floating_dimension_id;
      } else {
        assetSub = '10201'; // اسناد دریافتنی تجاری (چک)
      }

      // تولید سطر بدهکار و بستانکار
      const partySub = mode === 'RECEIPT' ? '10301' : '20101'; // بدهکاران یا بستانکاران

      const lines =
        mode === 'RECEIPT'
          ? [
              {
                subsidiaryAccountId: assetSub,
                floatingDimensionId: assetDimId,
                description: `${description} - ${party?.name || ''}`,
                debitAmount: amount.toString(),
                creditAmount: '0',
              },
              {
                subsidiaryAccountId: partySub,
                floatingDimensionId: partyDimId,
                description: `تسویه حساب - ${party?.name || ''}`,
                debitAmount: '0',
                creditAmount: amount.toString(),
              },
            ]
          : [
              {
                subsidiaryAccountId: partySub,
                floatingDimensionId: partyDimId,
                description: `پرداخت وجه به - ${party?.name || ''}`,
                debitAmount: amount.toString(),
                creditAmount: '0',
              },
              {
                subsidiaryAccountId: assetSub,
                floatingDimensionId: assetDimId,
                description: `${description} - پیگیری: ${trackingCode}`,
                debitAmount: '0',
                creditAmount: amount.toString(),
              },
            ];

      const res = await fetchApi('/accounting/journal-entries', {
        method: 'POST',
        body: JSON.stringify({
          entryDateShamsi: docDate,
          entryType: 'NORMAL',
          description: `${mode === 'RECEIPT' ? 'دریافت وجه' : 'پرداخت وجه'}: ${party?.name || ''} - ${description}`,
          sourceModule: 'TREASURY',
          lines,
        }),
      });

      if (res.data) {
        setSuccessResult({
          voucherNumber: res.data.entryNumber || res.data.sequenceNumber || 'سند جدید',
          amount,
          partyName: party?.name || 'طرف‌حساب',
          mode,
        });

        // افزودن به لیست تراکنش‌های اخیر
        setRecentTransactions((prev) => [
          {
            id: `rec-${Date.now()}`,
            mode,
            partyName: party?.name || 'طرف‌حساب',
            amount,
            method,
            trackingCode,
            date: docDate,
            voucherId: res.data.id,
          },
          ...prev,
        ]);

        setTrackingCode(`TRK-${Date.now().toString().slice(-6)}`);
      } else {
        setError(res.message || 'خطا در ثبت برگه دریافت/پرداخت.');
      }
    } catch (err: any) {
      setError(err.message || 'خطا در برقراری ارتباط با سرویس خزانه‌داری.');
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
            <Wallet className="w-6 h-6 text-emerald-600" />
            <span>برگه دریافت و پرداخت وجوه خزانه‌داری</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            ثبت دریافت از مشتریان، پرداخت به تامین‌کنندگان و پرسنل، تسویه فاکتورها و صدور اتوماتیک سند دوبل
          </p>
        </div>

        <Link
          href="/treasury/cheques"
          className="inline-flex items-center gap-1.5 text-xs text-purple-700 bg-purple-50 border border-purple-200 px-3 py-2 rounded-xl hover:bg-purple-100 transition-colors shadow-xs font-bold"
        >
          <CreditCard className="w-4 h-4" />
          <span>مشاهده کارتابل چک‌های صیادی</span>
        </Link>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successResult && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>
              برگه {successResult.mode === 'RECEIPT' ? 'دریافت' : 'پرداخت'} به مبلغ{' '}
              <strong className="font-mono text-sm">{formatMoney(successResult.amount)} ریال</strong> با موفقیت ثبت
              و سند دوبل تراز صادر شد.
            </span>
          </div>
          <Link
            href="/accounting/vouchers"
            className="text-xs font-bold text-emerald-700 underline hover:text-emerald-900"
          >
            مشاهده در دفتر روزنامه
          </Link>
        </div>
      )}

      {/* انتخاب نوع عملیات (دریافت یا پرداخت) */}
      <div className="flex rounded-2xl bg-white p-2 border border-slate-200 shadow-xs max-w-md">
        <button
          type="button"
          onClick={() => {
            setMode('RECEIPT');
            setDescription('دریافت وجه از مشتری بابت تسویه حساب');
          }}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${
            mode === 'RECEIPT'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <ArrowDownLeft className="w-4 h-4" />
          <span>برگه دریافت وجه (از مشتری / بستانکاران)</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setMode('PAYMENT');
            setDescription('پرداخت وجه به تامین‌کننده / هزینه');
          }}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${
            mode === 'PAYMENT'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <ArrowUpRight className="w-4 h-4" />
          <span>برگه پرداخت وجه (به تامین‌کننده / تنخواه)</span>
        </button>
      </div>

      {/* فرم ثبت دریافت یا پرداخت */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
        <form onSubmit={handleSave} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-slate-600 font-semibold mb-1">تاریخ عملیات (شمسی) *</label>
              <input
                type="text"
                value={docDate}
                onChange={(e) => setDocDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-mono text-left focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-slate-600 font-semibold mb-1">
                {mode === 'RECEIPT' ? 'طرف‌حساب پرداخت‌کننده (مشتری) *' : 'طرف‌حساب دریافت‌کننده (تامین‌کننده) *'}
              </label>
              <select
                value={selectedPartyId}
                onChange={(e) => setSelectedPartyId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-semibold"
              >
                {parties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.national_id ? `(${p.national_id})` : ''}
                  </option>
                ))}
                {parties.length === 0 && <option value="party-1">مشتری عمومی پیش‌فرض</option>}
              </select>
            </div>

            <div>
              <label className="block text-slate-600 font-semibold mb-1">مبلغ عملیات (ریال) *</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-mono text-left text-sm font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* روش پرداخت و حساب مالی */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div>
              <label className="block text-slate-600 font-semibold mb-1">روش تسویه *</label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value as any)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-medium"
              >
                <option value="BANK">واریز / فیش / حواله بانکی</option>
                <option value="CASH">نقد (صندوق مرکزی)</option>
                <option value="CHEQUE">چک صیادی بنفش</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-600 font-semibold mb-1">
                {method === 'BANK' ? 'حساب بانکی عامل' : method === 'CASH' ? 'صندوق' : 'وضعیت چک'}
              </label>
              {method === 'BANK' ? (
                <select
                  value={targetId}
                  onChange={(e) => setTargetId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-medium"
                >
                  {bankAccounts.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.bank_name} - {b.account_number}
                    </option>
                  ))}
                  {bankAccounts.length === 0 && <option value="bank-1">بانک ملت - حساب جاری</option>}
                </select>
              ) : method === 'CASH' ? (
                <select
                  value={targetId}
                  onChange={(e) => setTargetId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-medium"
                >
                  {cashDesks.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title} ({c.code})
                    </option>
                  ))}
                  {cashDesks.length === 0 && <option value="cash-1">صندوق مرکزی فروشگاه</option>}
                </select>
              ) : (
                <div className="bg-purple-50 border border-purple-200 text-purple-800 rounded-xl p-2.5 font-semibold">
                  دریافت مستقیم در کارتابل چک‌های صیادی
                </div>
              )}
            </div>

            <div>
              <label className="block text-slate-600 font-semibold mb-1">شماره ارجاع / پیگیری بانکی</label>
              <input
                type="text"
                value={trackingCode}
                onChange={(e) => setTrackingCode(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-mono text-left"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-600 font-semibold mb-1">شرح برگه و آرتیکل سند</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5"
            />
          </div>

          <div className="pt-3 flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className={`px-6 py-3 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg transition-all disabled:opacity-50 ${
                mode === 'RECEIPT'
                  ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/30'
                  : 'bg-rose-600 hover:bg-rose-500 shadow-rose-900/30'
              }`}
            >
              {loading ? (
                <span>در حال ثبت سند خزانه‌داری...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>ثبت قطعی برگه {mode === 'RECEIPT' ? 'دریافت' : 'پرداخت'} و صدور سند دوبل</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* تراکنش‌های اخیر */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-4">
        <h3 className="text-xs font-bold text-slate-800 flex items-center gap-2">
          <FileSpreadsheet className="w-4 h-4 text-slate-600" />
          <span>تراکنش‌های اخیر دریافت و پرداخت</span>
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold">
              <tr>
                <th className="py-2.5 px-3">نوع عملیات</th>
                <th className="py-2.5 px-3">طرف‌حساب</th>
                <th className="py-2.5 px-3 text-left">مبلغ (ریال)</th>
                <th className="py-2.5 px-3 text-center">روش تسویه</th>
                <th className="py-2.5 px-3 text-center">شماره پیگیری</th>
                <th className="py-2.5 px-3 text-center">تاریخ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentTransactions.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50">
                  <td className="py-3 px-3">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        t.mode === 'RECEIPT'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {t.mode === 'RECEIPT' ? 'دریافت وجه' : 'پرداخت وجه'}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-semibold text-slate-800">{t.partyName}</td>
                  <td className="py-3 px-3 text-left font-mono font-bold text-slate-900">
                    {formatMoney(t.amount)}
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">
                      {t.method === 'BANK' ? 'حواله بانکی' : t.method === 'CASH' ? 'نقد' : 'چک صیادی'}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-center font-mono text-slate-600">{t.trackingCode}</td>
                  <td className="py-3 px-3 text-center font-mono text-slate-600">{t.date}</td>
                </tr>
              ))}
              {recentTransactions.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-slate-400">
                    هنوز تراکنشی در این نشست ثبت نشده است.
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
