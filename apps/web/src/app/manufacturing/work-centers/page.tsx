'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Factory,
  Cpu,
  Users,
  Settings,
  Plus,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  TrendingUp,
  Clock,
  Layers,
} from 'lucide-react';

interface WorkCenter {
  id: string;
  code: string;
  title: string;
  type: 'MACHINE' | 'LABOR' | 'ASSEMBLY' | 'QUALITY_CONTROL';
  hourlyLaborRate: number;
  hourlyMachineRate: number;
  capacityHoursPerDay: number;
  isActive: boolean;
}

const MOCK_WORK_CENTERS: WorkCenter[] = [
  {
    id: 'wc-1',
    code: 'WC-CNC-01',
    title: 'مرکز فرزکاری و تراش CNC ۴ محوره',
    type: 'MACHINE',
    hourlyLaborRate: 1800000,
    hourlyMachineRate: 3500000,
    capacityHoursPerDay: 16,
    isActive: true,
  },
  {
    id: 'wc-2',
    code: 'WC-WND-02',
    title: 'ایستگاه سیم‌پیچی اتوماتیک استاتور',
    type: 'MACHINE',
    hourlyLaborRate: 1500000,
    hourlyMachineRate: 2200000,
    capacityHoursPerDay: 16,
    isActive: true,
  },
  {
    id: 'wc-3',
    code: 'WC-ASM-03',
    title: 'خط مونتاژ و جا زدن روتور و بلبرینگ',
    type: 'ASSEMBLY',
    hourlyLaborRate: 1600000,
    hourlyMachineRate: 800000,
    capacityHoursPerDay: 8,
    isActive: true,
  },
  {
    id: 'wc-4',
    code: 'WC-QC-04',
    title: 'ایستگاه تست بارداری، لرزش و کنترل کیفیت QC',
    type: 'QUALITY_CONTROL',
    hourlyLaborRate: 2000000,
    hourlyMachineRate: 1500000,
    capacityHoursPerDay: 8,
    isActive: true,
  },
];

