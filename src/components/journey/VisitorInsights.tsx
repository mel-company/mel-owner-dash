import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import { Clock3, Compass, Laptop, MapPin, MonitorSmartphone, Repeat, Smartphone, UserPlus, Users } from 'lucide-react';
import { LoadingState, Pagination, TableShell } from '@/components/dashboard';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { journeyVisitorsService, type JourneyFunnel, type JourneyVisitsPage } from '@/services/journeyService';

/**
 * Who the landing-page visitors are: where they come from, when, and on
 * what. Places, browsers and systems are only known for visits recorded since
 * the landing page started sending them; older visits show as «غير معروف».
 */

const fmt = (n: number) => n.toLocaleString('en-US');

const UNKNOWN = 'غير معروف';

/** Vercel names cities in English; the ones Iraqi merchants come from, in Arabic. */
const cityNames: Record<string, string> = {
  Baghdad: 'بغداد',
  Basra: 'البصرة',
  Basrah: 'البصرة',
  Erbil: 'أربيل',
  Arbil: 'أربيل',
  Mosul: 'الموصل',
  Najaf: 'النجف',
  Karbala: 'كربلاء',
  Sulaymaniyah: 'السليمانية',
  'As Sulaymaniyah': 'السليمانية',
  Kirkuk: 'كركوك',
  Duhok: 'دهوك',
  Dahuk: 'دهوك',
  Nasiriyah: 'الناصرية',
  'An Nasiriyah': 'الناصرية',
  Hillah: 'الحلة',
  'Al Hillah': 'الحلة',
  Ramadi: 'الرمادي',
  'Ar Ramadi': 'الرمادي',
  Diwaniyah: 'الديوانية',
  'Ad Diwaniyah': 'الديوانية',
  Kut: 'الكوت',
  'Al Kut': 'الكوت',
  Amarah: 'العمارة',
  'Al Amarah': 'العمارة',
  Samawah: 'السماوة',
  'As Samawah': 'السماوة',
  Baqubah: 'بعقوبة',
  Fallujah: 'الفلوجة',
  Tikrit: 'تكريت',
  Zakho: 'زاخو',
  Samarra: 'سامراء',
};

const regionNames = (() => {
  try {
    return new Intl.DisplayNames(['ar'], { type: 'region' });
  } catch {
    return null;
  }
})();

const countryName = (code: string | null) => {
  if (!code) return UNKNOWN;
  try {
    return regionNames?.of(code.toUpperCase()) ?? code;
  } catch {
    return code;
  }
};

const cityName = (city: string | null) => (city ? cityNames[city] ?? city : UNKNOWN);

const sourceLabels: Record<string, string> = {
  direct: 'مباشر',
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

const languageLabels: Record<string, string> = { ar: 'العربية', en: 'الإنجليزية', ku: 'الكردية', ckb: 'الكردية', tr: 'التركية', fa: 'الفارسية' };
const languageName = (tag: string | null) => (tag ? languageLabels[tag.split('-')[0].toLowerCase()] ?? tag : UNKNOWN);

/** `14` → `2م`, the way the clock reads in Iraq. */
const hourLabel = (hour: number) => {
  if (hour === 0) return '12ص';
  if (hour < 12) return `${hour}ص`;
  if (hour === 12) return '12م';
  return `${hour - 12}م`;
};

const formatTime = (iso: string) =>
  new Date(iso).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Baghdad',
  });

type Row = { key: string; label: string; value: number; hint?: string };

/** Merge rows that share a label (e.g. the four Facebook hosts). */
const mergeRows = (rows: Row[]) => {
  const out = new Map<string, Row>();
  for (const row of rows) {
    const prev = out.get(row.label);
    out.set(row.label, prev ? { ...prev, value: prev.value + row.value } : row);
  }
  return [...out.values()].sort((a, b) => b.value - a.value);
};

