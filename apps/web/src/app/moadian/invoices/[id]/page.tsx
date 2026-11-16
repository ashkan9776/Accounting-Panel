'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  QrCode,
  Copy,
  Check,
  FileCode,
  RefreshCw,
  ExternalLink,
  Clock,
  Send,
  AlertCircle,
} from 'lucide-react';

export default function MoadianInvoiceDetailPage() {
  const params = useParams();
  const invoiceId = params?.id as string;

  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [isInquiring, setIsInquiring] = useState(false);
  const [inquireResult, setInquireResult] = useState<string | null>(null);

  // داده‌های نمونه صورتحساب الکترونیکی
  const taxId = 'A123451403082600000012';
  const memoryId = 'A12345';
  const dateEpochDays = '19826';
  const serialNumber = '000000001';
  const verhoeffDigit = '2';

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(label);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const handleInquire = () => {
    setIsInquiring(true);
    setInquireResult(null);
    setTimeout(() => {
      setIsInquiring(false);
      setInquireResult('استعلام از کارپوشه موفق: صورتحساب در وضعیت تایید نهایی (CONFIRMED) ممیزی قرار دارد.');
    }, 1200);
  };

  const sampleJwsHeader = JSON.stringify({ alg: 'RS256', typ: 'JWT', kid: 'A12345-2024' }, null, 2);
  const sampleJwsPayload = JSON.stringify(
    {
      header: {
        taxid: taxId,
        indatim: 1732608000000,
        indati2m: 1732608000000,
        inty: 1,
        inno: 'INV-1403-0801',
        inp: 1,
        ins: 1,
        tprdis: 2500000000,
        tdis: 0,
        tadis: 2500000000,
        tvam: 250000000,
        todam: 0,
        tbill: 2750000000,
        setm: 1,
        tinb: '10103456789',
        sbc: '1987654321',
        bbc: '1456789012',
      },
      body: [
        {
          sstid: '2710000012345',
          sstt: 'دستگاه سرور پردازش ابری مدل X1',
          am: 10,
          mu: '1640',
          fee: 250000000,
          prdis: 2500000000,
          dis: 0,
          adis: 2500000000,
          vra: 0.1,
          vam: 250000000,
          tsstam: 2750000000,
        },
      ],
    },
    null,
    2
  );

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* سربرگ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/moadian/invoices" className="text-slate-400 hover:text-slate-600 transition">
              <ArrowRight className="w-5 h-5" />
            </Link>
            <h1 className="text-xl font-bold text-slate-800">جزئیات بسته فنی صورتحساب الکترونیکی</h1>
            <span className="bg-emerald-100 text-emerald-800 text-xs px-2.5 py-0.5 rounded-full font-bold">
              تایید کارپوشه
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            مشاهده شناسه ۲۲ رقمی، امضای JWS Compact، چک‌لیست اعتبارسنجی Pre-flight و QR Code
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleInquire}
            disabled={isInquiring}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm transition disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isInquiring ? 'animate-spin' : ''}`} />
            {isInquiring ? 'در حال استعلام...' : 'استعلام آنلاین از کارپوشه'}
          </button>
        </div>
      </div>

      {inquireResult && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{inquireResult}</span>
          </div>
          <button onClick={() => setInquireResult(null)} className="text-slate-500 hover:underline">
            بستن
          </button>
        </div>
      )}

      {/* تفکیک ریاضی شناسه منحصر‌به‌فرد مالیاتی */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          کالبدشکافی شماره منحصر‌به‌فرد مالیاتی ۲۲ رقمی (Tax ID)
        </h2>

        <div className="p-4 bg-slate-900 text-white rounded-xl flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-center md:text-right">
            <span className="text-[11px] text-slate-400 block mb-1">شناسه ۲۲ رقمی ثبت‌شده در کارپوشه سازمان:</span>
            <span className="font-mono text-lg font-bold tracking-widest text-emerald-400">{taxId}</span>
          </div>

          <button
            onClick={() => handleCopy(taxId, 'taxId')}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
          >
            {copiedSection === 'taxId' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            کپی شناسه مالیاتی
          </button>
        </div>

        {/* ۴ بخش شناسه مالیاتی */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <span className="text-[10px] text-slate-500 block">۱. شناسه حافظه (۶ رقم)</span>
            <span className="font-mono font-bold text-slate-800 text-sm">{memoryId}</span>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <span className="text-[10px] text-slate-500 block">۲. روزها از مبدا تاریخ (۵ رقم)</span>
            <span className="font-mono font-bold text-slate-800 text-sm">{dateEpochDays}</span>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <span className="text-[10px] text-slate-500 block">۳. سریال ده رقمی فاکتور (۱۰ رقم)</span>
            <span className="font-mono font-bold text-slate-800 text-sm">{serialNumber}</span>
          </div>
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
            <span className="text-[10px] text-emerald-700 block">۴. رقم کنترل Verhoeff (۱ رقم)</span>
            <span className="font-mono font-bold text-emerald-700 text-sm">{verhoeffDigit}</span>
          </div>
        </div>
      </div>

      {/* چک‌لیست اعتبارسنجی پیش از ارسال (Pre-flight Validator) و QR Code */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            گزارش اعتبارسنجی پیش از ارسال (Pre-flight Validator)
          </h2>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-100">
              <span className="text-slate-700">اعتبارسنجی کد ملی / شناسه ملی خریدار و فروشنده</span>
              <span className="font-bold text-emerald-600 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> تایید شده
              </span>
            </div>
            <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-100">
              <span className="text-slate-700">کد پستی ۱۰ رقمی معتبر اقامتگاه قانونی</span>
              <span className="font-bold text-emerald-600 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> تایید شده
              </span>
            </div>
            <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-100">
              <span className="text-slate-700">شناسه ۱۳ رقمی عمومی/اختصاصی کالا و خدمت (SSTID)</span>
              <span className="font-bold text-emerald-600 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> تایید شده
              </span>
            </div>
            <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-100">
              <span className="text-slate-700">محاسبه دقیق ارزش افزوده ۱۰٪ بدون خطای گردکردن</span>
              <span className="font-bold text-emerald-600 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> تایید شده
              </span>
            </div>
            <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-100">
              <span className="text-slate-700">تطابق کامل جمع جبری اقلام با مبالغ سربرگ صورتحساب</span>
              <span className="font-bold text-emerald-600 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> تایید شده
              </span>
            </div>
          </div>
        </div>

        {/* پیش‌نمایش QR Code */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center space-y-3">
          <div className="w-36 h-36 border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center bg-slate-50 p-2">
            <QrCode className="w-24 h-24 text-slate-800" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-800 block">بارکد دو بعدی استاندارد (QR Code)</span>
            <span className="text-[11px] text-slate-400 mt-0.5 block">
              حاوی اطلاعات هویتی و شناسه ۲۲ رقمی جهت اسکن پایانه
            </span>
          </div>
        </div>
      </div>

      {/* بسته داده امضا شده JWS (RFC 7515 Compact) */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <FileCode className="w-4 h-4 text-emerald-600" />
            بسته داده رمزنگاری‌شده و امضای دیجیتال (JWS Compact Payload)
          </h2>
          <span className="text-[11px] font-mono text-slate-400">RS256 / SHA256withRSA</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-slate-700">JWS Header (Protected)</span>
              <button
                onClick={() => handleCopy(sampleJwsHeader, 'header')}
                className="text-xs text-slate-400 hover:text-emerald-600 flex items-center gap-1"
              >
                {copiedSection === 'header' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                کپی
              </button>
            </div>
            <pre className="p-3 bg-slate-900 text-cyan-400 rounded-lg text-[11px] font-mono overflow-x-auto" dir="ltr">
              {sampleJwsHeader}
            </pre>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-slate-700">Normalised Canonical Payload</span>
              <button
                onClick={() => handleCopy(sampleJwsPayload, 'payload')}
                className="text-xs text-slate-400 hover:text-emerald-600 flex items-center gap-1"
              >
                {copiedSection === 'payload' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                کپی
              </button>
            </div>
            <pre
              className="p-3 bg-slate-900 text-emerald-400 rounded-lg text-[11px] font-mono max-h-60 overflow-y-auto"
              dir="ltr"
            >
              {sampleJwsPayload}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
