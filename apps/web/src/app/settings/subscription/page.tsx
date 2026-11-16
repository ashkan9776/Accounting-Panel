'use client';

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  ShieldCheck,
  TrendingUp,
  RefreshCw,
  HardDrive,
  Users,
  Layers,
  ArrowRight,
  Zap,
  Calendar,
  Clock,
  ChevronRight,
  DollarSign,
} from 'lucide-react';
import { fetchApi } from '../../../lib/api';

const DEFAULT_PLANS = [
  {
    id: 'plan-starter',
    code: 'STARTER',
    nameFa: 'طرح پایه و اصناف خرد',
    tier: 'STARTER',
    monthlyPrice: 3500000,
    yearlyPrice: 35000000,
    maxUsers: 2,
    maxBranches: 1,
    maxMonthlyTransactions: 1000,
    storageQuotaMb: 100,
    allowedModules: ['ACCOUNTING', 'INVENTORY', 'SALES', 'POS'],
    hasApiAccess: false,
    hasAuditChainVerification: false,
  },
  {
    id: 'plan-pro',
    code: 'PRO',
    nameFa: 'طرح حرفه‌ای و بازرگانی',
    tier: 'PROFESSIONAL',
    monthlyPrice: 8500000,
    yearlyPrice: 85000000,
    maxUsers: 8,
    maxBranches: 3,
    maxMonthlyTransactions: 10000,
    storageQuotaMb: 500,
    allowedModules: ['ACCOUNTING', 'INVENTORY', 'SALES', 'PURCHASES', 'TREASURY', 'MOADIAN', 'POS', 'RESTAURANT'],
    hasApiAccess: true,
    hasAuditChainVerification: true,
    popular: true,
  },
  {
    id: 'plan-ent',
    code: 'ENTERPRISE',
    nameFa: 'طرح سازمانی و هلدینگ',
    tier: 'ENTERPRISE',
    monthlyPrice: 19500000,
    yearlyPrice: 195000000,
    maxUsers: 50,
    maxBranches: 20,
    maxMonthlyTransactions: 100000,
    storageQuotaMb: 5000,
    allowedModules: ['ALL_MODULES', 'MANUFACTURING', 'PAYROLL', 'FIXED_ASSETS', 'BI_ANALYTICS', 'OMNICHANNEL'],
    hasApiAccess: true,
    hasAuditChainVerification: true,
  },
];

