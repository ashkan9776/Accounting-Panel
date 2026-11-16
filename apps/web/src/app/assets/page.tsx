'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Landmark,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Trash2,
  DollarSign,
  TrendingDown,
  Building,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Eye,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';

interface FixedAssetItem {
  id: string;
  assetCode: string;
  title: string;
  category: 'FURNITURE_OFFICE' | 'VEHICLES' | 'MACHINERY_TECHNICAL';
  purchaseDateShamsi: string;
  historicalCost: number;
  salvageValue: number;
  depreciationMethod: 'STRAIGHT_LINE' | 'DECLINING_BALANCE';
  usefulLifeYears?: number;
  annualRatePercentage?: number;
  accumulatedDepreciation: number;
  bookValue: number;
  location: string;
  keeperName: string;
  status: 'ACTIVE' | 'DEPRECIATED' | 'SOLD' | 'SCRAPPED';
}

const INITIAL_ASSETS: FixedAssetItem[] = [
  {
    id: 'asset-1',
    assetCode: 'FA-1403-M01',
    title: 'دستگاه تراش CNC صنعتی ۴ محور Haas',
    category: 'MACHINERY_TECHNICAL',
    purchaseDateShamsi: '1401/02/15',
    historicalCost: 1500000000,
    salvageValue: 150000000,
    depreciationMethod: 'STRAIGHT_LINE',
    usefulLifeYears: 10,
    accumulatedDepreciation: 315000000,
    bookValue: 1185000000,
    location: 'کارخانه - سالن ماشین‌کاری شماره ۱',
    keeperName: 'کامران کریمی',
    status: 'ACTIVE',
  },
  {
    id: 'asset-2',
    assetCode: 'FA-1403-V01',
    title: 'وانت پراید ۱۵۱ مسقف (پخش و توزیع)',
    category: 'VEHICLES',
    purchaseDateShamsi: '1402/05/10',
    historicalCost: 320000000,
    salvageValue: 32000000,
    depreciationMethod: 'DECLINING_BALANCE',
    annualRatePercentage: 25,
    accumulatedDepreciation: 108000000,
    bookValue: 212000000,
    location: 'پارکینگ مرکزی شرکت',
    keeperName: 'علی رضایی',
    status: 'ACTIVE',
  },
  {
    id: 'asset-3',
    assetCode: 'FA-1403-F01',
    title: 'سرور محاسباتی HPE ProLiant DL380 G10',
    category: 'FURNITURE_OFFICE',
    purchaseDateShamsi: '1402/10/01',
    historicalCost: 450000000,
    salvageValue: 0,
    depreciationMethod: 'STRAIGHT_LINE',
    usefulLifeYears: 5,
    accumulatedDepreciation: 90000000,
    bookValue: 360000000,
    location: 'اتاق سرور مرکزی ساختمان اداری',
    keeperName: 'مهدی محمدی',
    status: 'ACTIVE',
  },
];

