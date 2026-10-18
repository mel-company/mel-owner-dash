import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import { BarChart3, Link2, Route as RouteIcon, Smartphone, X } from 'lucide-react';
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

/** Each step's illustration is `/journey/<key>.webp` (Fluent Emoji 3D, see public/journey/LICENSE.txt). */
const stepTone: Record<string, StatTone> = {
  visitors: 'violet',
  signup_open: 'cyan',
  accounts: 'blue',
  stores: 'teal',
  ai_design: 'violet',
  editor: 'amber',
  published: 'emerald',
  products: 'blue',
  orders: 'rose',
  paid: 'amber',
};

/** Soft backdrop behind a step's illustration, and the glow in the card corner. */
const toneBackdrop: Record<StatTone, { chip: string; glow: string }> = {
  blue: { chip: 'from-blue-50 to-blue-100/70', glow: 'bg-blue-100/60' },
  cyan: { chip: 'from-cyan-50 to-cyan-100/70', glow: 'bg-cyan-100/60' },
  teal: { chip: 'from-teal-50 to-teal-100/70', glow: 'bg-teal-100/60' },
  amber: { chip: 'from-orange-50 to-amber-100/70', glow: 'bg-amber-100/60' },
  rose: { chip: 'from-rose-50 to-rose-100/70', glow: 'bg-rose-100/60' },
  violet: { chip: 'from-violet-50 to-fuchsia-100/70', glow: 'bg-violet-100/60' },
  emerald: { chip: 'from-emerald-50 to-emerald-100/70', glow: 'bg-emerald-100/60' },
  slate: { chip: 'from-slate-50 to-slate-100', glow: 'bg-slate-100' },
};

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

const sourceLabels: Record<string, string> = {
  direct: 'مباشر / بدون مصدر',
  'google.com': 'Google',
  'facebook.com': 'Facebook',
  'm.facebook.com': 'Facebook',
  'l.facebook.com': 'Facebook',
  'lm.facebook.com': 'Facebook',
  'instagram.com': 'Instagram',
  'l.instagram.com': 'Instagram',
  'tiktok.com': 'TikTok',
  't.co': 'X (Twitter)',
};

