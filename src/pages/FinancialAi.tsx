import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import {
  AlertTriangle,
  BrainCircuit,
  CreditCard,
  LineChart as LineChartIcon,
  Store as StoreIcon,
} from 'lucide-react';
import {
  AlertMessage,
  EmptyState,
  LoadingState,
  PageHeader,
  Pagination,
  SearchFiltersBar,
  SideDrawer,
  StatusPill,
  TableShell,
} from '@/components/dashboard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  financialAiService,
  type CreditPurchase,
  type CurrencyCode,
  type FinancialAiStoreDetail,
  type FinancialAiStoreRow,
  type FinancialAiSummary,
  type Money,
} from '../services/financialAiService';
import { platformPaymentService } from '../services/platformPaymentService';

const CURRENCY_STORAGE_KEY = 'financial-ai:currency';
const RATE_STORAGE_KEY = 'financial-ai:rate';

const kindLabels: Record<string, string> = {
  STORE_GENERATION: 'إنشاء متجر',
  DESIGN_PROPOSAL: 'اقتراح تصميم',
  DESIGN_REVISION: 'تعديل تصميم',
  EDITOR_CHAT: 'محادثة المحرر',
  EDITOR_BRAND: 'تحديث الهوية',
};

const statusLabels: Record<string, string> = {
  PAID: 'مدفوع',
  PENDING: 'قيد الدفع',
  FAILED: 'فشل',
  EXPIRED: 'منتهي',
  REFUNDED: 'مسترجع',
  PARTIALLY_REFUNDED: 'مسترجع جزئياً',
};

const statusTones: Record<string, 'green' | 'amber' | 'red' | 'slate'> = {
  PAID: 'green',
  PENDING: 'amber',
  FAILED: 'red',
  EXPIRED: 'slate',
  REFUNDED: 'slate',
  PARTIALLY_REFUNDED: 'amber',
};

const canRefundPurchase = (purchase: CreditPurchase) =>
  purchase.provider === 'QI_CARD' &&
  (purchase.status === 'PAID' || purchase.status === 'PARTIALLY_REFUNDED');

/** Recalculate IQD from USD whenever the user edits the exchange rate. */
const atRate = (money: Money | undefined, rate: number): Money => {
  const usd = money?.usd ?? 0;
  return { usd, iqd: usd * rate };
};

const formatMoney = (money: Money | undefined, currency: CurrencyCode, rate: number): string => {
  const value = atRate(money, rate);
  return currency === 'IQD'
    ? `${Math.round(value.iqd).toLocaleString('en-US')} د.ع`
    : `$${value.usd.toLocaleString('en-US', { maximumFractionDigits: 2, minimumFractionDigits: 2 })}`;
};

const amountOf = (money: Money | undefined, currency: CurrencyCode, rate: number): number => {
  const value = atRate(money, rate);
  return currency === 'IQD' ? value.iqd : value.usd;
};

const formatTokens = (value: number): string =>
  value >= 1_000_000
    ? `${(value / 1_000_000).toFixed(1)}M`
    : value >= 1_000
      ? `${(value / 1_000).toFixed(1)}K`
      : String(value);

const formatDate = (value: string | null): string =>
  value ? new Date(value).toLocaleDateString('en-GB') : '—';

const readStoredCurrency = (): CurrencyCode => {
  try {
    return localStorage.getItem(CURRENCY_STORAGE_KEY) === 'USD' ? 'USD' : 'IQD';
  } catch {
    return 'IQD';
  }
};

const readStoredRate = (): number | null => {
  try {
    const raw = localStorage.getItem(RATE_STORAGE_KEY);
    if (!raw) return null;
    const value = Number(raw);
    return Number.isFinite(value) && value > 0 ? value : null;
  } catch {
    return null;
  }
};

