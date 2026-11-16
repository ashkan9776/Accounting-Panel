'use client';

import React, { useState } from 'react';
import {
  Calendar,
  Plus,
  Play,
  CheckCircle2,
  FileText,
  CreditCard,
  Download,
  AlertCircle,
  Clock,
  DollarSign,
  Users,
  ShieldCheck,
  ChevronDown,
  Building,
  RefreshCw,
} from 'lucide-react';

interface PayrollSlipItem {
  id: string;
  employeeId: string;
  employeeName: string;
  personnelCode: string;
  nationalId: string;
  shebaNumber: string;
  workedDays: number;
  overtimeHours: number;
  basePay: number;
  housingPay: number;
  groceryPay: number;
  childPay: number;
  overtimePay: number;
  grossPay: number;
  employeeInsurance: number; // 7%
  employerInsurance: number; // 23%
  incomeTax: number;
  advanceDeduction: number;
  loanDeduction: number;
  totalDeductions: number;
  netPayable: number;
}

interface PayrollPeriod {
  id: string;
  title: string;
  yearShamsi: string;
  monthNumber: number;
  startDateShamsi: string;
  endDateShamsi: string;
  status: 'DRAFT' | 'CALCULATED' | 'APPROVED' | 'PAID';
  totalGrossPay: number;
  totalDeductions: number;
  totalNetPay: number;
  totalEmployerInsurance: number;
  journalEntryId?: string;
  paymentReference?: string;
  slips: PayrollSlipItem[];
}

const INITIAL_PERIODS: PayrollPeriod[] = [
  {
    id: 'prd-1403-08',
    title: 'حقوق و دستمزد آبان‌ماه ۱۴۰۳',
    yearShamsi: '1403',
    monthNumber: 8,
    startDateShamsi: '1403/08/01',
    endDateShamsi: '1403/08/30',
    status: 'PAID',
    totalGrossPay: 285000000,
    totalDeductions: 39500000,
    totalNetPay: 245500000,
    totalEmployerInsurance: 52900000,
    journalEntryId: 'vou-1403-0890',
    paymentReference: 'PAYA-14030830-4491',
    slips: [
      {
        id: 'slip-1',
        employeeId: 'emp-1',
        employeeName: 'مهدی محمدی',
        personnelCode: 'EMP-1001',
        nationalId: '0012345678',
        shebaNumber: 'IR120570000000001234567890',
        workedDays: 30,
        overtimeHours: 20,
        basePay: 120000000,
        housingPay: 9000000,
        groceryPay: 14000000,
        childPay: 7166184,
        overtimePay: 15270000,
        grossPay: 165436184,
        employeeInsurance: 10500000,
        employerInsurance: 34500000,
        incomeTax: 2543618,
        advanceDeduction: 10000000,
        loanDeduction: 0,
        totalDeductions: 23043618,
        netPayable: 142392566,
      },
      {
        id: 'slip-2',
        employeeId: 'emp-2',
        employeeName: 'سارا رضایی',
        personnelCode: 'EMP-1002',
        nationalId: '0076543210',
        shebaNumber: 'IR980120000000009876543210',
        workedDays: 30,
        overtimeHours: 10,
        basePay: 95000000,
        housingPay: 9000000,
        groceryPay: 14000000,
        childPay: 0,
        overtimePay: 6045000,
        grossPay: 124045000,
        employeeInsurance: 8260000,
        employerInsurance: 27140000,
        incomeTax: 0, // زیر سقف معافیت ماده ۸۴
        advanceDeduction: 5000000,
        loanDeduction: 3200000,
        totalDeductions: 16460000,
        netPayable: 107585000,
      },
    ],
  },
  {
    id: 'prd-1403-09',
    title: 'حقوق و دستمزد آذرماه ۱۴۰۳',
    yearShamsi: '1403',
    monthNumber: 9,
    startDateShamsi: '1403/09/01',
    endDateShamsi: '1403/09/30',
    status: 'CALCULATED',
    totalGrossPay: 298000000,
    totalDeductions: 42100000,
    totalNetPay: 255900000,
    totalEmployerInsurance: 55200000,
    slips: [
      {
        id: 'slip-3',
        employeeId: 'emp-1',
        employeeName: 'مهدی محمدی',
        personnelCode: 'EMP-1001',
        nationalId: '0012345678',
        shebaNumber: 'IR120570000000001234567890',
        workedDays: 30,
        overtimeHours: 25,
        basePay: 120000000,
        housingPay: 9000000,
        groceryPay: 14000000,
        childPay: 7166184,
        overtimePay: 19088000,
        grossPay: 169254184,
        employeeInsurance: 10500000,
        employerInsurance: 34500000,
        incomeTax: 2925418,
        advanceDeduction: 12000000,
        loanDeduction: 0,
        totalDeductions: 25425418,
        netPayable: 143828766,
      },
      {
        id: 'slip-4',
        employeeId: 'emp-2',
        employeeName: 'سارا رضایی',
        personnelCode: 'EMP-1002',
        nationalId: '0076543210',
        shebaNumber: 'IR980120000000009876543210',
        workedDays: 30,
        overtimeHours: 15,
        basePay: 95000000,
        housingPay: 9000000,
        groceryPay: 14000000,
        childPay: 0,
        overtimePay: 9067500,
        grossPay: 127067500,
        employeeInsurance: 8260000,
        employerInsurance: 27140000,
        incomeTax: 0,
        advanceDeduction: 5000000,
        loanDeduction: 3200000,
        totalDeductions: 16460000,
        netPayable: 110607500,
      },
    ],
  },
];

