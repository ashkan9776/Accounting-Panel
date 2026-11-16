'use client';

import React, { useEffect, useState } from 'react';
import {
  ArrowLeftRight,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Building,
  Wallet,
  ArrowRight,
} from 'lucide-react';
import Link from 'next/link';
import { fetchApi, formatMoney } from '../../../lib/api';

export default function TransfersPage() {
  const [sourceType, setSourceType] = useState<'BANK' | 'CASH' | 'PETTY'>('BANK');
  const [sourceId, setSourceId] = useState('');
  const [destType, setDestType] = useState<'BANK' | 'CASH' | 'PETTY'>('CASH');
  const [destId, setDestId] = useState('');
  const [amount, setAmount] = useState('50000000');
  const [transferDate, setTransferDate] = useState('1403/08/26');
  const [trackingCode, setTrackingCode] = useState(`TRF-${Date.now().toString().slice(-6)}`);
  const [description, setDescription] = useState('انتقال وجه از حساب بانک ملت جهت شارژ صندوق مرکزی');

  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [cashDesks, setCashDesks] = useState<any[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<any>(null);

  const loadAccounts = async () => {
    try {
      const [banksRes, cashRes] = await Promise.all([
        fetchApi('/treasury/bank-accounts').catch(() => ({ data: [] })),
        fetchApi('/treasury/cash-desks').catch(() => ({ data: [] })),
      ]);

      const bList = banksRes.data || [];
      setBankAccounts(bList);
      if (bList.length > 0) setSourceId(bList[0].floating_dimension_id || 'dim-bank-1');

      const cList = cashRes.data || [];
      setCashDesks(cList);
      if (cList.length > 0) setDestId(cList[0].floating_dimension_id || 'dim-cash-1');
    } catch (e) {
      console.warn('Transfers options loading error:', e);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessResult(null);

    if (sourceType === destType && sourceId === destId) {
      setError('حساب مبدا و مقصد نمی‌تواند یکسان باشد.');
      return;
    }

    if (!amount || Number(amount) <= 0) {
      setError('مبلغ انتقال باید بزرگتر از صفر باشد.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        sourceType,
        sourceId: sourceId || 'dim-bank-1',
        destType,
        destId: destId || 'dim-cash-1',
        amount: Number(amount),
        transferDateShamsi: transferDate,
        trackingCode,
        description,
      };

      const res = await fetchApi('/treasury/transfers', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (res.data) {
        setSuccessResult(res.data);
        setTrackingCode(`TRF-${Date.now().toString().slice(-6)}`);
      } else {
        setError(res.message || 'خطا در ثبت انتقال وجه.');
      }
    } catch (err: any) {
      setError(err.message || 'خطا در برقراری ارتباط با سرویس انتقال.');
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
            <ArrowLeftRight className="w-6 h-6 text-blue-600" />
            <span>انتقال وجه بین‌حسابی (خزانه‌داری)</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            جابجایی وجوه نقد بین حساب‌های بانکی، صندوق‌ها و تنخواه‌گردان‌ها و صدور اتوماتیک سند دوبل
          </p>
        </div>

        <Link
          href="/treasury/banks"
          className="inline-flex items-center gap-1.5 text-xs text-blue-700 bg-blue-50 border border-blue-200 px-3 py-2 rounded-xl hover:bg-blue-100 transition-colors shadow-xs font-bold"
        >
          <Building className="w-4 h-4" />
          <span>مشاهده مانده حساب‌های بانکی</span>
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
              انتقال وجه به مبلغ{' '}
              <strong className="font-mono text-sm">{formatMoney(successResult.amount)} ریال</strong> با موفقیت ثبت
              و سند دوبل متناظر با شناسه <strong className="font-mono">{successResult.journalEntryId}</strong> صادر و قطعی شد.
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

      {/* فرم انتقال */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
        <form onSubmit={handleTransfer} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* کارت حساب مبدا */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <h2 className="font-bold text-slate-800 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                <span>حساب مبدا (کاهش وجه / بستانکار)</span>
              </h2>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">نوع حساب مبدا</label>
                <select
                  value={sourceType}
                  onChange={(e) => setSourceType(e.target.value as any)}
                  className="w-full bg-white border border-slate-300 rounded-xl p-2 font-medium"
                >
                  <option value="BANK">حساب بانکی</option>
                  <option value="CASH">صندوق</option>
                  <option value="PETTY">تنخواه‌گردان</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">انتخاب حساب مبدا</label>
                <select
                  value={sourceId}
                  onChange={(e) => setSourceId(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl p-2 font-medium"
                >
                  {sourceType === 'BANK' &&
                    bankAccounts.map((b) => (
                      <option key={b.id} value={b.floating_dimension_id || b.id}>
                        {b.bank_name} - {b.account_number}
                      </option>
                    ))}
                  {sourceType === 'CASH' &&
                    cashDesks.map((c) => (
                      <option key={c.id} value={c.floating_dimension_id || c.id}>
                        {c.title} ({c.code})
                      </option>
                    ))}
                  {bankAccounts.length === 0 && <option value="dim-bank-1">بانک ملت - جاری</option>}
                </select>
              </div>
            </div>

            {/* کارت حساب مقصد */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <h2 className="font-bold text-slate-800 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>حساب مقصد (افزایش وجه / بدهکار)</span>
              </h2>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">نوع حساب مقصد</label>
                <select
                  value={destType}
                  onChange={(e) => setDestType(e.target.value as any)}
                  className="w-full bg-white border border-slate-300 rounded-xl p-2 font-medium"
                >
                  <option value="CASH">صندوق</option>
                  <option value="BANK">حساب بانکی</option>
                  <option value="PETTY">تنخواه‌گردان</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">انتخاب حساب مقصد</label>
                <select
                  value={destId}
                  onChange={(e) => setDestId(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl p-2 font-medium"
                >
                  {destType === 'BANK' &&
                    bankAccounts.map((b) => (
                      <option key={b.id} value={b.floating_dimension_id || b.id}>
                        {b.bank_name} - {b.account_number}
                      </option>
                    ))}
                  {destType === 'CASH' &&
                    cashDesks.map((c) => (
                      <option key={c.id} value={c.floating_dimension_id || c.id}>
                        {c.title} ({c.code})
                      </option>
                    ))}
                  {cashDesks.length === 0 && <option value="dim-cash-1">صندوق مرکزی</option>}
                </select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div>
              <label className="block text-slate-600 font-semibold mb-1">مبلغ انتقال (ریال) *</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-mono text-left text-sm font-bold text-blue-900"
              />
            </div>

            <div>
              <label className="block text-slate-600 font-semibold mb-1">تاریخ انتقال (شمسی) *</label>
              <input
                type="text"
                value={transferDate}
                onChange={(e) => setTransferDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-mono text-left"
              />
            </div>

            <div>
              <label className="block text-slate-600 font-semibold mb-1">شماره پیگیری / فیش</label>
              <input
                type="text"
                value={trackingCode}
                onChange={(e) => setTrackingCode(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-mono text-left"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-600 font-semibold mb-1">شرح انتقال</label>
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
              className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-blue-900/30 transition-all disabled:opacity-50"
            >
              {loading ? (
                <span>در حال ثبت سند انتقال...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>ثبت انتقال و صدور خودکار سند دوبل</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
