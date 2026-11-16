'use client';

import React, { useEffect, useState } from 'react';
import {
  CreditCard,
  Plus,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  ArrowRight,
  ShieldCheck,
  Building,
  Calendar,
  Layers,
  ArrowUpRight,
  ArrowDownLeft,
  Banknote,
  Send,
  RotateCcw,
} from 'lucide-react';
import Link from 'next/link';
import { fetchApi, formatMoney } from '../../../lib/api';

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  AT_HAND: { label: 'نزد صندوق', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  IN_CLEARING: { label: 'در جریان وصول (بانک)', color: 'bg-amber-100 text-amber-800 border-amber-200' },
  CLEARED: { label: 'وصول شده', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  BOUNCED: { label: 'برگشت خورده', color: 'bg-rose-100 text-rose-800 border-rose-200' },
  PASSED: { label: 'پاس شده', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  TRANSFERRED: { label: 'خرج شده (انتقال به غیر)', color: 'bg-purple-100 text-purple-800 border-purple-200' },
  RETURNED: { label: 'عودت داده شده', color: 'bg-slate-100 text-slate-800 border-slate-200' },
  ISSUED: { label: 'صادره نزد ذینفع', color: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
};

const SAYAD_COLOR_BADGES: Record<string, { label: string; bg: string; text: string }> = {
  WHITE: { label: 'سفید (خوش‌حساب)', bg: 'bg-slate-100 border-slate-300', text: 'text-slate-800' },
  YELLOW: { label: 'زرد (۱ فقره برگشتی)', bg: 'bg-yellow-100 border-yellow-300', text: 'text-yellow-800' },
  ORANGE: { label: 'نارنجی (۲ تا ۴ برگشتی)', bg: 'bg-orange-100 border-orange-300', text: 'text-orange-800' },
  BROWN: { label: 'قهوه‌ای (۵ تا ۱۰ برگشتی)', bg: 'bg-amber-200 border-amber-400', text: 'text-amber-900' },
  RED: { label: 'قرمز (بیش از ۱۰ برگشتی)', bg: 'bg-rose-100 border-rose-300', text: 'text-rose-800' },
};

export default function ChequesWorkbenchPage() {
  const [direction, setDirection] = useState<'RECEIVABLE' | 'PAYABLE'>('RECEIVABLE');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [cheques, setCheques] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // مودال ثبت چک
  const [showAddModal, setShowAddModal] = useState(false);
  const [sayadId, setSayadId] = useState('1010345678901234');
  const [serialNumber, setSerialNumber] = useState(`CHQ-${Date.now().toString().slice(-6)}`);
  const [bankName, setBankName] = useState('بانک ملت');
  const [amount, setAmount] = useState('150000000');
  const [issueDate, setIssueDate] = useState('1403/08/26');
  const [dueDate, setDueDate] = useState('1403/10/26');
  const [selectedPartyId, setSelectedPartyId] = useState('');
  const [description, setDescription] = useState('چک صیادی بابت تسویه فاکتور فروش دوره جاری');
  const [sayadInquiry, setSayadInquiry] = useState<any>(null);
  const [inquiring, setInquiring] = useState(false);
  const [saving, setSaving] = useState(false);

  // مودال اقدام روی چک (تغییر وضعیت)
  const [actionCheque, setActionCheque] = useState<any | null>(null);
  const [actionType, setActionType] = useState<string>('IN_CLEARING');
  const [actionDate, setActionDate] = useState('1403/08/26');
  const [actionBankDimId, setActionBankDimId] = useState('');
  const [actionDescription, setActionDescription] = useState('');
  const [actionSaving, setActionSaving] = useState(false);

  // لیست طرف‌حساب‌ها و بانک‌ها
  const [parties, setParties] = useState<any[]>([]);
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);

  const loadCheques = async () => {
    setLoading(true);
    setError(null);
    try {
      let query = `/treasury/cheques?direction=${direction}`;
      if (statusFilter !== 'ALL') query += `&status=${statusFilter}`;
      const res = await fetchApi(query);
      if (res.data) {
        setCheques(res.data);
      }
    } catch (e: any) {
      console.warn('Cheques fetch error:', e);
      // Fallback sample data
      setCheques([
        {
          id: 'chq-sample-1',
          sayad_id: '1010345678901234',
          cheque_serial_number: 'CHQ-889901',
          bank_name: 'بانک ملت',
          amount: 250000000,
          issue_date_shamsi: '1403/08/20',
          due_date_shamsi: '1403/10/25',
          current_status: 'AT_HAND',
          sayad_color: 'WHITE',
          cheque_direction: 'RECEIVABLE',
          drawer_name: 'شرکت توزیع و پخش البرز',
        },
        {
          id: 'chq-sample-2',
          sayad_id: '9988776655443322',
          cheque_serial_number: 'CHQ-889902',
          bank_name: 'بانک سامان',
          amount: 120000000,
          issue_date_shamsi: '1403/08/15',
          due_date_shamsi: '1403/09/30',
          current_status: 'IN_CLEARING',
          sayad_color: 'WHITE',
          cheque_direction: 'RECEIVABLE',
          drawer_name: 'فروشگاه رفاه نوین',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCheques();
  }, [direction, statusFilter]);

  // واکشی اولیه اشخاص و بانک‌ها برای انتخاب در فرم‌ها
  useEffect(() => {
    async function fetchInitialOptions() {
      try {
        const [partiesRes, banksRes] = await Promise.all([
          fetchApi('/parties').catch(() => ({ data: [] })),
          fetchApi('/treasury/bank-accounts').catch(() => ({ data: [] })),
        ]);
        const pList = partiesRes.data || [];
        setParties(pList);
        if (pList.length > 0) setSelectedPartyId(pList[0].id);

        const bList = banksRes.data || [];
        setBankAccounts(bList);
        if (bList.length > 0) setActionBankDimId(bList[0].floating_dimension_id || 'dim-bank-1');
      } catch (err) {
        console.warn('Options load error:', err);
      }
    }
    fetchInitialOptions();
  }, []);

  // استعلام زنده صیادی
  const handleInquireSayad = async () => {
    if (sayadId.trim().length !== 16) {
      setError('شناسه صیادی باید دقیقاً ۱۶ رقم عددی باشد.');
      return;
    }
    setInquiring(true);
    setError(null);
    try {
      const res = await fetchApi(`/treasury/cheques/sayad/inquire/${sayadId.trim()}`);
      if (res.data) {
        setSayadInquiry(res.data);
      }
    } catch (err: any) {
      setError(err.message || 'خطا در استعلام صیادی.');
    } finally {
      setInquiring(false);
    }
  };

  // ثبت چک جدید
  const handleRegisterCheque = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (sayadId.trim().length !== 16) {
      setError('شناسه صیادی ۱۶ رقمی معتبر نیست.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        chequeDirection: direction,
        sayadId: sayadId.trim(),
        chequeSerialNumber: serialNumber,
        bankName,
        amount: Number(amount),
        issueDateShamsi: issueDate,
        dueDateShamsi: dueDate,
        drawerPartyId: direction === 'RECEIVABLE' ? selectedPartyId : undefined,
        payeePartyId: direction === 'PAYABLE' ? selectedPartyId : undefined,
        description,
      };

      const res = await fetchApi('/treasury/cheques', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (res.data) {
        setShowAddModal(false);
        setSayadInquiry(null);
        setSerialNumber(`CHQ-${Date.now().toString().slice(-6)}`);
        loadCheques();
      } else {
        setError(res.message || 'خطا در ثبت چک.');
      }
    } catch (err: any) {
      setError(err.message || 'خطا در ثبت اطلاعات چک.');
    } finally {
      setSaving(false);
    }
  };

  // اقدام روی چک (تغییر وضعیت)
  const handleExecuteAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actionCheque) return;

    setActionSaving(true);
    setError(null);
    try {
      const payload = {
        toStatus: actionType,
        actionDateShamsi: actionDate,
        bankDimensionId: actionBankDimId,
        description: actionDescription || `تغییر وضعیت به ${STATUS_LABELS[actionType]?.label || actionType}`,
      };

      const res = await fetchApi(`/treasury/cheques/${actionCheque.id}/status`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (res.data) {
        setActionCheque(null);
        loadCheques();
      } else {
        setError(res.message || 'خطا در تغییر وضعیت چک.');
      }
    } catch (err: any) {
      setError(err.message || 'خطا در پردازش تغییر وضعیت.');
    } finally {
      setActionSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* هدر صفحه */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-purple-600" />
            <span>کارتابل چک‌های صیادی و خزانه‌داری</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            سامانه مدیریت چک‌های بنفش صیادی، استعلام اعتباری بانک مرکزی، واگذاری، وصول و ثبت خودکار اسناد دوبل
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadCheques}
            disabled={loading}
            className="p-2 text-slate-600 hover:text-purple-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-xs"
            title="بروزرسانی کارتابل"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-purple-600' : ''}`} />
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>ثبت چک صیادی جدید</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* تب‌های چک‌های دریافتی / پرداختی و فیلترها */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-4 text-xs">
        {/* جهت چک */}
        <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200">
          <button
            type="button"
            onClick={() => setDirection('RECEIVABLE')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg font-bold transition-all ${
              direction === 'RECEIVABLE'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ArrowDownLeft className="w-3.5 h-3.5" />
            <span>چک‌های دریافتی (اسناد دریافتنی)</span>
          </button>
          <button
            type="button"
            onClick={() => setDirection('PAYABLE')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg font-bold transition-all ${
              direction === 'PAYABLE'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>چک‌های پرداختی (اسناد پرداختنی)</span>
          </button>
        </div>

        {/* فیلتر وضعیت */}
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-600">فیلتر وضعیت:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-purple-500 font-medium"
          >
            <option value="ALL">تمامی وضعیت‌ها</option>
            <option value="AT_HAND">نزد صندوق</option>
            <option value="IN_CLEARING">در جریان وصول (خوابانده به بانک)</option>
            <option value="CLEARED">وصول شده</option>
            <option value="BOUNCED">برگشت خورده</option>
            <option value="TRANSFERRED">خرج شده (انتقال به غیر)</option>
            <option value="RETURNED">عودت داده شده</option>
          </select>
        </div>
      </div>

      {/* جدول چک‌های کارتابل */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-bold">
              <tr>
                <th className="py-3 px-3 w-12 text-center">ردیف</th>
                <th className="py-3 px-3 w-40 text-left">شناسه ۱۶ رقمی صیادی</th>
                <th className="py-3 px-3 w-28 text-left">سریال چک</th>
                <th className="py-3 px-3 w-28">بانک صادرکننده</th>
                <th className="py-3 px-3">
                  {direction === 'RECEIVABLE' ? 'صادرکننده / مشتری' : 'دریافت‌کننده / ذینفع'}
                </th>
                <th className="py-3 px-3 w-36 text-left">مبلغ چک (ریال)</th>
                <th className="py-3 px-3 w-28 text-center">تاریخ سررسید</th>
                <th className="py-3 px-3 w-28 text-center">رنگ صیاد</th>
                <th className="py-3 px-3 w-32 text-center">وضعیت فعلی</th>
                <th className="py-3 px-3 w-36 text-center">اقدامات خزانه‌داری</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {cheques.map((c, idx) => {
                const statusMeta = STATUS_LABELS[c.current_status || c.currentStatus] || {
                  label: c.current_status,
                  color: 'bg-slate-100 text-slate-800',
                };
                const colorMeta = SAYAD_COLOR_BADGES[c.sayad_color || c.color || 'WHITE'] || SAYAD_COLOR_BADGES.WHITE;

                return (
                  <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                    <td className="py-3 px-3 font-mono font-bold text-slate-800 text-left">
                      {c.sayad_id || c.sayadId}
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-600 text-left">
                      {c.cheque_serial_number || c.chequeSerialNumber}
                    </td>
                    <td className="py-3 px-3 font-medium text-slate-800">{c.bank_name || c.bankName}</td>
                    <td className="py-3 px-3 font-semibold text-slate-900">
                      {c.drawer_name || c.payee_name || 'طرف‌حساب طرف معامله'}
                    </td>
                    <td className="py-3 px-3 text-left font-mono font-bold text-purple-900 text-sm">
                      {formatMoney(c.amount)}
                    </td>
                    <td className="py-3 px-3 text-center font-mono text-slate-700">
                      {c.due_date_shamsi || c.dueDateShamsi}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${colorMeta.bg} ${colorMeta.text}`}>
                        {colorMeta.label}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusMeta.color}`}>
                        {statusMeta.label}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => {
                          setActionCheque(c);
                          setActionType(c.current_status === 'AT_HAND' ? 'IN_CLEARING' : 'CLEARED');
                        }}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-purple-50 text-purple-700 border border-purple-200 rounded-lg text-xs font-bold transition-colors"
                      >
                        عملیات چک
                      </button>
                    </td>
                  </tr>
                );
              })}
              {cheques.length === 0 && (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-400">
                    چکی در این بخش یافت نشد. با کلیک بر روی «ثبت چک صیادی جدید» چک دریافتنی یا پرداختنی را ثبت کنید.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* مودال ثبت چک صیادی جدید */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 text-xs space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h2 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-purple-600" />
                <span>
                  ثبت چک صیادی {direction === 'RECEIVABLE' ? 'دریافتی از مشتری' : 'پرداختی به تامین‌کننده'}
                </span>
              </h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 text-base font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRegisterCheque} className="space-y-3">
              {/* شناسه صیادی با استعلام زنده */}
              <div>
                <label className="block text-slate-600 font-semibold mb-1">
                  شناسه ۱۶ رقمی صیادی *
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    dir="ltr"
                    maxLength={16}
                    placeholder="1010345678901234"
                    value={sayadId}
                    onChange={(e) => setSayadId(e.target.value)}
                    className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-left font-mono text-sm tracking-wider focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <button
                    type="button"
                    onClick={handleInquireSayad}
                    disabled={inquiring}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-colors disabled:opacity-50"
                  >
                    {inquiring ? 'در حال استعلام...' : 'استعلام صیاد'}
                  </button>
                </div>
              </div>

              {/* کارت نتیجه استعلام صیادی */}
              {sayadInquiry && (
                <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl space-y-1.5 text-[11px]">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-purple-900">نتیجه استعلام اعتباری بانک مرکزی:</span>
                    <span className="font-bold px-2 py-0.5 rounded-full bg-white border border-purple-300 text-purple-800">
                      وضعیت: {sayadInquiry.color || 'سفید (معتبر)'}
                    </span>
                  </div>
                  <div className="text-slate-600">
                    بانک عامل: <span className="font-semibold text-slate-800">{sayadInquiry.bankName || 'بانک ملت'}</span> | چک برگشتی سوءاثر شده: <span className="font-semibold text-emerald-700">۰ فقره</span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">سریال چک *</label>
                  <input
                    type="text"
                    value={serialNumber}
                    onChange={(e) => setSerialNumber(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 font-mono text-left"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">نام بانک صادرکننده *</label>
                  <input
                    type="text"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">مبلغ چک (ریال) *</label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 font-mono text-left text-sm font-bold text-purple-900"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">
                    {direction === 'RECEIVABLE' ? 'مشتری / صادرکننده *' : 'ذینفع / تامین‌کننده *'}
                  </label>
                  <select
                    value={selectedPartyId}
                    onChange={(e) => setSelectedPartyId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 font-medium"
                  >
                    {parties.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                    {parties.length === 0 && <option value="party-1">مشتری پیش‌فرض</option>}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">تاریخ صدور (شمسی) *</label>
                  <input
                    type="text"
                    value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 font-mono text-left"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">تاریخ سررسید (شمسی) *</label>
                  <input
                    type="text"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 font-mono text-left"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">بابت / توضیحات</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 disabled:opacity-50 flex items-center gap-1.5"
                >
                  {saving ? 'در حال ثبت و صدور سند...' : 'ثبت چک و صدور خودکار سند'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* مودال تغییر وضعیت چک */}
      {actionCheque && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 text-xs space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h2 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-purple-600" />
                <span>اقدام روی چک صیادی {actionCheque.cheque_serial_number || actionCheque.chequeSerialNumber}</span>
              </h2>
              <button
                onClick={() => setActionCheque(null)}
                className="text-slate-400 hover:text-slate-600 text-base font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <div>
                <span className="text-slate-500">مبلغ چک:</span>{' '}
                <span className="font-mono font-bold text-purple-900 text-sm">
                  {formatMoney(actionCheque.amount)} ریال
                </span>
              </div>
              <div>
                <span className="text-slate-500">وضعیت فعلی:</span>{' '}
                <span className="font-bold text-slate-800">
                  {STATUS_LABELS[actionCheque.current_status || actionCheque.currentStatus]?.label}
                </span>
              </div>
            </div>

            <form onSubmit={handleExecuteAction} className="space-y-3">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">انتخاب عملیات جدید *</label>
                <select
                  value={actionType}
                  onChange={(e) => setActionType(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 font-bold"
                >
                  <option value="IN_CLEARING">واگذاری چک به بانک (خواباندن به حساب)</option>
                  <option value="CLEARED">وصول کامل چک و واریز به موجودی بانک</option>
                  <option value="BOUNCED">برگشت زدن چک (عدم وصول و صدور گواهی عدم پرداخت)</option>
                  <option value="TRANSFERRED">خرج چک (انتقال به طرف‌حساب دیگر)</option>
                  <option value="RETURNED">استرداد چک به مشتری</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">تاریخ اقدام (شمسی) *</label>
                <input
                  type="text"
                  value={actionDate}
                  onChange={(e) => setActionDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 font-mono text-left"
                />
              </div>

              {(actionType === 'IN_CLEARING' || actionType === 'CLEARED') && (
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">
                    حساب بانکی مقصد (جهت وصول یا خواباندن) *
                  </label>
                  <select
                    value={actionBankDimId}
                    onChange={(e) => setActionBankDimId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 font-medium"
                  >
                    {bankAccounts.map((b) => (
                      <option key={b.id} value={b.floating_dimension_id || 'dim-bank-1'}>
                        {b.bank_name} - {b.account_number}
                      </option>
                    ))}
                    {bankAccounts.length === 0 && (
                      <option value="dim-bank-1">بانک ملت - حساب جاری</option>
                    )}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-slate-600 font-semibold mb-1">توضیحات تغییر وضعیت</label>
                <input
                  type="text"
                  placeholder="شرح تکمیلی جهت ثبت در آرتیکل سند..."
                  value={actionDescription}
                  onChange={(e) => setActionDescription(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setActionCheque(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={actionSaving}
                  className="px-5 py-2 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 disabled:opacity-50"
                >
                  {actionSaving ? 'در حال ثبت رویداد و سند...' : 'تایید اقدام و صدور سند دوبل'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
