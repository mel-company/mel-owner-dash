import { useCallback, useEffect, useMemo, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import { Info, Route as RouteIcon } from 'lucide-react';
import { AlertMessage, LoadingState, PageHeader } from '@/components/dashboard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { journeyService, type JourneyFunnel, type JourneyStep } from '../services/journeyService';

/**
 * رحلة الزوار: from a visit to mel.iq to a paying merchant.
 *
 * Visitors are counted by the landing page itself (anonymous, once a day per
 * browser). From «أنشأوا حساباً» on, each step counts the accounts created in
 * the range that have reached it by now.
 */

const RANGES = [
  { days: 1, label: 'اليوم' },
  { days: 7, label: '7 أيام' },
  { days: 30, label: '30 يوم' },
  { days: 90, label: '90 يوم' },
] as const;

const RANGE_STORAGE_KEY = 'visitor-journey:days';

/** Baghdad calendar day `offset` days from today, `YYYY-MM-DD`. */
const baghdadDay = (offset = 0) =>
  new Date(Date.now() + 3 * 3600_000 + offset * 86400_000).toISOString().slice(0, 10);

const fmt = (n: number) => n.toLocaleString('en-US');

const percent = (part: number, whole: number) => {
  if (!whole) return null;
  const value = (part / whole) * 100;
  return value >= 10 ? Math.round(value) : Math.round(value * 10) / 10;
};

const errorMessage = (err: unknown, fallback: string) => {
  const message = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
  if (Array.isArray(message)) return message[0] ?? fallback;
  return message || fallback;
};

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

const deviceLabels: Record<string, string> = {
  mobile: 'هاتف',
  desktop: 'حاسوب',
  unknown: 'غير معروف',
};

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

  const load = useCallback(async (rangeDays: number) => {
    setLoading(true);
    setError('');
    try {
      setData(await journeyService.funnel({ from: baghdadDay(-(rangeDays - 1)), to: baghdadDay() }));
    } catch (err) {
      setError(errorMessage(err, 'تعذر تحميل رحلة الزوار'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(days);
    try {
      window.localStorage.setItem(RANGE_STORAGE_KEY, String(days));
    } catch {
      // Remembering the range is a convenience only.
    }
  }, [days, load]);

  const steps = useMemo(() => data?.steps ?? [], [data]);
  // Two scales: visitors dwarf everything after them, so the account steps get
  // bars of their own, measured against the largest account step.
  const visitorMax = Math.max(1, ...steps.slice(0, 2).map((s) => s.count));
  const accountMax = Math.max(1, ...steps.slice(2).map((s) => s.count));

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
    if (!data.trackingSince) return 'لم يصل أي زائر بعد: عدّ الزوار يبدأ بعد نشر التحديث على mel.iq. باقي الخطوات محسوبة من بيانات المنصة.';
    const since = data.trackingSince.slice(0, 10);
    if (since > data.range.from) {
      return `عدّ الزوار بدأ في ${since}، لذلك أول خطوتين لا تشملان ما قبل هذا التاريخ. باقي الخطوات محسوبة من بيانات المنصة.`;
    }
    return null;
  }, [data]);

  const dailyOption = useMemo<EChartsOption>(() => {
    const points = data?.daily ?? [];
    return {
      tooltip: { trigger: 'axis', textStyle: { fontFamily: 'Setar XS, sans-serif' } },
      legend: {
        bottom: 0,
        textStyle: { color: '#64748b', fontWeight: 700, fontFamily: 'Setar XS, sans-serif' },
      },
      grid: { left: 12, right: 12, top: 24, bottom: 48, containLabel: true },
      xAxis: {
        type: 'category',
        data: points.map((p) => p.day.slice(5)),
        axisTick: { show: false },
        axisLine: { lineStyle: { color: '#e2e8f0' } },
        axisLabel: { color: '#64748b', fontWeight: 700 },
      },
      yAxis: {
        type: 'value',
        minInterval: 1,
        splitLine: { lineStyle: { color: 'rgba(148,163,184,0.18)' } },
        axisLabel: { color: '#64748b', fontWeight: 600 },
      },
      series: [
        {
          name: 'الزوار',
          type: 'line',
          smooth: true,
          symbol: 'circle',
          symbolSize: 6,
          areaStyle: { color: 'rgba(125,38,247,0.10)' },
          lineStyle: { width: 3, color: '#7d26f7' },
          itemStyle: { color: '#7d26f7' },
          data: points.map((p) => p.visitors),
        },
        {
          name: 'حسابات جديدة',
          type: 'line',
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

  if (loading && !data) return <LoadingState />;

  const totalSourceVisits = (data?.sources ?? []).reduce((sum, s) => sum + s.visits, 0);
  const totalDeviceVisits = (data?.devices ?? []).reduce((sum, d) => sum + d.visits, 0);

  return (
    <div className="page-shell bg-[#f8fafc] text-right" dir="rtl">
      <PageHeader
        title="رحلة الزوار"
        description="من زيارة mel.iq حتى أول طلب واشتراك مدفوع"
        icon={<RouteIcon className="h-6 w-6" />}
        action={
          <div className="inline-flex h-11 w-full items-center gap-1 rounded-2xl bg-white p-1 shadow-sm ring-1 ring-slate-100 sm:w-auto">
            {RANGES.map((range) => (
              <Button
                key={range.days}
                type="button"
                variant={days === range.days ? 'default' : 'ghost'}
                onClick={() => setDays(range.days)}
                className={cn(
                  'h-9 flex-1 rounded-xl px-3 text-sm font-black sm:flex-none',
                  days === range.days && 'bg-[#7D26F7] text-white hover:bg-[#7D26F7]',
                )}
              >
                {range.label}
              </Button>
            ))}
          </div>
        }
      />

      {error && <AlertMessage>{error}</AlertMessage>}

      {trackingNote && (
        <div className="flex items-start gap-2 rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3 text-sm font-semibold text-sky-700">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          {trackingNote}
        </div>
      )}

      <Card className={cn('gap-4 py-5', loading && 'opacity-60')}>
        <CardHeader className="px-5">
          <CardTitle className="text-lg font-black">مراحل الرحلة</CardTitle>
          <CardDescription>
            {data ? `${data.range.from} ← ${data.range.to}` : ''} · النسبة من الخطوة السابقة
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 px-5 pt-0">
          {steps.map((step, index) => {
            const prev = index > 0 ? steps[index - 1] : null;
            const fromPrev = prev ? percent(step.count, prev.count) : null;
            const fromFirst = index > 0 ? percent(step.count, steps[0].count) : null;
            const isDrop = biggestDrop?.step.key === step.key;
            return (
              <div key={step.key}>
                {index === 2 && (
                  <p className="mb-3 border-t border-dashed border-slate-200 pt-3 text-[11px] font-bold text-slate-400">
                    من هنا: الحسابات التي أُنشئت في الفترة، وإلى أين وصلت حتى الآن
                  </p>
                )}
                <div className="flex items-baseline justify-between gap-3">
                  <div className="min-w-0">
                    <span className="text-sm font-black text-slate-900">
                      {index + 1}. {step.label}
                    </span>
                    <span className="mr-2 text-[11px] font-semibold text-slate-400">{step.note}</span>
                  </div>
                  <div className="flex shrink-0 items-baseline gap-2" dir="ltr">
                    <span className="text-lg font-black text-slate-950">{fmt(step.count)}</span>
                    {fromPrev != null && (
                      <span
                        className={cn(
                          'rounded-lg px-1.5 py-0.5 text-[11px] font-black',
                          isDrop ? 'bg-rose-50 text-rose-600' : 'bg-slate-100 text-slate-500',
                        )}
                      >
                        {fromPrev}%
                      </span>
                    )}
                  </div>
                </div>
                <div className="mt-1.5 h-3 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={cn('h-full rounded-full', index < 2 ? 'bg-[#7D26F7]' : 'bg-emerald-500')}
                    style={{ width: `${Math.max(step.count ? 1.5 : 0, (step.count / (index < 2 ? visitorMax : accountMax)) * 100)}%` }}
                  />
                </div>
                {fromFirst != null && index >= 2 && steps[0].count > 0 && (
                  <p className="mt-1 text-[11px] font-semibold text-slate-400">{fromFirst}% من الزوار</p>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {biggestDrop && (
        <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          أكبر نقطة تسرب: من «{biggestDrop.from.label}» إلى «{biggestDrop.step.label}» يكمل{' '}
          {percent(biggestDrop.step.count, biggestDrop.from.count)}% فقط ({fmt(biggestDrop.step.count)} من{' '}
          {fmt(biggestDrop.from.count)}).
        </div>
      )}

      <Card className="gap-4 py-5">
        <CardHeader className="px-5">
          <CardTitle className="text-lg font-black">الزوار والحسابات يومياً</CardTitle>
          <CardDescription>بتوقيت بغداد</CardDescription>
        </CardHeader>
        <CardContent className="px-2 pt-0 sm:px-5">
          <ReactECharts option={dailyOption} style={{ height: 300 }} notMerge />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="gap-4 py-5">
          <CardHeader className="px-5">
            <CardTitle className="text-lg font-black">من أين يأتي الزوار</CardTitle>
            <CardDescription>رابط utm_source أو الموقع الذي جاؤوا منه</CardDescription>
          </CardHeader>
          <CardContent className="px-5 pt-0">
            <ShareList
              rows={(data?.sources ?? []).map((s) => ({
                key: s.source,
                label: sourceLabels[s.source] ?? s.source,
                value: s.visits,
              }))}
              total={totalSourceVisits}
            />
          </CardContent>
        </Card>
        <Card className="gap-4 py-5">
          <CardHeader className="px-5">
            <CardTitle className="text-lg font-black">الأجهزة</CardTitle>
            <CardDescription>زيارات حسب نوع الجهاز</CardDescription>
          </CardHeader>
          <CardContent className="px-5 pt-0">
            <ShareList
              rows={(data?.devices ?? []).map((d) => ({
                key: d.device,
                label: deviceLabels[d.device] ?? d.device,
                value: d.visits,
              }))}
              total={totalDeviceVisits}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

const ShareList = ({
  rows,
  total,
}: {
  rows: Array<{ key: string; label: string; value: number }>;
  total: number;
}) => {
  if (!rows.length) return <p className="py-6 text-center text-sm font-semibold text-slate-400">لا توجد زيارات بعد</p>;
  return (
    <ul className="space-y-2.5">
      {rows.map((row) => (
        <li key={row.key}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate font-bold text-slate-700" dir="auto">
              {row.label}
            </span>
            <span className="shrink-0 font-black text-slate-950" dir="ltr">
              {fmt(row.value)} <span className="text-[11px] font-bold text-slate-400">({percent(row.value, total) ?? 0}%)</span>
            </span>
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-[#7D26F7]/70" style={{ width: `${(row.value / Math.max(1, total)) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
};

export default VisitorJourney;
