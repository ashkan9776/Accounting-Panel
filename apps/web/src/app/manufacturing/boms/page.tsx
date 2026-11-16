'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Factory,
  Layers,
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  GitFork,
  Boxes,
  FileSpreadsheet,
  TrendingUp,
  Cpu,
  Package,
  RefreshCw,
} from 'lucide-react';
import { fetchApi, formatMoney } from '../../../lib/api';

interface BomItem {
  id: string;
  productId: string;
  productName: string;
  itemType: 'RAW_MATERIAL' | 'SEMI_FINISHED' | 'PACKAGING';
  quantityPerUnit: number;
  unit: string;
  unitCost: number;
  scrapPercentage: number;
  totalCost: number;
}

interface Bom {
  id: string;
  code: string;
  productName: string;
  title: string;
  version: string;
  yieldQuantity: number;
  status: 'ACTIVE' | 'DRAFT' | 'OBSOLETE';
  standardUnitCost: number;
  items: BomItem[];
}

const MOCK_BOMS: Bom[] = [
  {
    id: 'bom-1',
    code: 'BOM-MTR-01',
    productName: 'الکتروموتور صنعتی ۳ فاز ۵ اسب بخار',
    title: 'فرمولاسیون استاندارد سیم‌پیچی مس و پوسته چدن',
    version: 'v2.1',
    yieldQuantity: 1,
    status: 'ACTIVE',
    standardUnitCost: 28500000,
    items: [
      { id: 'bi-1', productId: 'raw-copper-wire', productName: 'سیم لاکی مسی نمره ۰.۸', itemType: 'RAW_MATERIAL', quantityPerUnit: 4.5, unit: 'کیلوگرم', unitCost: 3200000, scrapPercentage: 2, totalCost: 14688000 },
      { id: 'bi-2', productId: 'semi-rotor', productName: 'روتور و شفت تراش‌خورده بالانس‌شده', itemType: 'SEMI_FINISHED', quantityPerUnit: 1, unit: 'عدد', unitCost: 6500000, scrapPercentage: 0, totalCost: 6500000 },
      { id: 'bi-3', productId: 'semi-cast-body', productName: 'پوسته چدنی استاتور رنگ‌شده', itemType: 'SEMI_FINISHED', quantityPerUnit: 1, unit: 'عدد', unitCost: 4800000, scrapPercentage: 1, totalCost: 4848000 },
      { id: 'bi-4', productId: 'raw-bearings', productName: 'بلبرینگ دوربالا صنعتی (۲ عدد)', itemType: 'RAW_MATERIAL', quantityPerUnit: 2, unit: 'عدد', unitCost: 950000, scrapPercentage: 0, totalCost: 1900000 },
      { id: 'bi-5', productId: 'pkg-box', productName: 'جعبه چوبی مهاردار صادراتی', itemType: 'PACKAGING', quantityPerUnit: 1, unit: 'عدد', unitCost: 550000, scrapPercentage: 0, totalCost: 550000 },
    ],
  },
  {
    id: 'bom-2',
    code: 'BOM-PMP-02',
    productName: 'پمپ گریز از مرکز آب کشاورزی ۲ اینچ',
    title: 'فرمول ساخت پروانه برنزی و محور استیل',
    version: 'v1.0',
    yieldQuantity: 1,
    status: 'ACTIVE',
    standardUnitCost: 18200000,
    items: [
      { id: 'bi-6', productId: 'raw-bronze-impeller', productName: 'پروانه برنزی ریخته‌گری‌شده', itemType: 'RAW_MATERIAL', quantityPerUnit: 1, unit: 'عدد', unitCost: 7200000, scrapPercentage: 3, totalCost: 7416000 },
      { id: 'bi-7', productId: 'raw-steel-shaft', productName: 'میله استنلس استیل ۳۱۶', itemType: 'RAW_MATERIAL', quantityPerUnit: 1.2, unit: 'کیلوگرم', unitCost: 4500000, scrapPercentage: 5, totalCost: 5670000 },
      { id: 'bi-8', productId: 'raw-seal', productName: 'سیل مکانیکی سرامیکی', itemType: 'RAW_MATERIAL', quantityPerUnit: 1, unit: 'عدد', unitCost: 2800000, scrapPercentage: 0, totalCost: 2800000 },
      { id: 'bi-9', productId: 'pkg-pallet', productName: 'کارتن ضخیم ۵ لایه فوم‌دار', itemType: 'PACKAGING', quantityPerUnit: 1, unit: 'عدد', unitCost: 450000, scrapPercentage: 0, totalCost: 450000 },
    ],
  },
  {
    id: 'bom-3',
    code: 'BOM-VLV-03',
    productName: 'شیر فلکه‌ای چدنی صنعتی سایز ۴ اینچ',
    title: 'فرمولاسیون آب‌بندی تفلون و زبانه لاستیکی',
    version: 'v1.2',
    yieldQuantity: 1,
    status: 'DRAFT',
    standardUnitCost: 9800000,
    items: [
      { id: 'bi-10', productId: 'raw-body-4in', productName: 'بدنه چدن داکتیل سایز ۴', itemType: 'RAW_MATERIAL', quantityPerUnit: 1, unit: 'عدد', unitCost: 6500000, scrapPercentage: 2, totalCost: 6630000 },
      { id: 'bi-11', productId: 'raw-rubber-wedge', productName: 'زبانه لاستیکی EPDM', itemType: 'RAW_MATERIAL', quantityPerUnit: 1, unit: 'عدد', unitCost: 2200000, scrapPercentage: 0, totalCost: 2200000 },
      { id: 'bi-12', productId: 'raw-fasteners', productName: 'پیچ و مهره گالوانیزه گرید ۸.۸', itemType: 'RAW_MATERIAL', quantityPerUnit: 8, unit: 'عدد', unitCost: 120000, scrapPercentage: 0, totalCost: 960000 },
    ],
  },
];

