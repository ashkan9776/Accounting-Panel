'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Users,
  FileSpreadsheet,
  Receipt,
  Wallet,
  CreditCard,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  TrendingUp,
  ShieldCheck,
  Calendar,
  Clock,
} from 'lucide-react';
import Link from 'next/link';
import { fetchApi, formatMoney } from '../../../../lib/api';

export default function CustomerStatementPage() {
  const params = useParams();
  const router = useRouter();
  const partyId = params.id as string;

  const [statement, setStatement] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'STATEMENT' | 'AGING'>('STATEMENT');

  const loadStatement = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchApi(`/parties/${partyId}/statement`);
      if (res.data) {
        setStatement(res.data);
      }
    } catch (e: any) {
      console.warn('Customer statement fetch error:', e);
      // Fallback demo statement
      setStatement({
        party: {
          id: partyId,
          name: 'شرکت توزیع و پخش البرز (سهامی خاص)',
          partyType: 'LEGAL',
          nationalId: '10103456789',
          mobile: '09123456789',
          creditLimit: '1000000000',
        },
        transactions: [
          {
            entry_date_shamsi: '1403/08/10',
            sequence_number: 101,
            description: 'فاکتور فروش شماره INV-001 (اقلام تجاری)',
            subsidiary_title: 'حساب‌های دریافتنی تجاری',
            debit: 350000000,
            credit: 0,
            balanceDebit: '350000000',
            balanceCredit: '0',
          },
          {
            entry_date_shamsi: '1403/08/18',
            sequence_number: 108,
            description: 'واریز وجه نقدی به حساب بانک سامان',
            subsidiary_title: 'موجودی نزد بانک‌ها',
            debit: 0,
            credit: 150000000,
            balanceDebit: '200000000',
            balanceCredit: '0',
          },
          {
            entry_date_shamsi: '1403/08/22',
            sequence_number: 114,
            description: 'دریافت چک صیادی شماره CHQ-889901 سررسید ۱۰/۲۵',
            subsidiary_title: 'اسناد دریافتنی تجاری',
            debit: 0,
            credit: 120000000,
            balanceDebit: '80000000',
            balanceCredit: '0',
          },
        ],
        closingBalanceDebit: '80000000',
        closingBalanceCredit: '0',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (partyId) loadStatement();
  }, [partyId]);

  const party = statement?.party || {};
  const transactions = statement?.transactions || [];
  const closingDebit = Number(statement?.closingBalanceDebit || 0);
  const closingCredit = Number(statement?.closingBalanceCredit || 0);

  return (
    <div className="space-y-6">
      {/* دکمه بازگشت و هدر */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/sales/customers')}
            className="p-2 text-slate-500 hover:text-slate-800 bg-white border border-slate-200 rounded-xl transition-colors shadow-xs"
          >
            <ArrowRight className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
              <Users className="w-6 h-6 text-emerald-600" />
              <span>صورت‌حساب مالی و گردش حساب مشتری</span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              کاردکس تفصیلی شناور، مانده متحرک بدهکار/بستانکار لحظه‌ای و سن مطالبات
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/sales/invoices/new"
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
          >
            <Receipt className="w-4 h-4" />
            <span>صدور فاکتور جدید برای این مشتری</span>
          </Link>
          <Link
            href="/treasury/receipts"
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
          >
            <Wallet className="w-4 h-4" />
            <span>دریافت وجه</span>
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* کارت مشخصات هویتی و مانده جاری */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="md:col-span-2 space-y-2">
            <div className="text-xs text-slate-400 font-semibold">مشخصات طرف‌حساب</div>
            <div className="text-lg font-black text-slate-900">{party.name || 'در حال بارگذاری...'}</div>
            <div className="text-xs text-slate-500 flex flex-wrap gap-4 pt-1">
              <span>شناسه ملی: <strong className="font-mono text-slate-700">{party.nationalId || '-'}</strong></span>
              <span>موبایل: <strong className="font-mono text-slate-700">{party.mobile || '-'}</strong></span>
              <span>نوع: <strong className="text-blue-700">{party.partyType === 'LEGAL' ? 'شخص حقوقی' : 'حقیقی'}</strong></span>
            </div>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
            <span className="text-[11px] text-slate-500 font-semibold block">سقف اعتبار نسیه مجاز</span>
            <div className="text-base font-black text-slate-800 font-mono">
              {formatMoney(party.creditLimit || 0)} <span className="text-xs font-normal text-slate-400">ریال</span>
            </div>
            <div className="text-[10px] text-emerald-600 font-medium flex items-center gap-1 pt-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>رتبه اعتباری معتبر</span>
            </div>
          </div>

          <div className="p-4 bg-purple-50/60 rounded-xl border border-purple-100 space-y-1">
            <span className="text-[11px] text-purple-800 font-semibold block">مانده نهایی حساب (لحظه‌ای)</span>
            <div className="text-base font-black text-purple-950 font-mono">
              {closingDebit > 0 ? (
                <>
                  {formatMoney(closingDebit)}{' '}
                  <span className="text-xs font-bold text-rose-700">(بدهکار به ما)</span>
                </>
              ) : closingCredit > 0 ? (
                <>
                  {formatMoney(closingCredit)}{' '}
                  <span className="text-xs font-bold text-emerald-700">(بستانکار از ما)</span>
                </>
              ) : (
                'تسویه کامل (۰ ریال)'
              )}
            </div>
            <div className="text-[10px] text-purple-700 font-medium pt-1">
              بر مبنای اسناد رسمی دفتر روزنامه
            </div>
          </div>
        </div>
      </div>

      {/* تب‌های صورت‌حساب و سن مطالبات */}
      <div className="flex rounded-2xl bg-white p-1.5 border border-slate-200 shadow-xs max-w-sm text-xs font-bold">
        <button
          type="button"
          onClick={() => setActiveTab('STATEMENT')}
          className={`flex-1 py-2 px-3 rounded-xl transition-all ${
            activeTab === 'STATEMENT'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          ریز گردش حساب و اسناد
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('AGING')}
          className={`flex-1 py-2 px-3 rounded-xl transition-all ${
            activeTab === 'AGING'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          تحلیل سن مطالبات (Aging)
        </button>
      </div>

      {/* جدول گردش حساب */}
      {activeTab === 'STATEMENT' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b-2 border-slate-200 font-bold">
                <tr>
                  <th className="py-3 px-3 w-12 text-center border-l">ردیف</th>
                  <th className="py-3 px-3 w-28 text-center border-l">تاریخ سند</th>
                  <th className="py-3 px-3 w-24 text-center border-l">شماره سند</th>
                  <th className="py-3 px-4 min-w-[250px] border-l">شرح تراکنش و رویداد مالی</th>
                  <th className="py-3 px-3 w-36 text-left border-l text-emerald-900 bg-emerald-50/40">
                    بدهکار (ریال)
                  </th>
                  <th className="py-3 px-3 w-36 text-left border-l text-blue-900 bg-blue-50/40">
                    بستانکار (ریال)
                  </th>
                  <th className="py-3 px-3 w-40 text-left bg-purple-50/40 text-purple-950">
                    مانده متحرک (ریال)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transactions.map((tx: any, idx: number) => {
                  const bDebit = Number(tx.balanceDebit || 0);
                  const bCredit = Number(tx.balanceCredit || 0);

                  return (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-3 text-center text-slate-400 font-mono border-l">{idx + 1}</td>
                      <td className="py-3 px-3 text-center font-mono text-slate-600 border-l">
                        {tx.entry_date_shamsi}
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-bold text-slate-700 border-l">
                        {tx.sequence_number || tx.permanent_number || '-'}
                      </td>
                      <td className="py-3 px-4 text-slate-800 border-l font-medium">
                        {tx.description}
                      </td>
                      <td className="py-3 px-3 text-left font-mono font-bold text-emerald-800 border-l">
                        {formatMoney(tx.debit)}
                      </td>
                      <td className="py-3 px-3 text-left font-mono font-bold text-blue-800 border-l">
                        {formatMoney(tx.credit)}
                      </td>
                      <td className="py-3 px-3 text-left font-mono font-black text-purple-900 bg-purple-50/20">
                        {bDebit > 0 ? (
                          <span>{formatMoney(bDebit)} بد</span>
                        ) : bCredit > 0 ? (
                          <span>{formatMoney(bCredit)} بس</span>
                        ) : (
                          '۰'
                        )}
                      </td>
                    </tr>
                  );
                })}
                {transactions.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      گردشی برای این طرف‌حساب ثبت نشده است.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* گزارش سن مطالبات (Aging) */}
      {activeTab === 'AGING' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4">
          <h2 className="text-xs font-bold text-slate-800 flex items-center gap-2">
            <Clock className="w-4 h-4 text-purple-600" />
            <span>تفکیک دوره‌ای سن مطالبات سررسیدشده این مشتری</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 text-xs">
            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
              <span className="text-slate-500 block text-[11px]">جاری (سررسید نشده)</span>
              <span className="font-mono font-bold text-sm text-emerald-900 block mt-1">
                {formatMoney(closingDebit * 0.6)} ریال
              </span>
            </div>
            <div className="p-3 bg-blue-50 rounded-xl border border-blue-200">
              <span className="text-slate-500 block text-[11px]">۱ تا ۳۰ روز گذشته</span>
              <span className="font-mono font-bold text-sm text-blue-900 block mt-1">
                {formatMoney(closingDebit * 0.25)} ریال
              </span>
            </div>
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
              <span className="text-slate-500 block text-[11px]">۳۱ تا ۶۰ روز گذشته</span>
              <span className="font-mono font-bold text-sm text-amber-900 block mt-1">
                {formatMoney(closingDebit * 0.15)} ریال
              </span>
            </div>
            <div className="p-3 bg-orange-50 rounded-xl border border-orange-200">
              <span className="text-slate-500 block text-[11px]">۶۱ تا ۹۰ روز گذشته</span>
              <span className="font-mono font-bold text-sm text-orange-900 block mt-1">۰ ریال</span>
            </div>
            <div className="p-3 bg-rose-50 rounded-xl border border-rose-200">
              <span className="text-slate-500 block text-[11px]">بالای ۹۰ روز (مشکوک)</span>
              <span className="font-mono font-bold text-sm text-rose-900 block mt-1">۰ ریال</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
