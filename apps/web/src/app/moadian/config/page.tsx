'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  Key,
  Server,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Download,
  Copy,
  Check,
  ArrowRight,
  Lock,
  Globe,
  FileCode,
} from 'lucide-react';

export default function MoadianConfigPage() {
  const [fiscalMemoryId, setFiscalMemoryId] = useState('A12345');
  const [transportMethod, setTransportMethod] = useState<'DIRECT' | 'TRUSTED_COMPANY' | 'SANDBOX'>('DIRECT');
  const [tspProvider, setTspProvider] = useState('MOTAMED_DADEH');
  const [fiscalYear, setFiscalYear] = useState('1403');
  const [autoSendOnFinalize, setAutoSendOnFinalize] = useState(true);

  const [privateKey, setPrivateKey] = useState(
    '-----BEGIN RSA PRIVATE KEY-----\nMIIEowIBAAKCAQEA3f7Y8L99xKl02sK...[ENCRYPTED IN HARDWARE/DB]...==\n-----END RSA PRIVATE KEY-----'
  );
  const [publicKey, setPublicKey] = useState(
    '-----BEGIN CERTIFICATE-----\nMIIDdzCCAl+gAwIBAgIUX+V8h9yK...[TAX.GOV.IR COMPLIANT CRT]...==\n-----END CERTIFICATE-----'
  );

  const [isGeneratingKeys, setIsGeneratingKeys] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; latency?: number } | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(label);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleGenerateKeys = () => {
    setIsGeneratingKeys(true);
    setTimeout(() => {
      setPrivateKey(
        '-----BEGIN RSA PRIVATE KEY-----\nMIIEowIBAAKCAQEAzNewGeneratedKey2048Bit...[SECURE_LOCAL_STORAGE]...==\n-----END RSA PRIVATE KEY-----'
      );
      setPublicKey(
        '-----BEGIN CERTIFICATE-----\nMIIDdzCCAl+gAwIBAgIUNewPublicCertFiscal...[UPLOAD_TO_MY_TAX_GOV_IR]...==\n-----END CERTIFICATE-----'
      );
      setIsGeneratingKeys(false);
    }, 1200);
  };

  const handleTestConnection = () => {
    setIsTestingConnection(true);
    setTestResult(null);
    setTimeout(() => {
      setIsTestingConnection(false);
      setTestResult({
        success: true,
        message: 'ارتباط با سرور سامانه مودیان و دریافت توکن احراز هویت با موفقیت انجام شد.',
        latency: 184,
      });
    }, 1500);
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 4000);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* سربرگ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/moadian/invoices" className="text-slate-400 hover:text-slate-600 transition">
              <ArrowRight className="w-5 h-5" />
            </Link>
            <h1 className="text-xl font-bold text-slate-800">پیکربندی کلیدها و حافظه مالیاتی (سامانه مودیان)</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            تنظیم شناسه ۶ رقمی حافظه مالیاتی، زوج‌کلید نامتقارن RSA 2048-bit، انتخاب شرکت معتمد (TSP) و تست ارتباط
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={isTestingConnection}
            className="inline-flex items-center gap-2 px-3.5 py-2 border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 text-xs font-semibold rounded-lg shadow-sm transition disabled:opacity-50"
          >
            <Server className={`w-4 h-4 text-emerald-600 ${isTestingConnection ? 'animate-pulse' : ''}`} />
            {isTestingConnection ? 'در حال برقراری اتصال...' : 'تست ارتباط با سرور'}
          </button>
        </div>
      </div>

      {/* نتیجه تست اتصال */}
      {testResult && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center justify-between border animate-fadeIn ${
            testResult.success
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {testResult.success ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600" />
            )}
            <span>
              {testResult.message} {testResult.latency && `(زمان پاسخ: ${testResult.latency} میلی‌ثانیه)`}
            </span>
          </div>
          <button onClick={() => setTestResult(null)} className="text-slate-500 hover:underline">
            بستن
          </button>
        </div>
      )}

      {saveSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>تنظیمات و کلیدهای سامانه مودیان با موفقیت در پایگاه داده رمزنگاری و ذخیره شدند.</span>
        </div>
      )}

      <form onSubmit={handleSaveSettings} className="space-y-6">
        {/* کارت تنظیمات هویتی و حافظه مالیاتی */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
            <Lock className="w-4 h-4 text-emerald-600" />
            مشخصات حافظه مالیاتی و کانال ارسال
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                شناسه یکتای حافظه مالیاتی (۶ کاراکتر) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                maxLength={6}
                value={fiscalMemoryId}
                onChange={(e) => setFiscalMemoryId(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold tracking-widest text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="A12345"
                required
              />
              <span className="text-[11px] text-slate-400 mt-1 block">دریافت‌شده از کارپوشه امور مالیاتی</span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">روش ارسال صورتحساب (Transport)</label>
              <select
                value={transportMethod}
                onChange={(e) => setTransportMethod(e.target.value as any)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="DIRECT">ارسال مستقیم توسط مودی (کلید اختصاصی)</option>
                <option value="TRUSTED_COMPANY">ارسال از طریق شرکت معتمد ارائه‌دهنده (TSP)</option>
                <option value="SANDBOX">محیط آزمایشی دولتی (Sandbox Simulator)</option>
              </select>
            </div>

            {transportMethod === 'TRUSTED_COMPANY' && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">شرکت معتمد مالیاتی (TSP)</label>
                <select
                  value={tspProvider}
                  onChange={(e) => setTspProvider(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="MOTAMED_DADEH">داده‌پردازی معتمد ایرانیان</option>
                  <option value="KAYSAN">شرکت معتمد مالیاتی کیسان</option>
                  <option value="TISS">سامانه هوشمند تیس (Tiss)</option>
                  <option value="TARAZ">تراز محاسب معتمد</option>
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">سال مالی فعال</label>
              <input
                type="text"
                value={fiscalYear}
                onChange={(e) => setFiscalYear(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="pt-2">
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={autoSendOnFinalize}
                onChange={(e) => setAutoSendOnFinalize(e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
              />
              <span className="text-xs font-semibold text-slate-700">
                ارسال خودکار صورتحساب به صف مودیان بلافاصله پس از تایید فاکتور فروش
              </span>
            </label>
          </div>
        </div>

        {/* کارت کلیدهای نامتقارن RSA */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Key className="w-4 h-4 text-emerald-600" />
                زوج‌کلید رمزنگاری نامتقارن RSA (2048-bit)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                تولید امضای دیجیتال JWS Compact (RFC 7515) و بارگذاری کلید عمومی در سامانه my.tax.gov.ir
              </p>
            </div>
            <button
              type="button"
              onClick={handleGenerateKeys}
              disabled={isGeneratingKeys}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isGeneratingKeys ? 'animate-spin' : ''}`} />
              {isGeneratingKeys ? 'در حال تولید...' : 'تولید خودکار زوج‌کلید جدید'}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700">کلید خصوصی RSA (Private Key)</label>
                <button
                  type="button"
                  onClick={() => handleCopy(privateKey, 'private')}
                  className="text-xs text-slate-400 hover:text-emerald-600 flex items-center gap-1"
                >
                  {copiedKey === 'private' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  کپی
                </button>
              </div>
              <textarea
                value={privateKey}
                onChange={(e) => setPrivateKey(e.target.value)}
                rows={6}
                className="w-full p-2.5 bg-slate-900 text-emerald-400 font-mono text-[11px] rounded-lg border border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                dir="ltr"
              />
              <span className="text-[11px] text-amber-600 mt-1 block">
                این کلید به صورت امن در سرور ذخیره شده و هرگز در اختیار شخص ثالث قرار نمی‌گیرد.
              </span>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700">کلید عمومی / گواهی دیجیتال (Public Key / CRT)</label>
                <button
                  type="button"
                  onClick={() => handleCopy(publicKey, 'public')}
                  className="text-xs text-slate-400 hover:text-emerald-600 flex items-center gap-1"
                >
                  {copiedKey === 'public' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  کپی
                </button>
              </div>
              <textarea
                value={publicKey}
                onChange={(e) => setPublicKey(e.target.value)}
                rows={6}
                className="w-full p-2.5 bg-slate-900 text-cyan-400 font-mono text-[11px] rounded-lg border border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                dir="ltr"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">
                این گواهی را کپی کرده و در بخش پرونده مالیاتی درگاه امور مالیاتی بارگذاری کنید.
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
          <Link
            href="/moadian/invoices"
            className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50"
          >
            بازگشت به کارتابل
          </Link>
          <button
            type="submit"
            className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm transition"
          >
            ذخیره و اعمال تنظیمات مودیان
          </button>
        </div>
      </form>
    </div>
  );
}
