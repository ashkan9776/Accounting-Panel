'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Users,
  Search,
  Filter,
  Calendar,
  AlertTriangle,
  Clock,
  Printer,
  RefreshCw,
  Building2,
  DollarSign,
  TrendingDown,
  ShieldAlert,
} from 'lucide-react';

interface AgingParty {
  id: string;
  name: string;
  nationalId: string;
  creditLimit: number;
  totalBalance: number;
  current0To30: number;
  pastDue31To60: number;
  pastDue61To90: number;
  overdueOver90: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
}

const SAMPLE_PARTIES: AgingParty[] = [
  {
    id: 'p1',
    name: 'شرکت مهندسی سازه بتن پارس',
    nationalId: '10101122334',
    creditLimit: 500000000,
    totalBalance: 240000000,
    current0To30: 180000000,
    pastDue31To60: 60000000,
    pastDue61To90: 0,
    overdueOver90: 0,
    riskLevel: 'LOW',
  },
  {
    id: 'p2',
    name: 'فروشگاه ابزارآلات برادران احمدی',
    nationalId: '0078912345',
    creditLimit: 300000000,
    totalBalance: 195000000,
    current0To30: 45000000,
    pastDue31To60: 90000000,
    pastDue61To90: 60000000,
    overdueOver90: 0,
    riskLevel: 'MEDIUM',
  },
  {
    id: 'p3',
    name: 'شرکت تجارت الکترونیک داده‌ورز',
    nationalId: '10109988776',
    creditLimit: 200000000,
    totalBalance: 185000000,
    current0To30: 0,
    pastDue31To60: 0,
    pastDue61To90: 55000000,
    overdueOver90: 130000000,
    riskLevel: 'HIGH',
  },
];

