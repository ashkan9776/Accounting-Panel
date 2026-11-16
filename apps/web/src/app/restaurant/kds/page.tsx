'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Clock,
  Utensils,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Coffee,
  Pizza,
  RotateCcw,
  ArrowRight,
  Filter,
  Layers,
  ChefHat,
  Bike,
} from 'lucide-react';

interface KdsTicketItem {
  id: string;
  name: string;
  quantity: number;
  notes?: string;
  isReady?: boolean;
}

interface KdsTicket {
  id: string;
  ticketNumber: string;
  orderSource: 'TABLE' | 'DELIVERY' | 'TAKEAWAY';
  sourceTitle: string;
  station: 'HOT_KITCHEN' | 'BAR_CAFE' | 'GRILL_FASTFOOD' | 'BAKERY_DESSERT';
  status: 'QUEUED' | 'PREPARING' | 'READY' | 'SERVED';
  createdAt: string;
  elapsedMinutes: number;
  items: KdsTicketItem[];
}

const MOCK_KDS_TICKETS: KdsTicket[] = [
  {
    id: 'kds-1',
    ticketNumber: '#101',
    orderSource: 'TABLE',
    sourceTitle: 'میز T-01 (سالن اصلی)',
    station: 'HOT_KITCHEN',
    status: 'PREPARING',
    createdAt: '13:12',
    elapsedMinutes: 18, // هشدار تاخیر (>15)
    items: [
      { id: 'i1', name: 'چلوکباب کوبیده زعفرانی ۲ سیخ', quantity: 2, notes: 'کره محلی اضافه، گوجه کاملاً کبابی' },
      { id: 'i2', name: 'چلو جوجه کباب فیله زعفرانی', quantity: 1, notes: 'بدون پیاز خام' },
    ],
  },
  {
    id: 'kds-2',
    ticketNumber: '#102',
    orderSource: 'DELIVERY',
    sourceTitle: 'پیک دلیوری (اسنپ‌باکس)',
    station: 'GRILL_FASTFOOD',
    status: 'QUEUED',
    createdAt: '13:22',
    elapsedMinutes: 8,
    items: [
      { id: 'i3', name: 'پیتزا سیر و استیک آمریکایی', quantity: 1, notes: 'سس سیر دوبل' },
      { id: 'i4', name: 'سیب زمینی سرخ‌کرده ویژه با دیپ پنیر', quantity: 2 },
    ],
  },
  {
    id: 'kds-3',
    ticketNumber: '#103',
    orderSource: 'TABLE',
    sourceTitle: 'میز T-VIP-1 (سالن VIP)',
    station: 'BAR_CAFE',
    status: 'PREPARING',
    createdAt: '13:25',
    elapsedMinutes: 5,
    items: [
      { id: 'i5', name: 'شیک نوتلا با موز و فندق', quantity: 3 },
      { id: 'i6', name: 'اسپرسو دوبل ۱۰۰٪ عربیکا', quantity: 2 },
      { id: 'i7', name: 'دمنوش آرامش زعفران و بابونه', quantity: 1 },
    ],
  },
  {
    id: 'kds-4',
    ticketNumber: '#104',
    orderSource: 'TABLE',
    sourceTitle: 'میز T-04 (سالن اصلی)',
    station: 'HOT_KITCHEN',
    status: 'READY',
    createdAt: '13:18',
    elapsedMinutes: 12,
    items: [
      { id: 'i8', name: 'زرشک‌پلو با مرغ مجلسی سس‌دار', quantity: 4 },
      { id: 'i9', name: 'باقالی‌پلو با ماهیچه مخصوص', quantity: 2 },
    ],
  },
  {
    id: 'kds-5',
    ticketNumber: '#105',
    orderSource: 'TAKEAWAY',
    sourceTitle: 'بیرون‌بر حضوری',
    station: 'BAKERY_DESSERT',
    status: 'QUEUED',
    createdAt: '13:28',
    elapsedMinutes: 2,
    items: [
      { id: 'i10', name: 'کنافه پنیری با سرشیر و پسته', quantity: 2 },
      { id: 'i11', name: 'باقلوا استانبولی ۴ تکه', quantity: 1 },
    ],
  },
];

