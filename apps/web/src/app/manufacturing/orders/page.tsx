'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Factory,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Play,
  Layers,
  ArrowRight,
  Plus,
  PackageCheck,
  FileSpreadsheet,
  TrendingDown,
  TrendingUp,
  Percent,
  Search,
  Filter,
} from 'lucide-react';

interface ProductionOrder {
  id: string;
  orderNumber: string;
  productName: string;
  bomCode: string;
  plannedQuantity: number;
  completedQuantity: number;
  status: 'RELEASED' | 'IN_PROGRESS' | 'COMPLETED';
  startDate: string;
  targetEndDate: string;
  wipMaterialsCost: number;
  wipLaborCost: number;
  wipOverheadCost: number;
  totalActualCost: number;
  variancePercentage: number; // انحراف از استاندارد
}

const MOCK_ORDERS: ProductionOrder[] = [
  {
    id: 'wo-1',
    orderNumber: 'WO-1403-0801',
    productName: 'الکتروموتور صنعتی ۳ فاز ۵ اسب بخار',
    bomCode: 'BOM-MTR-01',
    plannedQuantity: 20,
    completedQuantity: 15,
    status: 'IN_PROGRESS',
    startDate: '1403/08/20',
    targetEndDate: '1403/08/30',
    wipMaterialsCost: 440640000,
    wipLaborCost: 45000000,
    wipOverheadCost: 75000000,
    totalActualCost: 560640000,
    variancePercentage: -1.8, // ۱.۸٪ صرفه‌جویی (مساعد)
  },
  {
    id: 'wo-2',
    orderNumber: 'WO-1403-0802',
    productName: 'پمپ گریز از مرکز آب کشاورزی ۲ اینچ',
    bomCode: 'BOM-PMP-02',
    plannedQuantity: 10,
    completedQuantity: 10,
    status: 'COMPLETED',
    startDate: '1403/08/15',
    targetEndDate: '1403/08/24',
    wipMaterialsCost: 182000000,
    wipLaborCost: 20000000,
    wipOverheadCost: 35000000,
    totalActualCost: 237000000,
    variancePercentage: 2.1, // ۲.۱٪ انحراف نامساعد
  },
  {
    id: 'wo-3',
    orderNumber: 'WO-1403-0803',
    productName: 'شیر فلکه‌ای چدنی صنعتی سایز ۴ اینچ',
    bomCode: 'BOM-VLV-03',
    plannedQuantity: 30,
    completedQuantity: 0,
    status: 'RELEASED',
    startDate: '1403/08/26',
    targetEndDate: '1403/09/05',
    wipMaterialsCost: 0,
    wipLaborCost: 0,
    wipOverheadCost: 0,
    totalActualCost: 0,
    variancePercentage: 0,
  },
];

