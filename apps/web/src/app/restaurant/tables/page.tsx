'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Utensils,
  Users,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  CreditCard,
  ArrowRightLeft,
  Merge,
  Plus,
  Search,
  Filter,
  DollarSign,
  Coffee,
  Sparkles,
} from 'lucide-react';

interface RestaurantTable {
  id: string;
  tableNumber: string;
  section: string;
  capacity: number;
  status: 'VACANT' | 'OCCUPIED' | 'BILL_PRINTED' | 'RESERVED' | 'CLEANING';
  currentOrderId?: string;
  customerName?: string;
  seatedAt?: string;
  currentTotalAmount?: number;
  itemCount?: number;
}

const MOCK_TABLES: RestaurantTable[] = [
  { id: 't1', tableNumber: 'T-01', section: 'سالن اصلی', capacity: 4, status: 'OCCUPIED', currentOrderId: 'ORD-901', customerName: 'خانواده رضایی', seatedAt: '1403/08/26 13:10', currentTotalAmount: 3850000, itemCount: 4 },
  { id: 't2', tableNumber: 'T-02', section: 'سالن اصلی', capacity: 2, status: 'VACANT' },
  { id: 't3', tableNumber: 'T-03', section: 'سالن اصلی', capacity: 4, status: 'BILL_PRINTED', currentOrderId: 'ORD-902', customerName: 'آقای کمالی', seatedAt: '1403/08/26 12:40', currentTotalAmount: 2150000, itemCount: 3 },
  { id: 't4', tableNumber: 'T-04', section: 'سالن اصلی', capacity: 6, status: 'OCCUPIED', currentOrderId: 'ORD-903', customerName: 'مهمانان شرکت مپنا', seatedAt: '1403/08/26 13:25', currentTotalAmount: 6400000, itemCount: 8 },
  { id: 't5', tableNumber: 'T-05', section: 'سالن اصلی', capacity: 4, status: 'VACANT' },
  { id: 't6', tableNumber: 'T-06', section: 'سالن اصلی', capacity: 2, status: 'RESERVED', customerName: 'رزرو ساعت ۲۰:۰۰ - دکتر نادری' },
  { id: 't7', tableNumber: 'T-VIP-1', section: 'سالن VIP', capacity: 10, status: 'OCCUPIED', currentOrderId: 'ORD-904', customerName: 'جشن تولد حسینی', seatedAt: '1403/08/26 12:15', currentTotalAmount: 14800000, itemCount: 16 },
  { id: 't8', tableNumber: 'T-VIP-2', section: 'سالن VIP', capacity: 8, status: 'VACANT' },
  { id: 't9', tableNumber: 'T-OUT-1', section: 'فضای باز', capacity: 4, status: 'VACANT' },
  { id: 't10', tableNumber: 'T-OUT-2', section: 'فضای باز', capacity: 4, status: 'OCCUPIED', currentOrderId: 'ORD-905', customerName: 'دوستان دانشگاه', seatedAt: '1403/08/26 13:30', currentTotalAmount: 1750000, itemCount: 3 },
  { id: 't11', tableNumber: 'T-OUT-3', section: 'فضای باز', capacity: 2, status: 'CLEANING' },
  { id: 't12', tableNumber: 'T-BAL-1', section: 'بالکن', capacity: 4, status: 'VACANT' },
];

