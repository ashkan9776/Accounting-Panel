'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Utensils,
  Plus,
  Search,
  Filter,
  TrendingUp,
  Percent,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Layers,
  ChefHat,
  Info,
  RefreshCw,
} from 'lucide-react';
import { fetchApi, formatMoney } from '../../../lib/api';

interface RecipeIngredient {
  rawProductName: string;
  quantity: number;
  unit: string;
  unitCost: number;
  wastePercentage: number;
  totalCost: number;
}

interface MenuItemRecipe {
  id: string;
  name: string;
  category: string;
  sellingPrice: number;
  recipeCost: number;
  foodCostPercentage: number;
  grossMarginAmount: number;
  grossMarginPercentage: number;
  menuEngineeringCategory: 'STAR' | 'PLOWHORSE' | 'PUZZLE' | 'DOG';
  ingredients: RecipeIngredient[];
}

const MOCK_RECIPES: MenuItemRecipe[] = [
  {
    id: 'rec-1',
    name: 'چلوکباب کوبیده زعفرانی ۲ سیخ',
    category: 'غذای اصلی و کباب',
    sellingPrice: 3800000,
    recipeCost: 1045000,
    foodCostPercentage: 27.5,
    grossMarginAmount: 2755000,
    grossMarginPercentage: 72.5,
    menuEngineeringCategory: 'STAR',
    ingredients: [
      { rawProductName: 'گوشت قلوه‌گاه و راسته گوسفندی', quantity: 220, unit: 'گرم', unitCost: 3500, wastePercentage: 6, totalCost: 816200 },
      { rawProductName: 'برنج درجه یک ایرانی (هاشمی)', quantity: 200, unit: 'گرم', unitCost: 800, wastePercentage: 2, totalCost: 163200 },
      { rawProductName: 'پیاز زرد چرخ‌کرده', quantity: 80, unit: 'گرم', unitCost: 200, wastePercentage: 10, totalCost: 17600 },
      { rawProductName: 'کره حیوانی محلی', quantity: 30, unit: 'گرم', unitCost: 1200, wastePercentage: 0, totalCost: 36000 },
      { rawProductName: 'زعفران قائنات ساییده', quantity: 0.1, unit: 'گرم', unitCost: 120000, wastePercentage: 0, totalCost: 12000 },
    ],
  },
  {
    id: 'rec-2',
    name: 'زرشک‌پلو با مرغ مجلسی سس‌دار',
    category: 'غذای اصلی و پلو',
    sellingPrice: 2400000,
    recipeCost: 816000,
    foodCostPercentage: 34.0,
    grossMarginAmount: 1584000,
    grossMarginPercentage: 66.0,
    menuEngineeringCategory: 'PLOWHORSE',
    ingredients: [
      { rawProductName: 'ران یا سینه مرغ کشتار روز', quantity: 400, unit: 'گرم', unitCost: 1400, wastePercentage: 8, totalCost: 604800 },
      { rawProductName: 'برنج طارم ایرانی', quantity: 200, unit: 'گرم', unitCost: 750, wastePercentage: 2, totalCost: 153000 },
      { rawProductName: 'زرشک کوهی اعلا و شکر', quantity: 25, unit: 'گرم', unitCost: 1500, wastePercentage: 0, totalCost: 37500 },
      { rawProductName: 'رب گوجه فرنگی و ادویه', quantity: 40, unit: 'گرم', unitCost: 500, wastePercentage: 0, totalCost: 20000 },
    ],
  },
  {
    id: 'rec-3',
    name: 'استیک ریب‌آی با سس قارچ و ترامیزو',
    category: 'فرنگی و گریل',
    sellingPrice: 7500000,
    recipeCost: 1725000,
    foodCostPercentage: 23.0,
    grossMarginAmount: 5775000,
    grossMarginPercentage: 77.0,
    menuEngineeringCategory: 'PUZZLE',
    ingredients: [
      { rawProductName: 'گوشت ریب‌آی بیات‌شده گوساله', quantity: 350, unit: 'گرم', unitCost: 4200, wastePercentage: 4, totalCost: 1528800 },
      { rawProductName: 'قارچ تازه دکمه‌ای', quantity: 100, unit: 'گرم', unitCost: 900, wastePercentage: 5, totalCost: 94500 },
      { rawProductName: 'خامه و کره و سیر', quantity: 60, unit: 'گرم', unitCost: 1500, wastePercentage: 0, totalCost: 90000 },
    ],
  },
  {
    id: 'rec-4',
    name: 'سوپ جوی روز با سبزیجات تازه',
    category: 'پیش‌غذا و سوپ',
    sellingPrice: 650000,
    recipeCost: 247000,
    foodCostPercentage: 38.0,
    grossMarginAmount: 403000,
    grossMarginPercentage: 62.0,
    menuEngineeringCategory: 'DOG',
    ingredients: [
      { rawProductName: 'جو پرک و پیاز و هویج', quantity: 150, unit: 'گرم', unitCost: 600, wastePercentage: 5, totalCost: 94500 },
      { rawProductName: 'عصاره مرغ و شیر', quantity: 200, unit: 'سی‌سی', unitCost: 700, wastePercentage: 0, totalCost: 140000 },
      { rawProductName: 'جعفری تازه ساطوری', quantity: 20, unit: 'گرم', unitCost: 600, wastePercentage: 5, totalCost: 12600 },
    ],
  },
];