export default function ProductionOrdersPage() {
  const [orders, setOrders] = useState<ProductionOrder[]>(MOCK_ORDERS);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // مودال حواله مصرف مواد
  const [selectedOrderForIssue, setSelectedOrderForIssue] = useState<ProductionOrder | null>(null);
  const [issueQuantity, setIssueQuantity] = useState<number>(10);

  // مودال اعلام تکمیل سفارش
  const [selectedOrderForComplete, setSelectedOrderForComplete] = useState<ProductionOrder | null>(null);
  const [completeQuantity, setCompleteQuantity] = useState<number>(5);

  // مودال تحلیل انحرافات
  const [selectedOrderForVariance, setSelectedOrderForVariance] = useState<ProductionOrder | null>(null);

  const [notification, setNotification] = useState<string | null>(null);

  const filteredOrders = orders.filter((o) => {
    const matchesStatus = filterStatus === 'ALL' || o.status === filterStatus;
    const matchesSearch =
      o.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.productName.includes(searchQuery);
    return matchesStatus && matchesSearch;
  });

  const inProgressCount = orders.filter((o) => o.status === 'IN_PROGRESS').length;
  const completedCount = orders.filter((o) => o.status === 'COMPLETED').length;

  const handleConfirmIssueMaterials = () => {
    if (!selectedOrderForIssue) return;
    setOrders((prev) =>
      prev.map((o) =>
        o.id === selectedOrderForIssue.id
          ? {
              ...o,
              status: 'IN_PROGRESS',
              wipMaterialsCost: o.wipMaterialsCost + 146880000,
              totalActualCost: o.totalActualCost + 146880000,
            }
          : o
      )
    );
    setSelectedOrderForIssue(null);
    setNotification(
      'حواله مصرف مواد اولیه به انبار در جریان ساخت (WIP) صادر و سند حسابداری شماره ۱۰۴ صادر گردید.'
    );
    setTimeout(() => setNotification(null), 4000);
  };

  const handleConfirmCompleteOrder = () => {
    if (!selectedOrderForComplete) return;
    setOrders((prev) =>
      prev.map((o) =>
        o.id === selectedOrderForComplete.id
          ? {
              ...o,
              completedQuantity: o.plannedQuantity,
              status: 'COMPLETED',
            }
          : o
      )
    );
    setSelectedOrderForComplete(null);
    setNotification(
      'رسید انبار محصول نهایی صادر و سند انتقال از کالای در جریان ساخت (WIP) به موجودی محصول ساخته‌شده در دفتر کل ثبت شد.'
    );
    setTimeout(() => setNotification(null), 4000);
  };

  return (
    <div className="space-y-6">
      {/* سربرگ */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-800">دستورات و سفارشات کار تولید (Work Orders)</h1>
            <span className="bg-emerald-100 text-emerald-800 text-xs px-2.5 py-0.5 rounded-full font-bold">
              حسابداری صنعتی
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            پیگیری فرآیند ساخت، ردیابی کالای در جریان ساخت (WIP)، جذب دستمزد و سربار و ثبت رسید محصول نهایی
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/manufacturing/boms"
            className="px-3.5 py-2 border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
          >
            <Layers className="w-4 h-4 text-emerald-600" />
            فرمول‌های ساخت (BOM)
          </Link>
          <Link
            href="/manufacturing/work-centers"
            className="px-3.5 py-2 border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
          >
            <Factory className="w-4 h-4 text-amber-500" />
            مراکز کاری و روتینگ
          </Link>
        </div>
      </div>

      {notification && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{notification}</span>
        </div>
      )}

      {/* کارت‌های آماری */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 block">سفارشات در جریان ساخت (WIP)</span>
            <span className="text-2xl font-black text-cyan-600 font-mono mt-1 block">
              {inProgressCount.toLocaleString('fa-IR')} سفارش
            </span>
            <span className="text-[11px] text-slate-400 mt-0.5 block">در حال جذب مواد، دستمزد و سربار</span>
          </div>
          <div className="w-12 h-12 bg-cyan-50 text-cyan-600 rounded-xl flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 block">سفارشات تکمیل‌شده</span>
            <span className="text-2xl font-black text-emerald-600 font-mono mt-1 block">
              {completedCount.toLocaleString('fa-IR')} سفارش
            </span>
            <span className="text-[11px] text-emerald-600 font-semibold mt-0.5 block">انتقال‌یافته به انبار محصول</span>
          </div>
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
            <PackageCheck className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 block">میانگین انحراف از استاندارد</span>
            <span className="text-2xl font-black text-slate-900 font-mono mt-1 block">
              -%۰.۴ (مساعد)
            </span>
            <span className="text-[11px] text-slate-400 mt-0.5 block">کنترل بهینه ضایعات و راندمان کار</span>
          </div>
          <div className="w-12 h-12 bg-slate-100 text-slate-700 rounded-xl flex items-center justify-center">
            <Percent className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* فیلترها و جستجو */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-bold text-slate-700">وضعیت سفارش:</span>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800 bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          >
            <option value="ALL">همه وضعیت‌ها</option>
            <option value="RELEASED">تایید شده / در انتظار شروع (RELEASED)</option>
            <option value="IN_PROGRESS">در جریان ساخت (IN_PROGRESS)</option>
            <option value="COMPLETED">تکمیل‌شده (COMPLETED)</option>
          </select>
        </div>

        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
          <input
            type="text"
            placeholder="جستجوی شماره سفارش کار یا محصول..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-3 pr-9 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          />
        </div>
      </div>

      {/* جدول سفارشات تولید */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs text-slate-600">
            <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">شماره دستور کار</th>
                <th className="py-3 px-4">محصول و فرمولاسیون (BOM)</th>
                <th className="py-3 px-4 text-center">تیراژ برنامه‌ریزی / تکمیل</th>
                <th className="py-3 px-4">پیشرفت فیزیکی</th>
                <th className="py-3 px-4 text-left">هزینه جذب‌شده در جریان ساخت</th>
                <th className="py-3 px-4 text-center">وضعیت</th>
                <th className="py-3 px-4 text-center">عملیات کارگاهی</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOrders.map((order) => {
                const progressPercent = Math.round(
                  (order.completedQuantity / order.plannedQuantity) * 100
                );

                return (
                  <tr key={order.id} className="hover:bg-slate-50 transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                      <div>{order.orderNumber}</div>
                      <span className="text-[10px] text-slate-400 font-normal">
                        تحویل: {order.targetEndDate}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-slate-900 block">{order.productName}</span>
                      <span className="text-[10px] text-emerald-700 font-mono bg-emerald-50 px-1.5 py-0.5 rounded">
                        {order.bomCode}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono">
                      <strong className="text-slate-900 text-sm">{order.completedQuantity}</strong>
                      <span className="text-slate-400 mx-1">از</span>
                      <strong className="text-slate-700">{order.plannedQuantity}</strong>
                    </td>
                    <td className="py-3.5 px-4 w-36">
                      <div className="flex items-center justify-between text-[11px] mb-1 font-mono font-bold text-slate-700">
                        <span>%{progressPercent}</span>
                      </div>
                      <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all ${
                            order.status === 'COMPLETED'
                              ? 'bg-emerald-500'
                              : 'bg-cyan-500'
                          }`}
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-left font-mono font-black text-slate-950">
                      {order.totalActualCost.toLocaleString('fa-IR')} ریال
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {order.status === 'RELEASED' && (
                        <span className="inline-block text-[10px] font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-full">
                          در انتظار شروع
                        </span>
                      )}
                      {order.status === 'IN_PROGRESS' && (
                        <span className="inline-block text-[10px] font-bold text-cyan-800 bg-cyan-100 px-2.5 py-1 rounded-full">
                          در حال ساخت
                        </span>
                      )}
                      {order.status === 'COMPLETED' && (
                        <span className="inline-block text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-full">
                          تکمیل‌شده
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {order.status !== 'COMPLETED' && (
                          <>
                            <button
                              onClick={() => setSelectedOrderForIssue(order)}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-semibold transition"
                              title="صدور حواله خروج مواد اولیه از انبار به خط تولید"
                            >
                              حواله مواد
                            </button>
                            <button
                              onClick={() => setSelectedOrderForComplete(order)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-semibold transition"
                              title="اعلام اتمام ساخت و انتقال به انبار محصول"
                            >
                              رسید محصول
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => setSelectedOrderForVariance(order)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-semibold transition"
                          title="مشاهده کارنامه انحرافات استاندارد"
                        >
                          انحرافات
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* مودال حواله مصرف مواد به جریان ساخت */}
      {selectedOrderForIssue && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 text-right space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-base text-slate-800 flex items-center gap-2">
                <Factory className="w-5 h-5 text-emerald-600" />
                صدور حواله مصرف مواد برای {selectedOrderForIssue.orderNumber}
              </h3>
              <button onClick={() => setSelectedOrderForIssue(null)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600">
              مواد اولیه بر مبنای استاندارد BOM از انبار مواد اولیه کسر و به حساب بدهکار{' '}
              <strong>۱۵۰۴ (کالای در جریان ساخت)</strong> منتقل می‌گردد.
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">تیراژ تحویلی مواد (واحد)</label>
              <input
                type="number"
                value={issueQuantity}
                onChange={(e) => setIssueQuantity(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                onClick={() => setSelectedOrderForIssue(null)}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50"
              >
                انصراف
              </button>
              <button
                onClick={handleConfirmIssueMaterials}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm"
              >
                تایید و صدور سند حواله انبار
              </button>
            </div>
          </div>
        </div>
      )}

      {/* مودال اعلام اتمام و رسید انبار محصول */}
      {selectedOrderForComplete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 text-right space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-base text-emerald-700 flex items-center gap-2">
                <PackageCheck className="w-5 h-5 text-emerald-600" />
                اعلام اتمام و صدور رسید انبار محصول ساخته‌شده
              </h3>
              <button onClick={() => setSelectedOrderForComplete(null)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600">
              با تایید این مرحله، محصولات سالم به انبار محصول ساخته‌شده منتقل شده و سند حسابداری انتقال از جریان ساخت صادر می‌شود.
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">تعداد محصولات سالم تکمیل‌شده</label>
              <input
                type="number"
                value={completeQuantity}
                onChange={(e) => setCompleteQuantity(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                onClick={() => setSelectedOrderForComplete(null)}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50"
              >
                انصراف
              </button>
              <button
                onClick={handleConfirmCompleteOrder}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm"
              >
                تایید و صدور سند رسید انبار محصول
              </button>
            </div>
          </div>
        </div>
      )}

      {/* مودال تحلیل انحرافات استاندارد (Variance Analysis) */}
      {selectedOrderForVariance && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 text-right space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-base text-slate-800 flex items-center gap-2">
                  <Percent className="w-5 h-5 text-emerald-600" />
                  تحلیل انحرافات بهای تمام‌شده: {selectedOrderForVariance.orderNumber}
                </h3>
                <span className="text-xs text-slate-400 mt-0.5 block">
                  محصول: {selectedOrderForVariance.productName}
                </span>
              </div>
              <button onClick={() => setSelectedOrderForVariance(null)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-600">هزینه مواد اولیه مستقیم جذب‌شده:</span>
                <span className="font-mono font-bold text-slate-900">
                  {selectedOrderForVariance.wipMaterialsCost.toLocaleString('fa-IR')} ریال
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">هزینه دستمزد مستقیم جذب‌شده:</span>
                <span className="font-mono font-bold text-slate-900">
                  {selectedOrderForVariance.wipLaborCost.toLocaleString('fa-IR')} ریال
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">هزینه سربار ساخت (MOH) جذب‌شده:</span>
                <span className="font-mono font-bold text-slate-900">
                  {selectedOrderForVariance.wipOverheadCost.toLocaleString('fa-IR')} ریال
                </span>
              </div>
              <div className="pt-2 border-t border-slate-200 flex items-center justify-between font-black text-slate-900">
                <span>کل بهای تمام‌شده واقعی تولید:</span>
                <span className="font-mono text-sm text-emerald-800">
                  {selectedOrderForVariance.totalActualCost.toLocaleString('fa-IR')} ریال
                </span>
              </div>
            </div>

            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs font-bold text-emerald-800">
              <span>وضعیت انحراف از بهای استاندارد:</span>
              <span className="font-mono text-sm">
                %{Math.abs(selectedOrderForVariance.variancePercentage)} (مساعد - کاهش هزینه مصرف مواد)
              </span>
            </div>

            <div className="flex items-center justify-end pt-2 border-t border-slate-100">
              <button
                onClick={() => setSelectedOrderForVariance(null)}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold"
              >
                بستن پنجره
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
