'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Scale, Lock, Smartphone, ArrowLeft, AlertCircle, Sparkles, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { fetchApi } from '../../../lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);

    if (!mobile.trim() || !password.trim()) {
      setError('لطفاً شماره موبایل و کلمه عبور را وارد نمایید.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetchApi('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          mobile: mobile.trim(),
          password: password.trim(),
          tenantId: 'tenant-pishro',
        }),
      });

      if (res.accessToken) {
        localStorage.setItem('access_token', res.accessToken);
        localStorage.setItem('user', JSON.stringify(res.user));
        localStorage.setItem('tenant_id', res.user?.tenantId || 'tenant-pishro');
        localStorage.setItem('company_id', 'comp-pishro-1');
        localStorage.setItem('company_name', 'شرکت صنایع پیشرو پارس');
        router.push('/dashboard');
      } else {
        setError(res.message || 'خطا در احراز هویت.');
      }
    } catch (err: any) {
      setError(err.message || 'خطا در برقراری ارتباط با سرور.');
    } finally {
      setLoading(false);
    }
  };

  const fillQuickAdmin = () => {
    setMobile('09120000000');
    setPassword('admin12345');
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden">
      {/* دکوراسیون پس‌زمینه */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md z-10">
        {/* هدر لوگو */}
        <div className="text-center mb-8">
          <div className="inline-flex w-14 h-14 rounded-2xl bg-emerald-600 items-center justify-center shadow-xl shadow-emerald-900/50 mb-4 border border-emerald-500/30">
            <Scale className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">سامانه یکپارچه مالی پیشرو</h1>
          <p className="text-xs text-slate-400 mt-1">نسخه ۳.۰ سازمانی با هسته حسابداری استاندارد ایران</p>
        </div>

        {/* کارت لاگین */}
        <div className="bg-slate-800/80 backdrop-blur-md border border-slate-700/80 rounded-2xl p-6 sm:p-8 shadow-2xl">
          <h2 className="text-base font-bold text-slate-100 mb-6 flex items-center gap-2">
            <span>ورود به حساب کاربری</span>
          </h2>

          {error && (
            <div className="mb-5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                شماره موبایل
              </label>
              <div className="relative">
                <input
                  type="text"
                  dir="ltr"
                  placeholder="09120000000"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  className="w-full bg-slate-900/90 border border-slate-700 text-slate-100 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-left font-mono"
                />
                <Smartphone className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                کلمه عبور
              </label>
              <div className="relative">
                <input
                  type="password"
                  dir="ltr"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-900/90 border border-slate-700 text-slate-100 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-left"
                />
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold py-2.5 px-4 rounded-xl text-sm transition-all shadow-lg shadow-emerald-900/40 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <span>در حال ورود...</span>
              ) : (
                <>
                  <span>ورود به سامانه</span>
                  <ArrowLeft className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* راهنمای اطلاعات ورود */}
          <div className="mt-6 pt-5 border-t border-slate-700/60 space-y-2">
            <button
              type="button"
              onClick={fillQuickAdmin}
              className="w-full py-2 px-3 bg-slate-700/60 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-medium flex items-center justify-center gap-2 border border-slate-600/50 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>ورود سریع با کاربر پیش‌فرض دمو (۰۹۱۲۰۰۰۰۰۰۰ / admin12345)</span>
            </button>
            <div className="text-[11px] text-slate-400 text-center leading-relaxed">
              برای سازمان‌های ثبت‌شده در Onboarding: از شماره موبایل ثبت‌شده و کلمه عبور <span className="font-mono text-amber-300">Admin@2026!Sec</span> استفاده نمایید.
            </div>
          </div>
        </div>

        {/* هدایت به Onboarding */}
        <div className="mt-6 text-center">
          <Link
            href="/onboarding"
            className="text-xs text-slate-400 hover:text-emerald-400 transition-colors inline-flex items-center gap-1.5"
          >
            <span>سازمان جدید دارید؟</span>
            <span className="font-bold underline">راه‌اندازی صنف و ایجاد شرکت جدید (Onboarding)</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