export const VisitorInsights = ({ data, range }: { data: JourneyFunnel | null; range: { from: string; to: string } }) => {
  const cities = useMemo(
    () =>
      mergeRows(
        (data?.cities ?? []).map((c) => ({
          key: `${c.city}-${c.country}`,
          label: cityName(c.city),
          hint: c.city && c.country && c.country !== 'IQ' ? countryName(c.country) : undefined,
          value: c.visits,
        })),
      ),
    [data],
  );
  const countries = useMemo(
    () => mergeRows((data?.countries ?? []).map((c) => ({ key: c.country ?? 'none', label: countryName(c.country), value: c.visits }))),
    [data],
  );
  const sources = useMemo(
    () => mergeRows((data?.sources ?? []).map((s) => ({ key: s.source, label: sourceLabels[s.source] ?? s.source, value: s.visits }))),
    [data],
  );
  const browsers = useMemo(
    () => mergeRows((data?.browsers ?? []).map((b) => ({ key: b.browser ?? 'none', label: b.browser ?? UNKNOWN, value: b.visits }))),
    [data],
  );
  const systems = useMemo(
    () => mergeRows((data?.systems ?? []).map((o) => ({ key: o.os ?? 'none', label: o.os ?? UNKNOWN, value: o.visits }))),
    [data],
  );
  const languages = useMemo(
    () => mergeRows((data?.languages ?? []).map((l) => ({ key: l.language ?? 'none', label: languageName(l.language), value: l.visits }))),
    [data],
  );
  const devices = useMemo(() => {
    const byDevice = new Map((data?.devices ?? []).map((d) => [d.device, d.visits]));
    return { mobile: byDevice.get('mobile') ?? 0, desktop: byDevice.get('desktop') ?? 0 };
  }, [data]);

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-black text-slate-950 sm:text-xl">من هم الزوار</h2>
        <p className="text-xs font-semibold text-slate-500">
          المدينة والجهاز والمتصفح تُسجَّل منذ هذا التحديث، والزيارات الأقدم تظهر «غير معروف»
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <InsightCard icon={<MapPin />} title="المدن" hint="من أين يزورون">
          <ShareRows rows={cities} />
          {countries.length > 1 && (
            <div className="mt-4 flex flex-wrap gap-1.5 border-t border-slate-100 pt-3">
              {countries.map((c) => (
                <span key={c.key} className="rounded-lg bg-slate-50 px-2 py-1 text-[11px] font-bold text-slate-500">
                  {c.label} <span dir="ltr">{fmt(c.value)}</span>
                </span>
              ))}
            </div>
          )}
        </InsightCard>
        <InsightCard icon={<Compass />} title="المصادر" hint="utm_source أو الموقع السابق">
          <ShareRows rows={sources} />
        </InsightCard>
        <InsightCard icon={<MonitorSmartphone />} title="الأجهزة والأنظمة" hint="هاتف أم حاسوب، وأي نظام">
          <DeviceSplit mobile={devices.mobile} desktop={devices.desktop} />
          <div className="mt-4">
            <ShareRows rows={systems} />
          </div>
        </InsightCard>
        <InsightCard icon={<Laptop />} title="المتصفحات واللغة" hint="بما فيها متصفح إنستغرام وفيسبوك">
          <ShareRows rows={browsers} />
          {languages.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5 border-t border-slate-100 pt-3">
              {languages.map((l) => (
                <span key={l.key} className="rounded-lg bg-violet-50 px-2 py-1 text-[11px] font-bold text-violet-600">
                  {l.label} <span dir="ltr">{fmt(l.value)}</span>
                </span>
              ))}
            </div>
          )}
        </InsightCard>
      </div>

      <Card className="gap-0 rounded-[1.5rem] py-5 shadow-sm sm:rounded-[2rem]">
        <CardContent className="px-3 sm:px-5">
          <HoursChart hours={data?.hours ?? []} />
        </CardContent>
      </Card>

      {/* Keyed on the range so a new range starts again at page 1. */}
      <RecentVisits key={`${range.from}-${range.to}`} range={range} />
    </section>
  );
};

const InsightCard = ({ icon, title, hint, children }: { icon: ReactNode; title: string; hint: string; children: ReactNode }) => (
  <Card className="gap-0 rounded-[1.5rem] py-5 shadow-sm sm:rounded-[2rem]">
    <CardContent className="px-5">
      <div className="mb-4 flex items-center gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-violet-50 text-violet-500 [&_svg]:h-4.5 [&_svg]:w-4.5">
          {icon}
        </span>
        <div className="min-w-0">
          <p className="font-black text-slate-950">{title}</p>
          <p className="truncate text-[11px] font-semibold text-slate-400">{hint}</p>
        </div>
      </div>
      {children}
    </CardContent>
  </Card>
);