export default function ManufacturingWorkCentersPage() {
  const [workCenters, setWorkCenters] = useState<WorkCenter[]>(MOCK_WORK_CENTERS);
  const [isNewWcModalOpen, setIsNewWcModalOpen] = useState(false);

  const [newCode, setNewCode] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState<'MACHINE' | 'LABOR' | 'ASSEMBLY' | 'QUALITY_CONTROL'>('MACHINE');
  const [newLaborRate, setNewLaborRate] = useState<number>(1500000);
  const [newMachineRate, setNewMachineRate] = useState<number>(2000000);
  const [newCapacity, setNewCapacity] = useState<number>(8);

  const handleCreateWorkCenter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode.trim() || !newTitle.trim()) return;

    const newWc: WorkCenter = {
      id: `wc-${Date.now()}`,
      code: newCode,
      title: newTitle,
      type: newType,
      hourlyLaborRate: newLaborRate,
      hourlyMachineRate: newMachineRate,
      capacityHoursPerDay: newCapacity,
      isActive: true,
    };

    setWorkCenters([...workCenters, newWc]);
    setIsNewWcModalOpen(false);
    setNewCode('');
    setNewTitle('');
  };

  return (
    <div className="space-y-6">
      {/* سربرگ */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/manufacturing/orders" className="text-slate-400 hover:text-slate-600 transition">
              <ArrowRight className="w-5 h-5" />
            </Link>
            <h1 className="text-xl font-bold text-slate-800">مراکز کاری و ایستگاه‌های تولید (Work Centers)</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            تنظیم خطوط تولید، نرخ‌های ساعتی جذب دستمزد مستقیم، نرخ استهلاک و سربار ماشین‌آلات و ظرفیت اسمی روزانه
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/manufacturing/orders"
            className="px-3.5 py-2 border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
          >
            <Factory className="w-4 h-4 text-emerald-600" />
            دستورات کار (Work Orders)
          </Link>
          <button
            onClick={() => setIsNewWcModalOpen(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            تعریف مرکز کاری جدید
          </button>
        </div>
      </div>

      {/* کارت‌های آماری */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 block">مراکز کاری فعال</span>
            <span className="text-2xl font-black text-slate-900 font-mono mt-1 block">
              {workCenters.length.toLocaleString('fa-IR')} ایستگاه
            </span>
            <span className="text-[11px] text-emerald-600 font-semibold block mt-0.5">خطوط ماشین‌کاری و مونتاژ</span>
          </div>
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
            <Cpu className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 block">میانگین نرخ جذب سربار ماشین</span>
            <span className="text-2xl font-black text-cyan-600 font-mono mt-1 block">
              ۲,۰۰۰,۰۰۰ ریال/ساعت
            </span>
            <span className="text-[11px] text-slate-400 block mt-0.5">تخصیص اتوماتیک به WIP</span>
          </div>
          <div className="w-12 h-12 bg-cyan-50 text-cyan-600 rounded-xl flex items-center justify-center">
            <Settings className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 block">مجموع ظرفیت روزانه خطوط</span>
            <span className="text-2xl font-black text-slate-800 font-mono mt-1 block">
              ۴۸ ساعت/روز
            </span>
            <span className="text-[11px] text-slate-400 block mt-0.5">معادل ۶ شیفت ۸ ساعته</span>
          </div>
          <div className="w-12 h-12 bg-slate-100 text-slate-700 rounded-xl flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* جدول مراکز کاری */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50">
          <h2 className="text-sm font-bold text-slate-800">فهرست مراکز کاری و نرخ‌های جذب بهای تمام‌شده</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs text-slate-600">
            <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">کد و عنوان مرکز کاری</th>
                <th className="py-3 px-4 text-center">نوع مرکز کاری</th>
                <th className="py-3 px-4 text-left">نرخ ساعتی دستمزد مستقیم</th>
                <th className="py-3 px-4 text-left">نرخ ساعتی سربار ماشین‌آلات</th>
                <th className="py-3 px-4 text-center">ظرفیت شیفت روزانه</th>
                <th className="py-3 px-4 text-center">وضعیت</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {workCenters.map((wc) => (
                <tr key={wc.id} className="hover:bg-slate-50 transition">
                  <td className="py-3.5 px-4">
                    <span className="font-bold text-slate-900 block">{wc.title}</span>
                    <span className="text-[11px] text-slate-400 font-mono">{wc.code}</span>
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    {wc.type === 'MACHINE' && (
                      <span className="bg-cyan-100 text-cyan-800 text-[10px] px-2.5 py-0.5 rounded-full font-bold">
                        ماشین‌آلات صنعتی
                      </span>
                    )}
                    {wc.type === 'ASSEMBLY' && (
                      <span className="bg-purple-100 text-purple-800 text-[10px] px-2.5 py-0.5 rounded-full font-bold">
                        خط مونتاژ
                      </span>
                    )}
                    {wc.type === 'QUALITY_CONTROL' && (
                      <span className="bg-emerald-100 text-emerald-800 text-[10px] px-2.5 py-0.5 rounded-full font-bold">
                        کنترل کیفیت (QC)
                      </span>
                    )}
                    {wc.type === 'LABOR' && (
                      <span className="bg-blue-100 text-blue-800 text-[10px] px-2.5 py-0.5 rounded-full font-bold">
                        دستی و کارگری
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-left font-mono font-bold text-slate-800">
                    {wc.hourlyLaborRate.toLocaleString('fa-IR')} ریال
                  </td>
                  <td className="py-3.5 px-4 text-left font-mono font-bold text-slate-800">
                    {wc.hourlyMachineRate.toLocaleString('fa-IR')} ریال
                  </td>
                  <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-800">
                    {wc.capacityHoursPerDay} ساعت
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      فعال در خط
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* مودال ایجاد مرکز کاری جدید */}
      {isNewWcModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateWorkCenter}
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 text-right space-y-4 animate-fadeIn"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-base text-slate-800 flex items-center gap-2">
                <Factory className="w-5 h-5 text-emerald-600" />
                تعریف مرکز کاری جدید
              </h3>
              <button
                type="button"
                onClick={() => setIsNewWcModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">کد مرکز کاری</label>
              <input
                type="text"
                value={newCode}
                onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                placeholder="مثلاً: WC-PNT-05"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">عنوان مرکز کاری</label>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="مثلاً: ایستگاه رنگ‌پاشی پودری الکترواستاتیک"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">نوع مرکز کاری</label>
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value as any)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-800 bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                <option value="MACHINE">ماشین‌آلات صنعتی (MACHINE)</option>
                <option value="ASSEMBLY">خط مونتاژ قطعات (ASSEMBLY)</option>
                <option value="QUALITY_CONTROL">کنترل کیفیت (QUALITY_CONTROL)</option>
                <option value="LABOR">دستی و کارگری (LABOR)</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">نرخ دستمزد ساعتی</label>
                <input
                  type="number"
                  value={newLaborRate}
                  onChange={(e) => setNewLaborRate(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">نرخ سربار ماشین ساعتی</label>
                <input
                  type="number"
                  value={newMachineRate}
                  onChange={(e) => setNewMachineRate(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">ظرفیت شیفت کاری روزانه (ساعت)</label>
              <input
                type="number"
                value={newCapacity}
                onChange={(e) => setNewCapacity(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsNewWcModalOpen(false)}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50"
              >
                انصراف
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm"
              >
                ثبت مرکز کاری
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