const FinancialAi = () => {
  const [currency, setCurrency] = useState<CurrencyCode>(readStoredCurrency);
  const [rate, setRate] = useState<number>(() => readStoredRate() ?? 0);
  const [rateDraft, setRateDraft] = useState(() => {
    const stored = readStoredRate();
    return stored ? String(stored) : '';
  });
  const [summary, setSummary] = useState<FinancialAiSummary | null>(null);
  const [stores, setStores] = useState<FinancialAiStoreRow[]>([]);
  const [storeTotal, setStoreTotal] = useState(0);
  const [purchases, setPurchases] = useState<CreditPurchase[]>([]);
  const [purchaseTotal, setPurchaseTotal] = useState(0);
  const [detail, setDetail] = useState<FinancialAiStoreDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [openStoreId, setOpenStoreId] = useState<string | null>(null);
  const openStoreIdRef = useRef<string | null>(null);
  openStoreIdRef.current = openStoreId;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sort, setSort] = useState<'cost' | 'revenue' | 'margin' | 'generations'>('cost');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [purchaseStatus, setPurchaseStatus] = useState('');
  const [purchasePage, setPurchasePage] = useState(1);
  const [purchasePageSize, setPurchasePageSize] = useState(10);
  const [refundTarget, setRefundTarget] = useState<CreditPurchase | null>(null);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundMessage, setRefundMessage] = useState('');
  const [refunding, setRefunding] = useState(false);
  const [purchaseReloadKey, setPurchaseReloadKey] = useState(0);

  const activeRate = rate > 0 ? rate : summary?.rate || 1;

  useEffect(() => {
    try {
      localStorage.setItem(CURRENCY_STORAGE_KEY, currency);
    } catch {
      // ignore
    }
  }, [currency]);

  useEffect(() => {
    if (rate > 0) {
      try {
        localStorage.setItem(RATE_STORAGE_KEY, String(rate));
      } catch {
        // ignore
      }
    }
  }, [rate]);

  // Seed the input from the server rate once, unless the user already saved one.
  useEffect(() => {
    if (!summary?.rate) return;
    if (rate > 0) return;
    setRate(summary.rate);
    setRateDraft(String(summary.rate));
  }, [summary, rate]);

  useEffect(() => {
    let cancelled = false;
    financialAiService
      .getSummary()
      .then((response) => {
        if (!cancelled) setSummary(response);
      })
      .catch((err) => {
        if (cancelled) return;
        setError('فشل في جلب البيانات المالية للذكاء الاصطناعي.');
        console.error('Error fetching financial AI summary:', err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    financialAiService
      .getStores({ page, limit: pageSize, search: debouncedSearch, sort })
      .then((response) => {
        if (cancelled) return;
        setStores(response.data || []);
        setStoreTotal(response.total || 0);
      })
      .catch((err) => {
        if (cancelled) return;
        setError('فشل في جلب بيانات المتاجر.');
        console.error('Error fetching financial AI stores:', err);
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, page, pageSize, sort]);

  useEffect(() => {
    let cancelled = false;
    financialAiService
      .getPurchases({
        page: purchasePage,
        limit: purchasePageSize,
        status: purchaseStatus || undefined,
      })
      .then((response) => {
        if (cancelled) return;
        setPurchases(response.data || []);
        setPurchaseTotal(response.total || 0);
      })
      .catch((err) => {
        if (cancelled) return;
        setError('فشل في جلب سجل شراء الرصيد.');
        console.error('Error fetching credit purchases:', err);
      });
    return () => {
      cancelled = true;
    };
  }, [purchasePage, purchasePageSize, purchaseStatus, purchaseReloadKey]);

  const openRefund = (purchase: CreditPurchase) => {
    const remaining = Math.max(
      0,
      (purchase.amountIqd ?? 0) - (purchase.refundedAmountIqd ?? 0),
    );
    setRefundTarget(purchase);
    setRefundAmount(remaining > 0 ? String(remaining) : '');
    setRefundMessage('');
  };

  const closeRefund = () => {
    if (refunding) return;
    setRefundTarget(null);
    setRefundAmount('');
    setRefundMessage('');
  };

  const submitRefund = async () => {
    if (!refundTarget) return;
    const remaining = Math.max(
      0,
      (refundTarget.amountIqd ?? 0) - (refundTarget.refundedAmountIqd ?? 0),
    );
    const amount = Number(refundAmount.replace(/,/g, ''));
    if (!Number.isFinite(amount) || amount <= 0) {
      setError('أدخل مبلغ استرجاع صحيح.');
      return;
    }
    if (amount > remaining) {
      setError(`المبلغ أكبر من المتبقي (${remaining.toLocaleString()} د.ع).`);
      return;
    }

    try {
      setRefunding(true);
      setError('');
      await platformPaymentService.refund(refundTarget.id, {
        amount,
        message: refundMessage.trim() || undefined,
      });
      setRefundTarget(null);
      setRefundAmount('');
      setRefundMessage('');
      setPurchaseReloadKey((key) => key + 1);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (err instanceof Error ? err.message : 'فشل الاسترجاع.');
      setError(message);
      console.error('Error refunding platform payment:', err);
    } finally {
      setRefunding(false);
    }
  };

  const openStore = useCallback(async (storeId: string) => {
    setOpenStoreId(storeId);
    setDetail(null);
    setDetailLoading(true);
    try {
      const response = await financialAiService.getStoreDetail(storeId);
      if (openStoreIdRef.current === storeId) setDetail(response);
    } catch (err) {
      console.error('Error fetching store financial detail:', err);
      setError('فشل في جلب تفاصيل المتجر.');
    } finally {
      if (openStoreIdRef.current === storeId) setDetailLoading(false);
    }
  }, []);

  const closeStore = () => {
    setOpenStoreId(null);
    setDetail(null);
  };

  const applyRateDraft = () => {
    const parsed = Number(rateDraft.replace(/,/g, ''));
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setRateDraft(String(activeRate));
      return;
    }
    setRate(parsed);
    setRateDraft(String(parsed));
  };

  const revenueCostOption = useMemo<EChartsOption>(() => {
    const points = summary?.monthly ?? [];
    return {
      tooltip: { trigger: 'axis', textStyle: { fontFamily: 'Setar XS, sans-serif' } },
      legend: {
        bottom: 0,
        textStyle: { color: '#64748b', fontWeight: 700, fontFamily: 'Setar XS, sans-serif' },
      },
      grid: { left: 12, right: 12, top: 24, bottom: 48, containLabel: true },
      xAxis: {
        type: 'category',
        data: points.map((point) => point.month),
        axisTick: { show: false },
        axisLine: { lineStyle: { color: '#e2e8f0' } },
        axisLabel: { color: '#64748b', fontWeight: 700 },
      },
      yAxis: {
        type: 'value',
        splitLine: { lineStyle: { color: 'rgba(148,163,184,0.18)' } },
        axisLabel: { color: '#64748b', fontWeight: 600 },
      },
      series: [
        {
          name: 'الإيرادات',
          type: 'line',
          smooth: true,
          symbol: 'circle',
          symbolSize: 8,
          areaStyle: { color: 'rgba(16,185,129,0.12)' },
          lineStyle: { width: 3, color: '#10b981' },
          itemStyle: { color: '#10b981' },
          data: points.map((point) => amountOf(point.revenue, currency, activeRate)),
        },
        {
          name: 'كلفة الذكاء الاصطناعي',
          type: 'line',
          smooth: true,
          symbol: 'circle',
          symbolSize: 8,
          areaStyle: { color: 'rgba(244,63,94,0.10)' },
          lineStyle: { width: 3, color: '#f43f5e' },
          itemStyle: { color: '#f43f5e' },
          data: points.map((point) => amountOf(point.cost, currency, activeRate)),
        },
      ],
    };
  }, [activeRate, currency, summary]);

  const modelOption = useMemo<EChartsOption>(() => {
    const models = summary?.byModel ?? [];
    const colors = ['#7d26f7', '#0ea5e9', '#10b981', '#f59e0b', '#f43f5e', '#64748b'];
    return {
      tooltip: {
        trigger: 'item',
        formatter: '{b}: {c} ({d}%)',
        textStyle: { fontFamily: 'Setar XS, sans-serif' },
      },
      legend: {
        bottom: 0,
        icon: 'circle',
        textStyle: { color: '#64748b', fontWeight: 700, fontFamily: 'Setar XS, sans-serif' },
      },
      series: [
        {
          type: 'pie',
          radius: ['55%', '76%'],
          center: ['50%', '45%'],
          itemStyle: { borderRadius: 8, borderColor: '#fff', borderWidth: 2 },
          label: { show: false },
          data: models.map((model, index) => ({
            name: model.model,
            value: amountOf(model.cost, currency, activeRate),
            itemStyle: { color: colors[index % colors.length] },
          })),
        },
      ],
    };
  }, [activeRate, currency, summary]);

  const totalPages = Math.max(1, Math.ceil(storeTotal / pageSize));
  const purchaseTotalPages = Math.max(1, Math.ceil(purchaseTotal / purchasePageSize));
  const marginPositive = amountOf(summary?.margin, 'IQD', activeRate) >= 0;

  if (loading && !summary) return <LoadingState />;

  return (
    <div className="page-shell bg-[#f8fafc] text-right" dir="rtl">
      <PageHeader
        title="مالية الذكاء الاصطناعي"
        description={
          <>
            كلفة فعلية على{' '}
            <span className="font-black text-violet-600">
              {(summary?.usage.runs ?? 0).toLocaleString('en-US')} تشغيل
            </span>
          </>
        }
        icon={<BrainCircuit className="h-6 w-6" />}
        action={
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <div className="flex h-11 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 shadow-sm">
              <span className="whitespace-nowrap text-xs font-bold text-slate-500">سعر الصرف</span>
              <Input
                dir="ltr"
                value={rateDraft}
                onChange={(event) => setRateDraft(event.target.value)}
                onBlur={applyRateDraft}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.currentTarget.blur();
                  }
                }}
                className="h-8 w-28 border-0 bg-transparent px-1 text-sm font-black shadow-none focus-visible:ring-0"
                inputMode="decimal"
                aria-label="سعر صرف الدولار إلى الدينار"
              />
              <span className="text-xs font-bold text-slate-400">د.ع/$</span>
            </div>
            <CurrencyToggle value={currency} onChange={setCurrency} />
          </div>
        }
      />

      {error && <AlertMessage>{error}</AlertMessage>}

      {summary && !summary.fullyPriced && (
        <div className="flex items-center gap-2 rounded-2xl border border-orange-100 bg-orange-50 px-4 py-3 text-sm font-semibold text-orange-600">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          بعض التشغيلات استخدمت نماذج بلا سعر منشور — الكلفة المعروضة حد أدنى وليست الفاتورة الكاملة.
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard
          title="كلفة الذكاء الاصطناعي"
          value={formatMoney(summary?.cost, currency, activeRate)}
          hint="تكلفة النماذج"
        />
        <KpiCard
          title="إجمالي الإيرادات"
          value={formatMoney(summary?.revenue, currency, activeRate)}
          hint="رصيد + اشتراك"
          accent="emerald"
        />
        <KpiCard
          title="صافي الربح"
          value={formatMoney(summary?.margin, currency, activeRate)}
          hint={marginPositive ? 'موجب' : 'سالب'}
          accent={marginPositive ? 'emerald' : 'rose'}
        />
        <KpiCard
          title="نسبة الربح"
          value={
            summary?.marginPercent === null || summary?.marginPercent === undefined
              ? '—'
              : `${summary.marginPercent}%`
          }
          hint="من الإيراد"
        />
        <KpiCard
          title="رصيد غير مستهلك"
          value={formatMoney(summary?.deferredLiability, currency, activeRate)}
          hint="التزام مؤجل"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.6fr_1fr]">
        <ChartPanel
          title="الإيرادات مقابل الكلفة"
          description="مقارنة شهرية"
          empty={!summary?.monthly.length}
          emptyText="لا توجد بيانات شهرية بعد"
          option={revenueCostOption}
        />
        <ChartPanel
          title="الكلفة حسب النموذج"
          description="أين يذهب المال"
          empty={!summary?.byModel.length}
          emptyText="لا توجد تشغيلات مسجلة"
          option={modelOption}
        />
      </div>

      <Card className="gap-4 py-5">
        <CardHeader className="px-5">
          <CardTitle className="text-lg font-black">الاستهلاك</CardTitle>
          <CardDescription>ملخص استخدام المنصة للذكاء الاصطناعي</CardDescription>
        </CardHeader>
        <CardContent className="px-5 pt-0">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              { label: 'إنشاء متاجر', value: (summary?.usage.generations ?? 0).toLocaleString('en-US') },
              { label: 'طلبات المحرر', value: (summary?.usage.editorCalls ?? 0).toLocaleString('en-US') },
              { label: 'نداءات النماذج', value: (summary?.usage.modelCalls ?? 0).toLocaleString('en-US') },
              { label: 'تشغيلات فاشلة', value: (summary?.usage.failedRuns ?? 0).toLocaleString('en-US') },
              { label: 'رموز مدخلة', value: formatTokens(summary?.usage.promptTokens ?? 0) },
              { label: 'رموز مخرجة', value: formatTokens(summary?.usage.completionTokens ?? 0) },
              { label: 'من الذاكرة المؤقتة', value: `${summary?.usage.cacheHitPercent ?? 0}%` },
              {
                label: 'رصيد غير مستهلك',
                value: `${summary?.deferredCredits.generations ?? 0} / ${summary?.deferredCredits.editor ?? 0}`,
              },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-xs font-bold text-slate-400">{item.label}</p>
                <p className="mt-1 text-lg font-black text-slate-950" dir="ltr">
                  {item.value}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <h2 className="flex items-center gap-2 text-xl font-black text-slate-950">
          <StoreIcon className="h-5 w-5 text-violet-600" />
          الكلفة والإيراد لكل متجر
        </h2>
      </div>

      <SearchFiltersBar
        search={search}
        onSearchChange={(value) => {
          setSearch(value);
          setPage(1);
        }}
        placeholder="ابحث عن متجر أو مالك"
        filterCount={sort === 'cost' ? 0 : 1}
        onFilterClick={() => setSort('cost')}
      >
        <select
          value={sort}
          onChange={(event) => {
            setSort(event.target.value as typeof sort);
            setPage(1);
          }}
          className="h-12 rounded-2xl border border-slate-100 bg-white px-4 text-sm font-bold text-slate-600 shadow-sm outline-none"
        >
          <option value="cost">الأعلى كلفة</option>
          <option value="revenue">الأعلى إيراداً</option>
          <option value="margin">الأسوأ ربحاً</option>
          <option value="generations">الأكثر إنشاءً</option>
        </select>
      </SearchFiltersBar>

      <TableShell
        footer={
          <Pagination
            page={page}
            totalPages={totalPages}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(value) => {
              setPageSize(value);
              setPage(1);
            }}
          />
        }
      >
        <table className="w-full min-w-[880px]">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/60 text-sm text-slate-700">
              <th className="px-5 py-5 text-right">المتجر</th>
              <th className="px-5 py-5 text-right">التشغيلات</th>
              <th className="px-5 py-5 text-right">الرموز</th>
              <th className="px-5 py-5 text-right">الكلفة</th>
              <th className="px-5 py-5 text-right">إيراد الرصيد</th>
              <th className="px-5 py-5 text-right">إيراد الاشتراك</th>
              <th className="px-5 py-5 text-right">الربح</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {stores.map((row) => {
              const margin = amountOf(row.margin, 'IQD', activeRate);
              return (
                <tr
                  key={row.store.id ?? 'unattributed'}
                  onClick={() => row.store.id && openStore(row.store.id)}
                  className={cn(
                    'text-sm text-slate-700 transition hover:bg-slate-50/70',
                    row.store.id && 'cursor-pointer',
                  )}
                >
                  <td className="px-5 py-4">
                    <p className="font-black text-slate-950">{row.store.name || 'بدون اسم'}</p>
                    <p className="text-xs font-semibold text-slate-400">
                      {row.store.owner?.name || row.store.domain || '—'}
                    </p>
                  </td>
                  <td className="px-5 py-4">
                    <p className="font-bold">{row.usage.runs}</p>
                    <p className="text-xs font-semibold text-slate-400">
                      {row.usage.generations} إنشاء · {row.usage.editorCalls} محرر
                    </p>
                  </td>
                  <td className="px-5 py-4 font-bold text-slate-500">
                    {formatTokens(row.usage.promptTokens + row.usage.completionTokens)}
                  </td>
                  <td className="px-5 py-4 font-black text-rose-500">
                    {formatMoney(row.cost, currency, activeRate)}
                    {!row.fullyPriced && (
                      <span className="mr-1 text-xs font-bold text-orange-500" title="نماذج بلا سعر منشور">
                        +
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-4 font-bold text-emerald-600">
                    {formatMoney(row.creditRevenue, currency, activeRate)}
                  </td>
                  <td className="px-5 py-4 font-bold text-emerald-600">
                    {formatMoney(row.subscriptionRevenue, currency, activeRate)}
                  </td>
                  <td className={cn('px-5 py-4 font-black', margin >= 0 ? 'text-emerald-600' : 'text-rose-600')}>
                    {formatMoney(row.margin, currency, activeRate)}
                  </td>
                </tr>
              );
            })}
            {!stores.length && (
              <tr>
                <td colSpan={7}>
                  <EmptyState title="لا توجد متاجر بنشاط ذكاء اصطناعي" />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </TableShell>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <h2 className="flex items-center gap-2 text-xl font-black text-slate-950">
          <CreditCard className="h-5 w-5 text-violet-600" />
          سجل شراء الرصيد
        </h2>
        <select
          value={purchaseStatus}
          onChange={(event) => {
            setPurchaseStatus(event.target.value);
            setPurchasePage(1);
          }}
          className="h-12 rounded-2xl border border-slate-100 bg-white px-4 text-sm font-bold text-slate-600 shadow-sm outline-none"
        >
          <option value="">جميع الحالات</option>
          <option value="PAID">مدفوع</option>
          <option value="PENDING">قيد الدفع</option>
          <option value="FAILED">فشل</option>
          <option value="EXPIRED">منتهي</option>
        </select>
      </div>

      <TableShell
        footer={
          <Pagination
            page={purchasePage}
            totalPages={purchaseTotalPages}
            pageSize={purchasePageSize}
            onPageChange={setPurchasePage}
            onPageSizeChange={(value) => {
              setPurchasePageSize(value);
              setPurchasePage(1);
            }}
          />
        }
      >
        <table className="w-full min-w-[900px]">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/60 text-sm text-slate-700">
              <th className="px-5 py-5 text-right">المشتري</th>
              <th className="px-5 py-5 text-right">الباقة</th>
              <th className="px-5 py-5 text-right">الرصيد</th>
              <th className="px-5 py-5 text-right">المبلغ</th>
              <th className="px-5 py-5 text-right">تاريخ الدفع</th>
              <th className="px-5 py-5 text-right">التسليم</th>
              <th className="px-5 py-5 text-right">الحالة</th>
              <th className="px-5 py-5 text-right">إجراء</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {purchases.map((purchase) => (
              <tr key={purchase.id} className="text-sm text-slate-700 transition hover:bg-slate-50/70">
                <td className="px-5 py-4">
                  <p className="font-black text-slate-950">{purchase.user?.name || 'بدون اسم'}</p>
                  <p className="text-xs font-semibold text-slate-400" dir="ltr">
                    {purchase.user?.phone || '—'}
                  </p>
                </td>
                <td className="px-5 py-4 font-bold">{purchase.pack?.name || '—'}</td>
                <td className="px-5 py-4 font-bold text-slate-500">
                  {purchase.pack
                    ? `${purchase.pack.generations} إنشاء · ${purchase.pack.editor} تحرير`
                    : '—'}
                </td>
                <td className="px-5 py-4 font-black text-slate-950">
                  {formatMoney(purchase.amount, currency, activeRate)}
                </td>
                <td className="px-5 py-4 font-semibold text-slate-500">{formatDate(purchase.paidAt)}</td>
                <td className="px-5 py-4 font-semibold text-slate-500">
                  {purchase.status === 'PAID' && !purchase.fulfilledAt ? (
                    <StatusPill tone="red">لم يُسلَّم</StatusPill>
                  ) : (
                    formatDate(purchase.fulfilledAt)
                  )}
                </td>
                <td className="px-5 py-4">
                  <StatusPill tone={statusTones[purchase.status] ?? 'slate'}>
                    {statusLabels[purchase.status] ?? purchase.status}
                  </StatusPill>
                </td>
                <td className="px-5 py-4">
                  {canRefundPurchase(purchase) ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="rounded-xl border-rose-200 font-bold text-rose-600 hover:bg-rose-50"
                      onClick={() => openRefund(purchase)}
                    >
                      استرجاع
                    </Button>
                  ) : (
                    <span className="text-xs font-semibold text-slate-300">—</span>
                  )}
                </td>
              </tr>
            ))}
            {!purchases.length && (
              <tr>
                <td colSpan={8}>
                  <EmptyState title="لا توجد عمليات شراء رصيد" />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </TableShell>

      {refundTarget && (
        <SideDrawer
          title="استرجاع دفعة QiCard"
          subtitle={refundTarget.user?.name || refundTarget.orderId}
          icon={<CreditCard className="h-6 w-6" />}
          maxWidth="max-w-md"
          onClose={closeRefund}
          footer={(
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                disabled={refunding}
                onClick={closeRefund}
                className="h-14 rounded-2xl bg-slate-100 font-black text-slate-600 disabled:opacity-60"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={refunding}
                onClick={submitRefund}
                className="h-14 rounded-2xl bg-linear-to-l from-rose-600 to-orange-500 font-black text-white shadow-lg shadow-rose-200 disabled:opacity-60"
              >
                {refunding ? 'جارٍ الاسترجاع…' : 'تأكيد الاسترجاع'}
              </button>
            </div>
          )}
        >
          <div className="space-y-5">
            <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-600">
              <p>
                المبلغ الأصلي:{' '}
                <span className="font-black text-slate-950">
                  {(refundTarget.amountIqd ?? 0).toLocaleString()} د.ع
                </span>
              </p>
              <p className="mt-1">
                المسترجع سابقاً:{' '}
                <span className="font-black text-slate-950">
                  {(refundTarget.refundedAmountIqd ?? 0).toLocaleString()} د.ع
                </span>
              </p>
              <p className="mt-1">
                المتبقي:{' '}
                <span className="font-black text-rose-600">
                  {Math.max(
                    0,
                    (refundTarget.amountIqd ?? 0) - (refundTarget.refundedAmountIqd ?? 0),
                  ).toLocaleString()}{' '}
                  د.ع
                </span>
              </p>
            </div>
            <label className="block space-y-2">
              <span className="text-sm font-black text-slate-800">مبلغ الاسترجاع (د.ع)</span>
              <Input
                value={refundAmount}
                onChange={(event) => setRefundAmount(event.target.value)}
                inputMode="decimal"
                dir="ltr"
                className="h-12 rounded-2xl text-right font-bold"
              />
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-black text-slate-800">سبب الاسترجاع (اختياري)</span>
              <Input
                value={refundMessage}
                onChange={(event) => setRefundMessage(event.target.value)}
                placeholder="مثال: طلب الزبون"
                className="h-12 rounded-2xl"
              />
            </label>
          </div>
        </SideDrawer>
      )}

      {openStoreId && (
        <SideDrawer
          title={detail?.store.name || 'تفاصيل المتجر'}
          subtitle={detail?.store.owner?.name || detail?.store.domain || undefined}
          icon={<StoreIcon className="h-6 w-6" />}
          onClose={closeStore}
        >
          {detailLoading || !detail ? (
            <LoadingState />
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <KpiCard title="الكلفة" value={formatMoney(detail.cost, currency, activeRate)} />
                <KpiCard
                  title="إيراد الاشتراك"
                  value={formatMoney(detail.subscriptionRevenue, currency, activeRate)}
                  accent="emerald"
                />
                <KpiCard
                  title="الربح"
                  value={formatMoney(detail.margin, currency, activeRate)}
                  accent={amountOf(detail.margin, 'IQD', activeRate) >= 0 ? 'emerald' : 'rose'}
                />
              </div>

              <section className="space-y-3">
                <h3 className="text-base font-black text-slate-950">التشغيلات</h3>
                <TableShell>
                  <table className="w-full min-w-[640px]">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/60 text-sm text-slate-700">
                        <th className="px-5 py-3 text-right">النوع</th>
                        <th className="px-5 py-3 text-right">النداءات</th>
                        <th className="px-5 py-3 text-right">الكلفة</th>
                        <th className="px-5 py-3 text-right">التاريخ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {detail.runs.map((run) => (
                        <tr key={run.id} className="text-sm text-slate-700">
                          <td className="px-5 py-3 font-bold">
                            {kindLabels[run.kind] ?? run.kind}
                            {!run.succeeded && (
                              <Badge variant="destructive" className="mr-2">
                                فشل
                              </Badge>
                            )}
                          </td>
                          <td className="px-5 py-3 font-semibold text-slate-500">{run.calls}</td>
                          <td className="px-5 py-3 font-black text-rose-500">
                            {formatMoney(run.cost, currency, activeRate)}
                          </td>
                          <td className="px-5 py-3 font-semibold text-slate-500">
                            {formatDate(run.createdAt)}
                          </td>
                        </tr>
                      ))}
                      {!detail.runs.length && (
                        <tr>
                          <td colSpan={4}>
                            <EmptyState title="لا توجد تشغيلات" />
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </TableShell>
              </section>

              <section className="space-y-3">
                <h3 className="text-base font-black text-slate-950">مشتريات الرصيد</h3>
                <TableShell>
                  <table className="w-full min-w-[560px]">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/60 text-sm text-slate-700">
                        <th className="px-5 py-3 text-right">الباقة</th>
                        <th className="px-5 py-3 text-right">المبلغ</th>
                        <th className="px-5 py-3 text-right">التاريخ</th>
                        <th className="px-5 py-3 text-right">الحالة</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {detail.purchases.map((purchase) => (
                        <tr key={purchase.id} className="text-sm text-slate-700">
                          <td className="px-5 py-3 font-bold">{purchase.pack?.name || '—'}</td>
                          <td className="px-5 py-3 font-black text-slate-950">
                            {formatMoney(purchase.amount, currency, activeRate)}
                          </td>
                          <td className="px-5 py-3 font-semibold text-slate-500">
                            {formatDate(purchase.paidAt ?? purchase.createdAt)}
                          </td>
                          <td className="px-5 py-3">
                            <StatusPill tone={statusTones[purchase.status] ?? 'slate'}>
                              {statusLabels[purchase.status] ?? purchase.status}
                            </StatusPill>
                          </td>
                        </tr>
                      ))}
                      {!detail.purchases.length && (
                        <tr>
                          <td colSpan={4}>
                            <EmptyState title="لا توجد مشتريات" />
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </TableShell>
              </section>
            </div>
          )}
        </SideDrawer>
      )}
    </div>
  );
};

const CurrencyToggle = ({
  value,
  onChange,
}: {
  value: CurrencyCode;
  onChange: (value: CurrencyCode) => void;
}) => (
  <div className="inline-flex h-11 items-center gap-1 rounded-2xl bg-white p-1 shadow-sm ring-1 ring-slate-100">
    {(['IQD', 'USD'] as const).map((option) => (
      <Button
        key={option}
        type="button"
        variant={value === option ? 'default' : 'ghost'}
        onClick={() => onChange(option)}
        className={cn(
          'h-9 min-w-14 rounded-xl px-4 text-sm font-black',
          value === option && 'bg-[#7D26F7] text-white hover:bg-[#7D26F7]',
        )}
      >
        {option === 'IQD' ? 'د.ع' : '$'}
      </Button>
    ))}
  </div>
);

const KpiCard = ({
  title,
  value,
  hint,
  accent,
}: {
  title: string;
  value: string;
  hint?: string;
  accent?: 'emerald' | 'rose';
}) => (
  <Card
    className={cn(
      'gap-3 py-4',
      accent === 'emerald' && 'border-emerald-100 bg-emerald-50/40',
      accent === 'rose' && 'border-rose-100 bg-rose-50/40',
    )}
  >
    <CardHeader className="gap-1 px-5">
      <CardTitle className="text-xs font-bold text-muted-foreground">{title}</CardTitle>
      {hint && <CardDescription className="text-[11px]">{hint}</CardDescription>}
    </CardHeader>
    <CardContent className="px-5 pt-0">
      <p
        className={cn(
          'text-xl font-black tracking-tight text-foreground sm:text-2xl',
          accent === 'emerald' && 'text-emerald-700',
          accent === 'rose' && 'text-rose-600',
        )}
        dir="ltr"
      >
        {value}
      </p>
    </CardContent>
  </Card>
);

const ChartPanel = ({
  title,
  description,
  option,
  empty = false,
  emptyText = 'لا توجد بيانات',
}: {
  title: string;
  description: string;
  option: EChartsOption;
  empty?: boolean;
  emptyText?: string;
}) => (
  <Card className="gap-4 overflow-hidden py-5">
    <CardHeader className="gap-1 px-5">
      <CardAction>
        <span className="grid size-10 place-items-center rounded-xl bg-violet-50 text-violet-600">
          <LineChartIcon className="h-5 w-5" />
        </span>
      </CardAction>
      <CardTitle className="text-lg font-black text-foreground">{title}</CardTitle>
      <CardDescription>{description}</CardDescription>
    </CardHeader>
    <CardContent className="px-5 pt-0">
      <div className="relative h-80 w-full">
        {empty ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-200 bg-slate-50/80 text-center">
            <p className="text-sm font-bold text-slate-500">{emptyText}</p>
          </div>
        ) : (
          <ReactECharts
            option={option}
            style={{ height: '100%', width: '100%' }}
            opts={{ renderer: 'canvas' }}
            notMerge
            lazyUpdate
          />
        )}
      </div>
    </CardContent>
  </Card>
);

export default FinancialAi;
