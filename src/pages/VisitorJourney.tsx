import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import {
  BarChart3,
  Crown,
  Eye,
  Globe,
  Info,
  MousePointerClick,
  Package,
  PenTool,
  Route as RouteIcon,
  SearchX,
  ShoppingBag,
  Sparkles,
  Store as StoreIcon,
  TrendingDown,
  UserPlus,
  X,
} from 'lucide-react';
import {
  AlertMessage,
  LoadingState,
  PageHeader,
  Pagination,
  StatusPill,
  TableShell,
  type StatTone,
} from '@/components/dashboard';
import { UserAvatar } from '@/components/UserAvatar';
import { VisitorInsights } from '@/components/journey/VisitorInsights';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  journeyAccountsService,
  journeyService,
  type JourneyAccountsPage,
  type JourneyFunnel,
  type JourneyStep,
} from '../services/journeyService';

/**
 * رحلة الزوار: from a visit to mel.iq to a paying merchant.
 *
 * Visitors are counted by the landing page itself (anonymous, once a day per
 * browser). From «أنشأوا حساباً» on, each step counts the accounts created in
 * the range that have reached it by now, and the table below lists them.
 */

const RANGES = [
  { days: 1, label: 'اليوم' },
  { days: 7, label: '7 أيام' },
  { days: 30, label: '30 يوم' },
  { days: 90, label: '90 يوم' },
] as const;

const RANGE_STORAGE_KEY = 'visitor-journey:days';

/** Steps before this index are anonymous visitors; from it on, accounts. */
const FIRST_ACCOUNT_STEP = 2;

const stepLook: Record<string, { icon: ReactNode; tone: StatTone }> = {
  visitors: { icon: <Eye />, tone: 'violet' },
  signup_open: { icon: <MousePointerClick />, tone: 'cyan' },
  accounts: { icon: <UserPlus />, tone: 'blue' },
  stores: { icon: <StoreIcon />, tone: 'teal' },
  ai_design: { icon: <Sparkles />, tone: 'violet' },
  editor: { icon: <PenTool />, tone: 'amber' },
  published: { icon: <Globe />, tone: 'emerald' },
  products: { icon: <Package />, tone: 'blue' },
  orders: { icon: <ShoppingBag />, tone: 'rose' },
  paid: { icon: <Crown />, tone: 'amber' },
};

/** A raised, glossy tile per tone, and the soft glow in the card corner. */
const toneTile: Record<StatTone, { tile: string; glow: string }> = {
  blue: { tile: 'from-sky-400 to-blue-600 shadow-blue-300/60', glow: 'bg-blue-100/70' },
  cyan: { tile: 'from-cyan-300 to-cyan-600 shadow-cyan-300/60', glow: 'bg-cyan-100/70' },
  teal: { tile: 'from-emerald-300 to-teal-600 shadow-teal-300/60', glow: 'bg-teal-100/70' },
  amber: { tile: 'from-amber-300 to-orange-500 shadow-orange-300/60', glow: 'bg-amber-100/70' },
  rose: { tile: 'from-pink-400 to-rose-600 shadow-rose-300/60', glow: 'bg-rose-100/70' },
  violet: { tile: 'from-fuchsia-400 to-violet-700 shadow-violet-300/60', glow: 'bg-violet-100/70' },
  emerald: { tile: 'from-lime-300 to-emerald-600 shadow-emerald-300/60', glow: 'bg-emerald-100/70' },
  slate: { tile: 'from-slate-300 to-slate-500 shadow-slate-300/60', glow: 'bg-slate-100' },
};

const lookOf = (key: string) => stepLook[key] ?? { icon: <RouteIcon />, tone: 'slate' as StatTone };

/** The milestones drawn along the road in the banner. */
const HERO_STEPS = ['visitors', 'accounts', 'stores', 'published', 'paid'] as const;

/** Baghdad calendar day `offset` days from today, `YYYY-MM-DD`. */
const baghdadDay = (offset = 0) =>
  new Date(Date.now() + 3 * 3600_000 + offset * 86400_000).toISOString().slice(0, 10);

const fmt = (n: number) => n.toLocaleString('en-US');

const percent = (part: number, whole: number) => {
  if (!whole) return null;
  const value = (part / whole) * 100;
  return value >= 10 ? Math.round(value) : Math.round(value * 10) / 10;
};

/** Green when most people carry on, amber when many stop, red when most do. */
const keptTone = (value: number | null) => {
  if (value == null) return 'bg-slate-100 text-slate-500';
  if (value >= 50) return 'bg-emerald-50 text-emerald-600';
  if (value >= 20) return 'bg-orange-50 text-orange-500';
  return 'bg-red-50 text-red-500';
};