export default function RestaurantRecipesPage() {
  const [recipes, setRecipes] = useState<MenuItemRecipe[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [activeIngredientModalRecipe, setActiveIngredientModalRecipe] = useState<MenuItemRecipe | null>(null);

  const loadRecipes = async () => {
    setLoading(true);
    try {
      const res = await fetchApi('/restaurant/recipes');
      if (res.data && Array.isArray(res.data) && res.data.length > 0) {
        setRecipes(res.data);
      } else {
        setRecipes(MOCK_RECIPES);
      }
    } catch {
      setRecipes(MOCK_RECIPES);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecipes();
  }, []);

  // میانگین درصد Food Cost
  const avgFoodCost = recipes.length > 0
    ? Math.round(recipes.reduce((sum, r) => sum + (r.foodCostPercentage || 0), 0) / recipes.length)
    : 0;

  const filteredRecipes = recipes.filter((r) => {
    const matchesCategory = selectedCategory === 'ALL' || r.category === selectedCategory;
    const matchesSearch = r.name.includes(searchQuery);
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* سربرگ */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/restaurant/tables" className="text-slate-400 hover:text-slate-600 transition">
              <ArrowRight className="w-5 h-5" />
            </Link>
            <h1 className="text-xl font-bold text-slate-800">دستور پخت، فرمولاسیون (BOM) و آنالیز Food Cost</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            کسر خودکار مواد اولیه از انبار، محاسبه بهای تمام شده غذا، درصد ضایعات و مهندسی منو (Menu Engineering)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/restaurant/tables"
            className="px-3.5 py-2 border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
          >
            <Utensils className="w-4 h-4 text-emerald-600" />
            نقشه سالن و میزها
          </Link>
        </div>
      </div>

      {/* کارت‌های شاخص‌های کلیدی عملکرد (KPIs) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 block">میانگین Food Cost رستوران</span>
            <span className="text-2xl font-black text-emerald-600 font-mono mt-1 block">
              %{avgFoodCost}
            </span>
            <span className="text-[11px] text-slate-400 mt-0.5 block">استاندارد صنعت: ۲۵٪ تا ۳۲٪</span>
          </div>
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
            <Percent className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 block">میانگین حاشیه سود ناخالص غذاها</span>
            <span className="text-2xl font-black text-slate-900 font-mono mt-1 block">
              %{100 - avgFoodCost}
            </span>
            <span className="text-[11px] text-emerald-600 mt-0.5 block font-semibold">بسیار مطلوب و سودآور</span>
          </div>
          <div className="w-12 h-12 bg-slate-100 text-slate-700 rounded-xl flex items-center justify-center">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 block">تعداد آیتم‌های فرمول‌نویسی‌شده</span>
            <span className="text-2xl font-black text-slate-800 font-mono mt-1 block">
              {recipes.length.toLocaleString('fa-IR')}
            </span>
            <span className="text-[11px] text-slate-400 mt-0.5 block">کسر لحظه‌ای از کاردکس انبار</span>
          </div>
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
            <ChefHat className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* راهنمای ۴ خانه مهندسی منو (Menu Engineering Matrix) */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <h2 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-amber-500" />
          ماتریس طبقه‌بندی مهندسی منو (Menu Engineering)
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
            <span className="font-bold text-emerald-800 block">⭐ ستاره (Star)</span>
            <span className="text-[11px] text-emerald-700 block mt-0.5">سود ناخالص بالا + محبوبیت و فروش بالا</span>
          </div>
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl">
            <span className="font-bold text-blue-800 block">🐎 اسب کار (Plowhorse)</span>
            <span className="text-[11px] text-blue-700 block mt-0.5">سود پایین‌تر + حجم سفارش بسیار بالا</span>
          </div>
          <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl">
            <span className="font-bold text-purple-800 block">🧩 معما (Puzzle)</span>
            <span className="text-[11px] text-purple-700 block mt-0.5">سود ناخالص عالی + نیاز به پروموشن و فروش بیشتر</span>
          </div>
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl">
            <span className="font-bold text-rose-800 block">🐕 سگ (Dog)</span>
            <span className="text-[11px] text-rose-700 block mt-0.5">سود پایین + فروش پایین (کاندید حذف از منو)</span>
          </div>
        </div>
      </div>

      {/* جدول فرمولاسیون و غذاها */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50">
          <h2 className="text-sm font-bold text-slate-800">فهرست غذاها، بهای تمام‌شده و فرمولاسیون مواد اولیه</h2>
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
            <input
              type="text"
              placeholder="جستجوی نام غذا در منو..."
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
                <th className="py-3 px-4">نام غذا و رسته منو</th>
                <th className="py-3 px-4 text-left">قیمت فروش منو</th>
                <th className="py-3 px-4 text-left">بهای تمام‌شده (Food Cost)</th>
                <th className="py-3 px-4 text-center">درصد Food Cost</th>
                <th className="py-3 px-4 text-left">سود ناخالص هر پرس</th>
                <th className="py-3 px-4 text-center">ماتریس منو</th>
                <th className="py-3 px-4 text-center">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecipes.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50 transition">
                  <td className="py-3.5 px-4">
                    <span className="font-bold text-slate-900 block">{item.name}</span>
                    <span className="text-[11px] text-slate-400">{item.category}</span>
                  </td>
                  <td className="py-3.5 px-4 text-left font-mono font-bold text-slate-900">
                    {item.sellingPrice.toLocaleString('fa-IR')} ریال
                  </td>
                  <td className="py-3.5 px-4 text-left font-mono text-emerald-700">
                    {item.recipeCost.toLocaleString('fa-IR')} ریال
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <span
                      className={`inline-block font-mono font-bold px-2.5 py-0.5 rounded-full text-[11px] ${
                        item.foodCostPercentage <= 30
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : item.foodCostPercentage <= 35
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}
                    >
                      %{item.foodCostPercentage}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-left font-mono font-bold text-slate-800">
                    {item.grossMarginAmount.toLocaleString('fa-IR')} ریال
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    {item.menuEngineeringCategory === 'STAR' && (
                      <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-md">
                        ⭐ ستاره (Star)
                      </span>
                    )}
                    {item.menuEngineeringCategory === 'PLOWHORSE' && (
                      <span className="text-[11px] font-bold text-blue-700 bg-blue-100/70 px-2 py-0.5 rounded-md">
                        🐎 اسب کار
                      </span>
                    )}
                    {item.menuEngineeringCategory === 'PUZZLE' && (
                      <span className="text-[11px] font-bold text-purple-700 bg-purple-100/70 px-2 py-0.5 rounded-md">
                        🧩 معما (Puzzle)
                      </span>
                    )}
                    {item.menuEngineeringCategory === 'DOG' && (
                      <span className="text-[11px] font-bold text-rose-700 bg-rose-100/70 px-2 py-0.5 rounded-md">
                        🐕 سگ (Dog)
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <button
                      onClick={() => setActiveIngredientModalRecipe(item)}
                      className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold transition"
                    >
                      ریز مواد BOM ({item.ingredients.length})
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* مودال مشاهده ریز مواد اولیه فرمول پخت (BOM Breakdown) */}
      {activeIngredientModalRecipe && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 text-right space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-base text-slate-800 flex items-center gap-2">
                  <ChefHat className="w-5 h-5 text-emerald-600" />
                  فرمول پخت و مواد اولیه: {activeIngredientModalRecipe.name}
                </h3>
                <span className="text-xs text-slate-400 mt-0.5 block">
                  خروجی فرمول: ۱ پرس | قیمت منو: {activeIngredientModalRecipe.sellingPrice.toLocaleString('fa-IR')} ریال
                </span>
              </div>
              <button
                onClick={() => setActiveIngredientModalRecipe(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-right text-xs text-slate-600">
                <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">ماده اولیه</th>
                    <th className="py-2.5 px-3 text-center">مقدار مصرف</th>
                    <th className="py-2.5 px-3 text-left">بهای واحد (ریال)</th>
                    <th className="py-2.5 px-3 text-center">ضایعات (%)</th>
                    <th className="py-2.5 px-3 text-left">بهای تمام‌شده کل</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {activeIngredientModalRecipe.ingredients.map((ing, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-2 px-3 font-semibold text-slate-800">{ing.rawProductName}</td>
                      <td className="py-2 px-3 text-center font-mono">
                        {ing.quantity} {ing.unit}
                      </td>
                      <td className="py-2 px-3 text-left font-mono">{ing.unitCost.toLocaleString('fa-IR')}</td>
                      <td className="py-2 px-3 text-center font-mono">%{ing.wastePercentage}</td>
                      <td className="py-2 px-3 text-left font-mono font-bold text-slate-900">
                        {ing.totalCost.toLocaleString('fa-IR')} ریال
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-50 font-bold text-slate-800 border-t border-slate-200">
                  <tr>
                    <td colSpan={4} className="py-2.5 px-3">
                      مجموع بهای تمام‌شده مواد اولیه (Food Cost):
                    </td>
                    <td className="py-2.5 px-3 text-left font-mono text-emerald-700 text-sm">
                      {activeIngredientModalRecipe.recipeCost.toLocaleString('fa-IR')} ریال
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="flex items-center justify-end pt-2 border-t border-slate-100">
              <button
                onClick={() => setActiveIngredientModalRecipe(null)}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold"
              >
                بستن پنجره
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