export default function FixedAssetsPage() {
  const [assets, setAssets] = useState<FixedAssetItem[]>(INITIAL_ASSETS);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [showAddModal, setShowAddModal] = useState(false);
  const [disposalAsset, setDisposalAsset] = useState<FixedAssetItem | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // فرم ثبت دارایی جدید
  const [code, setCode] = useState('FA-1403-M02');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<'FURNITURE_OFFICE' | 'VEHICLES' | 'MACHINERY_TECHNICAL'>('MACHINERY_TECHNICAL');
  const [pDate, setPDate] = useState('1403/08/01');
  const [cost, setCost] = useState('200000000');
  const [salvage, setSalvage] = useState('20000000');
  const [method, setMethod] = useState<'STRAIGHT_LINE' | 'DECLINING_BALANCE'>('STRAIGHT_LINE');
  const [lifeYears, setLifeYears] = useState(5);
  const [ratePct, setRatePct] = useState(20);
  const [loc, setLoc] = useState('انبار مرکزی');
  const [keeper, setKeeper] = useState('مهدی محمدی');

  // فرم واگذاری یا اسقاط
  const [salePrice, setSalePrice] = useState('1200000000');
  const [disposalDate, setDisposalDate] = useState('1403/08/30');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleCreateAsset = (e: React.FormEvent) => {
    e.preventDefault();
    const newCost = Number(cost);
    const newSalvage = Number(salvage);
    const newAsset: FixedAssetItem = {
      id: `asset-${Date.now()}`,
      assetCode: code,
      title: title,
      category: category,
      purchaseDateShamsi: pDate,
      historicalCost: newCost,
      salvageValue: newSalvage,
      depreciationMethod: method,
      usefulLifeYears: method === 'STRAIGHT_LINE' ? lifeYears : undefined,
      annualRatePercentage: method === 'DECLINING_BALANCE' ? ratePct : undefined,
      accumulatedDepreciation: 0,
      bookValue: newCost,
      location: loc,
      keeperName: keeper,
      status: 'ACTIVE',
    };

    setAssets([newAsset, ...assets]);
    setShowAddModal(false);
    showToast(`دارایی جدید با پلاک «${code}» با بهای دفتری ثبت گردید.`);
    setTitle('');
  };

  const handleDisposeAsset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!disposalAsset) return;

    const sPrice = Number(salePrice);
    const bValue = disposalAsset.bookValue;
    const gainOrLoss = sPrice - bValue;
    const isGain = gainOrLoss >= 0;

    setAssets((prev) =>
      prev.map((a) =>
        a.id === disposalAsset.id
          ? { ...a, status: sPrice > 0 ? 'SOLD' : 'SCRAPPED', bookValue: 0 }
          : a
      )
    );

    const resultMsg = isGain
      ? `دارایی با شناسایی سود واگذاری به مبلغ ${Math.abs(gainOrLoss).toLocaleString('fa-IR')} ریال ثبت شد.`
      : `دارایی با شناسایی زیان واگذاری به مبلغ ${Math.abs(gainOrLoss).toLocaleString('fa-IR')} ریال ثبت شد.`;

    setDisposalAsset(null);
    showToast(resultMsg);
  };

  const totalHistoricalCost = assets.reduce((sum, a) => sum + a.historicalCost, 0);
  const totalAccumulatedDep = assets.reduce((sum, a) => sum + a.accumulatedDepreciation, 0);
  const totalBookValue = assets.reduce((sum, a) => sum + a.bookValue, 0);

  const filteredAssets = assets.filter((a) => {
    const matchesSearch =
      a.title.includes(searchQuery) ||
      a.assetCode.includes(searchQuery) ||
      a.location.includes(searchQuery) ||
      a.keeperName.includes(searchQuery);
    const matchesCat = selectedCategory === 'ALL' || a.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const renderCategoryBadge = (cat: FixedAssetItem['category']) => {
    switch (cat) {
      case 'MACHINERY_TECHNICAL':
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-100 text-blue-800 border border-blue-200">ماشین‌آلات و تجهیزات</span>;
      case 'VEHICLES':
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-purple-100 text-purple-800 border border-purple-200">وسایط نقلیه</span>;
      case 'FURNITURE_OFFICE':
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">اثاثه و IT</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 left-5 z-50 bg-emerald-700 text-white px-5 py-3 rounded-lg shadow-xl flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-emerald-200" />
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2.5">
            <Landmark className="w-7 h-7 text-emerald-600" />
            اموال و دارایی‌های ثابت (Fixed Assets)
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            پلاک‌کوبی، کدگذاری اموال، ردیابی ارزش دفتری و محاسبه خودکار استهلاک طبق ماده ۱۴۹ قانون مالیات‌های مستقیم
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/assets/depreciation"
            className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold px-4 py-2.5 rounded-lg transition-colors border border-slate-200"
          >
            <TrendingDown className="w-4 h-4 text-slate-600" />
            کارتابل محاسبه استهلاک دوره
          </Link>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2.5 rounded-lg transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            پلاک‌کوبی دارایی جدید
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500 block mb-1">بهای تمام‌شده تاریخی اموال</span>
            <span className="text-xl font-bold text-slate-800">
              {totalHistoricalCost.toLocaleString('fa-IR')} <span className="text-xs font-normal text-slate-500">ریال</span>
            </span>
          </div>
          <div className="w-11 h-11 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500 block mb-1">استهلاک انباشته دوره‌ها</span>
            <span className="text-xl font-bold text-rose-600">
              {totalAccumulatedDep.toLocaleString('fa-IR')} <span className="text-xs font-normal text-slate-500">ریال</span>
            </span>
          </div>
          <div className="w-11 h-11 bg-rose-50 text-rose-600 rounded-lg flex items-center justify-center">
            <TrendingDown className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500 block mb-1">ارزش دفتری خالص فعلی</span>
            <span className="text-xl font-bold text-emerald-600">
              {totalBookValue.toLocaleString('fa-IR')} <span className="text-xs font-normal text-slate-500">ریال</span>
            </span>
          </div>
          <div className="w-11 h-11 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center">
            <Landmark className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500 block mb-1">تعداد اموال در بهره‌برداری</span>
            <span className="text-xl font-bold text-slate-800">
              {assets.filter((a) => a.status === 'ACTIVE').length} <span className="text-xs font-normal text-slate-500">پلاک</span>
            </span>
          </div>
          <div className="w-11 h-11 bg-purple-50 text-purple-600 rounded-lg flex items-center justify-center">
            <Layers className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="جستجو با پلاک، شرح دارایی، تحویل‌گیرنده..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs pl-3 pr-9 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-xs text-slate-500">طبقه دارایی:</span>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="text-xs p-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
          >
            <option value="ALL">همه طبقات اموال</option>
            <option value="MACHINERY_TECHNICAL">ماشین‌آلات و تجهیزات فنی</option>
            <option value="VEHICLES">وسایط نقلیه</option>
            <option value="FURNITURE_OFFICE">اثاثه و تجهیزات اداری و کامپیوتری</option>
          </select>
        </div>
      </div>

      {/* Asset Register Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold">
              <tr>
                <th className="py-3 px-4">کد پلاک اموال</th>
                <th className="py-3 px-4">شرح و نام دارایی</th>
                <th className="py-3 px-3">طبقه دارایی</th>
                <th className="py-3 px-3">تاریخ تحصیل</th>
                <th className="py-3 px-3">بهای تمام‌شده (ریال)</th>
                <th className="py-3 px-3">روش استهلاک</th>
                <th className="py-3 px-3">استهلاک انباشته</th>
                <th className="py-3 px-3 font-bold text-emerald-800">ارزش دفتری</th>
                <th className="py-3 px-3">تحویل‌گیرنده</th>
                <th className="py-3 px-3 text-center">وضعیت</th>
                <th className="py-3 px-3 text-center">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAssets.map((asset) => (
                <tr key={asset.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-4 font-mono font-bold text-slate-700 bg-slate-50/50">
                    {asset.assetCode}
                  </td>
                  <td className="py-3.5 px-4 font-bold text-slate-800">
                    <div>{asset.title}</div>
                    <div className="text-[11px] text-slate-400 font-normal">{asset.location}</div>
                  </td>
                  <td className="py-3.5 px-3">{renderCategoryBadge(asset.category)}</td>
                  <td className="py-3.5 px-3 font-mono text-slate-600">{asset.purchaseDateShamsi}</td>
                  <td className="py-3.5 px-3 font-mono text-slate-800 font-medium">
                    {asset.historicalCost.toLocaleString('fa-IR')}
                  </td>
                  <td className="py-3.5 px-3 text-slate-600">
                    {asset.depreciationMethod === 'STRAIGHT_LINE' ? (
                      <span title="ماده ۱۴۹ ق.م.م - خط مستقیم">خط مستقیم ({asset.usefulLifeYears} سال)</span>
                    ) : (
                      <span title="ماده ۱۴۹ ق.م.م - مانده نزولی">مانده نزولی ({asset.annualRatePercentage}٪)</span>
                    )}
                  </td>
                  <td className="py-3.5 px-3 font-mono text-rose-600">
                    {asset.accumulatedDepreciation.toLocaleString('fa-IR')}
                  </td>
                  <td className="py-3.5 px-3 font-mono font-bold text-emerald-600">
                    {asset.bookValue.toLocaleString('fa-IR')}
                  </td>
                  <td className="py-3.5 px-3 text-slate-700">{asset.keeperName}</td>
                  <td className="py-3.5 px-3 text-center">
                    {asset.status === 'ACTIVE' && (
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        فعال
                      </span>
                    )}
                    {asset.status === 'SOLD' && (
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-100 text-blue-800 border border-blue-200">
                        فروخته شده
                      </span>
                    )}
                    {asset.status === 'SCRAPPED' && (
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-300">
                        اسقاط شده
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-3 text-center">
                    {asset.status === 'ACTIVE' ? (
                      <button
                        onClick={() => {
                          setDisposalAsset(asset);
                          setSalePrice(asset.bookValue.toString());
                        }}
                        className="px-2.5 py-1 text-[11px] font-medium bg-rose-50 text-rose-700 hover:bg-rose-100 rounded border border-rose-200 transition-colors"
                      >
                        اسقاط / واگذاری
                      </button>
                    ) : (
                      <span className="text-[11px] text-slate-400">واگذار شده</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: ثبت دارایی جدید */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl max-w-xl w-full p-6 space-y-4 my-8">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <Landmark className="w-5 h-5 text-emerald-600" />
              پلاک‌کوبی و ثبت دارایی ثابت در دفاتر مالی
            </h2>

            <form onSubmit={handleCreateAsset} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">کد پلاک اموال</label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full text-xs p-2.5 border rounded-lg font-mono focus:ring-2 focus:ring-emerald-500 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">طبقه دارایی ثابت</label>
                  <select
                    value={category}
                    onChange={(e: any) => setCategory(e.target.value)}
                    className="w-full text-xs p-2.5 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                  >
                    <option value="MACHINERY_TECHNICAL">ماشین‌آلات و تجهیزات تولیدی</option>
                    <option value="VEHICLES">وسایط نقلیه</option>
                    <option value="FURNITURE_OFFICE">اثاثه و تجهیزات اداری و کامپیوتر</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">شرح کامل دارایی</label>
                <input
                  type="text"
                  value={title}
                  placeholder="مثال: دستگاه تراش CNC صنعتی ۴ محور Haas"
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full text-xs p-2.5 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">تاریخ تحصیل شمسی</label>
                  <input
                    type="text"
                    value={pDate}
                    onChange={(e) => setPDate(e.target.value)}
                    className="w-full text-xs p-2.5 border rounded-lg font-mono focus:ring-2 focus:ring-emerald-500 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">بهای تمام‌شده خرید (ریال)</label>
                  <input
                    type="text"
                    value={cost}
                    onChange={(e) => setCost(e.target.value)}
                    className="w-full text-xs p-2.5 border rounded-lg font-mono focus:ring-2 focus:ring-emerald-500 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">ارزش اسقاط برآوردی (ریال)</label>
                  <input
                    type="text"
                    value={salvage}
                    onChange={(e) => setSalvage(e.target.value)}
                    className="w-full text-xs p-2.5 border rounded-lg font-mono focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-lg border space-y-3">
                <span className="text-xs font-bold text-slate-700 block">روش استهلاک طبق ماده ۱۴۹ قانون مالیات‌های مستقیم:</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">روش محاسبه</label>
                    <select
                      value={method}
                      onChange={(e: any) => setMethod(e.target.value)}
                      className="w-full text-xs p-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                    >
                      <option value="STRAIGHT_LINE">روش خط مستقیم (Straight-Line)</option>
                      <option value="DECLINING_BALANCE">روش مانده نزولی (Declining-Balance)</option>
                    </select>
                  </div>

                  {method === 'STRAIGHT_LINE' ? (
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">عمر مفید بر حسب سال</label>
                      <input
                        type="number"
                        min={1}
                        max={50}
                        value={lifeYears}
                        onChange={(e) => setLifeYears(Number(e.target.value))}
                        className="w-full text-xs p-2 border rounded-lg font-mono focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">نرخ استهلاک سالانه (درصد)</label>
                      <input
                        type="number"
                        min={1}
                        max={100}
                        value={ratePct}
                        onChange={(e) => setRatePct(Number(e.target.value))}
                        className="w-full text-xs p-2 border rounded-lg font-mono focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">محل استقرار فیزیکی</label>
                  <input
                    type="text"
                    value={loc}
                    onChange={(e) => setLoc(e.target.value)}
                    className="w-full text-xs p-2.5 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">پرسنل تحویل‌گیرنده / امین اموال</label>
                  <input
                    type="text"
                    value={keeper}
                    onChange={(e) => setKeeper(e.target.value)}
                    className="w-full text-xs p-2.5 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  ثبت دارایی و صدور پلاک
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: اسقاط یا فروش دارایی */}
      {disposalAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2 text-rose-700">
              <AlertCircle className="w-5 h-5 text-rose-600" />
              واگذاری یا اسقاط دارایی: {disposalAsset.title}
            </h2>

            <div className="bg-slate-50 p-3 rounded-lg border text-xs space-y-1">
              <div>پلاک اموال: <strong className="font-mono">{disposalAsset.assetCode}</strong></div>
              <div>بهای تمام‌شده تاریخی: <strong className="font-mono">{disposalAsset.historicalCost.toLocaleString('fa-IR')} ریال</strong></div>
              <div>استهلاک انباشته تا تاریخ واگذاری: <strong className="font-mono text-rose-600">{disposalAsset.accumulatedDepreciation.toLocaleString('fa-IR')} ریال</strong></div>
              <div>ارزش دفتری فعلی: <strong className="font-mono text-emerald-700">{disposalAsset.bookValue.toLocaleString('fa-IR')} ریال</strong></div>
            </div>

            <form onSubmit={handleDisposeAsset} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">تاریخ واگذاری / اسقاط</label>
                <input
                  type="text"
                  value={disposalDate}
                  onChange={(e) => setDisposalDate(e.target.value)}
                  className="w-full text-xs p-2.5 border rounded-lg font-mono focus:ring-2 focus:ring-rose-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">مبلغ فروش واگذاری (ریال - در صورت اسقاط صفر وارد کنید)</label>
                <input
                  type="text"
                  value={salePrice}
                  onChange={(e) => setSalePrice(e.target.value)}
                  className="w-full text-xs p-2.5 border rounded-lg font-mono focus:ring-2 focus:ring-rose-500 outline-none"
                  required
                />
              </div>

              {Number(salePrice) > disposalAsset.bookValue ? (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center gap-2">
                  <ArrowUpRight className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>
                    سود ناشی از واگذاری دارایی: <strong>{(Number(salePrice) - disposalAsset.bookValue).toLocaleString('fa-IR')} ریال</strong> (بستانکار حساب سایر درآمدهای غیرعملیاتی)
                  </span>
                </div>
              ) : (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-center gap-2">
                  <ArrowDownRight className="w-5 h-5 text-amber-600 shrink-0" />
                  <span>
                    زیان ناشی از واگذاری دارایی: <strong>{(disposalAsset.bookValue - Number(salePrice)).toLocaleString('fa-IR')} ریال</strong> (بدهکار حساب سایر هزینه‌های غیرعملیاتی)
                  </span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setDisposalAsset(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors"
                >
                  تایید واگذاری و صدور سند دوبل
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
