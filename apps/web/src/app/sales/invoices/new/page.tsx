'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Trash2,
  Receipt,
  Building,
  Calendar,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  ArrowRight,
  Package,
  Layers,
  Calculator,
} from 'lucide-react';
import Link from 'next/link';
import { fetchApi, formatMoney } from '../../../../lib/api';

interface InvoiceItemRow {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  taxExempt: boolean;
}

export default function NewSalesInvoicePage() {
  const router = useRouter();

  // فیلدهای فاکتور
  const [docNumber, setDocNumber] = useState(`INV-${Date.now().toString().slice(-6)}`);
  const [docDateShamsi, setDocDateShamsi] = useState('1403/08/26');
  const [customerId, setCustomerId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CREDIT'); // نسیه / نقدی
  const [description, setDescription] = useState('فروش کالا موضوع قرارداد تجاری دوره جاری');

  // لیست داده‌های لود شده
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);

  // اقلام فاکتور
  const [items, setItems] = useState<InvoiceItemRow[]>([
    {
      productId: '',
      productName: '',
      quantity: 1,
      unitPrice: 10000000,
      discountAmount: 0,
      taxExempt: false,
    },
  ]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<any>(null);

  // لود مشتریان، کالاها و انبارها
  useEffect(() => {
    async function loadInitialData() {
      try {
        const [partiesRes, prodRes, whRes] = await Promise.all([
          fetchApi('/parties').catch(() => ({ data: [] })),
          fetchApi('/inventory/products').catch(() => ({ data: [] })),
          fetchApi('/inventory/warehouses').catch(() => ({ data: [] })),
        ]);

        const partyList = partiesRes.data || [];
        setCustomers(partyList);
        if (partyList.length > 0) {
          setCustomerId(partyList[0].id);
        }

        const prodList = prodRes.data || [];
        setProducts(prodList);
        if (prodList.length > 0) {
          setItems([
            {
              productId: prodList[0].id,
              productName: prodList[0].name,
              quantity: 2,
              unitPrice: Number(prodList[0].sell_price || 15000000),
              discountAmount: 0,
              taxExempt: Boolean(prodList[0].tax_exempt),
            },
          ]);
        }

        const whList = whRes.data || [];
        setWarehouses(whList);
        if (whList.length > 0) {
          setWarehouseId(whList[0].id);
        }
      } catch (e) {
        console.warn('Failed loading initial options:', e);
      }
    }
    loadInitialData();
  }, []);

  // اضافه کردن سطر جدید
  const addItemRow = () => {
    const defaultProd = products[0];
    setItems([
      ...items,
      {
        productId: defaultProd?.id || '',
        productName: defaultProd?.name || '',
        quantity: 1,
        unitPrice: Number(defaultProd?.sell_price || 10000000),
        discountAmount: 0,
        taxExempt: Boolean(defaultProd?.tax_exempt),
      },
    ]);
  };

  // حذف سطر
  const removeItemRow = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, idx) => idx !== index));
  };

  // تغییر فیلدهای یک سطر
  const updateRow = (index: number, field: keyof InvoiceItemRow, value: any) => {
    const updated = [...items];
    if (field === 'productId') {
      const selected = products.find((p) => p.id === value);
      updated[index].productId = value;
      if (selected) {
        updated[index].productName = selected.name;
        updated[index].unitPrice = Number(selected.sell_price || 10000000);
        updated[index].taxExempt = Boolean(selected.tax_exempt);
      }
    } else {
      (updated[index] as any)[field] = value;
    }
    setItems(updated);
  };

  // محاسبات تجمیعی ارزش افزوده ۱۰٪ و مبالغ
  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const totalDiscount = items.reduce((sum, item) => sum + Number(item.discountAmount || 0), 0);
  const taxableBase = Math.max(0, subtotal - totalDiscount);
  // ۱۰٪ ارزش افزوده برای اقلام غیرمعاف
  const totalTax = items.reduce((sum, item) => {
    if (item.taxExempt) return sum;
    const rowNet = Math.max(0, item.quantity * item.unitPrice - Number(item.discountAmount || 0));
    return sum + Math.round(rowNet * 0.1);
  }, 0);
  const grandTotal = taxableBase + totalTax;

  // ثبت و صدور فاکتور
  const handleSaveInvoice = async () => {
    setError(null);
    if (!customerId && customers.length > 0) {
      setError('لطفاً خریدار / طرف‌حساب را انتخاب کنید.');
      return;
    }

    if (items.some((it) => !it.productId || it.quantity <= 0)) {
      setError('تمامی سطرها باید کالا و تعداد معتبر داشته باشند.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        documentNumber: docNumber,
        dateShamsi: docDateShamsi,
        customerPartyId: customerId || customers[0]?.id || 'party-customer-1',
        warehouseId: warehouseId || warehouses[0]?.id,
        paymentMethod,
        description,
        items: items.map((it) => ({
          productId: it.productId,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          discountAmount: it.discountAmount,
          taxExempt: it.taxExempt,
        })),
      };

      const res = await fetchApi('/sales', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (res.data) {
        setSuccessResult(res.data);
      } else {
        setError(res.message || 'خطا در صدور فاکتور فروش.');
      }
    } catch (err: any) {
      setError(err.message || 'خطا در ثبت فاکتور.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* هدر صفحه */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <Receipt className="w-6 h-6 text-emerald-600" />
            <span>صدور فاکتور فروش کالا و خدمات</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            محاسبه خودکار ۱۰٪ مالیات بر ارزش افزوده، کسر از کاردکس انبار و صدور سند اتوماتیک دوبل
          </p>
        </div>

        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-xs text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3 py-2 rounded-xl transition-colors shadow-xs"
        >
          <ArrowRight className="w-4 h-4" />
          <span>بازگشت به داشبورد</span>
        </Link>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* نتیجه صدور فاکتور و ایجاد سند دوبل */}
      {successResult && (
        <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs space-y-3">
          <div className="flex items-center gap-2 font-bold text-sm text-emerald-800">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>فاکتور فروش با موفقیت در سیستم صادر و قطعی شد!</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white/80 p-3.5 rounded-xl border border-emerald-100">
            <div>
              <span className="text-slate-500 block text-[11px]">شناسه فاکتور فروش:</span>
              <span className="font-mono font-bold text-slate-800">{successResult.invoiceId || successResult.id}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">سند دوبل خودکار تولیدشده:</span>
              <span className="font-mono font-bold text-emerald-700">{successResult.journalEntryId || 'سند دوبل تراز صادر شد'}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">کاردکس انبار:</span>
              <span className="font-semibold text-blue-700">کسر حواله خروج انبار انجام شد</span>
            </div>
          </div>

          <div className="pt-2 flex gap-3">
            <Link
              href="/accounting/vouchers"
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold flex items-center gap-1.5 transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>مشاهده سند دوبل در دفتر روزنامه</span>
            </Link>
            <button
              onClick={() => {
                setSuccessResult(null);
                setDocNumber(`INV-${Date.now().toString().slice(-6)}`);
              }}
              className="px-4 py-2 bg-white text-emerald-800 border border-emerald-300 rounded-lg font-medium hover:bg-emerald-50 transition-colors"
            >
              صدور فاکتور جدید دیگر
            </button>
          </div>
        </div>
      )}

      {/* مشخصات سربرگ فاکتور */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-4">
        <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
          <Building className="w-4 h-4 text-slate-500" />
          <span>مشخصات سربرگ و خریدار</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div>
            <label className="block text-slate-600 font-semibold mb-1">شماره فاکتور</label>
            <input
              type="text"
              value={docNumber}
              onChange={(e) => setDocNumber(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-mono text-left focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-slate-600 font-semibold mb-1">تاریخ صدور (شمسی)</label>
            <input
              type="text"
              value={docDateShamsi}
              onChange={(e) => setDocDateShamsi(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-mono text-left focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-slate-600 font-semibold mb-1">خریدار / طرف‌حساب *</label>
            <select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
            >
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.national_id ? `(${c.national_id})` : ''}
                </option>
              ))}
              {customers.length === 0 && (
                <option value="party-customer-1">مشتری عمومی پیش‌فرض</option>
              )}
            </select>
          </div>

          <div>
            <label className="block text-slate-600 font-semibold mb-1">نحوه تسویه</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
            >
              <option value="CREDIT">نسیه (حساب‌های دریافتنی تجاری)</option>
              <option value="CASH">نقدی (صندوق و بانک)</option>
              <option value="POS">دستگاه کارتخوان (POS)</option>
            </select>
          </div>
        </div>
      </div>

      {/* جدول اقلام فاکتور */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <Package className="w-4 h-4 text-emerald-600" />
            <span>ردیف‌های کالا و خدمات</span>
          </h2>
          <button
            type="button"
            onClick={addItemRow}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>افزودن سطر کالا</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-100 text-slate-600 border-b border-slate-200 font-bold">
              <tr>
                <th className="py-2.5 px-3 w-12 text-center">ردیف</th>
                <th className="py-2.5 px-3 min-w-[200px]">شرح کالا یا خدمت</th>
                <th className="py-2.5 px-3 w-24 text-center">تعداد / مقدار</th>
                <th className="py-2.5 px-3 w-36 text-left">فی واحد (ریال)</th>
                <th className="py-2.5 px-3 w-28 text-left">تخفیف (ریال)</th>
                <th className="py-2.5 px-3 w-24 text-center">معاف از مالیات</th>
                <th className="py-2.5 px-3 w-32 text-left">ارزش افزوده (۱۰٪)</th>
                <th className="py-2.5 px-3 w-36 text-left">مبلغ کل سطر (ریال)</th>
                <th className="py-2.5 px-3 w-12 text-center">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((row, idx) => {
                const rowSub = row.quantity * row.unitPrice;
                const rowNet = Math.max(0, rowSub - Number(row.discountAmount || 0));
                const rowVat = row.taxExempt ? 0 : Math.round(rowNet * 0.1);
                const rowTotal = rowNet + rowVat;

                return (
                  <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3 text-center text-slate-400 font-mono font-medium">
                      {idx + 1}
                    </td>
                    <td className="py-2.5 px-3">
                      <select
                        value={row.productId}
                        onChange={(e) => updateRow(idx, 'productId', e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
                      >
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.code} - {p.name}
                          </option>
                        ))}
                        {products.length === 0 && (
                          <option value="prod-1">کالای بازرگانی نمونه (سایز استاندارد)</option>
                        )}
                      </select>
                    </td>
                    <td className="py-2.5 px-3">
                      <input
                        type="number"
                        min="1"
                        value={row.quantity}
                        onChange={(e) => updateRow(idx, 'quantity', Number(e.target.value))}
                        className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-center font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </td>
                    <td className="py-2.5 px-3">
                      <input
                        type="number"
                        value={row.unitPrice}
                        onChange={(e) => updateRow(idx, 'unitPrice', Number(e.target.value))}
                        className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-left font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </td>
                    <td className="py-2.5 px-3">
                      <input
                        type="number"
                        value={row.discountAmount}
                        onChange={(e) => updateRow(idx, 'discountAmount', Number(e.target.value))}
                        className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-left font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <input
                        type="checkbox"
                        checked={row.taxExempt}
                        onChange={(e) => updateRow(idx, 'taxExempt', e.target.checked)}
                        className="w-4 h-4 text-emerald-600 rounded-sm focus:ring-0 cursor-pointer"
                      />
                    </td>
                    <td className="py-2.5 px-3 text-left font-mono font-medium text-slate-700">
                      {formatMoney(rowVat)}
                    </td>
                    <td className="py-2.5 px-3 text-left font-mono font-bold text-slate-900">
                      {formatMoney(rowTotal)}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => removeItemRow(idx)}
                        disabled={items.length <= 1}
                        className="p-1 text-slate-400 hover:text-rose-600 disabled:opacity-30 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* جمع‌بندی مالی و تایید نهایی */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-3">
          <label className="block text-xs font-bold text-slate-700">توضیحات و شرح فاکتور</label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
            placeholder="شرح تکمیلی جهت درج در متن سند حسابداری..."
          />
        </div>

        {/* فاکتور و سرجمع مبالغ */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-2.5 text-xs">
          <div className="flex justify-between py-1 text-slate-600">
            <span>جمع ناخالص اقلام:</span>
            <span className="font-mono">{formatMoney(subtotal)} ریال</span>
          </div>
          <div className="flex justify-between py-1 text-slate-600">
            <span>مجموع تخفیفات:</span>
            <span className="font-mono text-rose-600">({formatMoney(totalDiscount)}) ریال</span>
          </div>
          <div className="flex justify-between py-1 text-slate-600 border-t border-slate-100 pt-2">
            <span>مبلغ مشمول ارزش افزوده:</span>
            <span className="font-mono font-bold text-slate-800">{formatMoney(taxableBase)} ریال</span>
          </div>
          <div className="flex justify-between py-1 text-emerald-800 font-semibold">
            <span>مالیات و عوارض ارزش افزوده (۱۰٪ قانونی):</span>
            <span className="font-mono">{formatMoney(totalTax)} ریال</span>
          </div>
          <div className="flex justify-between py-2 border-t-2 border-slate-200 text-sm font-black text-slate-900">
            <span>مبلغ نهایی و قابل دریافت فاکتور:</span>
            <span className="font-mono text-emerald-700 text-base">{formatMoney(grandTotal)} ریال</span>
          </div>

          <div className="pt-3">
            <button
              type="button"
              disabled={loading}
              onClick={handleSaveInvoice}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/30 transition-all disabled:opacity-50"
            >
              {loading ? (
                <span>در حال صدور فاکتور و ثبت سند دوبل...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>تایید، صدور فاکتور و ثبت خودکار سند دوبل</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