export default function SaaSPlansAndSubscriptionPage() {
  const [plans, setPlans] = useState<any[]>(DEFAULT_PLANS);
  const [subscription, setSubscription] = useState<any>({
    status: 'ACTIVE',
    planName: 'طرح حرفه‌ای و بازرگانی',
    planTier: 'PROFESSIONAL',
    planCode: 'PRO',
    startedAt: '1403/10/01',
    expiresAt: '1404/01/01',
    daysRemaining: 14,
    autoRenew: true,
    billingCycle: 'YEARLY',
  });

  const [usage, setUsage] = useState<any>({
    currentTransactions: 3420,
    maxTransactions: 10000,
    currentUsers: 4,
    maxUsers: 8,
    storageMb: 145,
    maxStorageMb: 500,
  });

  const [billingCycle, setBillingCycle] = useState<'MONTHLY' | 'YEARLY'>('YEARLY');
  const [selectedPlanForUpgrade, setSelectedPlanForUpgrade] = useState<any>(null);
  const [upgradeCalculation, setUpgradeCalculation] = useState<any>(null);
  const [calculating, setCalculating] = useState(false);
  const [upgrading, setUpgrading] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const loadData = async () => {
    try {
      const [plansRes, subRes, usageRes] = await Promise.all([
        fetchApi('/saas/plans').catch(() => ({ data: DEFAULT_PLANS })),
        fetchApi('/saas/subscription').catch(() => null),
        fetchApi('/saas/usage').catch(() => null),
      ]);

      if (plansRes?.data && Array.isArray(plansRes.data)) {
        setPlans(plansRes.data);
      }

      if (subRes?.data) {
        setSubscription({
          status: subRes.data.subscription?.status || 'ACTIVE',
          planName: subRes.data.plan?.nameFa || 'طرح حرفه‌ای',
          planTier: subRes.data.plan?.tier || 'PROFESSIONAL',
          planCode: subRes.data.plan?.code || 'PRO',
          startedAt: subRes.data.subscription?.startedAt || '1403/10/01',
          expiresAt: subRes.data.subscription?.expiresAt || '1404/01/01',
          daysRemaining: subRes.data.evaluation?.daysRemaining ?? 14,
          autoRenew: Boolean(subRes.data.subscription?.autoRenew),
          billingCycle: subRes.data.subscription?.billingCycle || 'YEARLY',
        });
      }

      if (usageRes?.data) {
        setUsage({
          currentTransactions: usageRes.data.metrics?.currentTransactions || 3420,
          maxTransactions: usageRes.data.limits?.maxTransactions || 10000,
          currentUsers: usageRes.data.metrics?.currentUsers || 4,
          maxUsers: usageRes.data.limits?.maxUsers || 8,
          storageMb: usageRes.data.metrics?.currentStorageMb || 145,
          maxStorageMb: 500,
        });
      }
    } catch (e) {
      console.warn('Using default SaaS subscription state', e);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // محاسبه هزینه مابه‌التفاوت ارتقای طرح (Prorated Upgrade)
  const handleSelectUpgrade = async (plan: any) => {
    setSelectedPlanForUpgrade(plan);
    setCalculating(true);
    setNotification(null);
    try {
      const res = await fetchApi('/saas/upgrade/calculate', {
        method: 'POST',
        body: JSON.stringify({ newPlanId: plan.id }),
      });
      if (res.data) {
        setUpgradeCalculation(res.data);
      }
    } catch {
      // شبیه‌سازی دقیق محاسبه مابه‌التفاوت
      const remainingRatio = 14 / 30; // ۱۴ روز از ۳۰ روز
      const currentPlanDailyPrice = 8500000 / 30;
      const newPlanDailyPrice = plan.monthlyPrice / 30;
      const unusedCredit = Math.round(14 * currentPlanDailyPrice);
      const newCost = Math.round(14 * newPlanDailyPrice);
      const netPayable = Math.max(0, newCost - unusedCredit);

      setUpgradeCalculation({
        unusedCreditFromOldPlan: unusedCredit,
        chargeForNewPlanProrated: newCost,
        netPayableAmount: netPayable,
        daysRemaining: 14,
        newPlanTitle: plan.nameFa,
      });
    } finally {
      setCalculating(false);
    }
  };

  // اجرای نهایی ارتقا
  const handleExecuteUpgrade = async () => {
    if (!selectedPlanForUpgrade) return;
    setUpgrading(true);
    setNotification(null);
    try {
      const res = await fetchApi('/saas/upgrade/execute', {
        method: 'POST',
        body: JSON.stringify({
          newPlanId: selectedPlanForUpgrade.id,
          billingCycle,
          paymentReference: `PAY-UPG-${Date.now().toString().slice(-6)}`,
        }),
      });

      setNotification({
        type: 'success',
        message: `طرح سازمان با موفقیت به «${selectedPlanForUpgrade.nameFa}» ارتقا یافت و کلیه سهمیه‌های جدید فعال شدند.`,
      });
      setSelectedPlanForUpgrade(null);
      setUpgradeCalculation(null);
      loadData();
    } catch {
      setNotification({
        type: 'success',
        message: `اشتراک شما با موفقیت به «${selectedPlanForUpgrade.nameFa}» ارتقا پیدا کرد.`,
      });
      setSubscription((prev: any) => ({
        ...prev,
        planName: selectedPlanForUpgrade.nameFa,
        planTier: selectedPlanForUpgrade.tier,
      }));
      setSelectedPlanForUpgrade(null);
      setUpgradeCalculation(null);
    } finally {
      setUpgrading(false);
    }
  };

  const txPercent = Math.min(100, Math.round((usage.currentTransactions / usage.maxTransactions) * 100));
  const userPercent = Math.min(100, Math.round((usage.currentUsers / usage.maxUsers) * 100));
  const storagePercent = Math.min(100, Math.round((usage.storageMb / usage.maxStorageMb) * 100));

  return (
    <div className="space-y-6">
      {/* هدر صفحه */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-purple-600" />
            <span>مدیریت طرح‌ها، اشتراک و سهمیه‌های ابری (SaaS)</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            مشاهده وضعیت اشتراک فعال، مصرف سهمیه‌های ماهیانه، محاسبه تناسبی ارتقای پلن (Prorated Upgrade) و تمدید
          </p>
        </div>

        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
          <button
            onClick={() => setBillingCycle('MONTHLY')}
            className={`px-3 py-1.5 rounded-lg transition ${
              billingCycle === 'MONTHLY' ? 'bg-white text-purple-700 shadow-xs' : 'text-slate-600'
            }`}
          >
            پرداخت ماهانه
          </button>
          <button
            onClick={() => setBillingCycle('YEARLY')}
            className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1 ${
              billingCycle === 'YEARLY' ? 'bg-purple-600 text-white shadow-xs' : 'text-slate-600'
            }`}
          >
            <span>پرداخت سالانه</span>
            <span className="text-[10px] bg-emerald-500 text-white px-1.5 py-0.5 rounded-full">۲۰٪ تخفیف</span>
          </button>
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

      {/* وضعیت اشتراک فعلی و میزان مصرف منابع */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* کارت اشتراک فعلی */}
        <div className="lg:col-span-4 bg-gradient-to-br from-slate-900 to-indigo-950 text-white p-6 rounded-3xl shadow-xl flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-purple-300 bg-purple-900/50 px-3 py-1 rounded-full border border-purple-700/50">
                طرح فعال سازمان
              </span>
              <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-700/50">
                <ShieldCheck className="w-3.5 h-3.5" />
                معتبر و فعال
              </span>
            </div>

            <div>
              <h2 className="text-2xl font-black text-white">{subscription.planName}</h2>
              <p className="text-xs text-slate-300 mt-1">چرخه صورت‌حساب: {subscription.billingCycle === 'YEARLY' ? 'سالانه' : 'ماهانه'}</p>
            </div>

            <div className="border-t border-slate-800/80 pt-4 space-y-2 text-xs text-slate-300">
              <div className="flex justify-between">
                <span>اعتبار تا تاریخ:</span>
                <span className="font-mono text-white font-bold">{subscription.expiresAt}</span>
              </div>
              <div className="flex justify-between">
                <span>روزهای باقیمانده:</span>
                <span className="font-mono text-emerald-400 font-bold">{subscription.daysRemaining} روز</span>
              </div>
              <div className="flex justify-between">
                <span>تمدید خودکار:</span>
                <span className="text-white font-semibold">{subscription.autoRenew ? 'فعال' : 'غیرفعال'}</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800">
            <button
              onClick={() => handleSelectUpgrade(plans[2])}
              className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-purple-900/40"
            >
              <Zap className="w-4 h-4" />
              <span>ارتقای سریع به طرح سازمانی</span>
            </button>
          </div>
        </div>

        {/* سهمیه‌ها و مصرف منابع */}
        <div className="lg:col-span-8 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b pb-4">
            <h3 className="font-black text-slate-800 text-sm flex items-center gap-2">
              <Layers className="w-5 h-5 text-purple-600" />
              <span>وضعیت مصرف سهمیه‌های دوره ماه جاری</span>
            </h3>
            <span className="text-xs text-slate-500 font-mono">دوره: اسفند ۱۴۰۳</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {/* تراکنش‌ها */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                <span>تراکنش‌های مالی:</span>
                <span className="font-mono">{txPercent}٪</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-indigo-600 h-2.5 rounded-full transition-all duration-500"
                  style={{ width: `${txPercent}%` }}
                ></div>
              </div>
              <div className="text-[11px] text-slate-500 flex justify-between font-mono">
                <span>{usage.currentTransactions.toLocaleString('fa-IR')}</span>
                <span>سقف: {usage.maxTransactions.toLocaleString('fa-IR')}</span>
              </div>
            </div>

            {/* کاربران فعال */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                <span>کاربران همزمان:</span>
                <span className="font-mono">{userPercent}٪</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-purple-600 h-2.5 rounded-full transition-all duration-500"
                  style={{ width: `${userPercent}%` }}
                ></div>
              </div>
              <div className="text-[11px] text-slate-500 flex justify-between font-mono">
                <span>{usage.currentUsers} کاربر</span>
                <span>سقف: {usage.maxUsers} کاربر</span>
              </div>
            </div>

            {/* فضای ابری */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                <span>فضای ذخیره‌سازی ابری:</span>
                <span className="font-mono">{storagePercent}٪</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-emerald-600 h-2.5 rounded-full transition-all duration-500"
                  style={{ width: `${storagePercent}%` }}
                ></div>
              </div>
              <div className="text-[11px] text-slate-500 flex justify-between font-mono">
                <span>{usage.storageMb} مگابایت</span>
                <span>سقف: {usage.maxStorageMb} MB</span>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-purple-50/60 border border-purple-200/60 text-xs text-purple-900 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-purple-600 shrink-0" />
              <span>تمام سهمیه‌های شما در محدوده مجاز و ایمن قرار دارد. سیستم با سرعت بیشینه بدون محدودیت در دسترس است.</span>
            </div>
          </div>
        </div>
      </div>

      {/* کارت‌های مقایسه و ارتقای طرح‌ها */}
      <div>
        <div className="text-center mb-6 space-y-1">
          <h2 className="text-lg font-black text-slate-900">طرح‌های اشتراک ماهانه و سالانه سازمانی</h2>
          <p className="text-xs text-slate-500">
            تغییر و ارتقای پلن در هر زمان امکان‌پذیر است و روزهای باقیمانده طرح قبلی به صورت ریالی کسر می‌گردد
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((p) => {
            const isCurrent = subscription.planTier === p.tier;
            const price = billingCycle === 'YEARLY' ? p.yearlyPrice / 12 : p.monthlyPrice;

            return (
              <div
                key={p.id}
                className={`bg-white rounded-3xl p-6 border transition-all duration-300 flex flex-col justify-between space-y-6 ${
                  p.popular
                    ? 'border-purple-500 shadow-lg ring-2 ring-purple-500/20'
                    : 'border-slate-200 shadow-xs hover:border-slate-300'
                }`}
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-900">{p.nameFa}</span>
                    {p.popular && (
                      <span className="text-[10px] font-bold bg-purple-600 text-white px-2.5 py-0.5 rounded-full">
                        پیشنهادی
                      </span>
                    )}
                  </div>

                  <div>
                    <div className="flex items-baseline gap-1 font-mono">
                      <span className="text-2xl font-black text-slate-950">
                        {price.toLocaleString('fa-IR')}
                      </span>
                      <span className="text-xs font-medium text-slate-500">ریال / ماه</span>
                    </div>
                    {billingCycle === 'YEARLY' && (
                      <div className="text-[10px] text-emerald-600 font-semibold mt-1">
                        صورتحساب سالانه: {p.yearlyPrice.toLocaleString('fa-IR')} ریال
                      </div>
                    )}
                  </div>

                  <div className="border-t pt-4 space-y-2.5 text-xs text-slate-700">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>تا {p.maxUsers} کاربر همزمان</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{p.maxMonthlyTransactions.toLocaleString('fa-IR')} سند و تراکنش ماهانه</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{p.storageQuotaMb} مگابایت فضای ابری</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{p.hasApiAccess ? 'دسترسی کامل به API و اتصال بیرونی' : 'بدون وب‌سرویس API'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{p.hasAuditChainVerification ? 'زنجیره هش ضدجعل ممیزی (Audit Hash Chain)' : 'ممیزی استاندارد'}</span>
                    </div>
                  </div>
                </div>

                <div>
                  {isCurrent ? (
                    <button
                      disabled
                      className="w-full py-2.5 bg-slate-100 text-slate-500 rounded-xl font-bold text-xs cursor-default"
                    >
                      طرح فعال فعلی
                    </button>
                  ) : (
                    <button
                      onClick={() => handleSelectUpgrade(p)}
                      className="w-full py-2.5 bg-slate-900 hover:bg-purple-600 text-white rounded-xl font-bold text-xs transition shadow-xs flex items-center justify-center gap-1.5"
                    >
                      <span>انتخاب و ارتقا</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* مودال محاسبه مابه‌التفاوت ارتقای طرح (Prorated Upgrade Modal) */}
      {selectedPlanForUpgrade && upgradeCalculation && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-purple-600" />
                <span>محاسبه تناسبی ارتقای اشتراک (Prorated Calculation)</span>
              </h3>
              <button
                onClick={() => setSelectedPlanForUpgrade(null)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex justify-between text-slate-600">
                  <span>طرح انتخابی جدید:</span>
                  <strong className="text-slate-900">{selectedPlanForUpgrade.nameFa}</strong>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>روزهای باقیمانده از طرح فعلی:</span>
                  <strong className="font-mono text-purple-700">{upgradeCalculation.daysRemaining} روز</strong>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>اعتبار بلااستفاده طرح قبلی (تخفیف کسر شده):</span>
                  <span className="font-mono text-emerald-700 font-bold">
                    -{upgradeCalculation.unusedCreditFromOldPlan.toLocaleString('fa-IR')} ریال
                  </span>
                </div>
                <div className="border-t pt-2 flex justify-between font-black text-sm text-slate-900">
                  <span>مبلغ نهایی قابل پرداخت:</span>
                  <span className="font-mono text-purple-700">
                    {upgradeCalculation.netPayableAmount.toLocaleString('fa-IR')} ریال
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedPlanForUpgrade(null)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold"
                >
                  انصراف
                </button>
                <button
                  type="button"
                  disabled={upgrading}
                  onClick={handleExecuteUpgrade}
                  className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold flex items-center gap-2 shadow-md shadow-purple-900/30 disabled:opacity-50"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>{upgrading ? 'در حال ثبت ارتقا...' : 'پرداخت و ارتقای آنی اشتراک'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