export default function RestaurantTablesPage() {
  const [tables, setTables] = useState<RestaurantTable[]>(MOCK_TABLES);
  const [selectedSection, setSelectedSection] = useState<string>('ALL');
  const [selectedTableForAction, setSelectedTableForAction] = useState<RestaurantTable | null>(null);

  // مودال انتقال میز
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [targetTableId, setTargetTableId] = useState<string>('');

  // مودال ثبت سفارش جدید روی میز خالی
  const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState(false);
  const [newOrderGuestName, setNewOrderGuestName] = useState('');
  const [newOrderGuestCount, setNewOrderGuestCount] = useState(2);

  const sections = ['ALL', 'سالن اصلی', 'سالن VIP', 'فضای باز', 'بالکن'];

  const filteredTables =
    selectedSection === 'ALL'
      ? tables
      : tables.filter((t) => t.section === selectedSection);

  const vacantCount = tables.filter((t) => t.status === 'VACANT').length;
  const occupiedCount = tables.filter((t) => t.status === 'OCCUPIED').length;
  const billCount = tables.filter((t) => t.status === 'BILL_PRINTED').length;
  const reservedCount = tables.filter((t) => t.status === 'RESERVED').length;

  const handleOpenOrder = (table: RestaurantTable) => {
    setSelectedTableForAction(table);
    setNewOrderGuestName('');
    setIsNewOrderModalOpen(true);
  };

  const handleConfirmNewOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTableForAction) return;
    setTables((prev) =>
      prev.map((t) =>
        t.id === selectedTableForAction.id
          ? {
              ...t,
              status: 'OCCUPIED',
              customerName: newOrderGuestName || 'مهمان سالن',
              seatedAt: '1403/08/26 ' + new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
              currentOrderId: `ORD-${Date.now().toString().slice(-4)}`,
              currentTotalAmount: 0,
              itemCount: 0,
            }
          : t
      )
    );
    setIsNewOrderModalOpen(false);
    setSelectedTableForAction(null);
  };

  const handleTransferTable = () => {
    if (!selectedTableForAction || !targetTableId) return;
    const sourceTable = selectedTableForAction;
    const destTable = tables.find((t) => t.id === targetTableId);
    if (!destTable) return;

    setTables((prev) =>
      prev.map((t) => {
        if (t.id === sourceTable.id) {
          return {
            ...t,
            status: 'VACANT',
            customerName: undefined,
            currentOrderId: undefined,
            currentTotalAmount: undefined,
            itemCount: undefined,
            seatedAt: undefined,
          };
        }
        if (t.id === destTable.id) {
          return {
            ...t,
            status: 'OCCUPIED',
            customerName: sourceTable.customerName,
            currentOrderId: sourceTable.currentOrderId,
            currentTotalAmount: sourceTable.currentTotalAmount,
            itemCount: sourceTable.itemCount,
            seatedAt: sourceTable.seatedAt,
          };
        }
        return t;
      })
    );

    setIsTransferModalOpen(false);
    setSelectedTableForAction(null);
    setTargetTableId('');
  };

  const handlePrintBill = (tableId: string) => {
    setTables((prev) =>
      prev.map((t) => (t.id === tableId ? { ...t, status: 'BILL_PRINTED' } : t))
    );
  };

  const handleSettleTable = (tableId: string) => {
    setTables((prev) =>
      prev.map((t) =>
        t.id === tableId
          ? {
              ...t,
              status: 'VACANT',
              customerName: undefined,
              currentOrderId: undefined,
              currentTotalAmount: undefined,
              itemCount: undefined,
              seatedAt: undefined,
            }
          : t
      )
    );
  };

  return (
    <div className="space-y-6">
      {/* سربرگ */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-800">نقشه زنده سالن و مدیریت میزهای رستوران</h1>
            <span className="bg-emerald-100 text-emerald-800 text-xs px-2.5 py-0.5 rounded-full font-bold">
              مانیتورینگ زنده
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            کنترل وضعیت میزها، پذیرش مهمان، انتقال میز، چاپ فاکتور موقت و اتصال به مانیتورینگ آشپزخانه (KDS)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/restaurant/kds"
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
          >
            <Clock className="w-4 h-4 text-emerald-400" />
            نمایشگر آشپزخانه (KDS)
          </Link>
          <Link
            href="/restaurant/recipes"
            className="px-3.5 py-2 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
          >
            <Utensils className="w-4 h-4 text-amber-500" />
            دستور پخت و Food Cost
          </Link>
        </div>
      </div>

      {/* کارت‌های آماری */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 block">میزهای خالی (آماده)</span>
            <span className="text-2xl font-black text-emerald-600 font-mono mt-1 block">
              {vacantCount.toLocaleString('fa-IR')}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            ✓
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 block">میزهای اشغال (سرو غذا)</span>
            <span className="text-2xl font-black text-rose-600 font-mono mt-1 block">
              {occupiedCount.toLocaleString('fa-IR')}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
            ●
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 block">درخواست صورتحساب</span>
            <span className="text-2xl font-black text-amber-500 font-mono mt-1 block">
              {billCount.toLocaleString('fa-IR')}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <FileText className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 block">میزهای رزرو شده</span>
            <span className="text-2xl font-black text-blue-600 font-mono mt-1 block">
              {reservedCount.toLocaleString('fa-IR')}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* تب‌های سالن و بخش‌ها */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {sections.map((sec) => (
          <button
            key={sec}
            onClick={() => setSelectedSection(sec)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              selectedSection === sec
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            {sec === 'ALL' ? 'همه بخش‌های سالن' : sec}
          </button>
        ))}
      </div>

      {/* گرید نقشه میزها */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filteredTables.map((table) => {
          const isVacant = table.status === 'VACANT';
          const isOccupied = table.status === 'OCCUPIED';
          const isBillPrinted = table.status === 'BILL_PRINTED';
          const isReserved = table.status === 'RESERVED';
          const isCleaning = table.status === 'CLEANING';

          return (
            <div
              key={table.id}
              className={`rounded-2xl p-5 border-2 transition-all shadow-sm flex flex-col justify-between ${
                isVacant
                  ? 'bg-white border-slate-200 hover:border-emerald-500'
                  : isOccupied
                  ? 'bg-rose-50/40 border-rose-300 shadow-rose-100'
                  : isBillPrinted
                  ? 'bg-amber-50/50 border-amber-300 shadow-amber-100'
                  : isReserved
                  ? 'bg-blue-50/40 border-blue-300'
                  : 'bg-slate-50 border-slate-300 opacity-70'
              }`}
            >
              {/* هدر کارت میز */}
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-lg font-mono text-slate-900">{table.tableNumber}</span>
                    <span className="text-[11px] bg-white/80 border border-slate-200 px-2 py-0.5 rounded-full text-slate-600 font-semibold">
                      {table.section}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 text-slate-500 text-xs">
                    <Users className="w-3.5 h-3.5" />
                    <span className="font-mono font-bold">{table.capacity} نفره</span>
                  </div>
                </div>

                {/* وضعیت میز */}
                <div className="mt-3">
                  {isVacant && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                      خالی و آماده پذیرش
                    </span>
                  )}
                  {isOccupied && (
                    <div>
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-100 px-2.5 py-1 rounded-lg">
                        مشغول | {table.customerName}
                      </span>
                      <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>نشستن: {table.seatedAt}</span>
                      </div>
                    </div>
                  )}
                  {isBillPrinted && (
                    <div>
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-100 px-2.5 py-1 rounded-lg">
                        صورتحساب صادر شد
                      </span>
                      <div className="text-[11px] text-slate-600 mt-1">مشتری: {table.customerName}</div>
                    </div>
                  )}
                  {isReserved && (
                    <div className="text-xs text-blue-800 font-semibold bg-blue-100/60 p-2 rounded-lg">
                      {table.customerName}
                    </div>
                  )}
                  {isCleaning && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 bg-slate-200 px-2.5 py-1 rounded-lg">
                      در حال نظافت
                    </span>
                  )}
                </div>

                {/* مبلغ سفارش جاری */}
                {(isOccupied || isBillPrinted) && (
                  <div className="mt-3 pt-3 border-t border-slate-200/80 flex items-center justify-between text-xs">
                    <span className="text-slate-500">{table.itemCount} قلم سفارش:</span>
                    <span className="font-mono font-black text-slate-900 text-sm">
                      {table.currentTotalAmount?.toLocaleString('fa-IR')} <span className="text-[10px]">ریال</span>
                    </span>
                  </div>
                )}
              </div>

              {/* دکمه‌های عملیات میز */}
              <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between gap-1.5">
                {isVacant && (
                  <button
                    onClick={() => handleOpenOrder(table)}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <Plus className="w-4 h-4" />
                    پذیرش مهمان / سفارش
                  </button>
                )}

                {(isOccupied || isBillPrinted) && (
                  <>
                    <button
                      onClick={() => handlePrintBill(table.id)}
                      className="flex-1 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-[11px] font-bold transition flex items-center justify-center gap-1 shadow-xs"
                      title="چاپ صورتحساب موقت سر میز"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      فاکتور
                    </button>
                    <button
                      onClick={() => handleSettleTable(table.id)}
                      className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold transition flex items-center justify-center gap-1 shadow-xs"
                      title="تسویه حساب و تخلیه میز"
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      تسویه
                    </button>
                    <button
                      onClick={() => {
                        setSelectedTableForAction(table);
                        setIsTransferModalOpen(true);
                      }}
                      className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs transition"
                      title="انتقال مهمان به میز دیگر"
                    >
                      <ArrowRightLeft className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}

                {isReserved && (
                  <button
                    onClick={() => handleOpenOrder(table)}
                    className="w-full py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition"
                  >
                    شروع سرویس رزرو
                  </button>
                )}

                {isCleaning && (
                  <button
                    onClick={() =>
                      setTables((prev) =>
                        prev.map((t) => (t.id === table.id ? { ...t, status: 'VACANT' } : t))
                      )
                    }
                    className="w-full py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold transition"
                  >
                    تایید آماده بودن میز
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* مودال پذیرش مهمان جدید روی میز */}
      {isNewOrderModalOpen && selectedTableForAction && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleConfirmNewOrder}
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 text-right space-y-4 animate-fadeIn"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-base text-slate-800 flex items-center gap-2">
                <Utensils className="w-5 h-5 text-emerald-600" />
                پذیرش مهمان در میز {selectedTableForAction.tableNumber} ({selectedTableForAction.section})
              </h3>
              <button
                type="button"
                onClick={() => setIsNewOrderModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">نام یا عنوان مهمان / میز</label>
              <input
                type="text"
                value={newOrderGuestName}
                onChange={(e) => setNewOrderGuestName(e.target.value)}
                placeholder="مثلاً: خانواده رضایی، مهمان VIP، میز ۳ نفره..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">تعداد مهمانان</label>
              <input
                type="number"
                min={1}
                max={selectedTableForAction.capacity}
                value={newOrderGuestCount}
                onChange={(e) => setNewOrderGuestCount(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsNewOrderModalOpen(false)}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50"
              >
                انصراف
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm"
              >
                تایید و باز کردن میز
              </button>
            </div>
          </form>
        </div>
      )}

      {/* مودال انتقال میز */}
      {isTransferModalOpen && selectedTableForAction && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 text-right space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-base text-slate-800 flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-amber-500" />
                انتقال مهمان از میز {selectedTableForAction.tableNumber}
              </h3>
              <button
                type="button"
                onClick={() => setIsTransferModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600">
              کلیه سفارشات، ریز اقلام و زمان نشستن مهمان ({selectedTableForAction.customerName}) به میز مقصد منتقل خواهد شد.
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">انتخاب میز مقصد (میزهای خالی)</label>
              <select
                value={targetTableId}
                onChange={(e) => setTargetTableId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-800 bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                <option value="">یک میز خالی را انتخاب کنید...</option>
                {tables
                  .filter((t) => t.status === 'VACANT' && t.id !== selectedTableForAction.id)
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.tableNumber} - {t.section} (ظرفیت: {t.capacity} نفر)
                    </option>
                  ))}
              </select>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsTransferModalOpen(false)}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={handleTransferTable}
                disabled={!targetTableId}
                className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold shadow-sm disabled:opacity-50"
              >
                تایید انتقال میز
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
