'use client';

import React, { useState } from 'react';
import {
  FileText,
  Printer,
  Download,
  Calendar,
  Building2,
  Users,
  ShieldCheck,
  CreditCard,
  DollarSign,
  ChevronDown,
  CheckCircle,
} from 'lucide-react';

interface PaySlipData {
  id: string;
  companyName: string;
  companyNationalId: string;
  taminWorkshopCode: string;
  periodTitle: string;
  monthShamsi: string;
  yearShamsi: string;
  employeeName: string;
  personnelCode: string;
  nationalId: string;
  insuranceNumber: string;
  jobTitle: string;
  department: string;
  bankName: string;
  bankShebaNumber: string;
  workedDays: number;
  overtimeHours: number;
  basePay: number;
  housingPay: number;
  groceryPay: number;
  childPay: number;
  seniorityPay: number;
  overtimePay: number;
  bonusPay: number;
  grossPay: number;
  employeeInsurance: number; // 7%
  employerInsurance: number; // 20%
  unemploymentInsurance: number; // 3%
  incomeTax: number;
  advanceDeduction: number;
  loanDeduction: number;
  totalDeductions: number;
  netPayable: number;
  netPayableWords: string;
}

const SAMPLE_SLIPS: PaySlipData[] = [
  {
    id: 'slip-1403-08-01',
    companyName: 'شرکت حسابداری پیشرو سیستم آریا (سهامی خاص)',
    companyNationalId: '10103456789',
    taminWorkshopCode: '0123456789',
    periodTitle: 'حقوق و دستمزد آبان‌ماه ۱۴۰۳',
    monthShamsi: 'آبان',
    yearShamsi: '1403',
    employeeName: 'مهدی محمدی',
    personnelCode: 'EMP-1001',
    nationalId: '0012345678',
    insuranceNumber: '12345678',
    jobTitle: 'کارشناس ارشد حسابداری',
    department: 'مالی و اداری',
    bankName: 'بانک پاسارگاد',
    bankShebaNumber: 'IR120570000000001234567890',
    workedDays: 30,
    overtimeHours: 20,
    basePay: 120000000,
    housingPay: 9000000,
    groceryPay: 14000000,
    childPay: 7166184,
    seniorityPay: 2100000,
    overtimePay: 15270000,
    bonusPay: 5000000,
    grossPay: 172536184,
    employeeInsurance: 10500000,
    employerInsurance: 30000000,
    unemploymentInsurance: 4500000,
    incomeTax: 2543618,
    advanceDeduction: 10000000,
    loanDeduction: 0,
    totalDeductions: 23043618,
    netPayable: 149492566,
    netPayableWords: 'یکصد و چهل و نه میلیون و چهارصد و نود و دو هزار و پانصد و شصت و شش ریال',
  },
  {
    id: 'slip-1403-08-02',
    companyName: 'شرکت حسابداری پیشرو سیستم آریا (سهامی خاص)',
    companyNationalId: '10103456789',
    taminWorkshopCode: '0123456789',
    periodTitle: 'حقوق و دستمزد آبان‌ماه ۱۴۰۳',
    monthShamsi: 'آبان',
    yearShamsi: '1403',
    employeeName: 'سارا رضایی',
    personnelCode: 'EMP-1002',
    nationalId: '0076543210',
    insuranceNumber: '87654321',
    jobTitle: 'مسئول فروش و صندوق',
    department: 'فروشگاه و POS',
    bankName: 'بانک ملت',
    bankShebaNumber: 'IR980120000000009876543210',
    workedDays: 30,
    overtimeHours: 10,
    basePay: 95000000,
    housingPay: 9000000,
    groceryPay: 14000000,
    childPay: 0,
    seniorityPay: 0,
    overtimePay: 6045000,
    bonusPay: 0,
    grossPay: 124045000,
    employeeInsurance: 8260000,
    employerInsurance: 23600000,
    unemploymentInsurance: 3540000,
    incomeTax: 0,
    advanceDeduction: 5000000,
    loanDeduction: 3200000,
    totalDeductions: 16460000,
    netPayable: 107585000,
    netPayableWords: 'یکصد و هفت میلیون و پانصد و هشتاد و پنج هزار ریال',
  },
];