export default function ReceivablesAgingPage() {
  const [parties] = useState<AgingParty[]>(SAMPLE_PARTIES);
  const [searchQuery, setSearchQuery] = useState('');
  const [asOfDate, setAsOfDate] = useState('1403/12/29');

  const totalReceivables = parties.reduce((sum, p) => sum + p.totalBalance, 0);
  const totalCurrent = parties.reduce((sum, p) => sum + p.current0To30, 0);
  const total31To60 = parties.reduce((sum, p) => sum + p.pastDue31To60, 0);
  const total61To90 = parties.reduce((sum, p) => sum + p.pastDue61To90, 0);
  const totalOver90 = parties.reduce((sum, p) => sum + p.overdueOver90, 0);

  const filteredParties = parties.filter((p) =>
    p.name.includes(searchQuery) || p.nationalId.includes(searchQuery)
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <Link href="/dashboard" className="hover:text-emerald-600 transition-colors">
              داشبورد مدیریتی
            </Link>
            <span>/</span>
            <span className="text-slate-800 font-semibold">سن‌سنجی مطالبات</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2.5">
            <Clock className="w-7 h-7 text-emerald-600" />
            گزارش سن‌سنجی مطالبات مشتریان (Receivables Aging)
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            طبقه‌بندی مطالبات باز بر اساس تاریخ سررسید فاکتورها، سنجش ریسک سوخت مطالبات و مدیریت بهینه نقدینگی
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold px-4 py-2.5 rounded-lg transition-colors shadow-sm"
          >
            <Printer className="w-4 h-4" />
            چاپ گزارش سن‌سنجی
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-medium text-slate-500 block mb-1">کل مطالبات باز</span>
          <span className="text-lg font-bold text-slate-800">
            {totalReceivables.toLocaleString('fa-IR')} <span className="text-[11px] font-normal text-slate-500">ریال</span>
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-medium text-slate-500 block mb-1">جاری (۰ تا ۳۰ روز)</span>
          <span className="text-lg font-bold text-emerald-600">
            {totalCurrent.toLocaleString('fa-IR')} <span className="text-[11px] font-normal text-slate-500">ریال</span>
          </span>
          <div className="text-[10px] text-emerald-700 mt-0.5">٪{((totalCurrent / totalReceivables) * 100).toFixed(0)} از کل</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-medium text-slate-500 block mb-1">سررسید گذشته (۳۱-۶۰ روز)</span>
          <span className="text-lg font-bold text-blue-600">
            {total31To60.toLocaleString('fa-IR')} <span className="text-[11px] font-normal text-slate-500">ریال</span>
          </span>
          <div className="text-[10px] text-blue-700 mt-0.5">٪{((total31To60 / totalReceivables) * 100).toFixed(0)} از کل</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-medium text-slate-500 block mb-1">با تاخیر (۶۱-۹۰ روز)</span>
          <span className="text-lg font-bold text-amber-600">
            {total61To90.toLocaleString('fa-IR')} <span className="text-[11px] font-normal text-slate-500">ریال</span>
          </span>
          <div className="text-[10px] text-amber-700 mt-0.5">٪{((total61To90 / totalReceivables) * 100).toFixed(0)} از کل</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-medium text-slate-500 block mb-1">بحرانی (بالای ۹۰ روز)</span>
          <span className="text-lg font-bold text-rose-600">
            {totalOver90.toLocaleString('fa-IR')} <span className="text-[11px] font-normal text-slate-500">ریال</span>
          </span>
          <div className="text-[10px] text-rose-700 mt-0.5">٪{((totalOver90 / totalReceivables) * 100).toFixed(0)} از کل</div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="relative w-72">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="جستجو با نام مشتری یا شناسه ملی..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs pl-3 pr-9 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>
          <div className="text-xs text-slate-500">
            مبنای تاریخ: <strong className="font-mono">{asOfDate}</strong>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold">
              <tr>
                <th className="py-3 px-4">نام طرف‌حساب / مشتری</th>
                <th className="py-3 px-3">شناسه ملی</th>
                <th className="py-3 px-3">سقف اعتبار (ریال)</th>
                <th className="py-3 px-3">کل بدهی (ریال)</th>
                <th className="py-3 px-3 text-emerald-700">۰ تا ۳۰ روز (جاری)</th>
                <th className="py-3 px-3 text-blue-700">۳۱ تا ۶۰ روز</th>
                <th className="py-3 px-3 text-amber-700">۶۱ تا ۹۰ روز</th>
                <th className="py-3 px-3 text-rose-700">بیش از ۹۰ روز</th>
                <th className="py-3 px-3 text-center">ریسک وصول</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredParties.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-slate-800">{p.name}</td>
                  <td className="py-3.5 px-3 font-mono text-slate-600">{p.nationalId}</td>
                  <td className="py-3.5 px-3 font-mono text-slate-600">{p.creditLimit.toLocaleString('fa-IR')}</td>
                  <td className="py-3.5 px-3 font-mono font-bold text-slate-900">{p.totalBalance.toLocaleString('fa-IR')}</td>
                  <td className="py-3.5 px-3 font-mono text-emerald-600">{p.current0To30.toLocaleString('fa-IR')}</td>
                  <td className="py-3.5 px-3 font-mono text-blue-600">{p.pastDue31To60.toLocaleString('fa-IR')}</td>
                  <td className="py-3.5 px-3 font-mono text-amber-600">{p.pastDue61To90.toLocaleString('fa-IR')}</td>
                  <td className="py-3.5 px-3 font-mono font-bold text-rose-600">{p.overdueOver90.toLocaleString('fa-IR')}</td>
                  <td className="py-3.5 px-3 text-center">
                    {p.riskLevel === 'LOW' && (
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        کم‌ریسک
                      </span>
                    )}
                    {p.riskLevel === 'MEDIUM' && (
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                        ریسک متوسط
                      </span>
                    )}
                    {p.riskLevel === 'HIGH' && (
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-100 text-rose-800 border border-rose-200">
                        پرخطر (پیگیری حقوقی)
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-50 border-t border-slate-200 font-bold text-xs">
              <tr>
                <td colSpan={3} className="py-3 px-4 text-slate-700">جمع کل مطالبات:</td>
                <td className="py-3 px-3 font-mono text-slate-900">{totalReceivables.toLocaleString('fa-IR')}</td>
                <td className="py-3 px-3 font-mono text-emerald-700">{totalCurrent.toLocaleString('fa-IR')}</td>
                <td className="py-3 px-3 font-mono text-blue-700">{total31To60.toLocaleString('fa-IR')}</td>
                <td className="py-3 px-3 font-mono text-amber-700">{total61To90.toLocaleString('fa-IR')}</td>
                <td className="py-3 px-3 font-mono text-rose-700">{totalOver90.toLocaleString('fa-IR')}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
