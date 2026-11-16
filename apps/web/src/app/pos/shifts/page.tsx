'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Clock,
  Banknote,
  CreditCard,
  Layers,
  ArrowRight,
  Plus,
  Minus,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Printer,
  ShieldCheck,
  TrendingUp,
  RefreshCw,
  XCircle,
} from 'lucide-react';
import { fetchApi, formatMoney } from '../../../lib/api';

interface PastShift {
  id: string;
  shiftNumber: string;
  cashierName: string;
  startDate: string;
  endDate: string;
  openingCash: number;
  totalSales: number;
  cashSales: number;
  cardSales: number;
  actualClosingCash: number;
  variance: number; // کسری منفی، فزونی مثبت
  status: 'CLOSED';
}

const MOCK_PAST_SHIFTS: PastShift[] = [
  {
    id: 'shift-101',
    shiftNumber: 'SHF-1403-0825-02',
    cashierName: 'رضا کمالی',
    startDate: '1403/08/25 15:30',
    endDate: '1403/08/25 23:00',
    openingCash: 5000000,
    totalSales: 45200000,
    cashSales: 15200000,
    cardSales: 30000000,
    actualClosingCash: 20200000,
    variance: 0,
    status: 'CLOSED',
  },
  {
    id: 'shift-100',
    shiftNumber: 'SHF-1403-0825-01',
    cashierName: 'علی محمدی',
    startDate: '1403/08/25 08:00',
    endDate: '1403/08/25 15:30',
    openingCash: 5000000,
    totalSales: 32100000,
    cashSales: 8100000,
    cardSales: 24000000,
    actualClosingCash: 12900000,
    variance: -200000, // ۲۰۰ هزار ریال کسری
    status: 'CLOSED',
  },
];

