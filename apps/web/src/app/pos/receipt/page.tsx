'use client';

import React from 'react';
import Link from 'next/link';
import { Printer, ArrowRight, CheckCircle2, QrCode } from 'lucide-react';

export default function PosReceiptPage() {
  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 p-4 sm:p-8 flex flex-col items-center justify-center">
      {/* نوار ابزار بالای چاپگر */}
      <div className="w-full max-w-[85mm] mb-4 flex items-center justify-between print:hidden">
        <Link
          href="/pos"
          className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 font-bold"
        >
          <ArrowRight className="w-4 h-4" />
          بازگشت به پایانه
        </Link>
        <button
          onClick={handlePrint}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow-sm transition"
        >
          <Printer className="w-4 h-4" />
          چاپ فیش (Print)
        </button>
      </div>

      {/* شبیه‌ساز کاغذ فیش حرارتی ۸۰ میلی‌متری */}
      <div className="w-full max-w-[80mm] bg-white text-slate-900 p-5 shadow-xl border border-slate-300 font-mono text-xs leading-relaxed print:shadow-none print:border-none print:m-0 print:p-2">
        {/* سربرگ فروشگاه */}
        <div className="text-center border-b border-dashed border-slate-400 pb-3 mb-3">
          <h1 className="font-sans font-black text-base text-slate-950">سوپرمارکت و هایپر پیشرو</h1>
          <p className="text-[11px] text-slate-600 mt-0.5">شعبه ۱ - ولیعصر، نرسیده به میدان ونک</p>
          <p className="text-[10px] text-slate-500">تلفن پشتیبانی: ۰۲۱-۸۸۸۸۹۹۹۹</p>
          <div className="mt-2 text-[10px] bg-slate-100 py-0.5 px-2 rounded inline-block font-bold">
            رسید پرداخت پایانه فروشگاهی (POS)
          </div>
        </div>

        {/* مشخصات فاکتور */}
        <div className="text-[11px] space-y-1 border-b border-dashed border-slate-400 pb-2 mb-3">
          <div className="flex justify-between">
            <span>شماره فاکتور:</span>
            <span className="font-bold">POS-1403-9981</span>
          </div>
          <div className="flex justify-between">
            <span>تاریخ و ساعت:</span>
            <span>1403/08/26 - 16:35:12</span>
          </div>
          <div className="flex justify-between">
            <span>صندوقدار / پایانه:</span>
            <span>علی محمدی (پایانه ۰۱)</span>
          </div>
          <div className="flex justify-between">
            <span>مشتری:</span>
            <span>مشتری حضوری نقدی</span>
          </div>
        </div>

        {/* اقلام خریداری‌شده */}
        <div className="border-b border-dashed border-slate-400 pb-2 mb-3">
          <table className="w-full text-right text-[11px]">
            <thead>
              <tr className="border-b border-slate-300 font-bold">
                <th className="py-1">شرح کالا</th>
                <th className="py-1 text-center">تعداد</th>
                <th className="py-1 text-left">فی (ریال)</th>
                <th className="py-1 text-left">مبلغ کل</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr>
                <td className="py-1.5 font-sans font-semibold">شیر کم‌چرب ۱ لیتری</td>
                <td className="py-1.5 text-center">۲</td>
                <td className="py-1.5 text-left">۳۸۰,۰۰۰</td>
                <td className="py-1.5 text-left font-bold">۷۶۰,۰۰۰</td>
              </tr>
              <tr>
                <td className="py-1.5 font-sans font-semibold">نان تست سبوس‌دار</td>
                <td className="py-1.5 text-center">۱</td>
                <td className="py-1.5 text-left">۴۵۰,۰۰۰</td>
                <td className="py-1.5 text-left font-bold">۴۵۰,۰۰۰</td>
              </tr>
              <tr>
                <td className="py-1.5 font-sans font-semibold">پنیر سفید پگاه</td>
                <td className="py-1.5 text-center">۱</td>
                <td className="py-1.5 text-left">۶۸۰,۰۰۰</td>
                <td className="py-1.5 text-left font-bold">۶۸۰,۰۰۰</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* محاسبات و مبالغ کل */}
        <div className="text-[11px] space-y-1.5 border-b border-dashed border-slate-400 pb-2 mb-3">
          <div className="flex justify-between">
            <span>جمع اقلام:</span>
            <span>۱,۸۹۰,۰۰۰ ریال</span>
          </div>
          <div className="flex justify-between">
            <span>تخفیف کل:</span>
            <span>۰ ریال</span>
          </div>
          <div className="flex justify-between text-slate-700">
            <span>مالیات ارزش افزوده (۱۰٪):</span>
            <span>۱۴۴,۰۰۰ ریال</span>
          </div>
          <div className="flex justify-between text-xs font-black text-slate-950 pt-1 border-t border-slate-300">
            <span>مبلغ نهایی قابل پرداخت:</span>
            <span>۲,۰۳۴,۰۰۰ ریال</span>
          </div>
        </div>

        {/* نحوه تسویه بانکی */}
        <div className="text-[10px] text-slate-600 space-y-1 border-b border-dashed border-slate-400 pb-2 mb-3">
          <div className="flex justify-between font-bold text-slate-900">
            <span>روش پرداخت:</span>
            <span>کارتخوان بانکی (PC-POS)</span>
          </div>
          <div className="flex justify-between">
            <span>شماره کارت:</span>
            <span>۶۰۳۷-۹۹**-****-۱۲۳۴</span>
          </div>
          <div className="flex justify-between">
            <span>شماره پیگیری (RRN):</span>
            <span>۸۸۹۹۲۲۱۱۰۳</span>
          </div>
          <div className="flex justify-between">
            <span>پذیرنده / ترمینال:</span>
            <span>۹۹۲۲۱۰۱ / بانک ملت</span>
          </div>
        </div>

        {/* بارکد و پانویس */}
        <div className="text-center pt-1 space-y-2">
          <div className="flex justify-center">
            <QrCode className="w-16 h-16 text-slate-800" />
          </div>
          <p className="text-[10px] font-sans font-semibold text-slate-700">
            از خرید و اعتماد شما سپاسگزاریم
          </p>
          <p className="text-[9px] text-slate-500 font-sans leading-tight">
            ارائه اصل این فیش حداکثر تا ۲۴ ساعت پس از خرید جهت تعویض کالا الزامی می‌باشد.
          </p>
          <p className="text-[8px] text-slate-400 pt-1">سامانه ابری حسابداری و فروشگاهی پیشرو ۳.۰</p>
        </div>
      </div>
    </div>
  );
}