const ShareRows = ({ rows }: { rows: Row[] }) => {
  const total = rows.reduce((sum, row) => sum + row.value, 0);
  if (!rows.length) return <p className="py-4 text-center text-sm font-semibold text-slate-400">لا توجد زيارات بعد</p>;
  return (
    <ul className="space-y-3">
      {rows.slice(0, 6).map((row) => {
        const share = total ? Math.round((row.value / total) * 100) : 0;
        return (
          <li key={row.key}>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className={cn('min-w-0 truncate font-bold', row.label === UNKNOWN ? 'text-slate-400' : 'text-slate-700')} dir="auto">
                {row.label}
                {row.hint && <span className="ms-1 text-[11px] font-semibold text-slate-400">{row.hint}</span>}
              </span>
              <span className="shrink-0 font-black text-slate-950" dir="ltr">
                {fmt(row.value)} <span className="text-[11px] font-bold text-slate-400">{share}%</span>
              </span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className={cn(
                  'h-full rounded-full transition-[width] duration-700',
                  row.label === UNKNOWN ? 'bg-slate-300' : 'bg-linear-to-l from-violet-600 to-fuchsia-400',
                )}
                style={{ width: `${share}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
};

/** Phone vs computer as one split bar, the share people ask about first. */
const DeviceSplit = ({ mobile, desktop }: { mobile: number; desktop: number }) => {
  const total = mobile + desktop;
  const mobileShare = total ? Math.round((mobile / total) * 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-xs font-black">
        <span className="inline-flex items-center gap-1.5 text-violet-600">
          <Smartphone className="h-4 w-4" /> هاتف <span dir="ltr">{total ? `${mobileShare}%` : '—'}</span>
        </span>
        <span className="inline-flex items-center gap-1.5 text-cyan-600">
          <span dir="ltr">{total ? `${100 - mobileShare}%` : '—'}</span> حاسوب <Laptop className="h-4 w-4" />
        </span>
      </div>
      <div className="mt-2 flex h-3 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full bg-linear-to-l from-violet-600 to-fuchsia-400" style={{ width: `${total ? mobileShare : 0}%` }} />
        <div className="h-full flex-1 bg-linear-to-l from-cyan-300 to-cyan-500" style={{ opacity: total ? 1 : 0 }} />
      </div>
    </div>
  );
};

const HoursChart = ({ hours }: { hours: Array<{ hour: number; visits: number }> }) => {
  const values = useMemo(() => {
    const byHour = new Map(hours.map((h) => [h.hour, h.visits]));
    return Array.from({ length: 24 }, (_, h) => byHour.get(h) ?? 0);
  }, [hours]);
  const peak = values.some(Boolean) ? values.indexOf(Math.max(...values)) : null;

  const option = useMemo<EChartsOption>(
    () => ({
      tooltip: {
        trigger: 'axis',
        textStyle: { fontFamily: 'Setar XS, sans-serif' },
        formatter: (params: unknown) => {
          const p = (params as Array<{ dataIndex: number; value: number }>)[0];
          return `${hourLabel(p.dataIndex)} : ${fmt(p.value)} زيارة`;
        },
      },
      grid: { left: 8, right: 8, top: 16, bottom: 8, containLabel: true },
      xAxis: {
        type: 'category',
        data: values.map((_, h) => hourLabel(h)),
        axisTick: { show: false },
        axisLine: { lineStyle: { color: '#e2e8f0' } },
        axisLabel: { color: '#94a3b8', fontWeight: 700, interval: 2 },
      },
      yAxis: {
        type: 'value',
        minInterval: 1,
        splitLine: { lineStyle: { color: 'rgba(148,163,184,0.18)' } },
        axisLabel: { color: '#94a3b8', fontWeight: 600 },
      },
      series: [
        {
          type: 'bar',
          barMaxWidth: 22,
          data: values.map((v, h) => ({
            value: v,
            itemStyle: {
              borderRadius: [6, 6, 0, 0],
              color:
                h === peak
                  ? {
                      type: 'linear',
                      x: 0,
                      y: 0,
                      x2: 0,
                      y2: 1,
                      colorStops: [
                        { offset: 0, color: '#e879f9' },
                        { offset: 1, color: '#7c3aed' },
                      ],
                    }
                  : '#ddd6fe',
            },
          })),
          animationDuration: 900,
          animationDelay: (i: number) => i * 25,
        },
      ],
    }),
    [values, peak],
  );

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 px-2 sm:px-0">
        <div className="flex items-center gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-violet-50 text-violet-500 [&_svg]:h-4.5 [&_svg]:w-4.5">
            <Clock3 />
          </span>
          <div className="min-w-0">
            <p className="font-black text-slate-950">متى يزورون</p>
            <p className="text-[11px] font-semibold text-slate-400">وقت أول زيارة في اليوم، بتوقيت بغداد</p>
          </div>
        </div>
        {peak != null && (
          <span className="rounded-xl bg-violet-50 px-3 py-1.5 text-xs font-black text-violet-600">
            الذروة: <span dir="ltr">{hourLabel(peak)}</span> – <span dir="ltr">{hourLabel((peak + 1) % 24)}</span>
          </span>
        )}
      </div>
      <ReactECharts option={option} style={{ height: 240 }} notMerge />
    </div>
  );
};

const RecentVisits = ({ range }: { range: { from: string; to: string } }) => {
  const [visits, setVisits] = useState<JourneyVisitsPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setVisits(await journeyVisitorsService.list({ ...range, page, pageSize }));
    } catch {
      setVisits(null);
    } finally {
      setLoading(false);
    }
  }, [range, page, pageSize]);

  useEffect(() => {
    void load();
  }, [load]);

  const totalPages = Math.max(1, Math.ceil((visits?.total ?? 0) / pageSize));

  return (
    <div className="space-y-3">
      <div>
        <h3 className="flex items-center gap-2 text-base font-black text-slate-950 sm:text-lg">
          <Users className="h-5 w-5 text-violet-500" /> آخر الزوار
        </h3>
        <p className="text-xs font-semibold text-slate-500">{fmt(visits?.total ?? 0)} زيارة في الفترة، زيارة واحدة لكل زائر في اليوم</p>
      </div>
      <TableShell
        footer={
          (visits?.total ?? 0) > 0 && (
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
        {loading && !visits ? (
          <div className="p-6">
            <LoadingState />
          </div>
        ) : !visits?.data.length ? (
          <p className="p-10 text-center text-sm font-bold text-slate-400">لا توجد زيارات في هذه الفترة</p>
        ) : (
          <table className={cn('w-full min-w-[820px] text-sm transition-opacity', loading && 'opacity-60')}>
            <thead>
              <tr className="border-b border-slate-100 text-xs font-black text-slate-500">
                <th className="px-5 py-4 text-right">الوقت</th>
                <th className="px-5 py-4 text-right">المكان</th>
                <th className="px-5 py-4 text-right">الجهاز</th>
                <th className="px-5 py-4 text-right">المصدر</th>
                <th className="px-5 py-4 text-right">الصفحة</th>
                <th className="px-5 py-4 text-right">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {visits.data.map((v) => (
                <tr key={v.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
                  <td className="px-5 py-3.5 font-bold whitespace-nowrap text-slate-700" data-card="title" dir="ltr">
                    {formatTime(v.createdAt)}
                  </td>
                  <td className="px-5 py-3.5">
                    <p className={cn('font-bold', v.city ? 'text-slate-800' : 'text-slate-400')}>{cityName(v.city)}</p>
                    {v.country && <p className="text-[11px] font-semibold text-slate-400">{countryName(v.country)}</p>}
                  </td>
                  <td className="px-5 py-3.5">
                    <p className="inline-flex items-center gap-1.5 font-bold text-slate-800">
                      {v.device === 'desktop' ? <Laptop className="h-4 w-4 text-cyan-500" /> : <Smartphone className="h-4 w-4 text-violet-500" />}
                      {v.os ?? (v.device === 'desktop' ? 'حاسوب' : v.device === 'mobile' ? 'هاتف' : UNKNOWN)}
                    </p>
                    {v.browser && <p className="text-[11px] font-semibold text-slate-400">{v.browser}</p>}
                  </td>
                  <td className="px-5 py-3.5 font-bold text-slate-700" dir="auto">
                    {sourceLabels[v.source] ?? v.source}
                  </td>
                  <td className="px-5 py-3.5 font-semibold text-slate-500" dir="ltr">
                    {v.path ?? '/'}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex flex-wrap gap-1.5">
                      {v.openedSignup && (
                        <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-1 text-[11px] font-black text-emerald-600">
                          <UserPlus className="h-3.5 w-3.5" /> فتح التسجيل
                        </span>
                      )}
                      {v.daysVisited > 1 ? (
                        <span className="inline-flex items-center gap-1 rounded-lg bg-violet-50 px-2 py-1 text-[11px] font-black text-violet-600">
                          <Repeat className="h-3.5 w-3.5" /> عائد · <span dir="ltr">{v.daysVisited}</span> أيام
                        </span>
                      ) : (
                        <span className="rounded-lg bg-slate-50 px-2 py-1 text-[11px] font-bold text-slate-400">زائر جديد</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </TableShell>
    </div>
  );
};
