'use client';

import React, { useState, useEffect } from 'react';
import {
  MapPin,
  Navigation,
  ShieldCheck,
  AlertTriangle,
  CreditCard,
  UserCheck,
  Search,
  Plus,
  RefreshCw,
  CheckCircle2,
  Calendar,
  Clock,
  Compass,
  FileSpreadsheet,
  AlertCircle,
  Building,
} from 'lucide-react';
import { fetchApi } from '../../../lib/api';

const SAMPLE_CUSTOMERS = [
  {
    id: 'party-cust-1',
    name: 'فروشگاه ابزارآلات برادران احمدی',
    code: 'CUST-1001',
    creditLimit: 300000000,
    totalBalance: 195000000,
    hasOverdue: false,
    maxOverdueDays: 15,
    latitude: 35.7542,
    longitude: 51.4112,
    address: 'تهران، میدان ونک، ابتدای ملاصدرا، پلاک ۲۴',
  },
  {
    id: 'party-cust-2',
    name: 'شرکت مهندسی سازه بتن پارس',
    code: 'CUST-1002',
    creditLimit: 500000000,
    totalBalance: 480000000,
    hasOverdue: true,
    maxOverdueDays: 45,
    latitude: 35.7981,
    longitude: 51.4289,
    address: 'تهران، نیاوران، خیابان باهنر، مجتمع نارون',
  },
  {
    id: 'party-cust-3',
    name: 'سوپرمارکت و هایپر کوروش شعبه ونک',
    code: 'CUST-1003',
    creditLimit: 150000000,
    totalBalance: 45000000,
    hasOverdue: false,
    maxOverdueDays: 0,
    latitude: 35.7511,
    longitude: 51.4088,
    address: 'تهران، میدان ونک، نرسیده به چهارراه جهان‌کودک',
  },
];

const SAMPLE_VISITS = [
  {
    id: 'vst-01',
    customerName: 'فروشگاه ابزارآلات برادران احمدی',
    visitorName: 'رضا کمالی (ویزیتور منطقه ۳)',
    distanceMeters: 45,
    isWithinGeofence: true,
    purpose: 'ORDER_TAKING',
    purposeTitle: 'ثبت سفارش کالا',
    orderAmount: 65000000,
    visitDate: '1403/12/28 10:15',
    notes: 'سفارش روغن نباتی و برنج ثبت شد، مشتری چک ماه قبل را تحویل داد.',
  },
  {
    id: 'vst-02',
    customerName: 'سوپرمارکت و هایپر کوروش شعبه ونک',
    visitorName: 'رضا کمالی (ویزیتور منطقه ۳)',
    distanceMeters: 110,
    isWithinGeofence: true,
    purpose: 'PAYMENT_COLLECTION',
    purposeTitle: 'وصول چک و مطالبات',
    orderAmount: 0,
    visitDate: '1403/12/28 11:45',
    notes: 'یک فقره چک صیادی به سررسید ۱۵ فروردین دریافت گردید.',
  },
];

