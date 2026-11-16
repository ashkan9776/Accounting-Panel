'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Barcode,
  Search,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  CreditCard,
  Banknote,
  PauseCircle,
  PlayCircle,
  Printer,
  Wifi,
  WifiOff,
  RefreshCw,
  Clock,
  Layers,
  ArrowRight,
  CheckCircle2,
  User,
  ShieldCheck,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';

interface CartItem {
  productId: string;
  productName: string;
  barcode: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  taxExempt: boolean;
  vatRate: number;
  vatAmount: number;
  totalPrice: number;
}

interface QuickProduct {
  id: string;
  name: string;
  barcode: string;
  category: string;
  price: number;
  taxExempt: boolean;
  imageColor: string;
}

const QUICK_PRODUCTS: QuickProduct[] = [
  { id: 'p1', name: 'شیر کم‌چرب ۱ لیتری', barcode: '626012345001', category: 'لبنیات', price: 380000, taxExempt: false, imageColor: 'bg-blue-100 text-blue-800' },
  { id: 'p2', name: 'نان تست طلایی سبوس‌دار', barcode: '626012345002', category: 'نان و غلات', price: 450000, taxExempt: true, imageColor: 'bg-amber-100 text-amber-800' },
  { id: 'p3', name: 'روغن سرخ‌کردنی ۱.۵ لیتری', barcode: '626012345003', category: 'خواربار', price: 1250000, taxExempt: false, imageColor: 'bg-yellow-100 text-yellow-800' },
  { id: 'p4', name: 'پنیر سفید پگاه ۴۰۰ گرم', barcode: '626012345004', category: 'لبنیات', price: 680000, taxExempt: false, imageColor: 'bg-emerald-100 text-emerald-800' },
  { id: 'p5', name: 'چای سیاه ممتاز نیم کیلویی', barcode: '626012345005', category: 'نوشیدنی', price: 2400000, taxExempt: false, imageColor: 'bg-stone-100 text-stone-800' },
  { id: 'p6', name: 'ماست دبه‌ای پرچرب ۲ کیلویی', barcode: '626012345006', category: 'لبنیات', price: 1100000, taxExempt: false, imageColor: 'bg-indigo-100 text-indigo-800' },
  { id: 'p7', name: 'تخم مرغ ۲۰ عددی شناسنامه‌دار', barcode: '626012345007', category: 'پروتئین', price: 1400000, taxExempt: true, imageColor: 'bg-orange-100 text-orange-800' },
  { id: 'p8', name: 'رب گوجه فرنگی ۸۰۰ گرمی', barcode: '626012345008', category: 'خواربار', price: 750000, taxExempt: false, imageColor: 'bg-rose-100 text-rose-800' },
];

