import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
} from 'chart.js';
import { Doughnut, Line } from 'react-chartjs-2';
import {
  AlertTriangle,
  BrainCircuit,
  Coins,
  CreditCard,
  Cpu,
  LineChart as LineChartIcon,
  PiggyBank,
  Receipt,
  Store as StoreIcon,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import {
  AlertMessage,
  EmptyState,
  LoadingState,
  PageHeader,
  Pagination,
  SearchFiltersBar,
  SideDrawer,
  StatCard,
  StatusPill,
  TableShell,
} from '@/components/dashboard';
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

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Tooltip, Legend, Filler);

const CURRENCY_STORAGE_KEY = 'financial-ai:currency';

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
};

const statusTones: Record<string, 'green' | 'amber' | 'red' | 'slate'> = {
  PAID: 'green',
  PENDING: 'amber',
  FAILED: 'red',
  EXPIRED: 'slate',
};

/**
 * One formatter for every figure on the page.
 *
 * The server sends both currencies, so switching is a render decision — there
 * is no second exchange rate living in the browser to drift from the one the
 * numbers were computed with.
 */
const formatMoney = (money: Money | undefined, currency: CurrencyCode): string => {
  if (!money) return currency === 'IQD' ? '0 د.ع' : '$0';
  return currency === 'IQD'
    ? `${Math.round(money.iqd).toLocaleString('en-US')} د.ع`
    : `$${money.usd.toLocaleString('en-US', { maximumFractionDigits: 2, minimumFractionDigits: 2 })}`;
};

const amountOf = (money: Money | undefined, currency: CurrencyCode): number =>
  !money ? 0 : currency === 'IQD' ? money.iqd : money.usd;

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