export default function VisitorSalesGeofencingPage() {
  const [customers] = useState<any[]>(SAMPLE_CUSTOMERS);
  const [visits, setVisits] = useState<any[]>(SAMPLE_VISITS);
  const [selectedCustomerId, setSelectedCustomerId] = useState(SAMPLE_CUSTOMERS[0].id);
  const [loading, setLoading] = useState(false);

  // فرم ثبت ویزیت
  const [visitorLat, setVisitorLat] = useState('35.7544');
  const [visitorLng, setVisitorLng] = useState('51.4114');
  const [orderAmount, setOrderAmount] = useState('45000000');
  const [visitPurpose, setVisitPurpose] = useState('ORDER_TAKING');
  const [visitNotes, setVisitNotes] = useState('مذاکره با مدیر فروشگاه و ثبت سفارش محصولات جدید');

  // نتیجه استعلام سقف اعتبار
  const [creditCheckResult, setCreditCheckResult] = useState<any>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId) || customers[0];

  // محاسبه فاصله با فرمول هاورسین به صورت محلی
  const calculateHaversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3; // شعاع کره زمین به متر
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
  };

  const calculatedDistance = calculateHaversineDistance(
    Number(visitorLat),
    Number(visitorLng),
    selectedCustomer.latitude,
    selectedCustomer.longitude
  );

  const isWithinGeofence = calculatedDistance <= 200; // حداکثر شعاع مجاز ۲۰۰ متر

  // استعلام آنلاین سقف اعتبار و مطالبات معوق
  const handleCheckCredit = async () => {
    setLoading(true);
    setNotification(null);
    try {
      const res = await fetchApi(
        `/omnichannel/visitor/customer-credit?partyId=${selectedCustomer.id}&amount=${orderAmount}`
      );
      if (res.data) {
        setCreditCheckResult(res.data);
      }
    } catch {
      // شبیه‌سازی محلی اعتبارسنجی سقف اعتبار
      const totalAfter = selectedCustomer.totalBalance + Number(orderAmount);
      const isApproved = totalAfter <= selectedCustomer.creditLimit && !selectedCustomer.hasOverdue;
      setCreditCheckResult({
        isApproved,
        creditLimit: selectedCustomer.creditLimit,
        currentBalance: selectedCustomer.totalBalance,
        newBalanceAfterOrder: totalAfter,
        availableCredit: Math.max(0, selectedCustomer.creditLimit - selectedCustomer.totalBalance),
        hasOverdueInvoices: selectedCustomer.hasOverdue,
        overdueDays: selectedCustomer.maxOverdueDays,
        message: isApproved
          ? 'سقف اعتبار مشتری تایید شد و ثبت سفارش نسیه مجاز است.'
          : selectedCustomer.hasOverdue
          ? 'مشتری دارای فاکتور معوق بیش از ۳۰ روز است؛ فروش نسیه مسدود می‌باشد.'
          : 'مبلغ سفارش از باقیمانده سقف اعتبار مشتری فراتر می‌رود.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handleCheckCredit();
  }, [selectedCustomerId, orderAmount]);

  // ثبت ویزیت میدانی
  const handleRecordVisit = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotification(null);

    const newVisit = {
      id: `vst-${Date.now()}`,
      customerName: selectedCustomer.name,
      visitorName: 'رضا کمالی (ویزیتور منطقه ۳)',
      distanceMeters: calculatedDistance,
      isWithinGeofence,
      purpose: visitPurpose,
      purposeTitle:
        visitPurpose === 'ORDER_TAKING'
          ? 'ثبت سفارش کالا'
          : visitPurpose === 'PAYMENT_COLLECTION'
          ? 'وصول چک و مطالبات'
          : 'ویزیت حضوری و بازاریابی',
      orderAmount: visitPurpose === 'ORDER_TAKING' ? Number(orderAmount) : 0,
      visitDate: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
      notes: visitNotes,
    };

    setVisits([newVisit, ...visits]);
    setNotification({
      type: 'success',
      message: `ویزیت مشتری ${selectedCustomer.name} با موقعیت GPS (${calculatedDistance} متر فاصله) با موفقیت ثبت شد.`,
    });
  };

  return (
    <div className="space-y-6">
      {/* سربرگ */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <Navigation className="w-6 h-6 text-purple-600" />
            <span>مدیریت ویزیتوری میدانی، سقف اعتبار و ژئوفنسینگ (GPS)</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            ردیابی لحظه‌ای بازاریاب با مختصات ماهواره‌ای، اعتبارسنجی شعاع مجاز مشتری (۲۰۰ متر) و کنترل سقف اعتبار آنلاین
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-600 bg-purple-50 border border-purple-200 px-3 py-1.5 rounded-xl">
            موقعیت بازاریاب: تهران، منطقه ۳ (آنلاین)
          </span>
        </div>
      </div>

      {notification && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center gap-2 ${
            notification.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border border-rose-200 text-rose-800'
          }`}
        >
          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
          <span>{notification.message}</span>
        </div>
      )}

      {/* بخش اعتبارسنجی سقف اعتبار و ثبت ویزیت */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ستون راست: انتخاب مشتری و وضعیت سقف اعتبار */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4 text-xs">
            <div className="flex items-center gap-2 font-black text-slate-800 border-b pb-3">
              <Building className="w-4 h-4 text-purple-600" />
              <span>انتخاب طرف‌حساب و استعلام سقف اعتبار</span>
            </div>

            <div>
              <label className="block text-slate-600 font-semibold mb-1">مشتری یا فروشگاه:</label>
              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 outline-none focus:border-purple-500 font-medium"
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-600 font-semibold mb-1">مبلغ سفارش جدید پیشنهادی (ریال):</label>
              <input
                type="number"
                value={orderAmount}
                onChange={(e) => setOrderAmount(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-mono text-left outline-none focus:border-purple-500"
              />
            </div>

            {/* کارت وضعیت اعتبار */}
            {creditCheckResult && (
              <div
                className={`p-4 rounded-xl border space-y-2.5 ${
                  creditCheckResult.isApproved
                    ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950'
                    : 'bg-rose-50/70 border-rose-300 text-rose-950'
                }`}
              >
                <div className="flex items-center justify-between font-bold">
                  <span className="flex items-center gap-1.5">
                    {creditCheckResult.isApproved ? (
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                    )}
                    {creditCheckResult.isApproved ? 'سفارش نسیه مجاز است' : 'فروش نسیه مسدود است'}
                  </span>
                  <span className="text-[11px] font-mono">
                    {creditCheckResult.hasOverdueInvoices ? 'دارای فاکتور معوق' : 'خوش‌حساب'}
                  </span>
                </div>

                <div className="space-y-1 text-[11px] border-t pt-2 border-slate-200/50">
                  <div className="flex justify-between">
                    <span>سقف اعتبار مصوب:</span>
                    <span className="font-mono font-bold">
                      {(creditCheckResult.creditLimit || 0).toLocaleString('fa-IR')} ریال
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>مانده بدهی جاری مشتری:</span>
                    <span className="font-mono font-bold">
                      {(creditCheckResult.currentBalance || 0).toLocaleString('fa-IR')} ریال
                    </span>
                  </div>
                  <div className="flex justify-between font-black text-purple-900">
                    <span>اعتبار باقیمانده آزاد:</span>
                    <span className="font-mono">
                      {(creditCheckResult.availableCredit || 0).toLocaleString('fa-IR')} ریال
                    </span>
                  </div>
                </div>

                <p className="text-[10px] leading-tight opacity-90 border-t pt-1.5 border-slate-200/50">
                  {creditCheckResult.message}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ستون چپ: ردیابی موقعیت مکانی و ژئوفنسینگ GPS */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4 text-xs">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2 font-black text-slate-800">
                <Compass className="w-4 h-4 text-purple-600" />
                <span>شبیه‌ساز حضور و ژئوفنسینگ ماهواره‌ای (Haversine Formula)</span>
              </div>
              <span
                className={`flex items-center gap-1 font-bold text-[10px] px-2.5 py-0.5 rounded-full ${
                  isWithinGeofence
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-rose-100 text-rose-800'
                }`}
              >
                <MapPin className="w-3 h-3" />
                {isWithinGeofence ? 'درون محدوده مشتری (مجاز)' : 'خارج از محدوده فروشگاه'}
              </span>
            </div>

            {/* مختصات مکانی */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-slate-50 p-3 rounded-xl border">
                <span className="text-[10px] text-slate-500 block mb-0.5">مختصات ثبت‌شده مشتری</span>
                <span className="font-mono font-bold text-slate-700">
                  {selectedCustomer.latitude}, {selectedCustomer.longitude}
                </span>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border">
                <span className="text-[10px] text-slate-500 block mb-0.5">موقعیت فعلی بازاریاب</span>
                <span className="font-mono font-bold text-indigo-700">
                  {visitorLat}, {visitorLng}
                </span>
              </div>

              <div
                className={`p-3 rounded-xl border text-center ${
                  isWithinGeofence
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-rose-50 border-rose-200 text-rose-900'
                }`}
              >
                <span className="text-[10px] block mb-0.5">فاصله تا مشتری</span>
                <span className="font-mono text-base font-black">{calculatedDistance} متر</span>
              </div>
            </div>

            <form onSubmit={handleRecordVisit} className="space-y-3 pt-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">هدف از ویزیت:</label>
                  <select
                    value={visitPurpose}
                    onChange={(e) => setVisitPurpose(e.target.value)}
                    className="w-full bg-slate-50 border rounded-xl p-2 outline-none"
                  >
                    <option value="ORDER_TAKING">ثبت سفارش کالا</option>
                    <option value="PAYMENT_COLLECTION">وصول چک و مطالبات</option>
                    <option value="FOLLOW_UP">پیگیری و بازاریابی</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">موقعیت آزمایشی بازاریاب:</label>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setVisitorLat('35.7544');
                        setVisitorLng('51.4114');
                      }}
                      className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-[10px] font-bold"
                    >
                      نزدیک مشتری (۴۵م)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setVisitorLat('35.7600');
                        setVisitorLng('51.4200');
                      }}
                      className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-[10px] font-bold"
                    >
                      دور از مشتری (۸۵۰م)
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">توضیحات و گزارش ویزیت:</label>
                <input
                  type="text"
                  value={visitNotes}
                  onChange={(e) => setVisitNotes(e.target.value)}
                  className="w-full bg-slate-50 border rounded-xl p-2 outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold transition flex items-center justify-center gap-2 shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>ثبت قطعی ویزیت با مهر زمانی و موقعیت GPS</span>
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* جدول تاریخچه ویزیت‌های ثبت‌شده بازاریاب */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-800 text-xs flex items-center gap-2">
            <Clock className="w-4 h-4 text-purple-600" />
            <span>گزارش ویزیت‌های میدانی بازاریاب (تاریخچه روزانه)</span>
          </h3>
          <span className="text-[11px] text-slate-500 font-mono">تاریخ: ۱۴۰۳/۱۲/۲۸</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 text-slate-700 border-b border-slate-200 font-bold">
              <tr>
                <th className="py-2.5 px-3 w-12 text-center">ردیف</th>
                <th className="py-2.5 px-3">مشتری ویزیت‌شده</th>
                <th className="py-2.5 px-3 w-36">هدف ویزیت</th>
                <th className="py-2.5 px-3 w-32 text-center">فاصله ژئوفنسینگ</th>
                <th className="py-2.5 px-3 w-32 text-left">مبلغ سفارش</th>
                <th className="py-2.5 px-3 w-28 text-center">ساعت ثبت</th>
                <th className="py-2.5 px-4">شرح مذاکرات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visits.map((v, idx) => (
                <tr key={v.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                  <td className="py-3 px-3 font-semibold text-slate-900">{v.customerName}</td>
                  <td className="py-3 px-3">
                    <span className="text-[11px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md">
                      {v.purposeTitle}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-center">
                    {v.isWithinGeofence ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full">
                        <CheckCircle2 className="w-3 h-3" />
                        {v.distanceMeters} متر (منطبق)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-rose-100 text-rose-800 px-2.5 py-0.5 rounded-full">
                        <AlertTriangle className="w-3 h-3" />
                        {v.distanceMeters} متر (نامنطبق)
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-left font-mono font-bold text-slate-800">
                    {v.orderAmount > 0 ? `${v.orderAmount.toLocaleString('fa-IR')} ریال` : '-'}
                  </td>
                  <td className="py-3 px-3 text-center font-mono text-slate-500">{v.visitDate}</td>
                  <td className="py-3 px-4 text-slate-600 text-[11px] truncate max-w-xs">{v.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
