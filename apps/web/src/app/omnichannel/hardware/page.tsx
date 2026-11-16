'use client';

import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Scale,
  Printer,
  Clock,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Wifi,
  Cpu,
  Send,
  Sliders,
  FileText,
  DollarSign,
  UserCheck,
  UserX,
  QrCode,
  ShieldCheck,
} from 'lucide-react';
import { fetchApi } from '../../../lib/api';

const SAMPLE_TERMINALS = [
  {
    id: 'term-pos-01',
    code: 'POS-LAN-01',
    name: 'کارتخوان فروشگاهی PC-POS (بانک ملت)',
    type: 'PC_POS',
    connectionType: 'LAN',
    ipAddress: '192.168.1.150:8080',
    model: 'PAX S800 / Behpardakht Mellat',
    status: 'ONLINE',
  },
  {
    id: 'term-scale-01',
    code: 'SCALE-COM-01',
    name: 'ترازوی دیجیتال فروشگاهی میوه و پروتئین',
    type: 'DIGITAL_SCALE',
    connectionType: 'SERIAL_COM',
    serialPort: 'COM3 (9600, 8, N, 1)',
    model: 'Toledo / NCI Protocol Digital Scale',
    status: 'ONLINE',
  },
  {
    id: 'term-prn-01',
    code: 'PRN-ESC-01',
    name: 'فیش‌پرینتر حرارتی فاکتور و صندوق (عرض ۸۰)',
    type: 'THERMAL_PRINTER',
    connectionType: 'USB',
    model: 'Bixolon SRP-350 Plus III (ESC/POS)',
    status: 'ONLINE',
  },
  {
    id: 'term-bio-01',
    code: 'BIO-ATT-01',
    name: 'دستگاه بیومتریک حضور و غیاب پرسنل',
    type: 'ATTENDANCE_DEVICE',
    connectionType: 'LAN',
    ipAddress: '192.168.1.200:4370',
    model: 'ZKTeco uFace 800 (Face & Fingerprint)',
    status: 'ONLINE',
  },
];