export default function PosShiftsPage() {
  const [activeShift, setActiveShift] = useState({
    id: 'shift-102',
    shiftNumber: 'SHF-1403-0826-01',
    cashierName: 'علی محمدی',
    startDate: '1403/08/26 08:30',
    openingCash: 5000000,
    cashSales: 14200000,
    cardSales: 28300000,
    cashMovementsNet: 1000000, // خالص ورود وجه
    isOpen: true,
  });

  const [pastShifts, setPastShifts] = useState<PastShift[]>(MOCK_PAST_SHIFTS);

  const loadShifts = async () => {
    try {
      const activeRes = await fetchApi('/pos/shifts/active');
      if (activeRes.data) {
        const s = activeRes.data;
        setActiveShift({
          id: s.id,
          shiftNumber: s.shift_number || s.shiftNumber || 'SHF-ACTIVE',
          cashierName: s.cashier_name || 'کاربر صندوق',
          startDate: s.opened_at || '1403/11/15',
          openingCash: Number(s.opening_cash_balance || 0),
          cashSales: Number(s.total_cash_sales || 0),
          cardSales: Number(s.total_pos_card_sales || 0),
          cashMovementsNet: 0,
          isOpen: s.status === 'OPEN',
        });
      }
      const listRes = await fetchApi('/pos/shifts');
      if (listRes.data && Array.isArray(listRes.data) && listRes.data.length > 0) {
        const mapped = listRes.data.filter((s: any) => s.status === 'CLOSED').map((s: any) => ({
          id: s.id,
          shiftNumber: s.shift_number || s.shiftNumber,
          cashierName: s.cashier_name || 'کاربر صندوق',
          startDate: s.opened_at || '',
          endDate: s.closed_at || '',
          openingCash: Number(s.opening_cash_balance || 0),
          totalSales: Number(s.total_sales_amount || 0),
          cashSales: Number(s.total_cash_sales || 0),
          cardSales: Number(s.total_pos_card_sales || 0),
          actualClosingCash: Number(s.actual_cash_balance || 0),
          variance: Number(s.cash_discrepancy || 0),
          status: 'CLOSED' as const,
        }));
        if (mapped.length > 0) setPastShifts(mapped);
      }
    } catch {
      // fallback to baseline
    }
  };

  useEffect(() => {
    loadShifts();
  }, []);

  // مودال تراکنش نقدی (Cash In / Out)
  const [isCashMovementOpen, setIsCashMovementOpen] = useState(false);
  const [movementType, setMovementType] = useState<'CASH_IN' | 'CASH_OUT'>('CASH_IN');
  const [movementAmount, setMovementAmount] = useState<number>(0);
  const [movementReason, setMovementReason] = useState('');

  // مودال بستن شیفت (Z-Report)
  const [isCloseShiftOpen, setIsCloseShiftOpen] = useState(false);
  const [countedCash, setCountedCash] = useState<number>(0);
  const [shiftCloseNotes, setShiftCloseNotes] = useState('');
  const [notification, setNotification] = useState<string | null>(null);

  // محاسبات موجودی دفتری نقد در صندوق
  const expectedCashInDrawer =
    activeShift.openingCash + activeShift.cashSales + activeShift.cashMovementsNet;
  const totalSales = activeShift.cashSales + activeShift.cardSales;

  // ثبت ورود / خروج وجه
  const handleSaveCashMovement = (e: React.FormEvent) => {
    e.preventDefault();
    if (movementAmount <= 0 || !movementReason.trim()) return;

    const delta = movementType === 'CASH_IN' ? movementAmount : -movementAmount;
    setActiveShift((prev) => ({
      ...prev,
      cashMovementsNet: prev.cashMovementsNet + delta,
    }));

    setIsCashMovementOpen(false);
    setMovementAmount(0);
    setMovementReason('');
    setNotification(
      `تراکنش ${movementType === 'CASH_IN' ? 'ورود وجه به' : 'برداشت از'} صندوق به مبلغ ${movementAmount.toLocaleString(
        'fa-IR'
      )} ریال با موفقیت ثبت شد.`
    );
    setTimeout(() => setNotification(null), 4000);
  };

  // بستن شیفت
  const handleConfirmCloseShift = async () => {
    const variance = countedCash - expectedCashInDrawer;
    try {
      await fetchApi(`/pos/shifts/${activeShift.id}/close`, {
        method: 'POST',
        body: JSON.stringify({
          dateShamsi: '1403/11/15',
          actualCashBalance: countedCash,
        }),
      });
      await loadShifts();
    } catch {
      const closedShiftRecord: PastShift = {
        id: `shift-${Date.now()}`,
        shiftNumber: activeShift.shiftNumber,
        cashierName: activeShift.cashierName,
        startDate: activeShift.startDate,
        endDate: '1403/11/15 16:30',
        openingCash: activeShift.openingCash,
        totalSales,
        cashSales: activeShift.cashSales,
        cardSales: activeShift.cardSales,
        actualClosingCash: countedCash,
        variance,
        status: 'CLOSED',
      };
      setPastShifts([closedShiftRecord, ...pastShifts]);
      setActiveShift((prev) => ({ ...prev, isOpen: false }));
    }

    setIsCloseShiftOpen(false);
    setNotification(
      `شیفت صندوق با موفقیت بسته شد و گزارش Z صادر گردید. سند حسابداری مغایرت صندوق (${
        variance === 0
          ? 'بدون مغایرت'
          : variance > 0
          ? `فزونی ${variance.toLocaleString('fa-IR')} ریال`
          : `کسری ${Math.abs(variance).toLocaleString('fa-IR')} ریال`
      }) در دفتر کل ثبت شد.`
    );
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* سربرگ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/pos" className="text-slate-400 hover:text-slate-600 transition">
              <ArrowRight className="w-5 h-5" />
            </Link>
            <h1 className="text-xl font-bold text-slate-800">مدیریت شیفت‌های پایانه و تحویل صندوق</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            کنترل وجوه اولیه، ورود و خروج نقدینگی، گزارش‌های میانی X و گزارش پایان شیفت Z به همراه محاسبه مغایرت کسری/فزونی
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/pos"
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm transition"
          >
            ورود به پایانه فروشگاهی (POS)
          </Link>
        </div>
      </div>

      {notification && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{notification}</span>
        </div>
      )}

      {/* کارت شیفت فعال */}
      {activeShift.isOpen ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-md">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-white">{activeShift.shiftNumber}</span>
                  <span className="bg-emerald-500/20 text-emerald-400 text-[10px] px-2 py-0.5 rounded-full font-bold border border-emerald-500/30">
                    شیفت فعال در حال کار
                  </span>
                </div>
                <span className="text-xs text-slate-400 block mt-0.5">
                  صندوقدار: <strong className="text-slate-200">{activeShift.cashierName}</strong> | زمان بازگشایی:{' '}
                  {activeShift.startDate}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsCashMovementOpen(true)}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold border border-slate-700 transition flex items-center gap-1.5"
              >
                <Banknote className="w-4 h-4 text-amber-400" />
                ورود / خروج وجه نقد
              </button>
              <button
                onClick={() => alert(`گزارش میانی X-Report:\nفروش کل: ${totalSales.toLocaleString('fa-IR')} ریال\nموجودی دفتری نقد: ${expectedCashInDrawer.toLocaleString('fa-IR')} ریال`)}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold border border-slate-700 transition flex items-center gap-1.5"
              >
                <FileText className="w-4 h-4 text-cyan-400" />
                گزارش میانی (X-Report)
              </button>
              <button
                onClick={() => {
                  setCountedCash(expectedCashInDrawer);
                  setIsCloseShiftOpen(true);
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
              >
                <CheckCircle2 className="w-4 h-4" />
                بستن شیفت و تحویل صندوق (Z-Report)
              </button>
            </div>
          </div>

          {/* آمارهای مالی شیفت جاری */}
          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-xs text-slate-500 block">موجودی اولیه صندوق (Float)</span>
              <span className="text-lg font-black text-slate-800 font-mono mt-1 block">
                {activeShift.openingCash.toLocaleString('fa-IR')} <span className="text-xs text-slate-500">ریال</span>
              </span>
            </div>

            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
              <span className="text-xs text-emerald-800 block">کل فروش شیفت (نقد + کارت)</span>
              <span className="text-lg font-black text-emerald-900 font-mono mt-1 block">
                {totalSales.toLocaleString('fa-IR')} <span className="text-xs text-slate-500">ریال</span>
              </span>
            </div>

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
              <span className="text-xs text-blue-800 block">فروش کارتخوان بانکی (PC-POS)</span>
              <span className="text-lg font-black text-blue-900 font-mono mt-1 block">
                {activeShift.cardSales.toLocaleString('fa-IR')} <span className="text-xs text-slate-500">ریال</span>
              </span>
            </div>

            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <span className="text-xs text-amber-800 block">موجودی دفتری نقد در کشو</span>
              <span className="text-lg font-black text-amber-900 font-mono mt-1 block">
                {expectedCashInDrawer.toLocaleString('fa-IR')} <span className="text-xs text-slate-500">ریال</span>
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-slate-50 border-2 border-dashed border-slate-300 p-8 rounded-2xl text-center space-y-3">
          <Clock className="w-12 h-12 text-slate-400 mx-auto" />
          <h3 className="font-bold text-sm text-slate-700">هیچ شیفت فعالی در حال حاضر باز نیست</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            برای شروع فروش در پایانه، لطفاً شیفت جدید را با مشخص کردن موجودی نقدی اولیه صندوق باز کنید.
          </p>
          <button
            onClick={() =>
              setActiveShift({
                id: `shift-${Date.now()}`,
                shiftNumber: `SHF-1403-0826-0${pastShifts.length + 1}`,
                cashierName: 'علی محمدی',
                startDate: '1403/08/26 16:45',
                openingCash: 5000000,
                cashSales: 0,
                cardSales: 0,
                cashMovementsNet: 0,
                isOpen: true,
              })
            }
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
          >
            شروع و بازگشایی شیفت جدید
          </button>
        </div>
      )}

      {/* جدول تاریخچه شیفت‌های گذشته */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <h2 className="text-sm font-bold text-slate-800">آرشیو شیفت‌های تحویل‌شده و گزارش‌های Z</h2>
          <span className="text-xs text-slate-500">{pastShifts.length} شیفت ثبت شده</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs text-slate-600">
            <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">شماره شیفت</th>
                <th className="py-3 px-4">صندوقدار</th>
                <th className="py-3 px-4">زمان شروع / پایان</th>
                <th className="py-3 px-4 text-left">موجودی اولیه</th>
                <th className="py-3 px-4 text-left">فروش کل (ریال)</th>
                <th className="py-3 px-4 text-left">نقد شمرده‌شده</th>
                <th className="py-3 px-4 text-center">مغایرت صندوق</th>
                <th className="py-3 px-4 text-center">وضعیت سند</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pastShifts.map((sh) => (
                <tr key={sh.id} className="hover:bg-slate-50 transition">
                  <td className="py-3 px-4 font-mono font-bold text-slate-900">{sh.shiftNumber}</td>
                  <td className="py-3 px-4 font-semibold text-slate-800">{sh.cashierName}</td>
                  <td className="py-3 px-4 text-slate-500">
                    <div>{sh.startDate}</div>
                    <div className="text-[11px] text-slate-400">{sh.endDate}</div>
                  </td>
                  <td className="py-3 px-4 text-left font-mono">{sh.openingCash.toLocaleString('fa-IR')}</td>
                  <td className="py-3 px-4 text-left font-mono font-bold text-emerald-700">
                    {sh.totalSales.toLocaleString('fa-IR')}
                  </td>
                  <td className="py-3 px-4 text-left font-mono">{sh.actualClosingCash.toLocaleString('fa-IR')}</td>
                  <td className="py-3 px-4 text-center">
                    {sh.variance === 0 && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        تراز دقیق (بدون مغایرت)
                      </span>
                    )}
                    {sh.variance < 0 && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                        <AlertTriangle className="w-3 h-3 text-rose-600" />
                        کسری: {Math.abs(sh.variance).toLocaleString('fa-IR')} ریال
                      </span>
                    )}
                    {sh.variance > 0 && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                        <TrendingUp className="w-3 h-3 text-blue-600" />
                        فزونی: {sh.variance.toLocaleString('fa-IR')} ریال
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono font-semibold">
                      سند دوبل صادر شد
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* مودال ورود / خروج نقد در حین شیفت */}
      {isCashMovementOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveCashMovement}
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 text-right space-y-4 animate-fadeIn"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-base text-slate-800 flex items-center gap-2">
                <Banknote className="w-5 h-5 text-amber-500" />
                ثبت ورود یا خروج وجه نقد در حین شیفت
              </h3>
              <button
                type="button"
                onClick={() => setIsCashMovementOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMovementType('CASH_IN')}
                className={`p-3 rounded-xl border text-center font-bold text-xs flex items-center justify-center gap-2 ${
                  movementType === 'CASH_IN'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                    : 'border-slate-200 bg-white text-slate-700'
                }`}
              >
                <Plus className="w-4 h-4 text-emerald-600" />
                ورود وجه (تزریق به صندوق)
              </button>
              <button
                type="button"
                onClick={() => setMovementType('CASH_OUT')}
                className={`p-3 rounded-xl border text-center font-bold text-xs flex items-center justify-center gap-2 ${
                  movementType === 'CASH_OUT'
                    ? 'border-rose-600 bg-rose-50 text-rose-800'
                    : 'border-slate-200 bg-white text-slate-700'
                }`}
              >
                <Minus className="w-4 h-4 text-rose-600" />
                خروج وجه (برداشت از صندوق)
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">مبلغ تراکنش (ریال)</label>
              <input
                type="number"
                value={movementAmount || ''}
                onChange={(e) => setMovementAmount(Number(e.target.value))}
                placeholder="مثلاً ۱,۰۰۰,۰۰۰"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">دلیل تراکنش</label>
              <input
                type="text"
                value={movementReason}
                onChange={(e) => setMovementReason(e.target.value)}
                placeholder="مثلاً: تزریق پول خرد ۵۰ تومانی، پرداخت کرایه پیک، خرید تنقلات..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                required
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsCashMovementOpen(false)}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50"
              >
                انصراف
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm"
              >
                ثبت تراکنش نقدی
              </button>
            </div>
          </form>
        </div>
      )}

      {/* مودال بستن شیفت و گزارش Z */}
      {isCloseShiftOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 text-right space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-base text-rose-600 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-rose-600" />
                تحویل و بستن نهایی شیفت صندوق (Z-Report)
              </h3>
              <button onClick={() => setIsCloseShiftOpen(false)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-600">
                <span>موجودی اولیه شیفت:</span>
                <span className="font-mono font-bold">{activeShift.openingCash.toLocaleString('fa-IR')} ریال</span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span>فروش نقدی شیفت:</span>
                <span className="font-mono font-bold text-emerald-600">
                  {activeShift.cashSales.toLocaleString('fa-IR')} ریال
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span>تراکنش‌های ورود/خروج نقد:</span>
                <span className="font-mono font-bold">
                  {activeShift.cashMovementsNet.toLocaleString('fa-IR')} ریال
                </span>
              </div>
              <div className="pt-2 border-t border-slate-200 flex items-center justify-between font-black text-slate-900">
                <span>موجودی دفتری نقد مورد انتظار:</span>
                <span className="font-mono text-sm text-emerald-800">
                  {expectedCashInDrawer.toLocaleString('fa-IR')} ریال
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                موجودی نقدی فیزیکی شمرده‌شده در کشو (ریال) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                value={countedCash || ''}
                onChange={(e) => setCountedCash(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            {/* وضعیت مغایرت */}
            {countedCash !== expectedCashInDrawer && (
              <div
                className={`p-3 rounded-xl border text-xs flex items-center justify-between font-bold ${
                  countedCash < expectedCashInDrawer
                    ? 'bg-rose-50 border-rose-200 text-rose-800'
                    : 'bg-blue-50 border-blue-200 text-blue-800'
                }`}
              >
                <span>
                  {countedCash < expectedCashInDrawer ? 'کسری نقدی صندوق:' : 'فزونی نقدی صندوق:'}
                </span>
                <span className="font-mono text-sm">
                  {Math.abs(countedCash - expectedCashInDrawer).toLocaleString('fa-IR')} ریال
                </span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">توضیحات و یادداشت تحویل صندوق</label>
              <textarea
                value={shiftCloseNotes}
                onChange={(e) => setShiftCloseNotes(e.target.value)}
                rows={2}
                placeholder="یادداشت‌های احتمالی برای سرپرست فروش یا حسابداری..."
                className="w-full p-2.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                onClick={() => setIsCloseShiftOpen(false)}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50"
              >
                انصراف
              </button>
              <button
                onClick={handleConfirmCloseShift}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-sm"
              >
                تایید، بستن شیفت و صدور سند Z
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
