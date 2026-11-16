'use client';

import React, { useEffect, useState } from 'react';
import {
  Network,
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  FileText,
  RefreshCw,
  Plus,
  Layers,
} from 'lucide-react';
import { fetchApi } from '../../../lib/api';

export default function ChartOfAccountsPage() {
  const [treeData, setTreeData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const loadTree = async () => {
    setLoading(true);
    try {
      const res = await fetchApi('/accounting/chart/tree');
      if (res.data) {
        setTreeData(res.data);
        // به طور پیش‌فرض گروه اول باز باشد
        if (res.data.length > 0) {
          setExpandedGroups({ [res.data[0].code]: true });
        }
      }
    } catch (e) {
      console.warn('Failed to load chart tree:', e);
      // Fallback standard tree
      setTreeData([
        {
          code: '1',
          title: 'دارایی‌های جاری',
          heads: [
            {
              code: '101',
              title: 'موجودی نقد و بانک',
              subsidiaries: [
                { code: '10101', title: 'صندوق مرکزی', nature: 'DEBIT' },
                { code: '10102', title: 'موجودی نزد بانک‌ها', nature: 'DEBIT' },
                { code: '10103', title: 'تنخواه‌گردان', nature: 'DEBIT' },
              ],
            },
            {
              code: '103',
              title: 'موجودی مواد و کالا',
              subsidiaries: [
                { code: '10301', title: 'موجودی کالای بازرگانی', nature: 'DEBIT' },
                { code: '10302', title: 'موجودی مواد اولیه', nature: 'DEBIT' },
              ],
            },
          ],
        },
        {
          code: '2',
          title: 'بدهی‌های جاری',
          heads: [
            {
              code: '201',
              title: 'حساب‌ها و اسناد پرداختنی تجاری',
              subsidiaries: [
                { code: '20101', title: 'بستانکاران تجاری', nature: 'CREDIT' },
                { code: '20104', title: 'مالیات و عوارض ارزش افزوده پرداختنی', nature: 'CREDIT' },
              ],
            },
          ],
        },
        {
          code: '6',
          title: 'درآمدها',
          heads: [
            {
              code: '601',
              title: 'درآمد حاصل از فروش کالا و خدمات',
              subsidiaries: [
                { code: '60101', title: 'فروش ناخالص کالا', nature: 'CREDIT' },
                { code: '60102', title: 'درآمد ارائه خدمات', nature: 'CREDIT' },
              ],
            },
          ],
        },
        {
          code: '7',
          title: 'بهای تمام شده',
          heads: [
            {
              code: '701',
              title: 'بهای تمام شده کالای فروش رفته',
              subsidiaries: [
                { code: '70101', title: 'بهای تمام شده کالای فروش رفته', nature: 'DEBIT' },
              ],
            },
          ],
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTree();
  }, []);

  const toggleGroup = (code: string) => {
    setExpandedGroups((prev) => ({ ...prev, [code]: !prev[code] }));
  };

  return (
    <div className="space-y-6">
      {/* هدر صفحه */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <Network className="w-6 h-6 text-emerald-600" />
            <span>درخت استاندارد کدینگ حساب‌ها (چارچوب ایران)</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            سلسله‌مراتب گروه‌ها (سطح ۱)، حساب‌های کل (سطح ۲)، معین (سطح ۳) و ماهیت حساب‌ها
          </p>
        </div>

        <button
          onClick={loadTree}
          disabled={loading}
          className="p-2 text-slate-600 hover:text-emerald-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-xs"
          title="بروزرسانی درخت"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
        </button>
      </div>

      {/* نمایش درختی */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4">
        {treeData.map((group) => {
          const isExpanded = Boolean(expandedGroups[group.code]);
          return (
            <div key={group.code} className="border border-slate-200 rounded-xl overflow-hidden">
              {/* سطح ۱: گروه */}
              <button
                type="button"
                onClick={() => toggleGroup(group.code)}
                className="w-full flex items-center justify-between p-3.5 bg-slate-100 hover:bg-slate-200/70 text-right transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  {isExpanded ? (
                    <FolderOpen className="w-5 h-5 text-emerald-600" />
                  ) : (
                    <Folder className="w-5 h-5 text-slate-500" />
                  )}
                  <span className="font-mono font-bold text-sm text-emerald-800 bg-white px-2 py-0.5 rounded-md border border-slate-300">
                    کد {group.code}
                  </span>
                  <span className="font-bold text-sm text-slate-800">{group.title}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-400">
                  <span className="text-xs font-normal">
                    {group.heads?.length || 0} حساب کل
                  </span>
                  {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </div>
              </button>

              {/* سطوح ۲ و ۳ */}
              {isExpanded && group.heads && (
                <div className="p-3 bg-white space-y-3 ps-6">
                  {group.heads.map((head: any) => (
                    <div key={head.code} className="border-r-2 border-emerald-500/40 pe-2 ps-4 py-1 space-y-2">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-mono font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
                          {head.code}
                        </span>
                        <span className="font-bold text-slate-900">{head.title}</span>
                      </div>

                      {head.subsidiaries && (
                        <div className="space-y-1 ps-4 pt-1">
                          {head.subsidiaries.map((sub: any) => (
                            <div
                              key={sub.code}
                              className="flex items-center justify-between py-1 px-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-xs text-slate-700 border border-slate-100"
                            >
                              <div className="flex items-center gap-2">
                                <FileText className="w-3.5 h-3.5 text-slate-400" />
                                <span className="font-mono text-emerald-700 font-semibold">{sub.code}</span>
                                <span>{sub.title}</span>
                              </div>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  sub.nature === 'DEBIT'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-blue-100 text-blue-800'
                                }`}
                              >
                                {sub.nature === 'DEBIT' ? 'ماهیت بدهکار' : 'ماهیت بستانکار'}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
