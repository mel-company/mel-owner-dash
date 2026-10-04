import { useEffect, useMemo, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Loader2,
  PackageCheck,
  PackageX,
  Truck,
  XCircle,
} from 'lucide-react';
import { SideDrawer, StatusPill } from './index';
import { CourierLogo } from './CourierLogo';
import {
  courierService,
  type CourierDetailStats,
  type CourierHealth,
} from '../../services/courierService';

/**
 * شركة شحن واحدة — الحالة، الأداء، وما ينقصها.
 *
 * Everything an operator asks about one courier, in the order they ask it:
 * can the platform reach it, how much has it carried, how did those parcels
 * end, and what is configured.
 *
 * The two halves come from different places and that is worth knowing while
 * reading this. **Health is a live call** to the vendor, cached for a minute
 * server-side because Al-Waseet allows thirty requests per thirty seconds and
 * live dispatch shares that budget. **The counts are read off the platform's
 * own parcel records** and cost nothing — three of the four couriers publish
 * no statistics API at all, so this is the only place those numbers can come
 * from, and they are only as fresh as the last webhook or sync.
 */

const STATUS_LABEL: Record<string, string> = {
  CREATED: 'مُسجَّل',
  PICKED_UP: 'استلمه المندوب',
  IN_TRANSIT: 'في الطريق',
  OUT_FOR_DELIVERY: 'خارج للتوصيل',
  DELIVERED: 'تم التوصيل',
  RETURNED: 'راجع',
  CANCELLED: 'ملغى',
  FAILED: 'فشل التوصيل',
  UNKNOWN: 'غير معروف',
};

const STATUS_TONE: Record<string, string> = {
  DELIVERED: 'bg-emerald-50 text-emerald-700',
  FAILED: 'bg-red-50 text-red-600',
  RETURNED: 'bg-amber-50 text-amber-700',
  CANCELLED: 'bg-slate-100 text-slate-500',
  OUT_FOR_DELIVERY: 'bg-indigo-50 text-indigo-700',
  IN_TRANSIT: 'bg-sky-50 text-sky-700',
  PICKED_UP: 'bg-sky-50 text-sky-700',
  CREATED: 'bg-slate-100 text-slate-600',
  UNKNOWN: 'bg-slate-100 text-slate-500',
};

/**
 * Arabic month names, Western digits.
 *
 * Plain `ar-IQ` renders ٢٠٢٦, which sits beside `MEL-12346`, `1,240` and
 * `1.2 يوم` in the same table — three numeral systems in one row. The
 * `-u-nu-latn` extension keeps the locale's own month names and fixes the
 * digits.
 */