const errorMessage = (err: unknown, fallback: string) => {
  const message = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
  if (Array.isArray(message)) return message[0] ?? fallback;
  return message || fallback;
};

/** `+9647701234567` → `0770 123 4567`, the way merchants write it. */
const formatPhone = (phone: string | null) => {
  if (!phone) return '—';
  const local = phone.replace(/^\+?964/, '0');
  return local.length === 11 ? `${local.slice(0, 4)} ${local.slice(4, 7)} ${local.slice(7)}` : phone;
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Baghdad' });

const readStoredDays = () => {
  try {
    const stored = Number(window.localStorage.getItem(RANGE_STORAGE_KEY));
    return RANGES.some((r) => r.days === stored) ? stored : 30;
  } catch {
    return 30;
  }
};

const VisitorJourney = () => {
  const [days, setDays] = useState<number>(readStoredDays);
  const [data, setData] = useState<JourneyFunnel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [stepFilter, setStepFilter] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<JourneyAccountsPage | null>(null);
  const [accountsLoading, setAccountsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const range = useMemo(() => ({ from: baghdadDay(-(days - 1)), to: baghdadDay() }), [days]);

  const loadFunnel = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setData(await journeyService.funnel(range));
    } catch (err) {
      setError(errorMessage(err, 'تعذر تحميل رحلة الزوار'));
    } finally {
      setLoading(false);
    }
  }, [range]);

  const loadAccounts = useCallback(async () => {
    setAccountsLoading(true);
    try {
      setAccounts(await journeyAccountsService.list({ ...range, step: stepFilter ?? undefined, page, pageSize }));
    } catch (err) {
      setError(errorMessage(err, 'تعذر تحميل الحسابات'));
    } finally {
      setAccountsLoading(false);
    }
  }, [range, stepFilter, page, pageSize]);

  useEffect(() => {
    void loadFunnel();
    try {
      window.localStorage.setItem(RANGE_STORAGE_KEY, String(days));
    } catch {
      // Remembering the range is a convenience only.
    }
  }, [loadFunnel, days]);

  useEffect(() => {
    void loadAccounts();
  }, [loadAccounts]);

  const steps = useMemo(() => data?.steps ?? [], [data]);
  const stepByKey = useMemo(() => new Map(steps.map((s) => [s.key, s])), [steps]);
  const count = (key: string) => stepByKey.get(key)?.count ?? 0;

  /** The step that loses the largest share of the one before it. */
  const biggestDrop = useMemo(() => {
    let worst: { step: JourneyStep; from: JourneyStep; kept: number } | null = null;
    for (let i = 1; i < steps.length; i++) {
      const prev = steps[i - 1];
      if (prev.count < 5) continue;
      const kept = steps[i].count / prev.count;
      if (kept < 1 && (!worst || kept < worst.kept)) worst = { step: steps[i], from: prev, kept };
    }
    return worst;
  }, [steps]);

  const trackingNote = useMemo(() => {
    if (!data) return null;
    if (!data.trackingSince) {
      return 'لم يُسجَّل أي زائر بعد: عدّ الزوار يبدأ بعد نشر التحديث على mel.iq. خطوات الحسابات محسوبة من بيانات المنصة وتشمل ما قبل ذلك.';
    }
    const since = data.trackingSince.slice(0, 10);
    if (since > data.range.from) {
      return `عدّ الزوار بدأ في ${since}، فأول خطوتين لا تشملان ما قبل هذا التاريخ. خطوات الحسابات محسوبة من بيانات المنصة.`;
    }
    return null;
  }, [data]);

  const chooseStep = (key: string | null) => {
    setStepFilter((current) => (current === key ? null : key));
    setPage(1);
  };

  const changeRange = (value: number) => {
    setDays(value);
    setPage(1);
  };

  if (loading && !data) return <LoadingState />;

  const visitors = count('visitors');
  const newAccounts = count('accounts');
  // More new accounts than visitors means the range starts before visitors
  // were counted; a rate above 100% would be meaningless.
  const signupRate = newAccounts <= visitors ? percent(newAccounts, visitors) : null;
  const accountStepKeys = accounts?.steps.map((s) => s.key) ?? steps.slice(FIRST_ACCOUNT_STEP).map((s) => s.key);
  const filterLabel = stepFilter ? stepByKey.get(stepFilter)?.label : null;
  const totalPages = Math.max(1, Math.ceil((accounts?.total ?? 0) / pageSize));

  return (
    <div className="page-shell bg-[#f8fafc] text-right" dir="rtl">
      <PageHeader
        title="رحلة الزوار"
        description={
          <>
            من زيارة mel.iq حتى الاشتراك المدفوع
            {data && (
              <span className="block font-black whitespace-nowrap text-violet-600 sm:ms-2 sm:inline">
                من <bdi>{data.range.from}</bdi> إلى <bdi>{data.range.to}</bdi>
              </span>
            )}
          </>
        }
        icon={<RouteIcon className="h-6 w-6" />}
        action={<RangeToggle value={days} onChange={changeRange} />}
      />

      {error && <AlertMessage>{error}</AlertMessage>}

      {trackingNote && (
        <div className="flex items-center gap-3 rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3 text-sm font-semibold text-sky-700">
          <Info className="h-4 w-4 shrink-0" />
          {trackingNote}
        </div>
      )}

      <JourneyBanner
        count={count}
        labels={stepByKey}
        signupRate={signupRate}
        className={cn('transition-opacity', loading && 'opacity-60')}
      />

      <section className={cn('space-y-3 transition-opacity', loading && 'opacity-60')}>
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-lg font-black text-slate-950 sm:text-xl">مراحل الرحلة</h2>
            <p className="text-xs font-semibold text-slate-500">
              اضغط على مرحلة من مراحل الحسابات لعرض أصحابها في الجدول بالأسفل
            </p>
          </div>
        </div>

        <StepTable
          steps={steps}
          selected={stepFilter}
          onSelect={chooseStep}
        />

        {biggestDrop && (
          <div className="flex items-start gap-3 rounded-[1.25rem] border border-red-100 bg-red-50/70 px-4 py-3">
            <GlossyTile icon={<TrendingDown />} tone="rose" className="size-10" />
            <div className="min-w-0 text-sm">
              <p className="font-black text-red-600">أكبر نقطة تسرّب</p>
              <p className="mt-0.5 font-semibold text-red-700/80">
                من «{biggestDrop.from.label}» إلى «{biggestDrop.step.label}» يكمل{' '}
                <span dir="ltr" className="font-black">
                  {percent(biggestDrop.step.count, biggestDrop.from.count)}%
                </span>{' '}
                فقط ({fmt(biggestDrop.step.count)} من {fmt(biggestDrop.from.count)}).
              </p>
            </div>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-black text-slate-950 sm:text-xl">الحسابات وأين وصلت</h2>
            <p className="text-xs font-semibold text-slate-500">
              {fmt(accounts?.total ?? 0)} حساب{filterLabel ? ` وصلوا إلى «${filterLabel}»` : ' أُنشئ في الفترة'}
            </p>
          </div>
          {filterLabel && (
            <button
              type="button"
              onClick={() => chooseStep(null)}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-violet-50 px-3 text-xs font-black text-violet-600 hover:bg-violet-100"
            >
              {filterLabel}
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <TableShell
          footer={
            (accounts?.total ?? 0) > 0 && (
              <Pagination
                page={page}
                totalPages={totalPages}
                pageSize={pageSize}
                onPageChange={setPage}
                onPageSizeChange={(size) => {
                  setPageSize(size);
                  setPage(1);
                }}
              />
            )
          }
        >
          {accountsLoading && !accounts ? (
            <div className="p-6">
              <LoadingState />
            </div>
          ) : !accounts?.data.length ? (
            <Illustrated
              icon={<SearchX />}
              title={filterLabel ? 'لا توجد حسابات وصلت إلى هذه المرحلة' : 'لا توجد حسابات جديدة في هذه الفترة'}
              hint={filterLabel ? 'جرّب مرحلة أبكر أو فترة أطول' : 'ستظهر هنا الحسابات فور تسجيلها، مع المراحل التي وصلت إليها'}
            />
          ) : (
            <table className={cn('w-full min-w-[760px] text-sm transition-opacity', accountsLoading && 'opacity-60')}>
              <thead>
                <tr className="border-b border-slate-100 text-xs font-black text-slate-500">
                  <th className="px-5 py-4 text-right">الحساب</th>
                  <th className="px-5 py-4 text-right">المتجر</th>
                  <th className="px-5 py-4 text-right">تاريخ التسجيل</th>
                  <th className="px-5 py-4 text-right">التقدّم</th>
                  <th className="px-5 py-4 text-right">آخر مرحلة</th>
                </tr>
              </thead>
              <tbody>
                {accounts.data.map((account) => {
                  const reached = new Set(account.steps);
                  const lastKey = [...accountStepKeys].reverse().find((key) => reached.has(key));
                  const last = lastKey ? stepByKey.get(lastKey) : undefined;
                  const done = accountStepKeys.filter((key) => reached.has(key)).length;
                  return (
                    <tr key={account.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
                      <td className="px-5 py-3.5" data-card="title">
                        <div className="flex items-center gap-3">
                          <UserAvatar seed={account.id} className="shadow-sm ring-2 ring-white" />
                          <div className="min-w-0">
                            <p className="truncate font-black text-slate-900">{account.name?.trim() || 'بدون اسم'}</p>
                            <p className="text-xs font-semibold text-slate-400" dir="ltr">
                              {formatPhone(account.phone)}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        {account.store ? (
                          <Link to={`/dashboard/stores/${account.store.id}`} className="group block min-w-0">
                            <p className="truncate font-bold text-slate-800 group-hover:text-violet-600">
                              {account.store.name || 'متجر بدون اسم'}
                            </p>
                            {account.store.subdomain && (
                              <p className="truncate text-xs font-semibold text-slate-400" dir="ltr">
                                {account.store.subdomain}.mel.iq
                              </p>
                            )}
                          </Link>
                        ) : (
                          <span className="text-xs font-bold text-slate-400">لا يوجد متجر</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 font-semibold text-slate-600" dir="ltr">
                        {formatDate(account.createdAt)}
                      </td>
                      <td className="px-5 py-3.5">
                        <ProgressDots keys={accountStepKeys} reached={reached} labels={stepByKey} />
                        <p className="mt-1 text-[11px] font-bold text-slate-400">
                          {done} من {accountStepKeys.length} مراحل
                        </p>
                      </td>
                      <td className="px-5 py-3.5">
                        {last ? (
                          <StatusPill tone={lastKey === 'paid' ? 'green' : lastKey === 'accounts' ? 'slate' : 'violet'} dot>
                            {last.label}
                          </StatusPill>
                        ) : (
                          '—'
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </TableShell>
      </section>

      <Card className="gap-0 rounded-[1.5rem] py-5 shadow-sm sm:rounded-[2rem]">
        <CardContent className="px-3 sm:px-5">
          <SectionTitle icon={<BarChart3 />} title="الزوار والحسابات يومياً" hint="بتوقيت بغداد" />
          <DailyChart data={data} />
        </CardContent>
      </Card>

      <VisitorInsights data={data} range={range} />
    </div>
  );
};

const RangeToggle = ({ value, onChange }: { value: number; onChange: (days: number) => void }) => (
  <div className="inline-flex h-12 w-full items-center gap-1 rounded-2xl bg-white p-1 shadow-sm ring-1 ring-slate-100 sm:w-auto">
    {RANGES.map((range) => (
      <button
        key={range.days}
        type="button"
        onClick={() => onChange(range.days)}
        className={cn(
          'h-10 flex-1 rounded-xl px-4 text-sm font-black whitespace-nowrap transition sm:flex-none',
          value === range.days
            ? 'bg-linear-to-l from-violet-700 to-fuchsia-500 text-white shadow-md shadow-violet-200'
            : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800',
        )}
      >
        {range.label}
      </button>
    ))}
  </div>
);

/**
 * Every milestone as one row of a single panel: its count, a bar against the
 * largest step of its group, and how many of the step before carried on.
 * Rows read top to bottom like the journey; account rows filter the table.
 */
const StepTable = ({
  steps,
  selected,
  onSelect,
}: {
  steps: JourneyStep[];
  selected: string | null;
  onSelect: (key: string | null) => void;
}) => {
  const groups = [
    { title: 'الزوار', hint: 'مجهولو الهوية، يحسبهم موقع mel.iq', rows: steps.slice(0, FIRST_ACCOUNT_STEP), offset: 0 },
    {
      title: 'الحسابات',
      hint: 'الحسابات التي أُنشئت في الفترة، وإلى أين وصلت حتى الآن',
      rows: steps.slice(FIRST_ACCOUNT_STEP),
      offset: FIRST_ACCOUNT_STEP,
    },
  ];

  return (
    <div className="overflow-hidden rounded-[1.5rem] border border-slate-100 bg-white shadow-[0_12px_35px_rgba(15,23,42,0.04)] sm:rounded-[2rem]">
      <div className="hidden grid-cols-[minmax(0,15rem)_minmax(0,1fr)_5rem_6.5rem_6rem] items-center gap-4 border-b border-slate-100 bg-slate-50/70 px-5 py-2.5 text-[11px] font-black text-slate-400 md:grid">
        <span>المرحلة</span>
        <span />
        <span className="text-left">العدد</span>
        <span className="text-center">من المرحلة السابقة</span>
        <span className="text-center">من الحسابات</span>
      </div>
      {groups.map((group) => {
        const max = Math.max(1, ...group.rows.map((r) => r.count));
        const base = group.offset === FIRST_ACCOUNT_STEP ? group.rows[0] : undefined;
        return (
          <div key={group.title}>
            <div className="flex flex-wrap items-baseline gap-x-2 border-b border-slate-100 bg-slate-50/40 px-4 py-2 sm:px-5">
              <span className="text-xs font-black text-slate-700">{group.title}</span>
              <span className="text-[11px] font-semibold text-slate-400">{group.hint}</span>
            </div>
            <ul>
              {group.rows.map((step, i) => {
                const index = i + group.offset;
                const prev = steps[index - 1];
                const rawKept = prev ? percent(step.count, prev.count) : null;
                // Steps counted on different groups of people can outnumber the one before.
                const kept = rawKept != null && rawKept <= 100 ? rawKept : null;
                const share = base && base.count && step !== base ? percent(step.count, base.count) : null;
                const look = lookOf(step.key);
                const clickable = group.offset === FIRST_ACCOUNT_STEP;
                const isSelected = selected === step.key;
                const Tag = clickable ? 'button' : 'div';
                return (
                  <li key={step.key} className="border-b border-slate-100/70 last:border-b-0">
                    <Tag
                      {...(clickable
                        ? { type: 'button' as const, onClick: () => onSelect(step.key), 'aria-pressed': isSelected }
                        : {})}
                      className={cn(
                        'grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 px-4 py-2.5 text-right transition sm:px-5 md:grid-cols-[minmax(0,15rem)_minmax(0,1fr)_5rem_6.5rem_6rem] md:gap-x-4',
                        clickable && 'cursor-pointer hover:bg-violet-50/50',
                        isSelected && 'bg-violet-50 ring-2 ring-violet-300 ring-inset',
                      )}
                    >
                      <span className="flex min-w-0 items-center gap-3">
                        <span className="w-4 shrink-0 text-center text-[10px] font-black text-slate-300">{index + 1}</span>
                        <span className="shrink-0 text-violet-500 [&_svg]:h-4 [&_svg]:w-4">{look.icon}</span>
                        <span className="min-w-0 truncate text-sm font-bold text-slate-800" title={step.note}>
                          {step.label}
                        </span>
                      </span>
                      <span className="text-left text-base font-black text-slate-950 md:order-3" dir="ltr">
                        {fmt(step.count)}
                      </span>
                      <span className="col-span-2 h-1.5 overflow-hidden rounded-full bg-slate-100 md:order-2 md:col-span-1">
                        <span
                          className="block h-full rounded-full bg-linear-to-l from-violet-600 to-fuchsia-400 transition-[width] duration-700"
                          style={{ width: `${Math.max(step.count ? 2 : 0, (step.count / max) * 100)}%` }}
                        />
                      </span>
                      <span
                        className={cn(
                          'col-span-2 flex items-center gap-2 text-[11px] font-bold text-slate-400 md:order-4 md:col-span-1 md:justify-center',
                          kept == null && share == null && 'max-md:hidden',
                        )}
                      >
                        <span className="md:hidden">من السابقة</span>
                        <span className={cn('rounded-lg px-1.5 py-0.5 text-[11px] font-black', keptTone(kept))} dir="ltr">
                          {kept == null ? '—' : `${kept}%`}
                        </span>
                        {share != null && (
                          <>
                            <span className="ms-2 md:hidden">من الحسابات</span>
                            <span className="text-[11px] font-black text-slate-500 md:hidden" dir="ltr">
                              {share}%
                            </span>
                          </>
                        )}
                      </span>
                      <span className="hidden text-center text-xs font-black text-slate-500 md:order-5 md:block" dir="ltr">
                        {share == null ? '' : `${share}%`}
                      </span>
                    </Tag>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </div>
  );
};

const ProgressDots = ({
  keys,
  reached,
  labels,
}: {
  keys: string[];
  reached: Set<string>;
  labels: Map<string, JourneyStep>;
}) => (
  <div className="flex items-center gap-1">
    {keys.map((key) => (
      <span
        key={key}
        title={labels.get(key)?.label}
        className={cn('h-2 w-5 rounded-full', reached.has(key) ? 'bg-linear-to-l from-violet-600 to-fuchsia-400' : 'bg-slate-200')}
      />
    ))}
  </div>
);

const SectionTitle = ({ icon, title, hint }: { icon: ReactNode; title: string; hint: string }) => (
  <div className="mb-4 flex items-center gap-3 px-2 sm:px-0">
    <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-violet-50 text-violet-500 [&_svg]:h-4.5 [&_svg]:w-4.5">
      {icon}
    </span>
    <div className="min-w-0">
      <p className="font-black text-slate-950">{title}</p>
      <p className="text-[11px] font-semibold text-slate-400">{hint}</p>
    </div>
  </div>
);

const DailyChart = ({ data }: { data: JourneyFunnel | null }) => {
  const option = useMemo<EChartsOption>(() => {
    const points = data?.daily ?? [];
    return {
      tooltip: { trigger: 'axis', textStyle: { fontFamily: 'Setar XS, sans-serif' } },
      legend: {
        bottom: 0,
        icon: 'circle',
        textStyle: { color: '#64748b', fontWeight: 700, fontFamily: 'Setar XS, sans-serif' },
      },
      grid: { left: 8, right: 8, top: 16, bottom: 40, containLabel: true },
      xAxis: {
        type: 'category',
        data: points.map((p) => p.day.slice(5)),
        axisTick: { show: false },
        axisLine: { lineStyle: { color: '#e2e8f0' } },
        axisLabel: { color: '#94a3b8', fontWeight: 700 },
      },
      yAxis: [
        {
          type: 'value',
          minInterval: 1,
          splitLine: { lineStyle: { color: 'rgba(148,163,184,0.18)' } },
          axisLabel: { color: '#94a3b8', fontWeight: 600 },
        },
        { type: 'value', minInterval: 1, splitLine: { show: false }, axisLabel: { color: '#10b981', fontWeight: 600 } },
      ],
      series: [
        {
          name: 'الزوار',
          type: 'bar',
          barMaxWidth: 18,
          itemStyle: {
            borderRadius: [6, 6, 0, 0],
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: '#a855f7' },
                { offset: 1, color: '#7c3aed' },
              ],
            },
          },
          data: points.map((p) => p.visitors),
        },
        {
          name: 'حسابات جديدة',
          type: 'line',
          yAxisIndex: 1,
          smooth: true,
          symbol: 'circle',
          symbolSize: 6,
          lineStyle: { width: 3, color: '#10b981' },
          itemStyle: { color: '#10b981' },
          data: points.map((p) => p.accounts),
        },
      ],
    };
  }, [data]);

  const empty = !data?.daily.some((p) => p.visitors || p.accounts);
  if (empty) {
    return (
      <div className="grid h-[300px] place-items-center">
        <Illustrated icon={<BarChart3 />} title="لا شيء ينمو هنا بعد" hint="سيظهر الرسم عند أول زيارة أو حساب جديد في هذه الفترة" />
      </div>
    );
  }
  return <ReactECharts option={option} style={{ height: 300 }} notMerge />;
};

/** A gradient tile with a white icon, lit by a soft glow in its own colour. */
const GlossyTile = ({ icon, tone, className }: { icon: ReactNode; tone: StatTone; className?: string }) => (
  <span
    className={cn(
      'grid size-12 shrink-0 place-items-center rounded-2xl bg-linear-to-br text-white shadow-lg ring-1 ring-white/30 ring-inset sm:size-14',
      '[&_svg]:h-5 [&_svg]:w-5 [&_svg]:stroke-[2.2] sm:[&_svg]:h-6 sm:[&_svg]:w-6',
      toneTile[tone].tile,
      className,
    )}
  >
    {icon}
  </span>
);

/**
 * Empty state drawn in code: a glass tile floating in rings of light, the
 * same language as the banner, instead of a stock picture.
 */
const Illustrated = ({
  icon,
  title,
  hint,
  compact,
}: {
  icon: ReactNode;
  title: string;
  hint?: string;
  compact?: boolean;
}) => (
  <div className={cn('flex flex-col items-center text-center', compact ? 'py-4' : 'px-6 py-10')}>
    <span aria-hidden className={cn('relative grid place-items-center', compact ? 'size-24' : 'size-36')}>
      <span className="absolute inset-0 rounded-full border border-violet-200/60" />
      <span className="absolute inset-[14%] rounded-full border border-dashed border-violet-300/70" />
      <span className="absolute inset-[26%] rounded-full bg-linear-to-br from-violet-400/40 via-fuchsia-300/30 to-cyan-300/30 blur-xl" />
      <span className="absolute top-[12%] right-[18%] size-2 rounded-full bg-fuchsia-400 shadow-[0_0_12px_rgba(232,121,249,0.9)]" />
      <span className="absolute bottom-[16%] left-[14%] size-1.5 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.9)]" />
      <span
        className={cn(
          'relative grid place-items-center rounded-2xl bg-white/70 text-violet-600 shadow-[0_12px_30px_rgba(124,58,237,0.25)] ring-1 ring-white backdrop-blur-md',
          compact ? 'size-11 [&_svg]:h-5 [&_svg]:w-5' : 'size-16 [&_svg]:h-7 [&_svg]:w-7',
        )}
      >
        {icon}
      </span>
    </span>
    <p className={cn('mt-4 font-black text-slate-600', compact ? 'text-sm' : 'text-base sm:text-lg')}>{title}</p>
    {hint && <p className="mt-1 max-w-xs text-xs font-semibold text-slate-400">{hint}</p>}
  </div>
);

/** Where each spark starts and how fast it runs; fixed so renders stay stable. */
const PARTICLES = [
  { y: -4, duration: 4.2, delay: 0 },
  { y: 3, duration: 5.1, delay: 1.1 },
  { y: 0, duration: 3.7, delay: 2.3 },
  { y: -2, duration: 4.8, delay: 3.2 },
  { y: 5, duration: 5.6, delay: 0.6 },
  { y: -6, duration: 4.4, delay: 2.8 },
];

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** A figure that counts up from zero once it appears. */
const CountUp = ({ value, delay = 0, duration = 1100 }: { value: number; delay?: number; duration?: number }) => {
  const [shown, setShown] = useState(() => (prefersReducedMotion() ? value : 0));

  useEffect(() => {
    const still = prefersReducedMotion();
    let frame = 0;
    const startAt = performance.now() + delay;
    const tick = (now: number) => {
      const t = still ? 1 : Math.min(1, Math.max(0, (now - startAt) / duration));
      // Ease out: quick at first, settling on the real figure.
      setShown(Math.round(value * (1 - (1 - t) ** 3)));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, delay, duration]);

  return <>{fmt(shown)}</>;
};

/** Smooth curve through `points`, as path commands after the first point. */
const curveThrough = (points: Array<[number, number]>) =>
  points
    .slice(1)
    .map(([x1, y1], i) => {
      const [x0, y0] = points[i];
      const cx = (x0 + x1) / 2;
      return `C ${cx} ${y0}, ${cx} ${y1}, ${x1} ${y1}`;
    })
    .join(' ');

/**
 * The funnel as a picture: one glowing glass ribbon that narrows with each
 * milestone. Its height follows each count to the power 0.7: close to
 * proportional, yet a step with a hundredth of the largest still reads as a
 * shape, not a hairline.
 */
const FunnelRibbon = ({ values }: { values: number[] }) => {
  const W = 1000;
  const H = 200;
  const mid = H / 2;
  // Scaled to the largest figure, not the first: visitors are only counted
  // since tracking began, so account steps can outnumber them.
  const top = Math.max(1, ...values);
  const half = values.map((v) => (Math.max(0.1, (v / top) ** 0.7) * (H - 24)) / 2);
  const step = W / values.length;
  // Right to left: the first milestone sits on the right, as the page reads.
  const xs = values.map((_, i) => W - step * (i + 0.5));
  const upper = xs.map((x, i): [number, number] => [x, mid - half[i]]);
  const lower = xs.map((x, i): [number, number] => [x, mid + half[i]]).reverse();
  const last = values.length - 1;
  const path = [
    `M ${W} ${upper[0][1]}`,
    `L ${upper[0][0]} ${upper[0][1]}`,
    curveThrough(upper),
    `L 0 ${upper[last][1]}`,
    `L 0 ${lower[0][1]}`,
    `L ${lower[0][0]} ${lower[0][1]}`,
    curveThrough(lower),
    `L ${W} ${lower[last][1]}`,
    'Z',
  ].join(' ');

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden>
      <defs>
        <linearGradient id="journey-ribbon" x1="1" x2="0" y1="0" y2="0">
          <stop offset="0" stopColor="#a78bfa" />
          <stop offset="0.5" stopColor="#d946ef" />
          <stop offset="1" stopColor="#22d3ee" />
        </linearGradient>
        <linearGradient id="journey-sheen" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.45" />
          <stop offset="0.45" stopColor="#fff" stopOpacity="0.06" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <filter id="journey-glow" x="-10%" y="-40%" width="120%" height="180%">
          <feGaussianBlur stdDeviation="18" />
        </filter>
        {/* A band of light that keeps flowing through the ribbon, right to left. */}
        <linearGradient id="journey-flow" gradientUnits="userSpaceOnUse" x1="0" x2="260" y1="0" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0.38" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
          <animateTransform
            attributeName="gradientTransform"
            type="translate"
            from={`${W} 0`}
            to="-260 0"
            dur="3.6s"
            repeatCount="indefinite"
          />
        </linearGradient>
        <clipPath id="journey-clip">
          <path d={path} />
        </clipPath>
      </defs>
      <path d={path} fill="url(#journey-ribbon)" opacity="0.55" filter="url(#journey-glow)" className="journey-breathe" />
      <path d={path} fill="url(#journey-ribbon)" opacity="0.85" />
      <path d={path} fill="url(#journey-sheen)" />
      <rect width={W} height={H} fill="url(#journey-flow)" clipPath="url(#journey-clip)" className="journey-motion" />
      <path d={path} fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
      {xs.slice(0, -1).map((x) => (
        <line
          key={x}
          x1={x - step / 2}
          x2={x - step / 2}
          y1={0}
          y2={H}
          stroke="rgba(255,255,255,0.14)"
          strokeDasharray="4 6"
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </svg>
  );
};

/**
 * The page's opening picture: a dark glass panel with the funnel from a visit
 * to a payment drawn as a glowing ribbon, each milestone's figure on it.
 */
const JourneyBanner = ({
  count,
  labels,
  signupRate,
  className,
}: {
  count: (key: string) => number;
  labels: Map<string, JourneyStep>;
  signupRate: number | null;
  className?: string;
}) => {
  const visitors = count('visitors');
  const accounts = count('accounts');
  const values = HERO_STEPS.map((key) => count(key));
  const headline = visitors
    ? accounts > visitors
      ? `${fmt(visitors)} زائر و${fmt(accounts)} حساب جديد في هذه الفترة`
      : accounts
      ? `${fmt(visitors)} زائر في هذه الفترة، و${fmt(accounts)} منهم بدأوا رحلتهم بحساب`
      : `${fmt(visitors)} زائر في هذه الفترة، ولم يُنشئ أحد منهم حساباً بعد`
    : accounts
      ? `${fmt(accounts)} حساب جديد في هذه الفترة`
      : 'الطريق جاهز، بانتظار أول زائر';

  return (
    <section
      className={cn(
        'relative isolate overflow-hidden rounded-[1.5rem] bg-[#0c0a1f] p-5 text-white shadow-[0_20px_50px_rgba(15,10,40,0.22)] sm:rounded-[2rem] sm:p-7',
        className,
      )}
    >
      {/* Mesh light and a faint grid that fades toward the edges. */}
      <span aria-hidden className="absolute -top-32 -right-20 -z-10 size-96 rounded-full bg-violet-600/40 blur-3xl" />
      <span aria-hidden className="absolute -bottom-40 left-1/4 -z-10 size-96 rounded-full bg-fuchsia-500/25 blur-3xl" />
      <span aria-hidden className="absolute -top-20 -left-24 -z-10 size-72 rounded-full bg-cyan-400/20 blur-3xl" />
      <span
        aria-hidden
        className="absolute inset-0 -z-10 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] mask-[radial-gradient(ellipse_at_center,black_35%,transparent_80%)] bg-size-[32px_32px]"
      />

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-bold text-violet-200 ring-1 ring-white/15">
            <span className="size-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]" />
            من أول زيارة إلى أول دفعة
          </p>
          <h2 className="mt-3 text-lg leading-snug font-black sm:text-2xl">{headline}</h2>
        </div>
        <div className="rounded-2xl bg-white/10 px-4 py-2.5 text-center ring-1 ring-white/15 backdrop-blur-md">
          <p
            className="bg-linear-to-l from-fuchsia-300 to-cyan-300 bg-clip-text text-2xl leading-none font-black text-transparent"
            dir="ltr"
          >
            {signupRate == null ? '—' : `${signupRate}%`}
          </p>
          <p className="mt-1 text-[10px] font-bold text-white/60">نسبة التسجيل</p>
        </div>
      </div>

      {/* Keyed on the figures so the ribbon draws itself again for a new range. */}
      <div key={values.join('-')} className="relative mt-6 h-32 sm:mt-8 sm:h-44">
        <div className="journey-reveal absolute inset-0">
          <FunnelRibbon values={values} />
          {/* Sparks travelling along the ribbon, from the first step to the last. */}
          {PARTICLES.map((p, i) => (
            <span
              key={i}
              aria-hidden
              className="journey-particle absolute top-1/2 size-1.5 -translate-y-1/2 rounded-full bg-white shadow-[0_0_10px_3px_rgba(255,255,255,0.7)]"
              style={{ marginTop: p.y, animationDuration: `${p.duration}s`, animationDelay: `${p.delay}s` }}
            />
          ))}
        </div>
        <ol className="relative grid h-full grid-cols-5">
          {HERO_STEPS.map((key, i) => (
            <li key={key} className="grid min-w-0 place-items-center">
              <span
                className="journey-pop text-lg leading-none font-black drop-shadow-[0_2px_6px_rgba(12,10,31,0.6)] sm:text-3xl"
                style={{ animationDelay: `${0.15 + i * 0.18}s` }}
                dir="ltr"
              >
                <CountUp value={values[i]} delay={150 + i * 180} />
              </span>
            </li>
          ))}
        </ol>
      </div>
      <ol className="mt-4 grid grid-cols-5 gap-1">
        {HERO_STEPS.map((key) => (
          <li key={key} className="flex min-w-0 flex-col items-center gap-1.5 text-center">
            <span className="grid size-7 place-items-center rounded-lg bg-white/10 text-white/90 ring-1 ring-white/15 [&_svg]:h-3.5 [&_svg]:w-3.5">
              {lookOf(key).icon}
            </span>
            <span className="line-clamp-2 text-[10px] leading-tight font-bold text-white/70 sm:text-xs">
              {labels.get(key)?.label ?? ''}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
};

export default VisitorJourney;