export default function PosTerminalPage() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [isOnline, setIsOnline] = useState(true);
  const [offlineOrdersCount, setOfflineOrdersCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // مشتری
  const [customerName, setCustomerName] = useState('مشتری حضوری نقدی');

  // فاکتورهای معلق (Hold Orders)
  const [heldOrders, setHeldOrders] = useState<{ id: string; items: CartItem[]; time: string; tag: string }[]>([]);

  // مودال پرداخت
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD' | 'SPLIT'>('CARD');
  const [cashTendered, setCashTendered] = useState<number>(0);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [lastCompletedOrder, setLastCompletedOrder] = useState<any>(null);

  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // فوکوس خودکار روی ورودی بارکد
  useEffect(() => {
    barcodeInputRef.current?.focus();
  }, []);

  // مدیریت کلیدهای میانبر کیبورد (F1 تا F12)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F1') {
        e.preventDefault();
        barcodeInputRef.current?.focus();
      } else if (e.key === 'F8') {
        e.preventDefault();
        handleHoldOrder();
      } else if (e.key === 'F9') {
        e.preventDefault();
        if (cart.length > 0) setIsPaymentModalOpen(true);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        if (isPaymentModalOpen) {
          setIsPaymentModalOpen(false);
        } else if (cart.length > 0) {
          if (confirm('آیا مایل به حذف اقلام فاکتور جاری هستید؟')) setCart([]);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart, isPaymentModalOpen]);

  // افزودن کالا به سبد خرید
  const addProductToCart = (prod: QuickProduct) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.productId === prod.id);
      if (existing) {
        return prev.map((item) =>
          item.productId === prod.id
            ? recalculateItem({ ...item, quantity: item.quantity + 1 })
            : item
        );
      } else {
        const vatRate = prod.taxExempt ? 0 : 10;
        const netPrice = prod.price;
        const vatAmount = prod.taxExempt ? 0 : Math.round(netPrice * 0.1);
        const totalPrice = netPrice + vatAmount;
        return [
          ...prev,
          {
            productId: prod.id,
            productName: prod.name,
            barcode: prod.barcode,
            quantity: 1,
            unitPrice: prod.price,
            discount: 0,
            taxExempt: prod.taxExempt,
            vatRate,
            vatAmount,
            totalPrice,
          },
        ];
      }
    });
    setBarcodeInput('');
    barcodeInputRef.current?.focus();
  };

  const recalculateItem = (item: CartItem): CartItem => {
    const subtotal = item.quantity * item.unitPrice - item.discount;
    const vatAmount = item.taxExempt ? 0 : Math.round(subtotal * (item.vatRate / 100));
    return {
      ...item,
      vatAmount,
      totalPrice: subtotal + vatAmount,
    };
  };

  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;
    const found = QUICK_PRODUCTS.find(
      (p) => p.barcode === barcodeInput.trim() || p.name.includes(barcodeInput.trim())
    );
    if (found) {
      addProductToCart(found);
    } else {
      alert(`کالایی با بارکد یا نام "${barcodeInput}" یافت نشد.`);
    }
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.productId === productId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? recalculateItem({ ...item, quantity: newQty }) : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const removeItem = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.productId !== productId));
  };

  // محاسبات مالی کل فاکتور
  const totalGross = cart.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const totalDiscount = cart.reduce((sum, item) => sum + item.discount, 0);
  const totalVat = cart.reduce((sum, item) => sum + item.vatAmount, 0);
  const totalPayable = cart.reduce((sum, item) => sum + item.totalPrice, 0);

  // تعلیق فاکتور (Hold Order)
  const handleHoldOrder = () => {
    if (cart.length === 0) return;
    const newHold = {
      id: `hold-${Date.now()}`,
      items: cart,
      time: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
      tag: `مشتری ${heldOrders.length + 1} (${cart.length} قلم)`,
    };
    setHeldOrders([...heldOrders, newHold]);
    setCart([]);
    barcodeInputRef.current?.focus();
  };

  const recallHeldOrder = (holdId: string) => {
    const target = heldOrders.find((h) => h.id === holdId);
    if (target) {
      setCart(target.items);
      setHeldOrders(heldOrders.filter((h) => h.id !== holdId));
    }
  };

  // تسویه نهایی فاکتور
  const handleFinalizePayment = () => {
    setIsProcessingPayment(true);
    setTimeout(() => {
      const orderData = {
        orderNumber: `POS-${Date.now().toString().slice(-6)}`,
        items: [...cart],
        totalPayable,
        totalVat,
        customerName,
        paymentMethod,
        dateShamsi: '1403/08/26',
        time: new Date().toLocaleTimeString('fa-IR'),
      };

      if (!isOnline) {
        setOfflineOrdersCount((c) => c + 1);
      }

      setLastCompletedOrder(orderData);
      setCart([]);
      setIsPaymentModalOpen(false);
      setIsProcessingPayment(false);
    }, 1000);
  };

  const handleSyncOffline = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setOfflineOrdersCount(0);
      setIsSyncing(false);
      alert('تمامی فاکتورهای صف آفلاین با موفقیت با سرور مرکزی و سامانه مودیان همگام شدند.');
    }, 1500);
  };

  const filteredQuickProducts =
    selectedCategory === 'ALL'
      ? QUICK_PRODUCTS
      : QUICK_PRODUCTS.filter((p) => p.category === selectedCategory);

  const categories = ['ALL', 'لبنیات', 'خواربار', 'نان و غلات', 'نوشیدنی', 'پروتئین'];

  return (
    <div className="h-[calc(100vh-5rem)] flex flex-col gap-3 select-none">
      {/* نوار وضعیت بالای POS */}
      <div className="bg-slate-900 text-white px-4 py-2.5 rounded-xl flex flex-wrap items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-800 px-3 py-1 rounded-lg border border-slate-700">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold text-slate-200">شیفت فعال: صندوق مرکزی ۱</span>
            <span className="text-[11px] text-slate-400 font-normal">| صندوقدار: علی محمدی</span>
          </div>

          <button
            onClick={() => setIsOnline(!isOnline)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition ${
              isOnline ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-amber-950 text-amber-400 border border-amber-800'
            }`}
          >
            {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
            {isOnline ? 'آنلاین (متصل)' : 'آفلاین (محلی)'}
          </button>

          {offlineOrdersCount > 0 && (
            <div className="flex items-center gap-2 bg-amber-500/20 text-amber-300 px-2.5 py-1 rounded-lg border border-amber-500/30 text-xs">
              <span>{offlineOrdersCount} فاکتور در صف ذخیره محلی</span>
              <button
                onClick={handleSyncOffline}
                disabled={isSyncing}
                className="bg-amber-500 hover:bg-amber-600 text-slate-950 px-2 py-0.5 rounded font-bold flex items-center gap-1"
              >
                <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
                همگام‌سازی
              </button>
            </div>
          )}
        </div>

        {/* کلیدهای میانبر سریع */}
        <div className="flex items-center gap-2 text-[11px] text-slate-300">
          <span className="bg-slate-800 px-2 py-0.5 rounded border border-slate-700 font-mono">F1 بارکد</span>
          <span className="bg-slate-800 px-2 py-0.5 rounded border border-slate-700 font-mono">F8 تعلیق</span>
          <span className="bg-emerald-900 text-emerald-300 px-2 py-0.5 rounded border border-emerald-700 font-mono font-bold">
            F9 پرداخت
          </span>
          <span className="bg-slate-800 px-2 py-0.5 rounded border border-slate-700 font-mono">Esc انصراف</span>
          <Link
            href="/pos/shifts"
            className="ms-2 text-xs bg-slate-800 hover:bg-slate-700 text-emerald-400 px-3 py-1 rounded-lg border border-slate-700 font-bold transition"
          >
            مدیریت شیفت‌ها
          </Link>
        </div>
      </div>

      {/* ناحیه کاربری اصلی (دو ستونه: اقلام/کاتالوگ سمت راست، فاکتور سمت چپ) */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3 min-h-0">
        {/* بخش کاتالوگ و اسکن کالا (۷ ستون) */}
        <div className="lg:col-span-7 flex flex-col gap-3 min-h-0">
          {/* بارکدخوان سریع */}
          <form onSubmit={handleBarcodeSubmit} className="relative">
            <Barcode className="w-5 h-5 text-slate-400 absolute right-3.5 top-3" />
            <input
              ref={barcodeInputRef}
              type="text"
              placeholder="اسکن بارکد با دستگاه یا جستجوی نام کالا... (F1)"
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              className="w-full pl-4 pr-11 py-2.5 bg-white border-2 border-slate-300 focus:border-emerald-500 rounded-xl text-sm font-semibold text-slate-800 shadow-sm focus:outline-none"
            />
          </form>

          {/* تب‌های دسته‌بندی کالاها */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                  selectedCategory === cat
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {cat === 'ALL' ? 'همه اقلام پرفروش' : cat}
              </button>
            ))}
          </div>

          {/* شبکه کالاهای لمسی سریع (Quick Touch Grid) */}
          <div className="flex-1 overflow-y-auto bg-white p-3 rounded-xl border border-slate-200 shadow-sm grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
            {filteredQuickProducts.map((prod) => (
              <button
                key={prod.id}
                onClick={() => addProductToCart(prod)}
                className="flex flex-col justify-between p-3 rounded-xl border border-slate-200 hover:border-emerald-500 hover:shadow-md transition text-right bg-slate-50/50 hover:bg-emerald-50/30 group"
              >
                <div>
                  <span className="text-[10px] text-slate-400 block font-mono">{prod.barcode}</span>
                  <span className="text-xs font-bold text-slate-800 group-hover:text-emerald-700 block mt-1 leading-snug">
                    {prod.name}
                  </span>
                </div>
                <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between w-full">
                  <span className="text-xs font-black text-emerald-600 font-mono">
                    {prod.price.toLocaleString('fa-IR')}
                  </span>
                  <span className="text-[10px] text-slate-400">ریال</span>
                </div>
              </button>
            ))}
          </div>

          {/* نوار فاکتورهای معلق (Hold Orders Tray) */}
          {heldOrders.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 p-2.5 rounded-xl flex items-center gap-2 overflow-x-auto">
              <span className="text-xs font-bold text-amber-800 whitespace-nowrap flex items-center gap-1">
                <PauseCircle className="w-4 h-4 text-amber-600" />
                فاکتورهای معلق:
              </span>
              {heldOrders.map((h) => (
                <button
                  key={h.id}
                  onClick={() => recallHeldOrder(h.id)}
                  className="bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition shadow-sm"
                >
                  <PlayCircle className="w-3.5 h-3.5 text-amber-600" />
                  <span>{h.tag}</span>
                  <span className="text-[10px] text-slate-400">({h.time})</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* بخش فاکتور جاری و پرداخت (۵ ستون) */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col min-h-0">
          {/* هدر فاکتور جاری */}
          <div className="p-3 border-b border-slate-200 flex items-center justify-between bg-slate-50/80 rounded-t-xl">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-bold text-slate-800">فاکتور جاری</span>
              <span className="text-[11px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full font-bold">
                {cart.length} قلم
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleHoldOrder}
                disabled={cart.length === 0}
                className="text-xs text-amber-600 hover:text-amber-700 flex items-center gap-1 font-bold disabled:opacity-40"
                title="تعلیق فاکتور و شروع فاکتور مشتری دیگر (F8)"
              >
                <PauseCircle className="w-3.5 h-3.5" />
                تعلیق (F8)
              </button>
              <button
                onClick={() => setCart([])}
                disabled={cart.length === 0}
                className="text-xs text-rose-500 hover:text-rose-600 font-bold disabled:opacity-40"
                title="پاک کردن سبد خرید"
              >
                لغو فاکتور
              </button>
            </div>
          </div>

          {/* جدول اقلام سبد خرید */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 p-6 text-center">
                <ShoppingCart className="w-12 h-12 text-slate-300 mb-2 stroke-1" />
                <span className="text-xs font-bold text-slate-600">سبد خرید پایانه خالی است</span>
                <span className="text-[11px] text-slate-400 mt-1">
                  بارکد کالا را اسکن کنید یا از کاتالوگ انتخاب نمایید.
                </span>
              </div>
            ) : (
              cart.map((item) => (
                <div key={item.productId} className="py-2 px-2 flex items-center justify-between gap-2 text-xs">
                  <div className="flex-1 min-w-0">
                    <span className="font-bold text-slate-800 block truncate">{item.productName}</span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {item.unitPrice.toLocaleString('fa-IR')} ریال
                      {!item.taxExempt && ' + ۱۰٪ ارزش افزوده'}
                    </span>
                  </div>

                  {/* کنترل تعداد */}
                  <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                    <button
                      onClick={() => updateQuantity(item.productId, 1)}
                      className="w-6 h-6 rounded bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-600 flex items-center justify-center font-bold shadow-xs"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                    <span className="w-7 text-center font-mono font-bold text-slate-900">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.productId, -1)}
                      className="w-6 h-6 rounded bg-white hover:bg-rose-50 text-slate-700 hover:text-rose-600 flex items-center justify-center font-bold shadow-xs"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="text-left w-24">
                    <span className="font-mono font-bold text-slate-900 block">
                      {item.totalPrice.toLocaleString('fa-IR')}
                    </span>
                    <span className="text-[10px] text-slate-400">ریال</span>
                  </div>

                  <button
                    onClick={() => removeItem(item.productId)}
                    className="text-slate-400 hover:text-rose-500 p-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* خلاصه مبالغ و دکمه پرداخت */}
          <div className="p-3 bg-slate-50 border-t border-slate-200 space-y-2 rounded-b-xl">
            <div className="flex items-center justify-between text-xs text-slate-600">
              <span>جمع ناخالص اقلام:</span>
              <span className="font-mono font-semibold">{totalGross.toLocaleString('fa-IR')} ریال</span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-600">
              <span>مالیات بر ارزش افزوده (۱۰٪):</span>
              <span className="font-mono font-semibold text-emerald-600">
                {totalVat.toLocaleString('fa-IR')} ریال
              </span>
            </div>

            <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
              <span className="text-xs font-black text-slate-800">مبلغ کل قابل پرداخت:</span>
              <div className="text-left">
                <span className="text-xl font-black text-slate-950 font-mono">
                  {totalPayable.toLocaleString('fa-IR')}
                </span>
                <span className="text-xs text-slate-500 ms-1 font-bold">ریال</span>
              </div>
            </div>

            <button
              onClick={() => setIsPaymentModalOpen(true)}
              disabled={cart.length === 0}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-black shadow-md shadow-emerald-700/20 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CreditCard className="w-5 h-5" />
              <span>تسویه و چاپ فیش (F9)</span>
            </button>
          </div>
        </div>
      </div>

      {/* مودال تسویه و انتخاب روش پرداخت */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 text-right space-y-5 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-base text-slate-800 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-600" />
                تسویه حساب و پرداخت فاکتور
              </h3>
              <button onClick={() => setIsPaymentModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>

            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 text-center">
              <span className="text-xs text-emerald-800 block">مبلغ کل قابل پرداخت:</span>
              <span className="text-2xl font-black text-emerald-900 font-mono mt-1 block">
                {totalPayable.toLocaleString('fa-IR')} <span className="text-sm font-bold">ریال</span>
              </span>
            </div>

            {/* انتخاب نوع تسویه */}
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod('CARD')}
                className={`p-3 rounded-xl border text-center font-bold text-xs flex flex-col items-center gap-1.5 transition ${
                  paymentMethod === 'CARD'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <CreditCard className="w-5 h-5 text-emerald-600" />
                کارتخوان (PC-POS)
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('CASH')}
                className={`p-3 rounded-xl border text-center font-bold text-xs flex flex-col items-center gap-1.5 transition ${
                  paymentMethod === 'CASH'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Banknote className="w-5 h-5 text-emerald-600" />
                وجه نقد
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('SPLIT')}
                className={`p-3 rounded-xl border text-center font-bold text-xs flex flex-col items-center gap-1.5 transition ${
                  paymentMethod === 'SPLIT'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Layers className="w-5 h-5 text-emerald-600" />
                ترکیبی (نقد + کارت)
              </button>
            </div>

            {/* بخش محاسبه پول خرد نقدی */}
            {paymentMethod === 'CASH' && (
              <div className="space-y-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <label className="block text-xs font-bold text-slate-700">مبلغ دریافتی از مشتری (ریال)</label>
                <input
                  type="number"
                  value={cashTendered || ''}
                  onChange={(e) => setCashTendered(Number(e.target.value))}
                  placeholder={totalPayable.toString()}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                {cashTendered > totalPayable && (
                  <div className="flex items-center justify-between text-xs text-emerald-700 font-bold pt-1">
                    <span>مبلغ بازگشتی (باقی‌پول):</span>
                    <span className="font-mono">{(cashTendered - totalPayable).toLocaleString('fa-IR')} ریال</span>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                onClick={() => setIsPaymentModalOpen(false)}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50"
              >
                انصراف
              </button>
              <button
                onClick={handleFinalizePayment}
                disabled={isProcessingPayment}
                className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-md transition flex items-center gap-2 disabled:opacity-50"
              >
                <Printer className="w-4 h-4" />
                {isProcessingPayment ? 'در حال ثبت و ارسال به پوز...' : 'تایید، ثبت و چاپ فیش'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* پیام فاکتور صادرشده با دکمه چاپ رسید حرارتی */}
      {lastCompletedOrder && (
        <div className="fixed bottom-6 left-6 bg-slate-900 text-white p-4 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-4 z-50 animate-bounce">
          <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center text-white">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold block">
              فاکتور {lastCompletedOrder.orderNumber} با موفقیت تسویه شد!
            </span>
            <span className="text-[11px] text-slate-400 font-mono">
              مبلغ: {lastCompletedOrder.totalPayable.toLocaleString('fa-IR')} ریال
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/pos/receipt"
              target="_blank"
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition"
            >
              <Printer className="w-3.5 h-3.5" />
              چاپ فیش حرارتی
            </Link>
            <button
              onClick={() => setLastCompletedOrder(null)}
              className="text-slate-400 hover:text-white text-xs p-1"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