const arabicDate = (iso: string) =>
  new Date(iso).toLocaleDateString('ar-IQ-u-nu-latn', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

const sinceLabel = (iso: string | null): string => {
  if (!iso) return 'لم تتم المزامنة بعد';
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return 'الآن';
  if (minutes < 60) return `منذ ${minutes} دقيقة`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `منذ ${hours} ساعة`;
  return `منذ ${Math.floor(hours / 24)} يوم`;
};

/** A share of parcels, or a dash when there is nothing to take a share of. */
const share = (part: number, whole: number): string =>
  whole > 0 ? `${((part / whole) * 100).toFixed(1)}%` : '—';

const StatTile = ({
  label,
  value,
  hint,
  tone,
  icon,
}: {
  label: string;
  value: string;
  hint?: string;
  tone: string;
  icon: React.ReactNode;
}) => (
  <div className="flex items-start justify-between gap-3 px-4 py-3">
    <span className={`grid size-9 shrink-0 place-items-center rounded-xl ${tone}`}>
      {icon}
    </span>
    <div className="min-w-0 text-right">
      <p className="text-xs font-bold text-slate-400">{label}</p>
      <p className="mt-0.5 text-xl font-black text-slate-950">{value}</p>
      {hint && <p className="text-[11px] font-bold text-slate-400">{hint}</p>}
    </div>
  </div>
);

export const CourierDetailDrawer = ({
  courier,
  onClose,
  onHealthChange,
}: {
  courier: CourierHealth;
  onClose: () => void;
  /** So the table behind the drawer reflects a probe without a full reload. */
  onHealthChange?: (health: CourierHealth) => void;
}) => {
  const [health, setHealth] = useState(courier);
  const [stats, setStats] = useState<CourierDetailStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [probing, setProbing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoadingStats(true);

    courierService
      .getCourierStats(courier.code, 30, 5)
      .then((result) => {
        if (!cancelled) setStats(result);
      })
      .catch((err) => {
        if (!cancelled) setError('تعذر قراءة أرقام هذه الشركة.');
        console.error('Error loading courier stats:', err);
      })
      .finally(() => {
        if (!cancelled) setLoadingStats(false);
      });

    return () => {
      cancelled = true;
    };
  }, [courier.code]);

  /** A real authenticated call to the vendor, so always a button. */
  const probe = async () => {
    setProbing(true);
    setError('');
    try {
      const checked = await courierService.checkCourier(courier.code);
      setHealth(checked);
      onHealthChange?.(checked);
    } catch (err) {
      setError('تعذر فحص الاتصال بهذه الشركة.');
      console.error('Error probing courier:', err);
    } finally {
      setProbing(false);
    }
  };

  const chartOption = useMemo(() => {
    const series = stats?.series ?? [];
    return {
      grid: { top: 16, right: 8, bottom: 24, left: 36 },
      tooltip: { trigger: 'axis' },
      xAxis: {
        type: 'category',
        data: series.map((point) =>
          new Date(point.date).toLocaleDateString('ar-IQ-u-nu-latn', {
            day: 'numeric',
            month: 'short',
          }),
        ),
        boundaryGap: false,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          color: '#94a3b8',
          fontSize: 11,
          // A point per day over a month is far more labels than fit.
          interval: Math.max(0, Math.floor(series.length / 6) - 1),
        },
      },
      yAxis: {
        type: 'value',
        splitLine: { lineStyle: { color: '#f1f5f9' } },
        axisLabel: { color: '#94a3b8', fontSize: 11 },
      },
      series: [
        {
          type: 'line',
          smooth: true,
          showSymbol: series.length <= 31,
          symbolSize: 5,
          data: series.map((point) => point.total),
          lineStyle: { width: 2, color: '#22c55e' },
          itemStyle: { color: '#22c55e' },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(34,197,94,0.28)' },
                { offset: 1, color: 'rgba(34,197,94,0.02)' },
              ],
            },
          },
        },
      ],
    };
  }, [stats]);

  const total = stats?.total ?? 0;

  return (
    <SideDrawer
      title={health.profile.nameAr}
      subtitle={health.profile.nameEn}
      maxWidth="max-w-2xl"
      onClose={onClose}
      icon={
        <CourierLogo
          src={health.profile.logoUrl}
          name={health.profile.nameAr}
          size="lg"
        />
      }
    >
      <div className="space-y-4">
        {/* Can the platform reach it — the first thing anyone opens this for. */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <StatusPill
              tone={
                health.ok ? 'green' : health.configured ? 'red' : 'amber'
              }
            >
              {health.ok
                ? 'متصل'
                : health.configured
                  ? 'غير متصل'
                  : 'في انتظار الإعداد'}
            </StatusPill>
            <p className="mt-1.5 text-xs font-bold text-slate-400">
              آخر فحص {sinceLabel(health.checkedAt)}
            </p>
          </div>

          <button
            type="button"
            onClick={probe}
            disabled={probing || !health.configured}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-xs font-black text-slate-600 transition-all duration-150 hover:bg-slate-50 active:scale-95 disabled:cursor-not-allowed disabled:text-slate-300 disabled:active:scale-100"
            title={
              health.configured
                ? 'إجراء اتصال حقيقي بالشركة للتحقق من الاعتماديات'
                : 'أضف المتغيّرات الناقصة أولاً'
            }
          >
            {probing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Activity className="h-3.5 w-3.5" />
            )}
            اختبار الاتصال
          </button>
        </div>

        {error && (
          <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
            {error}
          </div>
        )}

        {/* The vendor's own refusal, which is what tells a revoked key from an
            outage. Operator information, which is why this route is system-only. */}
        {health.error && !health.ok && (
          <div className="rounded-2xl bg-slate-50 px-4 py-3">
            <p className="text-xs font-black text-slate-600">
              {health.error.reason}
            </p>
            {health.error.detail && (
              <p
                className="mt-1 font-mono text-[11px] leading-relaxed text-slate-500"
                dir="ltr"
              >
                {health.error.detail}
              </p>
            )}
          </div>
        )}

        <section className="rounded-3xl bg-white p-5 ring-1 ring-slate-100 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex items-start justify-between gap-4">
            <div className="text-left" dir="ltr">
              <p className="text-2xl font-black text-slate-950">
                {total.toLocaleString('en-US')}
              </p>
              {stats?.trend !== null && stats?.trend !== undefined ? (
                <p
                  className={`text-xs font-black ${stats.trend >= 0 ? 'text-emerald-600' : 'text-red-600'}`}
                >
                  {stats.trend >= 0 ? '↑' : '↓'}{' '}
                  {Math.abs(stats.trend * 100).toFixed(0)}%
                </p>
              ) : (
                /* No parcels in the preceding month is not a 100% rise. */
                <p className="text-xs font-bold text-slate-400">
                  لا مقارنة سابقة
                </p>
              )}
            </div>
            <div className="text-right">
              <h3 className="text-sm font-black text-slate-700">
                الطرود خلال آخر 30 يوم
              </h3>
              <p className="text-xs font-semibold text-slate-400">
                مقارنة مع الشهر السابق
              </p>
            </div>
          </div>

          <div className="mt-3 h-48 w-full">
            {loadingStats ? (
              <div className="grid h-full place-items-center text-sm font-bold text-slate-300">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : total === 0 ? (
              <div className="grid h-full place-items-center rounded-2xl border border-dashed border-slate-200 text-center">
                <p className="text-sm font-bold text-slate-400">
                  لم تحمل هذه الشركة أي طرد خلال الشهر
                </p>
              </div>
            ) : (
              <ReactECharts
                option={chartOption}
                style={{ height: '100%', width: '100%' }}
                opts={{ renderer: 'canvas' }}
                notMerge
                lazyUpdate
              />
            )}
          </div>
        </section>

        <section
          className="grid grid-cols-2 divide-slate-100 rounded-3xl bg-white ring-1 ring-slate-100 animate-in fade-in slide-in-from-bottom-2 duration-300 sm:grid-cols-4 sm:divide-x sm:divide-x-reverse"
          style={{ animationDelay: '80ms', animationFillMode: 'both' }}
        >
          <StatTile
            label="إجمالي الطرود"
            value={total.toLocaleString('en-US')}
            tone="bg-sky-50 text-sky-600"
            icon={<Truck className="h-4 w-4" />}
          />
          <StatTile
            label="تم التوصيل"
            value={(stats?.delivered ?? 0).toLocaleString('en-US')}
            hint={share(stats?.delivered ?? 0, total)}
            tone="bg-emerald-50 text-emerald-600"
            icon={<PackageCheck className="h-4 w-4" />}
          />
          <StatTile
            label="قيد التوصيل"
            value={(stats?.inFlight ?? 0).toLocaleString('en-US')}
            hint={share(stats?.inFlight ?? 0, total)}
            tone="bg-amber-50 text-amber-600"
            icon={<Clock className="h-4 w-4" />}
          />
          <StatTile
            label="فشل التوصيل"
            value={(stats?.failed ?? 0).toLocaleString('en-US')}
            hint={share(stats?.failed ?? 0, total)}
            tone="bg-red-50 text-red-600"
            icon={<PackageX className="h-4 w-4" />}
          />
        </section>

        <section
          className="rounded-3xl bg-white p-5 ring-1 ring-slate-100 animate-in fade-in slide-in-from-bottom-2 duration-300"
          style={{ animationDelay: '160ms', animationFillMode: 'both' }}
        >
          <h3 className="mb-3 text-sm font-black text-slate-700">آخر الطرود</h3>

          {loadingStats ? (
            <p className="py-4 text-center text-sm font-bold text-slate-300">
              <Loader2 className="mx-auto h-4 w-4 animate-spin" />
            </p>
          ) : !stats?.recent.length ? (
            <p className="py-4 text-center text-sm font-bold text-slate-400">
              لا توجد طرود مسجَّلة لهذه الشركة.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-slate-400">
                  <th className="pb-2 text-right font-bold">رقم الطلب</th>
                  <th className="pb-2 text-right font-bold">الحالة</th>
                  <th className="pb-2 text-right font-bold">التاريخ</th>
                  <th className="pb-2 text-right font-bold">وقت المعالجة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {stats.recent.map((parcel) => (
                  <tr key={parcel.orderId}>
                    <td className="py-2.5 font-black text-slate-700">
                      <span dir="ltr">{parcel.reference ?? '—'}</span>
                    </td>
                    <td className="py-2.5">
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-black ${
                          STATUS_TONE[parcel.status] ??
                          'bg-slate-100 text-slate-500'
                        }`}
                        /* The courier's own words where it gave any — they
                           survive whatever the platform's status says. */
                        title={parcel.rawStatus ?? undefined}
                      >
                        {STATUS_LABEL[parcel.status] ?? parcel.status}
                      </span>
                    </td>
                    <td className="py-2.5 font-semibold text-slate-500">
                      {arabicDate(parcel.createdAt)}
                    </td>
                    <td className="py-2.5 font-semibold text-slate-500">
                      {/* Null while the parcel is moving: a number there would
                          only keep growing. */}
                      {parcel.processingDays === null
                        ? '—'
                        : `${parcel.processingDays} يوم`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section
          className="rounded-3xl bg-slate-50/70 p-5 ring-1 ring-slate-100 animate-in fade-in slide-in-from-bottom-2 duration-300"
          style={{ animationDelay: '240ms', animationFillMode: 'both' }}
        >
          <h3 className="mb-1 text-sm font-black text-slate-700">
            معلومات الاتصال
          </h3>
          <p className="mb-3 text-xs font-semibold text-slate-400">
            أسماء المتغيّرات فقط — لا تُعرض أي قيمة سرية هنا ولا يرجعها الخادم.
          </p>

          <ul className="space-y-1.5">
            {health.presentEnv.map((name) => (
              <li
                key={name}
                className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2"
              >
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                <span
                  className="truncate font-mono text-xs font-semibold text-slate-600"
                  dir="ltr"
                >
                  {name}
                </span>
              </li>
            ))}
            {health.missingEnv.map((name) => (
              <li
                key={name}
                className="flex items-center justify-between gap-3 rounded-xl bg-orange-50 px-3 py-2"
              >
                <XCircle className="h-4 w-4 shrink-0 text-orange-500" />
                <span
                  className="truncate font-mono text-xs font-semibold text-orange-700"
                  dir="ltr"
                >
                  {name}
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-3 flex items-center justify-between gap-3 text-xs font-bold">
            <span className="font-mono text-slate-400" dir="ltr">
              {health.baseUrl}
            </span>
            {/* A courier on a vendor sandbox passes every probe and cannot
                carry a real parcel. Nothing else in the platform says so. */}
            {!health.production && health.configured && (
              <span className="flex items-center gap-1 text-amber-600">
                <AlertTriangle className="h-3.5 w-3.5" />
                بيئة تجريبية
              </span>
            )}
          </div>
        </section>
      </div>
    </SideDrawer>
  );
};