const deviceLabels: Record<string, string> = { mobile: 'هاتف', desktop: 'حاسوب', unknown: 'غير معروف' };

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
  const signupRate = percent(newAccounts, visitors);
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
          <Art name="compass" className="size-9 shrink-0" />
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

        <StepGroup title="الزوار" hint="مجهولو الهوية، يحسبهم موقع mel.iq" className="md:grid-cols-2">
          {steps.slice(0, FIRST_ACCOUNT_STEP).map((step, index) => (
            <StepCard key={step.key} step={step} index={index} prev={steps[index - 1]} />
          ))}
        </StepGroup>

        <StepGroup title="الحسابات" hint="الحسابات التي أُنشئت في الفترة، وإلى أين وصلت حتى الآن">
          {steps.slice(FIRST_ACCOUNT_STEP).map((step, i) => {
            const index = i + FIRST_ACCOUNT_STEP;
            return (
              <StepCard
                key={step.key}
                step={step}
                index={index}
                prev={steps[index - 1]}
                base={steps[FIRST_ACCOUNT_STEP]}
                selected={stepFilter === step.key}
                onSelect={() => chooseStep(step.key)}
              />
            );
          })}
        </StepGroup>

        {biggestDrop && (
          <div className="flex items-start gap-3 rounded-[1.25rem] border border-red-100 bg-red-50/70 px-4 py-3">
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-white shadow-sm">
              <Art name="drop" className="size-9" />
            </span>
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
              art="telescope"
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

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="gap-0 rounded-[1.5rem] py-5 shadow-sm xl:col-span-2 sm:rounded-[2rem]">
          <CardContent className="px-3 sm:px-5">
            <SectionTitle icon={<BarChart3 />} title="الزوار والحسابات يومياً" hint="بتوقيت بغداد" />
            <DailyChart data={data} />
          </CardContent>
        </Card>
        <div className="grid gap-4">
          <Card className="gap-0 rounded-[1.5rem] py-5 shadow-sm sm:rounded-[2rem]">
            <CardContent className="px-5">
              <SectionTitle icon={<Link2 />} title="من أين يأتي الزوار" hint="utm_source أو الموقع السابق" />
              <ShareList
                art="globe"
                rows={(data?.sources ?? []).map((s) => ({ key: s.source, label: sourceLabels[s.source] ?? s.source, value: s.visits }))}
              />
            </CardContent>
          </Card>
          <Card className="gap-0 rounded-[1.5rem] py-5 shadow-sm sm:rounded-[2rem]">
            <CardContent className="px-5">
              <SectionTitle icon={<Smartphone />} title="الأجهزة" hint="زيارات حسب نوع الجهاز" />
              <ShareList
                art="phone"
                rows={(data?.devices ?? []).map((d) => ({ key: d.device, label: deviceLabels[d.device] ?? d.device, value: d.visits }))}
              />
            </CardContent>
          </Card>
        </div>
      </div>
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

const StepGroup = ({
  title,
  hint,
  children,
  className,
}: {
  title: string;
  hint: string;
  children: ReactNode;
  className?: string;
}) => (
  <div className="rounded-[1.5rem] border border-slate-100 bg-white/60 p-3 sm:rounded-[2rem] sm:p-4">
    <div className="mb-3 flex flex-wrap items-baseline gap-x-2 px-1">
      <span className="text-sm font-black text-slate-800">{title}</span>
      <span className="text-[11px] font-semibold text-slate-400">{hint}</span>
    </div>
    <div className={cn('grid grid-cols-2 gap-3 md:grid-cols-4', className)}>{children}</div>
  </div>
);

const StepCard = ({
  step,
  index,
  prev,
  base,
  selected,
  onSelect,
}: {
  step: JourneyStep;
  index: number;
  prev?: JourneyStep;
  /** The first account step: the bar shows how much of it is left. */
  base?: JourneyStep;
  selected?: boolean;
  onSelect?: () => void;
}) => {
  const tone = toneBackdrop[stepTone[step.key] ?? 'slate'];
  const kept = prev ? percent(step.count, prev.count) : null;
  const share = base && base.count ? Math.min(100, (step.count / base.count) * 100) : null;
  const Tag = onSelect ? 'button' : 'div';

  return (
    <Tag
      {...(onSelect ? { type: 'button' as const, onClick: onSelect, 'aria-pressed': selected } : {})}
      className={cn(
        'relative isolate flex h-full flex-col overflow-hidden rounded-[1.25rem] border bg-white p-3.5 text-right shadow-[0_12px_35px_rgba(15,23,42,0.04)] transition sm:p-4',
        onSelect && 'cursor-pointer hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgba(124,58,237,0.10)]',
        selected ? 'border-violet-400 ring-2 ring-violet-200' : 'border-slate-100',
      )}
    >
      <span aria-hidden className={cn('absolute -top-10 -left-10 -z-10 size-32 rounded-full blur-2xl', tone.glow)} />
      <div className="flex items-start justify-between gap-2">
        <span className={cn('grid size-14 shrink-0 place-items-center rounded-2xl bg-linear-to-br sm:size-16', tone.chip)}>
          <Art name={step.key} className="size-10 drop-shadow-[0_6px_8px_rgba(15,23,42,0.18)] sm:size-12" />
        </span>
        <span className="rounded-lg bg-slate-50 px-2 py-0.5 text-[10px] font-black text-slate-400">{index + 1}</span>
      </div>
      <p className="mt-3 line-clamp-2 text-xs leading-snug font-black text-slate-700 sm:text-sm">{step.label}</p>
      <div className="mt-1 flex flex-wrap items-center gap-1.5">
        <span className="text-2xl leading-none font-black text-slate-950" dir="ltr">
          {fmt(step.count)}
        </span>
        {kept != null && (
          <span className={cn('rounded-lg px-1.5 py-0.5 text-[10px] font-black', keptTone(kept))} dir="ltr">
            {kept}%
          </span>
        )}
      </div>
      <p className="mt-1 text-[11px] font-semibold text-slate-400">{step.note}</p>
      {share != null && (
        <div className="mt-auto pt-3">
          <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-linear-to-l from-violet-600 to-fuchsia-400" style={{ width: `${share}%` }} />
          </div>
        </div>
      )}
    </Tag>
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
        <Illustrated art="seedling" title="لا شيء ينمو هنا بعد" hint="سيظهر الرسم عند أول زيارة أو حساب جديد في هذه الفترة" />
      </div>
    );
  }
  return <ReactECharts option={option} style={{ height: 300 }} notMerge />;
};

const ShareList = ({ rows, art }: { rows: Array<{ key: string; label: string; value: number }>; art: string }) => {
  const total = rows.reduce((sum, row) => sum + row.value, 0);
  if (!rows.length) return <Illustrated art={art} title="لا توجد زيارات بعد" compact />;
  return (
    <ul className="space-y-3">
      {rows.map((row) => (
        <li key={row.key}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate font-bold text-slate-700" dir="auto">
              {row.label}
            </span>
            <span className="shrink-0 font-black text-slate-950" dir="ltr">
              {fmt(row.value)}{' '}
              <span className="text-[11px] font-bold text-slate-400">{percent(row.value, total) ?? 0}%</span>
            </span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-linear-to-l from-violet-600 to-fuchsia-400"
              style={{ width: `${(row.value / Math.max(1, total)) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
};

const Art = ({ name, className }: { name: string; className?: string }) => (
  <img src={`/journey/${name}.webp`} alt="" draggable={false} className={cn('select-none', className)} />
);

const Illustrated = ({ art, title, hint, compact }: { art: string; title: string; hint?: string; compact?: boolean }) => (
  <div className={cn('flex flex-col items-center text-center', compact ? 'py-4' : 'px-6 py-10')}>
    <span className={cn('relative grid place-items-center', compact ? 'size-20' : 'size-28')}>
      <span aria-hidden className="absolute inset-2 rounded-full bg-linear-to-br from-violet-100 to-fuchsia-50 blur-md" />
      <Art name={art} className={cn('relative drop-shadow-[0_10px_14px_rgba(76,29,149,0.18)]', compact ? 'size-14' : 'size-20')} />
    </span>
    <p className={cn('mt-2 font-black text-slate-600', compact ? 'text-sm' : 'text-base sm:text-lg')}>{title}</p>
    {hint && <p className="mt-1 max-w-xs text-xs font-semibold text-slate-400">{hint}</p>}
  </div>
);

/**
 * The page's opening picture: the road from a visit to a payment, with each
 * milestone's figure for the range under its illustration.
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
  const headline = visitors
    ? accounts
      ? `${fmt(visitors)} زائر في هذه الفترة، و${fmt(accounts)} منهم بدأوا رحلتهم بحساب`
      : `${fmt(visitors)} زائر في هذه الفترة، ولم يُنشئ أحد منهم حساباً بعد`
    : accounts
      ? `${fmt(accounts)} حساب جديد في هذه الفترة`
      : 'الطريق جاهز، بانتظار أول زائر';

  return (
    <section
      className={cn(
        'relative isolate overflow-hidden rounded-[1.5rem] bg-linear-to-bl from-violet-700 via-violet-600 to-fuchsia-500 p-5 text-white shadow-[0_14px_32px_rgba(124,58,237,0.22)] sm:rounded-[2rem] sm:p-7',
        className,
      )}
    >
      <span aria-hidden className="absolute -top-24 -right-16 -z-10 size-72 rounded-full bg-white/10 blur-2xl" />
      <span aria-hidden className="absolute -bottom-28 left-10 -z-10 size-72 rounded-full bg-fuchsia-300/25 blur-3xl" />

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold text-white/70">من أول زيارة إلى أول دفعة</p>
          <h2 className="mt-1 text-lg leading-snug font-black sm:text-2xl">{headline}</h2>
        </div>
        <div className="rounded-2xl bg-white/15 px-3.5 py-2 text-center ring-1 ring-white/25 backdrop-blur-sm">
          <p className="text-xl leading-none font-black" dir="ltr">
            {signupRate == null ? '—' : `${signupRate}%`}
          </p>
          <p className="mt-1 text-[10px] font-bold text-white/75">نسبة التسجيل</p>
        </div>
      </div>

      <div className="relative mt-6 sm:mt-8">
        {/* The road: a dashed wave behind the milestones. */}
        <svg
          aria-hidden
          viewBox="0 0 1000 80"
          preserveAspectRatio="none"
          className="absolute inset-x-[10%] top-5 -z-10 h-12 w-[80%] sm:top-7 sm:h-14"
        >
          <path
            d="M0 40 C 125 0, 125 80, 250 40 S 375 0, 500 40 S 625 80, 750 40 S 875 0, 1000 40"
            fill="none"
            stroke="rgba(255,255,255,0.55)"
            strokeWidth="3"
            strokeDasharray="10 12"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        <ol className="grid grid-cols-5 gap-1 sm:gap-3">
          {HERO_STEPS.map((key) => (
            <li key={key} className="flex min-w-0 flex-col items-center text-center">
              <span className="grid size-14 place-items-center rounded-full bg-white/20 shadow-[0_10px_25px_rgba(46,16,101,0.25)] ring-1 ring-white/35 backdrop-blur-sm sm:size-20">
                <Art name={key} className="size-10 drop-shadow-[0_6px_8px_rgba(46,16,101,0.35)] sm:size-14" />
              </span>
              <p className="mt-2 text-lg leading-none font-black sm:text-2xl" dir="ltr">
                {fmt(count(key))}
              </p>
              <p className="mt-1 line-clamp-2 text-[10px] leading-tight font-bold text-white/80 sm:text-xs">
                {labels.get(key)?.label ?? ''}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
};

export default VisitorJourney;