export default function PayrollPeriodsPage() {
  const [periods, setPeriods] = useState<PayrollPeriod[]>(INITIAL_PERIODS);
  const [selectedPeriod, setSelectedPeriod] = useState<PayrollPeriod | null>(periods[1]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTimecardModal, setShowTimecardModal] = useState(false);
  const [showTaminModal, setShowTaminModal] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // فرم ایجاد دوره جدید
  const [newTitle, setNewTitle] = useState('حقوق و دستمزد دی‌ماه ۱۴۰۳');
  const [newYear, setNewYear] = useState('1403');
  const [newMonth, setNewMonth] = useState(10);
  const [newStart, setNewStart] = useState('1403/10/01');
  const [newEnd, setNewEnd] = useState('1403/10/30');

  // فرم ثبت کارکرد پرسنل
  const [timecardWorkedDays, setTimecardWorkedDays] = useState(30);
  const [timecardOvertime, setTimecardOvertime] = useState(18);
  const [timecardAdvance, setTimecardAdvance] = useState('8000000');
  const [timecardLoan, setTimecardLoan] = useState('2000000');

  // فرم پرداخت بانکی
  const [payBankName, setPayBankName] = useState('حساب جاری بانک پاسارگاد (شبا: IR12...)');
  const [payDate, setPayDate] = useState('1403/09/30');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleCreatePeriod = (e: React.FormEvent) => {
    e.preventDefault();
    const newPrd: PayrollPeriod = {
      id: `prd-${newYear}-${newMonth.toString().padStart(2, '0')}`,
      title: newTitle,
      yearShamsi: newYear,
      monthNumber: newMonth,
      startDateShamsi: newStart,
      endDateShamsi: newEnd,
      status: 'DRAFT',
      totalGrossPay: 0,
      totalDeductions: 0,
      totalNetPay: 0,
      totalEmployerInsurance: 0,
      slips: [],
    };
    setPeriods([newPrd, ...periods]);
    setSelectedPeriod(newPrd);
    setShowCreateModal(false);
    showToast(`دوره جدید «${newTitle}» در وضعیت پیش‌نویس ایجاد شد.`);
  };

  const handleCalculatePeriod = (periodId: string) => {
    setPeriods((prev) =>
      prev.map((p) => {
        if (p.id !== periodId) return p;
        const updatedSlips: PayrollSlipItem[] = [
          {
            id: `slip-c1-${Date.now()}`,
            employeeId: 'emp-1',
            employeeName: 'مهدی محمدی',
            personnelCode: 'EMP-1001',
            nationalId: '0012345678',
            shebaNumber: 'IR120570000000001234567890',
            workedDays: timecardWorkedDays,
            overtimeHours: timecardOvertime,
            basePay: 120000000,
            housingPay: 9000000,
            groceryPay: 14000000,
            childPay: 7166184,
            overtimePay: Math.round(timecardOvertime * (120000000 / (30 * 7.33)) * 1.4),
            grossPay: 0,
            employeeInsurance: 10500000,
            employerInsurance: 34500000,
            incomeTax: 2800000,
            advanceDeduction: Number(timecardAdvance),
            loanDeduction: Number(timecardLoan),
            totalDeductions: 0,
            netPayable: 0,
          },
        ];
        updatedSlips[0].grossPay =
          updatedSlips[0].basePay +
          updatedSlips[0].housingPay +
          updatedSlips[0].groceryPay +
          updatedSlips[0].childPay +
          updatedSlips[0].overtimePay;
        updatedSlips[0].totalDeductions =
          updatedSlips[0].employeeInsurance +
          updatedSlips[0].incomeTax +
          updatedSlips[0].advanceDeduction +
          updatedSlips[0].loanDeduction;
        updatedSlips[0].netPayable = updatedSlips[0].grossPay - updatedSlips[0].totalDeductions;

        const updatedPeriod: PayrollPeriod = {
          ...p,
          status: 'CALCULATED',
          totalGrossPay: updatedSlips[0].grossPay,
          totalDeductions: updatedSlips[0].totalDeductions,
          totalNetPay: updatedSlips[0].netPayable,
          totalEmployerInsurance: updatedSlips[0].employerInsurance,
          slips: updatedSlips,
        };
        setSelectedPeriod(updatedPeriod);
        return updatedPeriod;
      })
    );
    setShowTimecardModal(false);
    showToast('محاسبه حقوق، بیمه تامین اجتماعی و مالیات با موفقیت انجام شد.');
  };

  const handleApprovePayroll = (periodId: string) => {
    setPeriods((prev) =>
      prev.map((p) => {
        if (p.id !== periodId) return p;
        const approved: PayrollPeriod = {
          ...p,
          status: 'APPROVED',
          journalEntryId: `vou-${Date.now().toString().slice(-4)}`,
        };
        setSelectedPeriod(approved);
        return approved;
      })
    );
    showToast('دوره تایید شد و سند حسابداری دوبل شناسایی هزینه حقوق و بیمه صادر گردید.');
  };

  const handlePaySalaries = (periodId: string) => {
    setPeriods((prev) =>
      prev.map((p) => {
        if (p.id !== periodId) return p;
        const paid: PayrollPeriod = {
          ...p,
          status: 'PAID',
          paymentReference: `PAYA-${Date.now().toString().slice(-6)}`,
        };
        setSelectedPeriod(paid);
        return paid;
      })
    );
    setShowPayModal(false);
    showToast('پرداخت بانکی حقوق ثبت و فایل شبا پایا برای بانک عامل صادر گردید.');
  };

  const renderStatusBadge = (status: PayrollPeriod['status']) => {
    switch (status) {
      case 'DRAFT':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-slate-100 text-slate-700 border border-slate-300">پیش‌نویس</span>;
      case 'CALCULATED':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 border border-blue-200">محاسبه‌شده</span>;
      case 'APPROVED':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800 border border-purple-200">تایید و سند زده‌شده</span>;
      case 'PAID':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">پرداخت‌شده (تسویه‌شده)</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 left-5 z-50 bg-emerald-700 text-white px-5 py-3 rounded-lg shadow-xl flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-emerald-200" />
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2.5">
            <Users className="w-7 h-7 text-emerald-600" />
            کارتابل حقوق و دستمزد ماهانه
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            محاسبه خودکار حقوق و مزایای قانون کار، بیمه تامین اجتماعی (۷٪ کارگر، ۲۳٪ کارفرما)، مالیات پلکانی ماده ۸۴ و صدور اسناد دوبل
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            ایجاد دوره جدید
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500 block mb-1">مجموع ناخالص حقوق و مزایا</span>
            <span className="text-xl font-bold text-slate-800">
              {selectedPeriod ? selectedPeriod.totalGrossPay.toLocaleString('fa-IR') : '۰'} <span className="text-xs font-normal text-slate-500">ریال</span>
            </span>
          </div>
          <div className="w-11 h-11 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500 block mb-1">بیمه سهم کارفرما (۲۳٪)</span>
            <span className="text-xl font-bold text-amber-600">
              {selectedPeriod ? selectedPeriod.totalEmployerInsurance.toLocaleString('fa-IR') : '۰'} <span className="text-xs font-normal text-slate-500">ریال</span>
            </span>
          </div>
          <div className="w-11 h-11 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center">
            <ShieldCheck className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500 block mb-1">کسورات قانونی و توافقی</span>
            <span className="text-xl font-bold text-rose-600">
              {selectedPeriod ? selectedPeriod.totalDeductions.toLocaleString('fa-IR') : '۰'} <span className="text-xs font-normal text-slate-500">ریال</span>
            </span>
          </div>
          <div className="w-11 h-11 bg-rose-50 text-rose-600 rounded-lg flex items-center justify-center">
            <AlertCircle className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500 block mb-1">خالص قابل پرداخت پرسنل</span>
            <span className="text-xl font-bold text-emerald-600">
              {selectedPeriod ? selectedPeriod.totalNetPay.toLocaleString('fa-IR') : '۰'} <span className="text-xs font-normal text-slate-500">ریال</span>
            </span>
          </div>
          <div className="w-11 h-11 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center">
            <CreditCard className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main Period Content & Selector */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Column: Period List */}
        <div className="lg:col-span-1 space-y-3">
          <h2 className="text-sm font-bold text-slate-700 px-1">دوره‌های حقوق سال ۱۴۰۳</h2>
          <div className="space-y-2">
            {periods.map((p) => {
              const isSelected = selectedPeriod?.id === p.id;
              return (
                <div
                  key={p.id}
                  onClick={() => setSelectedPeriod(p)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-emerald-50 border-emerald-400 shadow-sm ring-1 ring-emerald-300'
                      : 'bg-white border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-slate-800 text-sm">{p.title}</span>
                    {renderStatusBadge(p.status)}
                  </div>
                  <div className="text-xs text-slate-500 flex items-center gap-1.5 mb-2">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>{p.startDateShamsi} تا {p.endDateShamsi}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100">
                    <span className="text-slate-500">خالص پرداختی:</span>
                    <span className="font-bold text-slate-800">{p.totalNetPay.toLocaleString('fa-IR')} ریال</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Selected Period Details & Actions */}
        <div className="lg:col-span-3 space-y-6">
          {selectedPeriod ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
              {/* Actions Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-5 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-bold text-slate-800">{selectedPeriod.title}</h2>
                  {renderStatusBadge(selectedPeriod.status)}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {selectedPeriod.status === 'DRAFT' && (
                    <button
                      onClick={() => setShowTimecardModal(true)}
                      className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium px-3.5 py-2 rounded-lg transition-colors"
                    >
                      <Play className="w-3.5 h-3.5" />
                      ورود کارکرد و محاسبه
                    </button>
                  )}

                  {selectedPeriod.status === 'CALCULATED' && (
                    <>
                      <button
                        onClick={() => setShowTimecardModal(true)}
                        className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium px-3.5 py-2 rounded-lg transition-colors"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        محاسبه مجدد
                      </button>
                      <button
                        onClick={() => handleApprovePayroll(selectedPeriod.id)}
                        className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium px-3.5 py-2 rounded-lg transition-colors shadow-sm"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        تایید و صدور سند دوبل
                      </button>
                    </>
                  )}

                  {selectedPeriod.status === 'APPROVED' && (
                    <button
                      onClick={() => setShowPayModal(true)}
                      className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium px-3.5 py-2 rounded-lg transition-colors shadow-sm"
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      پرداخت بانکی و صدور پایا
                    </button>
                  )}

                  <button
                    onClick={() => setShowTaminModal(true)}
                    className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-medium px-3.5 py-2 rounded-lg transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    دیسکت بیمه (DSKWOR)
                  </button>
                </div>
              </div>

              {/* Status Notice */}
              {selectedPeriod.journalEntryId && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-xs text-purple-800 flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-purple-600" />
                    سند دوبل شناسایی هزینه حقوق با شماره <strong>{selectedPeriod.journalEntryId}</strong> با موفقیت در دفتر کل ثبت شده است.
                  </span>
                  {selectedPeriod.paymentReference && (
                    <span className="font-mono text-purple-900 bg-purple-100 px-2 py-0.5 rounded">
                      کد پیگیری پایا: {selectedPeriod.paymentReference}
                    </span>
                  )}
                </div>
              )}

              {/* Slips Table */}
              <div>
                <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                  <Users className="w-4 h-4 text-slate-500" />
                  ریز فیش‌های حقوقی پرسنل ({selectedPeriod.slips.length} نفر)
                </h3>

                {selectedPeriod.slips.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl">
                    <AlertCircle className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                    <p className="text-sm text-slate-600 font-medium">هیچ فیشی برای این دوره محاسبه نشده است.</p>
                    <p className="text-xs text-slate-400 mt-1">با زدن دکمه «ورود کارکرد و محاسبه» حقوق پرسنل را صادر نمایید.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-slate-200">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold">
                        <tr>
                          <th className="py-3 px-3">کد پرسنلی</th>
                          <th className="py-3 px-3">نام و نام خانوادگی</th>
                          <th className="py-3 px-2">کارکرد</th>
                          <th className="py-3 px-2">اضافه کار</th>
                          <th className="py-3 px-3">حقوق پایه</th>
                          <th className="py-3 px-3">ناخالص حقوق</th>
                          <th className="py-3 px-3">بیمه کارگر (۷٪)</th>
                          <th className="py-3 px-3">مالیات حقوق</th>
                          <th className="py-3 px-3">سایر کسورات</th>
                          <th className="py-3 px-3 text-emerald-700 font-bold">خالص پرداختی</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {selectedPeriod.slips.map((slip) => (
                          <tr key={slip.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3 px-3 font-mono font-medium text-slate-700">{slip.personnelCode}</td>
                            <td className="py-3 px-3 font-bold text-slate-800">{slip.employeeName}</td>
                            <td className="py-3 px-2 font-mono">{slip.workedDays} روز</td>
                            <td className="py-3 px-2 font-mono">{slip.overtimeHours} ساعت</td>
                            <td className="py-3 px-3 font-mono text-slate-600">{slip.basePay.toLocaleString('fa-IR')}</td>
                            <td className="py-3 px-3 font-mono font-bold text-slate-800">{slip.grossPay.toLocaleString('fa-IR')}</td>
                            <td className="py-3 px-3 font-mono text-rose-600">{slip.employeeInsurance.toLocaleString('fa-IR')}</td>
                            <td className="py-3 px-3 font-mono text-amber-600">{slip.incomeTax.toLocaleString('fa-IR')}</td>
                            <td className="py-3 px-3 font-mono text-slate-500">{(slip.advanceDeduction + slip.loanDeduction).toLocaleString('fa-IR')}</td>
                            <td className="py-3 px-3 font-mono font-bold text-emerald-600">{slip.netPayable.toLocaleString('fa-IR')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400">
              یک دوره حقوق را از لیست سمت راست انتخاب کنید.
            </div>
          )}
        </div>
      </div>

      {/* Modal: ایجاد دوره جدید */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <h2 className="text-base font-bold text-slate-800">ایجاد دوره حقوق و دستمزد ماهانه</h2>
            <form onSubmit={handleCreatePeriod} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">عنوان دوره</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full text-xs p-2.5 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">سال شمسی</label>
                  <input
                    type="text"
                    value={newYear}
                    onChange={(e) => setNewYear(e.target.value)}
                    className="w-full text-xs p-2.5 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">شماره ماه (۱ تا ۱۲)</label>
                  <input
                    type="number"
                    min={1}
                    max={12}
                    value={newMonth}
                    onChange={(e) => setNewMonth(Number(e.target.value))}
                    className="w-full text-xs p-2.5 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none font-mono"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">تاریخ شروع</label>
                  <input
                    type="text"
                    value={newStart}
                    onChange={(e) => setNewStart(e.target.value)}
                    className="w-full text-xs p-2.5 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">تاریخ پایان</label>
                  <input
                    type="text"
                    value={newEnd}
                    onChange={(e) => setNewEnd(e.target.value)}
                    className="w-full text-xs p-2.5 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none font-mono"
                    required
                  />
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors"
                >
                  ثبت دوره
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: ورود کارکرد و محاسبه */}
      {showTimecardModal && selectedPeriod && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <h2 className="text-base font-bold text-slate-800">ورود کارکرد پرسنل و محاسبه فیش‌ها</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">روزهای کارکرد ماهانه</label>
                <input
                  type="number"
                  min={0}
                  max={31}
                  value={timecardWorkedDays}
                  onChange={(e) => setTimecardWorkedDays(Number(e.target.value))}
                  className="w-full text-xs p-2.5 border rounded-lg font-mono focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">ساعات اضافه‌کاری (ضریب ۱.۴)</label>
                <input
                  type="number"
                  min={0}
                  value={timecardOvertime}
                  onChange={(e) => setTimecardOvertime(Number(e.target.value))}
                  className="w-full text-xs p-2.5 border rounded-lg font-mono focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">کسر مساعده ماه جاری (ریال)</label>
                <input
                  type="text"
                  value={timecardAdvance}
                  onChange={(e) => setTimecardAdvance(e.target.value)}
                  className="w-full text-xs p-2.5 border rounded-lg font-mono focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">کسر قسط وام پرسنلی (ریال)</label>
                <input
                  type="text"
                  value={timecardLoan}
                  onChange={(e) => setTimecardLoan(e.target.value)}
                  className="w-full text-xs p-2.5 border rounded-lg font-mono focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowTimecardModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  انصراف
                </button>
                <button
                  type="button"
                  onClick={() => handleCalculatePeriod(selectedPeriod.id)}
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <Play className="w-3.5 h-3.5" />
                  اجرای محاسبات قانونی
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: پرداخت بانکی و صدور پایا شبا */}
      {showPayModal && selectedPeriod && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <h2 className="text-base font-bold text-slate-800">پرداخت بانکی حقوق و صدور فایل پایا شبا</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">حساب بانکی پرداخت‌کننده</label>
                <input
                  type="text"
                  value={payBankName}
                  onChange={(e) => setPayBankName(e.target.value)}
                  className="w-full text-xs p-2.5 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">تاریخ پرداخت</label>
                <input
                  type="text"
                  value={payDate}
                  onChange={(e) => setPayDate(e.target.value)}
                  className="w-full text-xs p-2.5 border rounded-lg font-mono focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
              <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-200 text-xs text-emerald-800">
                مبلغ کل قابل انتقال: <strong>{selectedPeriod.totalNetPay.toLocaleString('fa-IR')} ریال</strong> به شماره شبای پرسنل به همراه صدور سند حسابداری بستانکار بانک.
              </div>
              <div className="flex items-center justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowPayModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  انصراف
                </button>
                <button
                  type="button"
                  onClick={() => handlePaySalaries(selectedPeriod.id)}
                  className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  تایید پرداخت و دانلود فایل شبا
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: دانلود دیسکت بیمه تامین اجتماعی */}
      {showTaminModal && selectedPeriod && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 space-y-4">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              دیسکت استاندارد بیمه تامین اجتماعی (DSKWOR00)
            </h2>
            <p className="text-xs text-slate-500">
              این فایل با فرمت رسمی سازمان تامین اجتماعی (سامانه eservices.tamin.ir) آماده بارگذاری مستقیم است.
            </p>
            <div className="bg-slate-900 text-emerald-400 p-4 rounded-lg font-mono text-[11px] overflow-x-auto whitespace-pre leading-relaxed select-all">
{selectedPeriod.slips.map((s) => `${s.nationalId},${s.personnelCode},${s.employeeName},${s.workedDays},${s.basePay},${s.grossPay},${s.employeeInsurance},${s.employerInsurance}`).join('\n')}
            </div>
            <div className="flex items-center justify-end gap-2 pt-3 border-t">
              <button
                type="button"
                onClick={() => setShowTaminModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                بستن
              </button>
              <button
                type="button"
                onClick={() => {
                  showToast('فایل دیسکت بیمه DSKWOR00 با موفقیت آماده و دانلود گردید.');
                  setShowTaminModal(false);
                }}
                className="px-4 py-2 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-900 rounded-lg transition-colors flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                دانلود فایل متنی DSKWOR00.txt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
