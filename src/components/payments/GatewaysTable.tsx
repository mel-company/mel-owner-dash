import { useMemo, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import {
  Activity,
  BadgeDollarSign,
  Check,
  ChevronLeft,
  Eye,
  Gauge,
  Pencil,
  Receipt,
  Store,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import {
  MenuItem,
  RowMenu,
  StatTile,
  StatusPill,
  StatusSwitch,
} from '@/components/dashboard';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  chartPoints,
  credentialStates,
  formatIqd,
  formatRequestedAt,
  gatewayStatus,
  gatewayUsage,
  sparklineBars,
  GATEWAY_SURFACES,
  type SurfaceIcon,
} from '@/lib/gateway-presentation';
import type {
  GatewayActivity,
  GatewaySurfaceSetting,
  PaymentGatewayHealth,
  PaymentSurface,
} from '@/services/paymentGatewaysService';
import type {
  PaymentProvider,
  ProviderGateway,
} from '@/services/paymentProviderService';

/**
 * بوابات الدفع — the gateways list and its detail panel.
 *
 * Every number drawn here comes off a row the server sent. That is worth
 * stating because the page it replaces did not have these numbers at all, and
 * the obvious way to make a table look like its mockup is to fill the gaps:
 * the accounting page shipped `hash % 2 === 0 ? 'mastercard' : 'visa'` and a
 * hardcoded `12.6% ↗` doing exactly that. Where the platform cannot answer
 * something — a credential's value, how this month compares with the last —
 * this says so rather than drawing a plausible answer.
 */

const MARK_FALLBACK_TONES = [
  'bg-violet-100 text-violet-700',
  'bg-sky-100 text-sky-700',
  'bg-amber-100 text-amber-700',
  'bg-emerald-100 text-emerald-700',
];

/** The lib names a glyph; this is the only place that knows which one. */
const SURFACE_ICONS: Record<SurfaceIcon, typeof Store> = {
  store: Store,
  users: Users,
};

/**
 * The brand's own mark, or its initials.
 *
 * Initials rather than a generic card glyph: the rows are scanned by brand,
 * and four identical placeholders are harder to tell apart than four
 * different pairs of letters. The tone is picked from the provider's code so
 * it is stable per brand across reloads — a presentation detail with no claim
 * attached, unlike a card network, which is a fact and is never derived this
 * way.
 */
const GatewayMark = ({
  provider,
  size = 'md',
}: {
  provider: PaymentProvider;
  size?: 'md' | 'lg';
}) => {
  const logo = provider.gateway?.logoUrl || provider.logoUrl;
  const [broken, setBroken] = useState(false);
  const box = size === 'lg' ? 'h-14 w-14 rounded-2xl' : 'h-11 w-11 rounded-xl';
  const glyph = size === 'lg' ? 'h-9 w-9' : 'h-7 w-7';

  if (logo && !broken) {
    return (
      <span
        className={cn(
          'grid shrink-0 place-items-center overflow-hidden bg-white shadow-sm ring-1 ring-slate-100',
          box,
        )}
      >
        <img
          src={logo}
          alt=""
          className={cn('object-contain', glyph)}
          onError={() => setBroken(true)}
        />
      </span>
    );
  }

  const seed = [...(provider.code || provider.name || '?')].reduce(
    (sum, char) => sum + char.charCodeAt(0),
    0,
  );
  const initials = (provider.name || provider.code || '؟').trim().slice(0, 2);

  return (
    <span
      className={cn(
        'grid shrink-0 place-items-center font-black',
        box,
        size === 'lg' ? 'text-base' : 'text-sm',
        MARK_FALLBACK_TONES[seed % MARK_FALLBACK_TONES.length],
      )}
    >
      {initials}
    </span>
  );
};

/** The 30-day shape, or nothing at all when there is no traffic to shape. */
const Sparkline = ({
  activity,
  className,
}: {
  activity?: GatewayActivity | null;
  className?: string;
}) => {
  const bars = sparklineBars(activity);
  if (bars.length === 0) return null;

  return (
    <span className={cn('flex h-7 items-end gap-[2px]', className)} aria-hidden>
      {bars.map((height, index) => (
        <span
          key={index}
          className="w-[3px] rounded-sm bg-emerald-400"
          style={{ height: `${Math.max(height, 6)}%` }}
        />
      ))}
    </span>
  );
};

export type GatewayRowAction = {
  onToggle: (provider: PaymentProvider) => void;
  onEdit: (provider: PaymentProvider) => void;
  onDelete: (provider: PaymentProvider) => void;
  onOpen: (provider: PaymentProvider) => void;
};

export const GatewaysTable = ({
  rows,
  activityByGateway,
  activeId,
  actions,
}: {
  rows: PaymentProvider[];
  activityByGateway: Record<string, GatewayActivity>;
  /** The row the detail drawer is open on, lifted out of the stack behind it. */
  activeId?: string | null;
  actions: GatewayRowAction;
}) => (
  <table className="w-full min-w-[980px] text-right">
    <thead>
      <tr className="border-b border-slate-100 bg-slate-50/60 text-xs font-bold text-slate-500">
        <th className="px-5 py-4">البوابة</th>
        <th className="px-5 py-4">الحالة</th>
        <th className="px-5 py-4">الاستخدام في المنصة</th>
        <th className="px-5 py-4">المعاملات</th>
        <th className="px-5 py-4">آخر طلب</th>
        <th className="px-5 py-4">تفعيل</th>
        <th className="px-5 py-4">
          <span className="sr-only">إجراءات</span>
        </th>
      </tr>
    </thead>
    <tbody className="divide-y divide-slate-100">
      {rows.map((provider) => {
        const activity = provider.gateway
          ? activityByGateway[provider.gateway.gateway]
          : undefined;
        const usage = gatewayUsage(activity);
        const lastRequest = formatRequestedAt(activity?.lastRequestAt);
        const status = gatewayStatus(provider);

        return (
          <tr
            key={provider.id}
            className={cn(
              'text-sm transition',
              // Violet rather than a white card: the rows are already white,
              // so an elevated-white row reads as nothing at all.
              activeId === provider.id
                ? 'bg-violet-50/60 ring-1 ring-inset ring-violet-200'
                : 'hover:bg-slate-50/70',
            )}
          >
            <td className="px-5 py-4">
              <button
                type="button"
                onClick={() => actions.onOpen(provider)}
                className="flex items-center gap-3 text-right"
              >
                <GatewayMark provider={provider} />
                <span className="leading-tight">
                  <span className="block font-black text-slate-900">
                    {provider.name}
                  </span>
                  <span className="block text-xs font-semibold text-slate-400">
                    {provider.gateway?.name ?? provider.code}
                  </span>
                </span>
              </button>
            </td>

            <td className="px-5 py-4">
              <StatusPill tone={status.tone} dot>
                {status.label}
              </StatusPill>
            </td>

            <td className="px-5 py-4">
              {usage.length > 0 ? (
                <span className="flex flex-wrap gap-1.5">
                  {usage.map((item) => {
                    const Icon = SURFACE_ICONS[item.icon];
                    return (
                      <span
                        key={item.surface}
                        className={cn(
                          'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-bold',
                          item.chip,
                        )}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        {item.label}
                      </span>
                    );
                  })}
                </span>
              ) : (
                // Not "unused": a gateway with no adapter has no traffic to
                // report, which is a different thing from one that has none.
                <span className="text-xs font-semibold text-slate-300">
                  {provider.gateway ? 'لا يوجد نشاط' : '—'}
                </span>
              )}
            </td>

            <td className="px-5 py-4">
              <span className="flex items-center gap-2">
                <span
                  className={cn(
                    'font-black tabular-nums',
                    activity?.transactions
                      ? 'text-slate-900'
                      : 'text-slate-300',
                  )}
                >
                  {activity ? formatIqd(activity.transactions) : '—'}
                </span>
                <Sparkline activity={activity} />
              </span>
            </td>

            <td className="px-5 py-4">
              {lastRequest ? (
                <span className="leading-tight">
                  <span className="block text-xs font-bold text-slate-700">
                    {lastRequest.date}
                  </span>
                  <span className="block text-xs text-slate-400">
                    {lastRequest.time}
                  </span>
                </span>
              ) : (
                <span className="text-slate-300">-</span>
              )}
            </td>

            <td className="px-5 py-4">
              <StatusSwitch
                active={!!provider.isActive}
                onClick={() => actions.onToggle(provider)}
                label={`تفعيل ${provider.name}`}
              />
            </td>

            <td className="px-5 py-4">
              <RowMenu label={`إجراءات ${provider.name}`}>
                {(close) => (
                  <>
                    <MenuItem
                      icon={<Eye className="h-4 w-4" />}
                      label="تفاصيل البوابة"
                      onClick={() => {
                        actions.onOpen(provider);
                        close();
                      }}
                    />
                    <MenuItem
                      icon={<Pencil className="h-4 w-4" />}
                      label="تعديل البوابة"
                      onClick={() => {
                        actions.onEdit(provider);
                        close();
                      }}
                    />
                    <MenuItem
                      icon={<Trash2 className="h-4 w-4" />}
                      label="حذف البوابة"
                      tone="danger"
                      onClick={() => {
                        actions.onDelete(provider);
                        close();
                      }}
                    />
                  </>
                )}
              </RowMenu>
            </td>
          </tr>
        );
      })}
    </tbody>
  </table>
);

/**
 * One surface, as a card the operator can switch.
 *
 * The whole card is the control rather than a checkbox in its corner: it is a
 * `role="switch"` button with the box drawn inside it, so the hit target is
 * the card and a screen reader still hears one switch with a name.
 */
const SurfaceCard = ({
  icon,
  label,
  hint,
  count,
  enabled,
  saving,
  editable,
  name,
  onToggle,
}: {
  icon: SurfaceIcon;
  label: string;
  hint: string;
  count: number;
  enabled: boolean;
  saving: boolean;
  editable: boolean;
  name: string;
  onToggle: () => void;
}) => {
  const Icon = SURFACE_ICONS[icon];
  const content = (
    <>
      <span className="flex items-start justify-between gap-2">
        <span
          className={cn(
            'grid size-9 place-items-center rounded-xl',
            enabled && editable
              ? 'bg-violet-100 text-violet-600'
              : 'bg-slate-100 text-slate-400',
          )}
        >
          <Icon className="h-4 w-4" />
        </span>
        {/* Trails on the left: the glyph identifies the surface and leads. */}
        <span
          className={cn(
            'grid size-5 shrink-0 place-items-center rounded-md border-2 transition',
            enabled && editable
              ? 'border-violet-600 bg-violet-600 text-white'
              : 'border-slate-200 bg-white text-transparent',
          )}
          aria-hidden
        >
          <Check className="h-3 w-3" strokeWidth={4} />
        </span>
      </span>
      <span className="mt-2 block text-xs font-black text-slate-800">
        {label}
      </span>
      <span className="mt-0.5 block text-[11px] leading-relaxed text-slate-400">
        {hint}
      </span>
      <span className="mt-1.5 block text-[11px] font-bold text-slate-500">
        {count > 0 ? `${formatIqd(count)} معاملة` : 'لا يوجد نشاط'}
      </span>
    </>
  );

  const shell = cn(
    'block rounded-2xl border p-3 text-right transition',
    enabled && editable
      ? 'border-violet-200 bg-violet-50/50'
      : 'border-slate-100 bg-slate-50',
    saving && 'opacity-60',
  );

  // A provider with no integration behind it has no gateway to switch; cash
  // on delivery is not "off", it is not a gateway. Rendering it as a dead
  // button would invite a click that can only fail.
  if (!editable) {
    return (
      <div className={cn(shell, 'cursor-default')}>
        {content}
        <span className="mt-1.5 block text-[11px] font-bold text-slate-300">
          لا ينطبق
        </span>
      </div>
    );
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      aria-label={`${label} — ${name}`}
      disabled={saving}
      onClick={onToggle}
      className={cn(shell, 'w-full hover:border-violet-300 disabled:cursor-wait')}
    >
      {content}
    </button>
  );
};

export const GatewayDetailPanel = ({
  provider,
  activity,
  settings,
  savingSurface,
  onSurfaceToggle,
  probing,
  probed,
  onProbe,
  onToggle,
}: {
  provider: PaymentProvider;
  activity?: GatewayActivity | null;
  /** The operator's per-surface switch, keyed by surface. */
  settings?: Partial<Record<PaymentSurface, GatewaySurfaceSetting>>;
  savingSurface?: PaymentSurface | null;
  onSurfaceToggle?: (surface: PaymentSurface, enabled: boolean) => void;
  probing: boolean;
  /**
   * The probe's answer, when one has been run.
   *
   * The full health shape rather than the list's trimmed `ProviderGateway`,
   * because the two facts this panel shows only after a probe — the latency
   * and the gateway's own `reason` — exist only on a probe's result. What it
   * falls back to, `provider.gateway`, is the trimmed one, so `health` below
   * is whichever arrived and reads only the fields both carry.
   */
  probed?: PaymentGatewayHealth | null;
  onProbe: () => void;
  onToggle: () => void;
}) => {
  const health: PaymentGatewayHealth | ProviderGateway | null =
    probed ?? provider.gateway ?? null;
  const missing = credentialStates(health);
  const status = gatewayStatus(provider);
  const lastRequest = formatRequestedAt(activity?.lastRequestAt);
  const points = chartPoints(activity);
  const [showAllCredentials, setShowAllCredentials] = useState(false);

  /**
   * Daily transactions over the window — one bar per day, one series.
   *
   * A bar rather than the drawer's usual line because the quantity is a count
   * of discrete events per day, not a level being sampled; and one series, so
   * there is nothing to a legend that the heading does not already say. The
   * axis idiom — slate labels, hairline splits, `ar-IQ-u-nu-latn` dates — is
   * `CourierDetailDrawer`'s, so the two drawers read as one dashboard.
   */
  const chartOption = useMemo(
    () => ({
      grid: { top: 12, right: 6, bottom: 22, left: 34 },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        textStyle: { fontSize: 12 },
      },
      xAxis: {
        type: 'category',
        data: points.map((point) => point.label),
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          color: '#94a3b8',
          fontSize: 10,
          // A bar a day over a month is far more labels than fit.
          interval: Math.max(0, Math.floor(points.length / 6) - 1),
        },
      },
      yAxis: {
        type: 'value',
        minInterval: 1,
        splitLine: { lineStyle: { color: '#f1f5f9' } },
        axisLabel: { color: '#94a3b8', fontSize: 10 },
      },
      series: [
        {
          type: 'bar',
          name: 'المعاملات',
          data: points.map((point) => point.transactions),
          // Rounded data-ends, square on the baseline they sit on.
          itemStyle: { color: '#22c55e', borderRadius: [4, 4, 0, 0] },
          // Leaves a surface gap between neighbours, so a run of busy days
          // reads as separate bars rather than one block.
          barCategoryGap: '35%',
        },
      ],
    }),
    [points],
  );

  const visibleCredentials = showAllCredentials ? missing : missing.slice(0, 3);

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3">
        <GatewayMark provider={provider} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="font-black text-slate-900">{provider.name}</div>
          <div className="text-xs font-semibold text-slate-400">
            {health?.name ?? provider.code}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <StatusSwitch
            active={!!provider.isActive}
            onClick={onToggle}
            label={`تفعيل ${provider.name}`}
          />
          <StatusPill tone={status.tone} dot>
            {status.label}
          </StatusPill>
        </div>
      </div>

      {provider.description && (
        <p className="text-sm leading-relaxed text-slate-500">
          {provider.description}
        </p>
      )}

      <section>
        <h3 className="mb-2 text-sm font-black text-slate-800">
          الاستخدام في المنصة
        </h3>
        {/*
          Real controls, backed by `PaymentGatewaySetting`.

          These were read-only until the table behind them existed, because a
          checkbox that writes nowhere is worse than a sentence — it invites a
          change and then discards it. Each switch is now honoured by the code
          that opens a payment: store checkout by `/order-payment/init` *and*
          by the storefront's method list, so a gateway withdrawn here stops
          being offered rather than being offered and then refused.

          Two cards, not three, because the server's `PAYMENT_SURFACES` has
          two members and the settings route rejects anything else.

          The count underneath is still the recorded traffic, which answers a
          different question from the switch: where it *has* been used, not
          where it *may* be.
        */}
        <div className="grid grid-cols-2 gap-2">
          {GATEWAY_SURFACES.map((entry) => (
            <SurfaceCard
              key={entry.surface}
              icon={entry.icon}
              label={entry.label}
              hint={entry.hint}
              count={activity?.surfaces[entry.counter] ?? 0}
              // Absence means enabled — the same default the server applies.
              enabled={settings?.[entry.surface]?.enabled ?? true}
              saving={savingSurface === entry.surface}
              editable={!!provider.gateway && !!onSurfaceToggle}
              name={provider.name}
              onToggle={() =>
                onSurfaceToggle?.(
                  entry.surface,
                  !(settings?.[entry.surface]?.enabled ?? true),
                )
              }
            />
          ))}
        </div>
      </section>

      <section>
        <h3 className="mb-2 text-sm font-black text-slate-800">
          إحصائيات آخر {activity?.window.days ?? 30} يوم
        </h3>
        {/*
          Three figures and no deltas. The activity route returns one window
          and no previous one, so a «+12%» here would be a number nobody
          measured — which this dashboard has shipped once already.
        */}
        <div className="grid grid-cols-3 divide-x divide-x-reverse divide-slate-100 rounded-2xl bg-white ring-1 ring-slate-100">
          <StatTile
            label="المبلغ الإجمالي"
            value={activity ? `${formatIqd(activity.window.amount)} د.ع` : '—'}
            hint="المسوّى فقط"
            tone="bg-violet-50 text-violet-600"
            icon={<BadgeDollarSign className="h-4 w-4" />}
            layout="stack"
          />
          <StatTile
            label="إجمالي المعاملات"
            value={activity ? formatIqd(activity.window.transactions) : '—'}
            tone="bg-sky-50 text-sky-600"
            icon={<Receipt className="h-4 w-4" />}
            layout="stack"
          />
          {/*
            `null` is drawn as a dash, not as 0%. Nothing decided yet and
            everything failing are different answers, and a new gateway
            reporting 0% reads as an outage.
          */}
          <StatTile
            label="معدل النجاح"
            value={
              activity?.window.successRate == null
                ? '—'
                : `${activity.window.successRate}%`
            }
            tone="bg-emerald-50 text-emerald-600"
            icon={<Gauge className="h-4 w-4" />}
            layout="stack"
          />
        </div>

        <div className="mt-3 h-40 w-full">
          {points.length > 0 ? (
            <ReactECharts
              option={chartOption}
              style={{ height: '100%', width: '100%' }}
              opts={{ renderer: 'canvas' }}
              notMerge
              lazyUpdate
            />
          ) : (
            <div className="grid h-full place-items-center rounded-2xl border border-dashed border-slate-200 text-center">
              <p className="text-sm font-bold text-slate-400">
                لا توجد معاملات خلال النافذة
              </p>
            </div>
          )}
        </div>
      </section>

      <section>
        <div className="mb-2 flex items-start justify-between gap-2">
          <div>
            <h3 className="text-sm font-black text-slate-800">معلومات الربط</h3>
            <p className="text-[11px] font-semibold text-slate-400">
              أسماء المتغيّرات فقط — لا تُعرض أي قيمة
            </p>
          </div>
          {health && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onProbe}
              disabled={probing}
              className="h-8 shrink-0 gap-1.5 rounded-xl text-xs font-bold"
            >
              <Activity className="h-3.5 w-3.5" />
              {probing ? 'جاري الفحص...' : 'اختبار الاتصال'}
            </Button>
          )}
        </div>

        {health ? (
          <div className="space-y-2 rounded-2xl bg-slate-50 p-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-500">الوضع</span>
              <span className="font-black text-slate-800">
                {health.mode === 'PRODUCTION' ? 'إنتاج' : 'تجريبي'}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="font-bold text-slate-500">الاتصال</span>
              <span className="flex items-center gap-2">
                {/*
                  Latency is the probe's own measurement and only exists after
                  one, so it is shown beside the verdict rather than as a
                  figure of its own that would read «—» until clicked.
                */}
                {probed?.credentialsValid && probed.latencyMs !== null && (
                  <span className="font-bold tabular-nums text-slate-400">
                    {probed.latencyMs}ms
                  </span>
                )}
                <span
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-bold',
                    health.credentialsValid
                      ? 'bg-emerald-50 text-emerald-700'
                      : health.configured
                        ? 'bg-slate-100 text-slate-500'
                        : 'bg-amber-50 text-amber-700',
                  )}
                >
                  <span
                    className={cn(
                      'h-1.5 w-1.5 rounded-full',
                      health.credentialsValid
                        ? 'bg-emerald-500'
                        : health.configured
                          ? 'bg-slate-400'
                          : 'bg-amber-500',
                    )}
                  />
                  {health.credentialsValid
                    ? 'متصل'
                    : health.configured
                      ? 'لم يُفحص بعد'
                      : 'إعدادات ناقصة'}
                </span>
              </span>
            </div>

            {/*
              Variable names and whether they are set — never a value, not even
              a masked tail. The last four characters of an API key are still
              key material, and the admin route is explicit that nothing here
              needs to read one back out. It is also the only thing the server
              sends: `missingCredentials` is a list of names, so a row per
              *present* variable could only be invented.
            */}
            {missing.length > 0 ? (
              <div className="space-y-1.5 pt-1">
                {visibleCredentials.map((credential) => (
                  <div
                    key={credential.name}
                    dir="ltr"
                    className="flex items-center justify-between gap-2 rounded-xl bg-white px-2.5 py-1.5 text-[11px] ring-1 ring-slate-100"
                  >
                    <span className="truncate font-mono text-slate-600">
                      {credential.name}
                    </span>
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 font-bold text-amber-600">
                      <X className="h-3 w-3" strokeWidth={3} />
                      غير مضبوط
                    </span>
                  </div>
                ))}
                {missing.length > 3 && (
                  <button
                    type="button"
                    onClick={() => setShowAllCredentials((value) => !value)}
                    className="flex w-full items-center justify-center gap-1 pt-0.5 text-[11px] font-bold text-slate-500 transition hover:text-slate-700"
                  >
                    {showAllCredentials
                      ? 'عرض أقل'
                      : `عرض جميع المتغيّرات (${missing.length})`}
                  </button>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-1.5 rounded-xl bg-white px-2.5 py-1.5 text-[11px] font-bold text-emerald-600 ring-1 ring-slate-100">
                <Check className="h-3.5 w-3.5" strokeWidth={3} />
                جميع متغيّرات الربط مضبوطة
              </div>
            )}

            {/*
              The gateway's own words, shown only when they add something.

              `reason` is the server's diagnostic string and it is English —
              `configured; credentials not verified yet` — which read as a bug
              sitting raw in an Arabic panel. For the two states this drawer
              already draws (configured, or missing variables it lists by
              name) it was also pure repetition. So the local states are said
              in Arabic above, and the raw text appears only after a probe,
              where it carries the gateway's actual answer and is worth having
              verbatim: labelled as technical detail and `dir="ltr"`, so mixed
              script reads as a quotation rather than a mistake.
            */}
            {probed?.reason && (
              <div className="space-y-1 pt-1">
                <div className="text-[11px] font-bold text-slate-500">
                  رد البوابة
                </div>
                <p
                  dir="ltr"
                  className="text-left font-mono text-[11px] leading-relaxed text-slate-400"
                >
                  {probed.reason}
                </p>
              </div>
            )}
          </div>
        ) : (
          <p className="rounded-2xl bg-slate-50 p-3 text-xs text-slate-500">
            لا يوجد تكامل خلف هذا المزود، لذلك لا توجد بيانات ربط لفحصها.
          </p>
        )}
      </section>

      <section>
        <h3 className="mb-2 text-sm font-black text-slate-800">آخر طلب</h3>
        {lastRequest ? (
          <div className="flex items-center gap-3 rounded-2xl bg-slate-50 px-3 py-2.5 text-xs">
            <ChevronLeft className="h-4 w-4 shrink-0 text-slate-300" aria-hidden />
            {/*
              The window total, not the last request's own amount or status.
              The activity route sends `lastRequestAt` and nothing else about
              that transaction — no reference, no outcome, no figure — so this
              names what it is rather than dressing a different number as it.
            */}
            <span className="flex-1 font-black text-slate-900">
              {formatIqd(activity?.window.transactions ?? 0)} معاملة خلال النافذة
            </span>
            <span className="shrink-0 font-bold text-slate-700">
              {lastRequest.date}{' '}
              <span className="text-slate-400">{lastRequest.time}</span>
            </span>
          </div>
        ) : (
          <p className="rounded-2xl bg-slate-50 px-3 py-2.5 text-xs text-slate-500">
            لم يُرسل أي طلب عبر هذه البوابة بعد.
          </p>
        )}
      </section>
    </div>
  );
};