export default function RestaurantKdsPage() {
  const [tickets, setTickets] = useState<KdsTicket[]>(MOCK_KDS_TICKETS);
  const [selectedStation, setSelectedStation] = useState<string>('ALL');

  // شبیه‌سازی افزایش زمان سپری‌شده هر دقیقه
  useEffect(() => {
    const timer = setInterval(() => {
      setTickets((prev) =>
        prev.map((t) =>
          t.status !== 'SERVED' ? { ...t, elapsedMinutes: t.elapsedMinutes + 1 } : t
        )
      );
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const handleNextStatus = (ticketId: string) => {
    setTickets((prev) =>
      prev.map((t) => {
        if (t.id === ticketId) {
          if (t.status === 'QUEUED') return { ...t, status: 'PREPARING' };
          if (t.status === 'PREPARING') return { ...t, status: 'READY' };
          if (t.status === 'READY') return { ...t, status: 'SERVED' };
        }
        return t;
      })
    );
  };

  const stations = [
    { id: 'ALL', title: 'همه ایستگاه‌ها', icon: Layers },
    { id: 'HOT_KITCHEN', title: 'آشپزخانه گرم و کباب‌ها', icon: Flame },
    { id: 'GRILL_FASTFOOD', title: 'گریل، پیتزا و برگر', icon: Pizza },
    { id: 'BAR_CAFE', title: 'بار سرد، کافه و نوشیدنی', icon: Coffee },
    { id: 'BAKERY_DESSERT', title: 'قنادی و دسرها', icon: Utensils },
  ];

  const filteredTickets =
    selectedStation === 'ALL'
      ? tickets.filter((t) => t.status !== 'SERVED')
      : tickets.filter((t) => t.station === selectedStation && t.status !== 'SERVED');

  const delayedCount = tickets.filter((t) => t.status !== 'SERVED' && t.elapsedMinutes > 15).length;
  const preparingCount = tickets.filter((t) => t.status === 'PREPARING').length;
  const readyCount = tickets.filter((t) => t.status === 'READY').length;

  return (
    <div className="space-y-5">
      {/* سربرگ KDS */}
      <div className="bg-slate-900 text-white p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <Link href="/restaurant/tables" className="text-slate-400 hover:text-white transition">
            <ArrowRight className="w-5 h-5" />
          </Link>
          <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white">
            <ChefHat className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-white">نمایشگر هوشمند آشپزخانه (KDS)</h1>
              <span className="bg-emerald-500/20 text-emerald-400 text-xs px-2.5 py-0.5 rounded-full font-bold border border-emerald-500/30">
                سیستم زنده Real-time
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              مدیریت لحظه‌ای صف پخت، توزیع سفارشات بین ایستگاه‌ها و کنترل زمان تحویل
            </p>
          </div>
        </div>

        {/* آمارهای سریع آشپزخانه */}
        <div className="flex items-center gap-3 text-xs">
          <div className="bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700">
            <span className="text-slate-400">در حال پخت:</span>{' '}
            <strong className="text-cyan-400 font-mono text-sm">{preparingCount}</strong>
          </div>
          <div className="bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700">
            <span className="text-slate-400">آماده تحویل:</span>{' '}
            <strong className="text-emerald-400 font-mono text-sm">{readyCount}</strong>
          </div>
          {delayedCount > 0 && (
            <div className="bg-rose-950 px-3 py-1.5 rounded-xl border border-rose-800 text-rose-300 flex items-center gap-1.5 animate-pulse">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              <span>{delayedCount} سفارش با تاخیر بالا!</span>
            </div>
          )}
        </div>
      </div>

      {/* تب‌های انتخاب ایستگاه آشپزخانه */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {stations.map((st) => {
          const Icon = st.icon;
          const isSelected = selectedStation === st.id;
          return (
            <button
              key={st.id}
              onClick={() => setSelectedStation(st.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap ${
                isSelected
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{st.title}</span>
            </button>
          );
        })}
      </div>

      {/* گرید تیکت‌های آشپزخانه */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredTickets.length === 0 ? (
          <div className="col-span-full bg-white p-12 rounded-2xl border border-slate-200 text-center text-slate-400 space-y-2">
            <ChefHat className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="font-bold text-sm text-slate-600">کلیه سفارشات این ایستگاه تحویل داده شده‌اند</h3>
            <span className="text-xs text-slate-400 block">سفارش جدیدی در صف آماده‌سازی وجود ندارد.</span>
          </div>
        ) : (
          filteredTickets.map((ticket) => {
            const isDelayed = ticket.elapsedMinutes > 15;
            const isWarning = ticket.elapsedMinutes >= 10 && ticket.elapsedMinutes <= 15;

            return (
              <div
                key={ticket.id}
                className={`rounded-2xl border-2 overflow-hidden shadow-sm flex flex-col justify-between transition-all bg-white ${
                  isDelayed
                    ? 'border-rose-500 shadow-rose-200 ring-2 ring-rose-400/30'
                    : isWarning
                    ? 'border-amber-400 shadow-amber-100'
                    : 'border-slate-200'
                }`}
              >
                {/* هدر تیکت */}
                <div>
                  <div
                    className={`p-3 text-white flex items-center justify-between ${
                      isDelayed
                        ? 'bg-rose-600'
                        : isWarning
                        ? 'bg-amber-600'
                        : ticket.status === 'READY'
                        ? 'bg-emerald-600'
                        : 'bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-black text-base font-mono">{ticket.ticketNumber}</span>
                      <span className="text-[11px] bg-white/20 px-2 py-0.5 rounded-full font-bold">
                        {ticket.createdAt}
                      </span>
                    </div>

                    {/* زمان‌سنج انتظار */}
                    <div className="flex items-center gap-1 font-mono font-black text-xs">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{ticket.elapsedMinutes} دقیقه</span>
                    </div>
                  </div>

                  {/* منبع سفارش */}
                  <div className="p-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 font-bold text-slate-800">
                      {ticket.orderSource === 'DELIVERY' ? (
                        <Bike className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Utensils className="w-4 h-4 text-slate-600" />
                      )}
                      <span>{ticket.sourceTitle}</span>
                    </div>

                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        ticket.status === 'QUEUED'
                          ? 'bg-slate-200 text-slate-700'
                          : ticket.status === 'PREPARING'
                          ? 'bg-cyan-100 text-cyan-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {ticket.status === 'QUEUED' && 'در صف'}
                      {ticket.status === 'PREPARING' && 'در حال پخت'}
                      {ticket.status === 'READY' && 'آماده تحویل'}
                    </span>
                  </div>

                  {/* لیست غذاهای تیکت */}
                  <div className="p-4 space-y-2.5 divide-y divide-slate-100">
                    {ticket.items.map((item) => (
                      <div key={item.id} className="pt-2 first:pt-0">
                        <div className="flex items-start gap-2">
                          <span className="w-6 h-6 rounded-md bg-slate-900 text-white font-mono font-black text-xs flex items-center justify-center shrink-0">
                            {item.quantity}
                          </span>
                          <div className="flex-1 min-w-0">
                            <span className="font-bold text-xs text-slate-900 block leading-snug">
                              {item.name}
                            </span>
                            {item.notes && (
                              <span className="text-[11px] text-rose-600 bg-rose-50 px-2 py-0.5 rounded mt-1 inline-block font-semibold">
                                ⚠️ {item.notes}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* دکمه پیشروی وضعیت */}
                <div className="p-3 bg-slate-50 border-t border-slate-100">
                  {ticket.status === 'QUEUED' && (
                    <button
                      onClick={() => handleNextStatus(ticket.id)}
                      className="w-full py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <Flame className="w-4 h-4 text-amber-400" />
                      شروع پخت و آماده‌سازی
                    </button>
                  )}

                  {ticket.status === 'PREPARING' && (
                    <button
                      onClick={() => handleNextStatus(ticket.id)}
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      آماده شد (تحویل به سالن / پیک)
                    </button>
                  )}

                  {ticket.status === 'READY' && (
                    <button
                      onClick={() => handleNextStatus(ticket.id)}
                      className="w-full py-2 bg-slate-700 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      تحویل داده شد (پایان تیکت)
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