const FinancialAi = () => {
  const [currency, setCurrency] = useState<CurrencyCode>(readStoredCurrency);
  const [summary, setSummary] = useState<FinancialAiSummary | null>(null);
  const [stores, setStores] = useState<FinancialAiStoreRow[]>([]);
  const [storeTotal, setStoreTotal] = useState(0);
  const [purchases, setPurchases] = useState<CreditPurchase[]>([]);
  const [purchaseTotal, setPurchaseTotal] = useState(0);
  const [detail, setDetail] = useState<FinancialAiStoreDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  /** Which store the drawer is showing; null once it is dismissed. */
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

  useEffect(() => {
    try {
      localStorage.setItem(CURRENCY_STORAGE_KEY, currency);
    } catch {
      // A browser with site data blocked still renders; the choice just resets.
    }
  }, [currency]);

  // The summary does not depend on any filter, so it is fetched once rather
  // than on every keystroke in the store search.
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

  // Typing in the search box used to fire a request per character, and each one
  // also refetched the summary and the purchase list.
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
  }, [purchasePage, purchasePageSize, purchaseStatus]);

  const openStore = useCallback(async (storeId: string) => {
    setOpenStoreId(storeId);
    setDetailLoading(true);
    try {
      const response = await financialAiService.getStoreDetail(storeId);
      // The drawer may have been closed, or another store opened, while this
      // was in flight — landing the stale answer would pop the drawer back up
      // over a merchant who had already dismissed it.
      setDetail((current) => (openStoreIdRef.current === storeId ? response : current));
    } catch (err) {
      setError('فشل في جلب تفاصيل المتجر.');
      console.error('Error fetching store financial detail:', err);
    } finally {
      if (openStoreIdRef.current === storeId) setDetailLoading(false);
    }
  }, []);

  const closeStore = useCallback(() => {
    setOpenStoreId(null);
    setDetail(null);
    setDetailLoading(false);
  }, []);

  const monthlyChart = useMemo(() => {
    const points = summary?.monthly ?? [];
    return {
      labels: points.map((point) => point.month),
      datasets: [
        {
          label: 'الإيرادات',
          data: points.map((point) => amountOf(point.revenue, currency)),
          borderColor: '#10b981',
          backgroundColor: 'rgba(16,185,129,0.12)',
          fill: true,
          tension: 0.4,
        },
        {
          label: 'كلفة الذكاء الاصطناعي',
          data: points.map((point) => amountOf(point.cost, currency)),
          borderColor: '#f43f5e',
          backgroundColor: 'rgba(244,63,94,0.12)',
          fill: true,
          tension: 0.4,
        },
      ],
    };
  }, [currency, summary]);

  const modelChart = useMemo(() => {
    const models = summary?.byModel ?? [];
    return {
      labels: models.map((model) => model.model),
      datasets: [
        {
          data: models.map((model) => amountOf(model.cost, currency)),
          backgroundColor: ['#7d26f7', '#0ea5e9', '#10b981', '#f59e0b', '#f43f5e', '#64748b'],
          borderWidth: 0,
        },
      ],
    };
  }, [currency, summary]);

  const totalPages = Math.max(1, Math.ceil(storeTotal / pageSize));
  const purchaseTotalPages = Math.max(1, Math.ceil(purchaseTotal / purchasePageSize));
  const marginPositive = (summary?.margin.iqd ?? 0) >= 0;

  if (loading && !summary) return <LoadingState />;

  return (
    <div className="min-h-screen space-y-5 bg-[#f8fafc] text-right" dir="rtl">
      <PageHeader
        title="مالية الذكاء الاصطناعي"
        description={
          <>
            كلفة فعلية على{' '}
            <span className="font-black text-violet-600">
              {(summary?.usage.runs ?? 0).toLocaleString('en-US')} تشغيل
            </span>{' '}
            · سعر الصرف {summary?.rate?.toLocaleString('en-US')} د.ع لكل دولار
          </>
        }
        icon={<BrainCircuit className="h-6 w-6" />}
        action={<CurrencyToggle value={currency} onChange={setCurrency} />}
      />

      {error && <AlertMessage>{error}</AlertMessage>}

      {summary && !summary.fullyPriced && (
        <div className="flex items-center gap-2 rounded-2xl border border-orange-100 bg-orange-50 px-4 py-3 text-sm font-semibold text-orange-600">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          بعض التشغيلات استخدمت نماذج بلا سعر منشور — الكلفة المعروضة حد أدنى وليست الفاتورة الكاملة.
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
        <StatCard
          title="كلفة الذكاء الاصطناعي"
          value={formatMoney(summary?.cost, currency)}
          icon={<Cpu />}
          tone="rose"
          hint={null}
        />
        <StatCard
          title="إجمالي الإيرادات"
          value={formatMoney(summary?.revenue, currency)}
          icon={<Coins />}
          tone="emerald"
          hint={null}
        />
        <StatCard
          title="صافي الربح"
          value={formatMoney(summary?.margin, currency)}
          icon={marginPositive ? <TrendingUp /> : <TrendingDown />}
          tone={marginPositive ? 'emerald' : 'rose'}
          hint={null}
        />
        <StatCard
          title="نسبة الربح"
          value={summary?.marginPercent === null || summary?.marginPercent === undefined ? '—' : `${summary.marginPercent}%`}
          icon={<LineChartIcon />}
          tone="violet"
          hint={null}
        />
        <StatCard
          title="رصيد مدفوع غير مستهلك"
          value={formatMoney(summary?.deferredLiability, currency)}
          icon={<PiggyBank />}
          tone="amber"
          hint={null}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <ChartCard
          title="الإيرادات مقابل الكلفة"
          subtitle="شهرياً"
          icon={<LineChartIcon className="h-5 w-5" />}
          className="lg:col-span-2"
        >
          {summary?.monthly.length ? (
            <Line data={monthlyChart} options={lineOptions} />
          ) : (
            <EmptyState title="لا توجد بيانات بعد" />
          )}
        </ChartCard>

        <ChartCard title="الكلفة حسب النموذج" subtitle="أين يذهب المال فعلاً" icon={<Cpu className="h-5 w-5" />}>
          {summary?.byModel.length ? (
            <Doughnut data={modelChart} options={doughnutOptions} />
          ) : (
            <EmptyState title="لا توجد تشغيلات مسجلة" />
          )}
        </ChartCard>
      </div>

      <MetricPanel
        items={[
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
        ]}
      />

      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
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
            {stores.map((row) => (
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
                  {formatMoney(row.cost, currency)}
                  {!row.fullyPriced && (
                    <span className="mr-1 text-xs font-bold text-orange-500" title="نماذج بلا سعر منشور">+</span>
                  )}
                </td>
                <td className="px-5 py-4 font-bold text-emerald-600">{formatMoney(row.creditRevenue, currency)}</td>
                <td className="px-5 py-4 font-bold text-emerald-600">
                  {formatMoney(row.subscriptionRevenue, currency)}
                </td>
                <td className={cn('px-5 py-4 font-black', row.margin.iqd >= 0 ? 'text-emerald-600' : 'text-rose-600')}>
                  {formatMoney(row.margin, currency)}
                </td>
              </tr>
            ))}
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

      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
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
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {purchases.map((purchase) => (
              <tr key={purchase.id} className="text-sm text-slate-700 transition hover:bg-slate-50/70">
                <td className="px-5 py-4">
                  <p className="font-black text-slate-950">{purchase.user?.name || 'بدون اسم'}</p>
                  <p className="text-xs font-semibold text-slate-400" dir="ltr">{purchase.user?.phone || '—'}</p>
                </td>
                <td className="px-5 py-4 font-bold">{purchase.pack?.name || '—'}</td>
                <td className="px-5 py-4 font-bold text-slate-500">
                  {purchase.pack ? `${purchase.pack.generations} إنشاء · ${purchase.pack.editor} تحرير` : '—'}
                </td>
                <td className="px-5 py-4 font-black text-slate-950">{formatMoney(purchase.amount, currency)}</td>
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
              </tr>
            ))}
            {!purchases.length && (
              <tr>
                <td colSpan={7}>
                  <EmptyState title="لا توجد عمليات شراء رصيد" />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </TableShell>

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
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <StatCard title="الكلفة" value={formatMoney(detail.cost, currency)} icon={<Cpu />} tone="rose" hint={null} />
                <StatCard
                  title="إيراد الاشتراك"
                  value={formatMoney(detail.subscriptionRevenue, currency)}
                  icon={<Coins />}
                  tone="emerald"
                  hint={null}
                />
                <StatCard
                  title="الربح"
                  value={formatMoney(detail.margin, currency)}
                  icon={detail.margin.iqd >= 0 ? <TrendingUp /> : <TrendingDown />}
                  tone={detail.margin.iqd >= 0 ? 'emerald' : 'rose'}
                  hint={null}
                />
              </div>

              <section>
                <h3 className="mb-3 text-lg font-black text-slate-950">الكلفة حسب النموذج</h3>
                <TableShell>
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/60 text-sm text-slate-700">
                        <th className="px-5 py-4 text-right">النموذج</th>
                        <th className="px-5 py-4 text-right">النداءات</th>
                        <th className="px-5 py-4 text-right">الكلفة</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {detail.byModel.map((model) => (
                        <tr key={model.model} className="text-sm text-slate-700">
                          <td className="px-5 py-3 font-bold" dir="ltr">{model.model}</td>
                          <td className="px-5 py-3 font-bold">{model.calls}</td>
                          <td className="px-5 py-3 font-black text-rose-500">{formatMoney(model.cost, currency)}</td>
                        </tr>
                      ))}
                      {!detail.byModel.length && (
                        <tr>
                          <td colSpan={3}>
                            <EmptyState title="لا توجد تشغيلات" />
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </TableShell>
              </section>

              <section>
                <h3 className="mb-3 text-lg font-black text-slate-950">آخر التشغيلات</h3>
                <TableShell>
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/60 text-sm text-slate-700">
                        <th className="px-5 py-4 text-right">النوع</th>
                        <th className="px-5 py-4 text-right">الرموز</th>
                        <th className="px-5 py-4 text-right">الكلفة</th>
                        <th className="px-5 py-4 text-right">التاريخ</th>
                        <th className="px-5 py-4 text-right">الحالة</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {detail.runs.map((run) => (
                        <tr key={run.id} className="text-sm text-slate-700">
                          <td className="px-5 py-3 font-bold">{kindLabels[run.kind] ?? run.kind}</td>
                          <td className="px-5 py-3 font-bold text-slate-500">
                            {formatTokens(run.promptTokens + run.completionTokens)}
                          </td>
                          <td className="px-5 py-3 font-black text-rose-500">{formatMoney(run.cost, currency)}</td>
                          <td className="px-5 py-3 font-semibold text-slate-500">{formatDate(run.createdAt)}</td>
                          <td className="px-5 py-3">
                            <StatusPill tone={run.succeeded ? 'green' : 'red'}>
                              {run.succeeded ? 'ناجح' : 'فاشل'}
                            </StatusPill>
                          </td>
                        </tr>
                      ))}
                      {!detail.runs.length && (
                        <tr>
                          <td colSpan={5}>
                            <EmptyState title="لا توجد تشغيلات" />
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </TableShell>
              </section>

              <section>
                <h3 className="mb-3 flex items-center gap-2 text-lg font-black text-slate-950">
                  <Receipt className="h-5 w-5 text-violet-600" />
                  مشتريات المالك
                </h3>
                <TableShell>
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/60 text-sm text-slate-700">
                        <th className="px-5 py-4 text-right">الباقة</th>
                        <th className="px-5 py-4 text-right">المبلغ</th>
                        <th className="px-5 py-4 text-right">التاريخ</th>
                        <th className="px-5 py-4 text-right">الحالة</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {detail.purchases.map((purchase) => (
                        <tr key={purchase.id} className="text-sm text-slate-700">
                          <td className="px-5 py-3 font-bold">{purchase.pack?.name || '—'}</td>
                          <td className="px-5 py-3 font-black text-slate-950">{formatMoney(purchase.amount, currency)}</td>
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

const CurrencyToggle = ({ value, onChange }: { value: CurrencyCode; onChange: (value: CurrencyCode) => void }) => (
  <div className="inline-flex h-12 items-center gap-1 rounded-2xl bg-white p-1 shadow-sm ring-1 ring-slate-100">
    {(['IQD', 'USD'] as const).map((option) => (
      <button
        key={option}
        type="button"
        onClick={() => onChange(option)}
        className={cn(
          'h-10 min-w-16 rounded-xl px-4 text-sm font-black transition',
          value === option ? 'bg-[#7D26F7] text-white shadow-lg shadow-violet-200' : 'text-slate-500 hover:bg-slate-50',
        )}
      >
        {option === 'IQD' ? 'د.ع' : '$'}
      </button>
    ))}
  </div>
);

const ChartCard = ({
  title,
  subtitle,
  icon,
  children,
  className,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) => (
  <div className={cn('rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-100', className)}>
    <div className="mb-5 flex items-center justify-between gap-3">
      <div className="grid h-11 w-11 place-items-center rounded-2xl bg-violet-50 text-violet-600">{icon}</div>
      <div className="min-w-0 flex-1 text-right">
        <h2 className="text-xl font-black text-slate-950">{title}</h2>
        <p className="text-sm font-semibold text-slate-400">{subtitle}</p>
      </div>
    </div>
    <div className="h-72">{children}</div>
  </div>
);

const MetricPanel = ({ items }: { items: Array<{ label: string; value: string }> }) => (
  <div className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-100">
    <h2 className="mb-4 text-xl font-black text-slate-950">الاستهلاك</h2>
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
      {items.map((item) => (
        <div key={item.label} className="rounded-2xl bg-slate-50 px-4 py-3">
          <p className="text-xs font-bold text-slate-400">{item.label}</p>
          <p className="mt-1 text-lg font-black text-slate-950" dir="ltr">{item.value}</p>
        </div>
      ))}
    </div>
  </div>
);

const lineOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: true, position: 'bottom' as const } },
  scales: {
    x: { grid: { display: false } },
    y: { grid: { color: '#f1f5f9' }, ticks: { precision: 0 } },
  },
};

const doughnutOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: true, position: 'bottom' as const } },
};

export default FinancialAi;