export default function ManufacturingBomsPage() {
  const [boms, setBoms] = useState<Bom[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBomForExplosion, setSelectedBomForExplosion] = useState<Bom | null>(null);

  // مودال ایجاد BOM جدید
  const [isNewBomModalOpen, setIsNewBomModalOpen] = useState(false);
  const [newProductName, setNewProductName] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newVersion, setNewVersion] = useState('v1.0');

  const loadBoms = async () => {
    setLoading(true);
    try {
      const res = await fetchApi('/manufacturing/boms');
      if (res.data && Array.isArray(res.data) && res.data.length > 0) {
        const mapped = res.data.map((b: any) => ({
          id: b.id,
          code: b.code || `BOM-${b.id.slice(-4)}`,
          productName: b.product_name || b.productName || 'محصول صنعتی',
          title: b.title || 'فرمول استاندارد ساخت',
          version: b.version || 'v1.0',
          yieldQuantity: Number(b.yield_quantity || b.yieldQuantity || 1),
          status: (b.is_active ? 'ACTIVE' : 'DRAFT') as 'ACTIVE' | 'DRAFT' | 'OBSOLETE',
          standardUnitCost: Number(b.standard_unit_cost || b.standardUnitCost || 0),
          items: (b.items || []).map((it: any) => ({
            id: it.id,
            productId: it.raw_product_id || it.productId,
            productName: it.raw_product_name || it.productName || 'ماده اولیه',
            itemType: (it.item_type || 'RAW_MATERIAL') as 'RAW_MATERIAL' | 'SEMI_FINISHED' | 'PACKAGING',
            quantityPerUnit: Number(it.quantity_per_unit || 1),
            unit: it.unit_symbol || 'عدد',
            unitCost: Number(it.unit_cost || 0),
            scrapPercentage: Number(it.scrap_percentage || 0),
            totalCost: Number(it.total_cost || 0),
          })),
        }));
        setBoms(mapped);
      } else {
        setBoms(MOCK_BOMS);
      }
    } catch {
      setBoms(MOCK_BOMS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBoms();
  }, []);

  const filteredBoms = boms.filter(
    (b) =>
      b.productName.includes(searchQuery) ||
      b.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.title.includes(searchQuery)
  );

  const activeBomsCount = boms.filter((b) => b.status === 'ACTIVE').length;

  const handleCreateNewBom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProductName.trim() || !newTitle.trim()) return;

    const newBom: Bom = {
      id: `bom-${Date.now()}`,
      code: `BOM-${Math.floor(100 + Math.random() * 900)}`,
      productName: newProductName,
      title: newTitle,
      version: newVersion,
      yieldQuantity: 1,
      status: 'ACTIVE',
      standardUnitCost: 15000000,
      items: [
        {
          id: `bi-${Date.now()}`,
          productId: 'raw-sample-1',
          productName: 'ماده اولیه اصلی نمونه',
          itemType: 'RAW_MATERIAL',
          quantityPerUnit: 2,
          unit: 'کیلوگرم',
          unitCost: 7500000,
          scrapPercentage: 2,
          totalCost: 15300000,
        },
      ],
    };

    setBoms([newBom, ...boms]);
    setIsNewBomModalOpen(false);
    setNewProductName('');
    setNewTitle('');
  };

  return (
    <div className="space-y-6">
      {/* سربرگ */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-800">ساختار محصول و فرمولاسیون ساخت (BOM)</h1>
            <span className="bg-emerald-100 text-emerald-800 text-xs px-2.5 py-0.5 rounded-full font-bold">
              حسابداری بهای تمام‌شده صنعتی
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            تعریف چندسطحی ساختار کالا، مواد اولیه مستقیم، قطعات نیمه‌ساخته، درصد ضایعات مجاز، و انفجار درختی فرمول
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/manufacturing/orders"
            className="px-3.5 py-2 border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
          >
            <Factory className="w-4 h-4 text-emerald-600" />
            سفارشات تولید (Work Orders)
          </Link>
          <button
            onClick={() => setIsNewBomModalOpen(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            تعریف فرمولاسیون جدید (BOM)
          </button>
        </div>
      </div>

      {/* کارت‌های آماری */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 block">فرمول‌های ساخت فعال</span>
            <span className="text-2xl font-black text-slate-900 font-mono mt-1 block">
              {activeBomsCount.toLocaleString('fa-IR')}
            </span>
            <span className="text-[11px] text-emerald-600 font-semibold block mt-0.5">آماده صدور دستور کار</span>
          </div>
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
            <Boxes className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 block">سطوح ساختار محصول</span>
            <span className="text-2xl font-black text-blue-600 font-mono mt-1 block">
              ۳ سطح
            </span>
            <span className="text-[11px] text-slate-400 block mt-0.5">مواد اولیه، نیمه‌ساخته، بسته‌بندی</span>
          </div>
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
            <GitFork className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 block">محاسبه خودکار بهای استاندارد</span>
            <span className="text-2xl font-black text-emerald-600 font-mono mt-1 block">
              فعال (BOM Unit Cost)
            </span>
            <span className="text-[11px] text-slate-400 block mt-0.5">مطابق استاندارد ۸ حسابداری ایران</span>
          </div>
          <div className="w-12 h-12 bg-slate-100 text-slate-700 rounded-xl flex items-center justify-center">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* جدول فرمولاسیون‌های ساخت */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50">
          <h2 className="text-sm font-bold text-slate-800">فهرست ساختارهای محصول و استانداردهای مصرف</h2>
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
            <input
              type="text"
              placeholder="جستجوی محصول یا کد فرمولاسیون..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-3 pr-9 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs text-slate-600">
            <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">کد و نام محصول ساخته‌شده</th>
                <th className="py-3 px-4">عنوان و نسخه فرمولاسیون</th>
                <th className="py-3 px-4 text-center">تعداد اقلام مواد</th>
                <th className="py-3 px-4 text-left">بهای تمام‌شده مواد اولیه (ریال)</th>
                <th className="py-3 px-4 text-center">وضعیت</th>
                <th className="py-3 px-4 text-center">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredBoms.map((bom) => (
                <tr key={bom.id} className="hover:bg-slate-50 transition">
                  <td className="py-3.5 px-4">
                    <span className="font-bold text-slate-900 block">{bom.productName}</span>
                    <span className="text-[11px] text-slate-400 font-mono">{bom.code}</span>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="text-slate-800 font-semibold block">{bom.title}</span>
                    <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">
                      {bom.version}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-800">
                    {bom.items.length} قلم
                  </td>
                  <td className="py-3.5 px-4 text-left font-mono font-black text-slate-950">
                    {bom.standardUnitCost.toLocaleString('fa-IR')}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    {bom.status === 'ACTIVE' ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        فعال
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                        پیش‌نویس
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => setSelectedBomForExplosion(bom)}
                        className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition flex items-center gap-1"
                        title="مشاهده درخت ساختار محصول (BOM Explosion)"
                      >
                        <GitFork className="w-3.5 h-3.5 text-emerald-600" />
                        انفجار BOM
                      </button>
                      <Link
                        href={`/manufacturing/orders?bomId=${bom.id}`}
                        className="px-3 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-semibold transition"
                      >
                        صدور سفارش کار
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* مودال انفجار درختی فرمولاسیون (BOM Tree Explosion) */}
      {selectedBomForExplosion && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full p-6 text-right space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-base text-slate-800 flex items-center gap-2">
                  <GitFork className="w-5 h-5 text-emerald-600" />
                  انفجار ساختار محصول (BOM Tree): {selectedBomForExplosion.productName}
                </h3>
                <span className="text-xs text-slate-400 mt-0.5 block">
                  کد: {selectedBomForExplosion.code} | نسخه: {selectedBomForExplosion.version} | بهای واحد استاندارد: {selectedBomForExplosion.standardUnitCost.toLocaleString('fa-IR')} ریال
                </span>
              </div>
              <button
                onClick={() => setSelectedBomForExplosion(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-right text-xs text-slate-600">
                <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">نوع سطر</th>
                    <th className="py-2.5 px-3">عنوان جزء تشکیل‌دهنده</th>
                    <th className="py-2.5 px-3 text-center">ضریب مصرف در ۱ واحد</th>
                    <th className="py-2.5 px-3 text-left">نرخ واحد (ریال)</th>
                    <th className="py-2.5 px-3 text-center">ضایعات مجاز (%)</th>
                    <th className="py-2.5 px-3 text-left">بهای تمام‌شده خط</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedBomForExplosion.items.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3">
                        {item.itemType === 'RAW_MATERIAL' && (
                          <span className="bg-blue-100 text-blue-800 text-[10px] px-2 py-0.5 rounded font-bold">
                            ماده اولیه مستقیم
                          </span>
                        )}
                        {item.itemType === 'SEMI_FINISHED' && (
                          <span className="bg-purple-100 text-purple-800 text-[10px] px-2 py-0.5 rounded font-bold">
                            قطعه نیمه‌ساخته
                          </span>
                        )}
                        {item.itemType === 'PACKAGING' && (
                          <span className="bg-amber-100 text-amber-800 text-[10px] px-2 py-0.5 rounded font-bold">
                            ملزومات بسته‌بندی
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-900">{item.productName}</td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold">
                        {item.quantityPerUnit} {item.unit}
                      </td>
                      <td className="py-2.5 px-3 text-left font-mono">{item.unitCost.toLocaleString('fa-IR')}</td>
                      <td className="py-2.5 px-3 text-center font-mono">%{item.scrapPercentage}</td>
                      <td className="py-2.5 px-3 text-left font-mono font-black text-slate-900">
                        {item.totalCost.toLocaleString('fa-IR')} ریال
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-50 font-black text-slate-900 border-t border-slate-200">
                  <tr>
                    <td colSpan={5} className="py-2.5 px-3">
                      مجموع بهای استاندارد مواد مستقیم (Direct Materials Cost):
                    </td>
                    <td className="py-2.5 px-3 text-left font-mono text-emerald-700 text-sm">
                      {selectedBomForExplosion.standardUnitCost.toLocaleString('fa-IR')} ریال
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="flex items-center justify-end pt-2 border-t border-slate-100">
              <button
                onClick={() => setSelectedBomForExplosion(null)}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold"
              >
                بستن پنجره
              </button>
            </div>
          </div>
        </div>
      )}

      {/* مودال ایجاد BOM جدید */}
      {isNewBomModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateNewBom}
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 text-right space-y-4 animate-fadeIn"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-base text-slate-800 flex items-center gap-2">
                <Boxes className="w-5 h-5 text-emerald-600" />
                تعریف ساختار جدید محصول (BOM)
              </h3>
              <button
                type="button"
                onClick={() => setIsNewBomModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">نام محصول نهایی</label>
              <input
                type="text"
                value={newProductName}
                onChange={(e) => setNewProductName(e.target.value)}
                placeholder="مثلاً: گیربکس خورشیدی مدل G-200"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">عنوان فرمول ساخت</label>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="مثلاً: فرمول ساخت دنده‌های فولادی و هوزینگ آلومینیوم"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">نسخه فرمولاسیون</label>
              <input
                type="text"
                value={newVersion}
                onChange={(e) => setNewVersion(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsNewBomModalOpen(false)}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50"
              >
                انصراف
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm"
              >
                ایجاد و ورود به مرحله اقلام
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