export default function PayrollSlipsPage() {
  const [slips] = useState<PaySlipData[]>(SAMPLE_SLIPS);
  const [selectedSlipId, setSelectedSlipId] = useState<string>(SAMPLE_SLIPS[0].id);

  const currentSlip = slips.find((s) => s.id === selectedSlipId) || slips[0];

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Print Styling */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-slip,
          #printable-slip * {
            visibility: visible;
          }
          #printable-slip {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 20px;
            box-shadow: none !important;
            border: 1px solid #999 !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Header (No Print) */}
      <div className="no-print flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2.5">
            <FileText className="w-7 h-7 text-emerald-600" />
            فیش رسمی حقوق و دستمزد پرسنلی
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            مشاهده، تفکیک آیتم‌های مشمول، کنترل کسورات قانونی و پرینت استاندارد فیش حقوقی
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-semibold">انتخاب پرسنل:</span>
            <select
              value={selectedSlipId}
              onChange={(e) => setSelectedSlipId(e.target.value)}
              className="text-xs p-2.5 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-slate-50 font-medium"
            >
              {slips.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.employeeName} ({s.personnelCode}) - {s.periodTitle}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handlePrint}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors shadow-sm"
          >
            <Printer className="w-4 h-4" />
            چاپ فیش رسمی
          </button>
        </div>
      </div>

      {/* Printable Pay Slip Container */}
      <div
        id="printable-slip"
        className="bg-white rounded-xl border border-slate-300 shadow-lg p-8 max-w-4xl mx-auto space-y-6 text-slate-800"
      >
        {/* Slip Header */}
        <div className="border-b-2 border-slate-800 pb-5">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <h2 className="text-lg font-extrabold text-slate-900">{currentSlip.companyName}</h2>
              <div className="flex items-center gap-4 text-xs text-slate-500">
                <span>شناسه ملی: <strong className="font-mono text-slate-700">{currentSlip.companyNationalId}</strong></span>
                <span>کد کارگاه تامین اجتماعی: <strong className="font-mono text-slate-700">{currentSlip.taminWorkshopCode}</strong></span>
              </div>
            </div>
            <div className="text-left space-y-1">
              <div className="inline-block bg-slate-900 text-white text-xs font-bold px-3 py-1 rounded">
                فیش حقوق و دستمزد
              </div>
              <div className="text-xs text-slate-500 font-medium">
                دوره: <strong>{currentSlip.periodTitle}</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Employee Info Bar */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <span className="text-slate-500 block">نام و نام خانوادگی:</span>
            <strong className="text-slate-900 text-sm">{currentSlip.employeeName}</strong>
          </div>
          <div>
            <span className="text-slate-500 block">کد پرسنلی:</span>
            <strong className="font-mono text-slate-900">{currentSlip.personnelCode}</strong>
          </div>
          <div>
            <span className="text-slate-500 block">کد ملی:</span>
            <strong className="font-mono text-slate-900">{currentSlip.nationalId}</strong>
          </div>
          <div>
            <span className="text-slate-500 block">شماره بیمه:</span>
            <strong className="font-mono text-slate-900">{currentSlip.insuranceNumber}</strong>
          </div>
          <div>
            <span className="text-slate-500 block">عنوان شغل:</span>
            <strong className="text-slate-800">{currentSlip.jobTitle}</strong>
          </div>
          <div>
            <span className="text-slate-500 block">واحد سازمانی:</span>
            <strong className="text-slate-800">{currentSlip.department}</strong>
          </div>
          <div>
            <span className="text-slate-500 block">کارکرد ماهانه:</span>
            <strong className="font-mono text-slate-900">{currentSlip.workedDays} روز</strong>
          </div>
          <div>
            <span className="text-slate-500 block">اضافه‌کاری:</span>
            <strong className="font-mono text-slate-900">{currentSlip.overtimeHours} ساعت</strong>
          </div>
        </div>

        {/* Dual Column: Earnings vs Deductions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Column 1: Earnings (مزایا و حقوق ناخالص) */}
          <div className="border border-slate-200 rounded-lg overflow-hidden flex flex-col justify-between">
            <div>
              <div className="bg-emerald-700 text-white font-bold text-xs py-2.5 px-4 flex justify-between items-center">
                <span>شرح حقوق و مزایا (بستانکار)</span>
                <span>مبلغ (ریال)</span>
              </div>
              <div className="p-3 space-y-2 text-xs divide-y divide-slate-100">
                <div className="flex justify-between pt-1">
                  <span>حقوق پایه ۳۰ روزه</span>
                  <span className="font-mono font-medium">{currentSlip.basePay.toLocaleString('fa-IR')}</span>
                </div>
                <div className="flex justify-between pt-2">
                  <span>حق مسکن مصوب</span>
                  <span className="font-mono font-medium">{currentSlip.housingPay.toLocaleString('fa-IR')}</span>
                </div>
                <div className="flex justify-between pt-2">
                  <span>بن خواربار و معیشت</span>
                  <span className="font-mono font-medium">{currentSlip.groceryPay.toLocaleString('fa-IR')}</span>
                </div>
                {currentSlip.childPay > 0 && (
                  <div className="flex justify-between pt-2">
                    <span>حق اولاد قانونی (ماده ۸۶)</span>
                    <span className="font-mono font-medium">{currentSlip.childPay.toLocaleString('fa-IR')}</span>
                  </div>
                )}
                {currentSlip.seniorityPay > 0 && (
                  <div className="flex justify-between pt-2">
                    <span>پایه سنوات ماهانه</span>
                    <span className="font-mono font-medium">{currentSlip.seniorityPay.toLocaleString('fa-IR')}</span>
                  </div>
                )}
                {currentSlip.overtimePay > 0 && (
                  <div className="flex justify-between pt-2">
                    <span>اضافه‌کاری (ضریب ۱.۴)</span>
                    <span className="font-mono font-medium">{currentSlip.overtimePay.toLocaleString('fa-IR')}</span>
                  </div>
                )}
                {currentSlip.bonusPay > 0 && (
                  <div className="flex justify-between pt-2">
                    <span>پاداش و بهره‌وری</span>
                    <span className="font-mono font-medium">{currentSlip.bonusPay.toLocaleString('fa-IR')}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-emerald-50 border-t border-emerald-200 p-3 flex justify-between items-center text-xs font-bold text-emerald-900">
              <span>مجموع حقوق و مزایای ناخالص:</span>
              <span className="font-mono text-sm">{currentSlip.grossPay.toLocaleString('fa-IR')} ریال</span>
            </div>
          </div>

          {/* Column 2: Deductions (کسورات قانونی و توافقی) */}
          <div className="border border-slate-200 rounded-lg overflow-hidden flex flex-col justify-between">
            <div>
              <div className="bg-rose-700 text-white font-bold text-xs py-2.5 px-4 flex justify-between items-center">
                <span>شرح کسورات (بدهکار)</span>
                <span>مبلغ (ریال)</span>
              </div>
              <div className="p-3 space-y-2 text-xs divide-y divide-slate-100">
                <div className="flex justify-between pt-1">
                  <span>بیمه تامین اجتماعی سهم کارگر (۷٪)</span>
                  <span className="font-mono font-medium text-rose-600">{currentSlip.employeeInsurance.toLocaleString('fa-IR')}</span>
                </div>
                <div className="flex justify-between pt-2">
                  <span>مالیات بر درآمد حقوق (ماده ۸۴)</span>
                  <span className="font-mono font-medium text-rose-600">{currentSlip.incomeTax.toLocaleString('fa-IR')}</span>
                </div>
                {currentSlip.advanceDeduction > 0 && (
                  <div className="flex justify-between pt-2">
                    <span>مساعده دریافتی ماه</span>
                    <span className="font-mono font-medium text-slate-700">{currentSlip.advanceDeduction.toLocaleString('fa-IR')}</span>
                  </div>
                )}
                {currentSlip.loanDeduction > 0 && (
                  <div className="flex justify-between pt-2">
                    <span>کسر قسط وام پرسنلی</span>
                    <span className="font-mono font-medium text-slate-700">{currentSlip.loanDeduction.toLocaleString('fa-IR')}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-rose-50 border-t border-rose-200 p-3 flex justify-between items-center text-xs font-bold text-rose-900">
              <span>مجموع کل کسورات:</span>
              <span className="font-mono text-sm">{currentSlip.totalDeductions.toLocaleString('fa-IR')} ریال</span>
            </div>
          </div>
        </div>

        {/* Employer Insurance Info (اطلاعاتی) */}
        <div className="bg-amber-50/60 border border-amber-200 rounded-lg p-3 text-xs text-amber-900 flex flex-wrap items-center justify-between gap-2">
          <span className="font-semibold flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-amber-700" />
            تعهدات کارفرما (صرفاً جهت اطلاع پرسنل):
          </span>
          <div className="flex items-center gap-4">
            <span>بیمه سهم کارفرما (۲۰٪): <strong className="font-mono">{currentSlip.employerInsurance.toLocaleString('fa-IR')}</strong></span>
            <span>بیمه بیکاری (۳٪): <strong className="font-mono">{currentSlip.unemploymentInsurance.toLocaleString('fa-IR')}</strong></span>
          </div>
        </div>

        {/* Final Net Payable Box */}
        <div className="bg-slate-900 text-white rounded-xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center sm:text-right">
            <span className="text-xs text-slate-400 block">خالص حقوق قابل پرداخت (واریزی به حساب):</span>
            <div className="text-2xl font-black text-emerald-400 font-mono">
              {currentSlip.netPayable.toLocaleString('fa-IR')} <span className="text-sm font-normal text-slate-300">ریال</span>
            </div>
            <div className="text-xs text-slate-300 pt-1">
              به حروف: <strong className="text-white">{currentSlip.netPayableWords}</strong>
            </div>
          </div>

          <div className="text-center sm:text-left bg-slate-800 p-3 rounded-lg border border-slate-700 text-xs space-y-1">
            <div className="text-slate-400">بانک مقصد و شماره شبا:</div>
            <div className="font-bold text-white">{currentSlip.bankName}</div>
            <div className="font-mono text-emerald-300 direction-ltr">{currentSlip.bankShebaNumber}</div>
          </div>
        </div>

        {/* Signatures */}
        <div className="pt-8 border-t border-slate-200 grid grid-cols-2 gap-8 text-center text-xs text-slate-500">
          <div>
            <div className="h-16"></div>
            <div className="font-semibold text-slate-700">امضا و مهر امور مالی شرکت</div>
          </div>
          <div>
            <div className="h-16"></div>
            <div className="font-semibold text-slate-700">امضا و تایید دریافت‌کننده فیش</div>
          </div>
        </div>
      </div>
    </div>
  );
}