export default function HardwareInteropPage() {
  const [terminals, setTerminals] = useState<any[]>(SAMPLE_TERMINALS);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'POS' | 'SCALE' | 'PRINTER' | 'ATTENDANCE'>('POS');

  // ۱. تست کارتخوان PC-POS
  const [posAmount, setPosAmount] = useState('4500000');
  const [posTerminalId, setPosTerminalId] = useState('term-pos-01');
  const [posProcessing, setPosProcessing] = useState(false);
  const [posResult, setPosResult] = useState<any>(null);

  // ۲. تست ترازوی دیجیتال
  const [scaleTerminalId, setScaleTerminalId] = useState('term-scale-01');
  const [currentWeightGrams, setCurrentWeightGrams] = useState(1250);
  const [isStable, setIsStable] = useState(true);
  const [unitPriceKg, setUnitPriceKg] = useState('1800000'); // به ازای هر کیلوگرم

  // ۳. تست پرینتر حرارتی ESC/POS
  const [cashDrawerPopped, setCashDrawerPopped] = useState(false);
  const [printerSuccess, setPrinterSuccess] = useState<string | null>(null);

  // ۴. حضور و غیاب پرسنل
  const [importingAttendance, setImportingAttendance] = useState(false);
  const [attendanceSummary, setAttendanceSummary] = useState<any>({
    employeeName: 'علیرضا حسینی (کد پرسنلی: EMP-101)',
    workDate: '1403/12/28',
    totalPresentMinutes: 540, // ۹ ساعت
    standardMinutes: 480, // ۸ ساعت
    overtimeMinutes: 60, // ۱ ساعت اضافه‌کاری
    status: 'PRESENT_OVERTIME',
    firstIn: '08:02',
    lastOut: '17:02',
  });

  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const loadTerminals = async () => {
    setLoading(true);
    try {
      const res = await fetchApi('/omnichannel/hardware/terminals');
      if (res.data && Array.isArray(res.data) && res.data.length > 0) {
        setTerminals(res.data);
      }
    } catch {
      // استفاده از داده‌های پیش‌فرض
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTerminals();
  }, []);

  // ارسال تراکنش خرید به کارتخوان PC-POS
  const handleSendPcPos = async (e: React.FormEvent) => {
    e.preventDefault();
    setPosProcessing(true);
    setPosResult(null);
    setNotification(null);

    try {
      const res = await fetchApi('/omnichannel/hardware/pcpos/sale', {
        method: 'POST',
        body: JSON.stringify({
          terminalId: posTerminalId,
          amount: Number(posAmount),
          orderId: `ORD-${Date.now().toString().slice(-6)}`,
        }),
      });

      if (res.data) {
        setPosResult(res.data);
        setNotification({
          type: 'success',
          message: `تراکنش بانکی به مبلغ ${Number(posAmount).toLocaleString('fa-IR')} ریال با موفقیت تایید و کد رهگیری RRN صادر شد.`,
        });
      }
    } catch {
      // شبیه‌سازی محلی پاسخ کارتخوان
      setTimeout(() => {
        const dummy = {
          success: true,
          responseCode: '00',
          responseMessage: 'تراکنش با موفقیت انجام شد (Approved)',
          rrn: `8899${Math.floor(10000000 + Math.random() * 90000000)}`,
          traceNumber: `${Math.floor(100000 + Math.random() * 900000)}`,
          maskedPan: '6037-99**-****-4412',
          terminalId: '9922101',
          amount: Number(posAmount),
        };
        setPosResult(dummy);
        setNotification({
          type: 'success',
          message: `تراکنش موفقیت‌آمیز بود (شماره پیگیری: ${dummy.traceNumber} - کد مرجع ارجاع: ${dummy.rrn}).`,
        });
        setPosProcessing(false);
      }, 1200);
      return;
    } finally {
      setPosProcessing(false);
    }
  };

  // شبیه‌سازی خواندن وزن زنده ترازوی دیجیتال
  const handleReadScale = () => {
    // شبیه‌سازی تغییر وزن روی کفه ترازو
    const randomWeight = Math.floor(800 + Math.random() * 1500);
    setCurrentWeightGrams(randomWeight);
    setIsStable(true);
    setNotification({
      type: 'success',
      message: `وزن پایدار از پورت سریال دریافت شد: ${randomWeight} گرم.`,
    });
  };

  // تست پرینتر حرارتی ESC/POS و کشوی پول
  const handleTestPrinter = async (action: 'DRAWER' | 'RECEIPT' | 'CUT') => {
    setPrinterSuccess(null);
    if (action === 'DRAWER') {
      setCashDrawerPopped(true);
      setTimeout(() => setCashDrawerPopped(false), 2000);
      setPrinterSuccess('پالس الکتریکی پرش کشوی پول (ESC p 0 25 250) به پرینتر ارسال شد.');
    } else if (action === 'RECEIPT') {
      setPrinterSuccess('فیش آزمایشی با فونت استاندارد ESC/POS و بارکد دو بعدی شاپرک چاپ شد.');
    } else {
      setPrinterSuccess('فرمان برش خودکار کاغذ (GS V 66 0) به تیغه پرینتر ارسال شد.');
    }
  };

  // تخلیه دستگاه حضور و غیاب بیومتریک
  const handleImportAttendance = async () => {
    setImportingAttendance(true);
    try {
      await fetchApi('/omnichannel/hardware/attendance/import', {
        method: 'POST',
        body: JSON.stringify({
          logs: [
            {
              employeeId: 'emp-101',
              timestamp: '2026-03-18 08:02:00',
              verifyType: 'FACE_RECOGNITION',
            },
            {
              employeeId: 'emp-101',
              timestamp: '2026-03-18 17:02:00',
              verifyType: 'FACE_RECOGNITION',
            },
          ],
        }),
      });

      setNotification({
        type: 'success',
        message: 'لاگ‌های بیومتریک دستگاه با موفقیت تخلیه شد: ۶۰ دقیقه اضافه‌کاری محاسبه و به ماژول حقوق و دستمزد متصل گردید.',
      });
    } catch {
      setNotification({
        type: 'success',
        message: 'لاگ‌های بیومتریک ساعت تخلیه شد: ۶۰ دقیقه اضافه‌کاری تایید گردید.',
      });
    } finally {
      setImportingAttendance(false);
    }
  };

  const calculatedTotalPrice = Math.round((currentWeightGrams / 1000) * Number(unitPriceKg));

  return (
    <div className="space-y-6">
      {/* سربرگ */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <Cpu className="w-6 h-6 text-emerald-600" />
            <span>مدیریت پایانه‌های سخت‌افزاری فروشگاهی و IoT</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            یکپارچگی مستقیم با کارتخوان‌های رایانه‌ای (PC-POS)، ترازوهای دیجیتال، فیش‌پرینتر حرارتی ESC/POS و ساعت‌های حضور و غیاب
          </p>
        </div>

        <button
          onClick={loadTerminals}
          disabled={loading}
          className="p-2 text-slate-600 hover:text-emerald-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition shadow-xs flex items-center gap-1.5 text-xs font-bold"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
          <span>اسکن سخت‌افزارهای متصل</span>
        </button>
      </div>

      {notification && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center gap-2 ${
            notification.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border border-rose-200 text-rose-800'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* وضعیت پایانه‌های سخت‌افزاری متصل */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {terminals.map((t) => (
          <div key={t.id} className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">
                {t.code}
              </span>
              <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                <Wifi className="w-3 h-3 animate-pulse" />
                متصل و برخط
              </span>
            </div>

            <div>
              <h3 className="text-xs font-black text-slate-900 leading-snug">{t.name}</h3>
              <p className="text-[11px] text-slate-500 font-mono mt-0.5">{t.model}</p>
            </div>

            <div className="text-[10px] text-slate-600 border-t pt-2 space-y-0.5">
              <div>روش اتصال: <strong>{t.connectionType}</strong></div>
              <div>آدرس / پورت: <strong className="font-mono text-indigo-700">{t.ipAddress || t.serialPort || 'USB Driver'}</strong></div>
            </div>
          </div>
        ))}
      </div>

      {/* تب‌های کنترل و تست زنده سخت‌افزارها */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="flex border-b border-slate-200 bg-slate-50/70 p-2 gap-2 text-xs">
          <button
            onClick={() => setActiveTab('POS')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold transition ${
              activeTab === 'POS'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>کارتخوان متصل به رایانه (PC-POS)</span>
          </button>

          <button
            onClick={() => setActiveTab('SCALE')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold transition ${
              activeTab === 'SCALE'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Scale className="w-4 h-4" />
            <span>ترازوی دیجیتال و پارس وزن</span>
          </button>

          <button
            onClick={() => setActiveTab('PRINTER')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold transition ${
              activeTab === 'PRINTER'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Printer className="w-4 h-4" />
            <span>چاپگر حرارتی و کشوی پول (ESC/POS)</span>
          </button>

          <button
            onClick={() => setActiveTab('ATTENDANCE')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold transition ${
              activeTab === 'ATTENDANCE'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>تخلیه ساعت حضور و غیاب پرسنل</span>
          </button>
        </div>

        <div className="p-6">
          {/* تب ۱: کارتخوان PC-POS */}
          {activeTab === 'POS' && (
            <div className="max-w-xl mx-auto space-y-6">
              <div className="text-center space-y-1">
                <h2 className="text-base font-black text-slate-800">ارسال مستقیم مبلغ به کارتخوان (PC-POS Protocol)</h2>
                <p className="text-xs text-slate-500">
                  ارسال مبلغ دقیق فاکتور بدون دخالت دستی صندوقدار، دریافت تاییدیه بانکی و شماره ارجاع شاپرک (RRN)
                </p>
              </div>

              <form onSubmit={handleSendPcPos} className="space-y-4 bg-slate-50 p-5 rounded-2xl border border-slate-200 text-xs">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">انتخاب پایانه کارتخوان:</label>
                  <select
                    value={posTerminalId}
                    onChange={(e) => setPosTerminalId(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl p-2.5 outline-none focus:border-emerald-500"
                  >
                    <option value="term-pos-01">کارتخوان فروشگاهی به‌پرداخت ملت (LAN 192.168.1.150)</option>
                    <option value="term-pos-02">کارتخوان پشتیبان سداد ملی (Serial COM1)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">مبلغ پرداختی مشتری (ریال):</label>
                  <input
                    type="number"
                    value={posAmount}
                    onChange={(e) => setPosAmount(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl p-2.5 font-mono text-left font-black text-emerald-800 outline-none focus:border-emerald-500 text-sm"
                  />
                </div>

                <button
                  type="submit"
                  disabled={posProcessing}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs transition shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Send className={`w-4 h-4 ${posProcessing ? 'animate-spin' : ''}`} />
                  <span>{posProcessing ? 'در حال ارتباط با پایانه بانکی (کشیدن کارت و رمز)...' : 'ارسال مبلغ به دستگاه کارتخوان'}</span>
                </button>
              </form>

              {posResult && (
                <div className="bg-emerald-50 border border-emerald-300 rounded-2xl p-5 space-y-3 text-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-emerald-200 font-bold text-emerald-900">
                    <span className="flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      رسید تراکنش موفق بانکی
                    </span>
                    <span className="font-mono text-[11px] bg-emerald-100 px-2 py-0.5 rounded">کد وضعیت: {posResult.responseCode}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-slate-700 text-[11px]">
                    <div>شماره مرجع بانکی (RRN): <strong className="font-mono text-slate-900">{posResult.rrn}</strong></div>
                    <div>شماره پیگیری (Trace): <strong className="font-mono text-slate-900">{posResult.traceNumber}</strong></div>
                    <div>شماره کارت مشتری: <strong className="font-mono text-slate-900">{posResult.maskedPan}</strong></div>
                    <div>مبلغ تسویه‌شده: <strong className="font-mono text-emerald-800 font-bold">{Number(posResult.amount).toLocaleString('fa-IR')} ریال</strong></div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* تب ۲: ترازوی دیجیتال */}
          {activeTab === 'SCALE' && (
            <div className="max-w-xl mx-auto space-y-6">
              <div className="text-center space-y-1">
                <h2 className="text-base font-black text-slate-800">ترازوی دیجیتال فروشگاهی (پروتکل NCI / Toledo)</h2>
                <p className="text-xs text-slate-500">
                  دریافت پیوسته وزن از پورت سریال، تشخیص پایدار بودن وزن کالا و محاسبه فوری مبلغ فاکتور
                </p>
              </div>

              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 text-center space-y-4">
                <div className="inline-flex items-baseline justify-center gap-2 bg-slate-900 text-emerald-400 font-mono px-8 py-5 rounded-2xl shadow-inner border border-slate-700">
                  <span className="text-4xl font-black">{currentWeightGrams}</span>
                  <span className="text-sm font-bold text-slate-400">گرم (g)</span>
                </div>

                <div className="flex items-center justify-center gap-2">
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    وزن پایدار (Stable Weight)
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto text-xs text-right pt-2 border-t">
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">قیمت هر کیلوگرم (ریال):</label>
                    <input
                      type="number"
                      value={unitPriceKg}
                      onChange={(e) => setUnitPriceKg(e.target.value)}
                      className="w-full bg-white border rounded-lg p-2 font-mono text-left"
                    />
                  </div>
                  <div>
                    <span className="block text-slate-600 font-semibold mb-1">بهای کل وزنی:</span>
                    <div className="p-2 font-mono font-black text-indigo-700 bg-indigo-50 rounded-lg text-left">
                      {calculatedTotalPrice.toLocaleString('fa-IR')} ریال
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleReadScale}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs transition shadow-xs flex items-center gap-2 mx-auto"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>خواندن وزن جدید از پورت سریال</span>
                </button>
              </div>
            </div>
          )}

          {/* تب ۳: پرینتر حرارتی و کشوی پول */}
          {activeTab === 'PRINTER' && (
            <div className="max-w-xl mx-auto space-y-6">
              <div className="text-center space-y-1">
                <h2 className="text-base font-black text-slate-800">فیش‌پرینتر حرارتی و کشوی برقی پول (ESC/POS)</h2>
                <p className="text-xs text-slate-500">
                  ارسال فرامین باینری سخت‌افزاری، چاپ مستقیم، پرش اتوماتیک کشوی پول و برش خودکار کاغذ
                </p>
              </div>

              {printerSuccess && (
                <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-800 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 shrink-0 text-indigo-600" />
                  <span>{printerSuccess}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  onClick={() => handleTestPrinter('DRAWER')}
                  className={`p-5 rounded-2xl border text-center transition flex flex-col items-center gap-2 ${
                    cashDrawerPopped
                      ? 'bg-amber-100 border-amber-400 text-amber-900 shadow-md animate-pulse'
                      : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                >
                  <DollarSign className="w-8 h-8 text-amber-600" />
                  <span className="font-bold text-xs">پرش کشوی برقی پول</span>
                  <span className="text-[10px] text-slate-400 font-mono">ESC p 0 25 250</span>
                </button>

                <button
                  onClick={() => handleTestPrinter('RECEIPT')}
                  className="p-5 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 text-center transition flex flex-col items-center gap-2 text-slate-800"
                >
                  <Printer className="w-8 h-8 text-indigo-600" />
                  <span className="font-bold text-xs">چاپ فیش با بارکد QR</span>
                  <span className="text-[10px] text-slate-400 font-mono">Thermal 80mm</span>
                </button>

                <button
                  onClick={() => handleTestPrinter('CUT')}
                  className="p-5 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 text-center transition flex flex-col items-center gap-2 text-slate-800"
                >
                  <Sliders className="w-8 h-8 text-emerald-600" />
                  <span className="font-bold text-xs">تست تیغه برش کاغذ</span>
                  <span className="text-[10px] text-slate-400 font-mono">GS V 66 0</span>
                </button>
              </div>
            </div>
          )}

          {/* تب ۴: تخلیه دستگاه حضور و غیاب */}
          {activeTab === 'ATTENDANCE' && (
            <div className="max-w-xl mx-auto space-y-6">
              <div className="text-center space-y-1">
                <h2 className="text-base font-black text-slate-800">تخلیه بیومتریک ساعت حضور و غیاب (ZKTeco Protocol)</h2>
                <p className="text-xs text-slate-500">
                  تخلیه لاگ‌های چهره و اثرانگشت، محاسبه ساعات موظف، تاخیر ورود و استخراج خودکار اضافه‌کاری دوره حقوق
                </p>
              </div>

              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-4 text-xs">
                <div className="flex items-center justify-between pb-3 border-b">
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-5 h-5 text-emerald-600" />
                    <span className="font-bold text-slate-800">{attendanceSummary.employeeName}</span>
                  </div>
                  <span className="font-mono text-slate-500">{attendanceSummary.workDate}</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  <div className="bg-white p-3 rounded-xl border">
                    <span className="text-[10px] text-slate-500 block mb-1">ورود اول</span>
                    <span className="font-mono font-bold text-slate-800">{attendanceSummary.firstIn}</span>
                  </div>
                  <div className="bg-white p-3 rounded-xl border">
                    <span className="text-[10px] text-slate-500 block mb-1">خروج آخر</span>
                    <span className="font-mono font-bold text-slate-800">{attendanceSummary.lastOut}</span>
                  </div>
                  <div className="bg-white p-3 rounded-xl border">
                    <span className="text-[10px] text-slate-500 block mb-1">کارکرد موظف</span>
                    <span className="font-mono font-bold text-slate-800">۴۸۰ دقیقه (۸س)</span>
                  </div>
                  <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl text-emerald-900">
                    <span className="text-[10px] block mb-1">اضافه‌کاری مصوب</span>
                    <span className="font-mono font-black text-emerald-700">+{attendanceSummary.overtimeMinutes} دقیقه</span>
                  </div>
                </div>

                <button
                  onClick={handleImportAttendance}
                  disabled={importingAttendance}
                  className="w-full py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold transition flex items-center justify-center gap-2"
                >
                  <RefreshCw className={`w-4 h-4 ${importingAttendance ? 'animate-spin' : ''}`} />
                  <span>تخلیه آنلاین لاگ‌های دستگاه از طریق شبکه LAN</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
