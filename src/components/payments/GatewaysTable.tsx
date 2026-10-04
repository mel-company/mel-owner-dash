import { useState } from 'react';
import { Activity, Check, Pencil, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  credentialStates,
  formatIqd,
  formatRequestedAt,
  gatewayStatus,
  gatewayUsage,
  sparklineBars,
} from '@/lib/gateway-presentation';
import type {
  GatewayActivity,
  GatewaySurfaceSetting,
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
 * something — a credential's value, which surfaces a gateway is *configured*
 * for — this says so rather than drawing a plausible answer.
 */

const MARK_FALLBACK_TONES = [
  'bg-violet-100 text-violet-700',
  'bg-sky-100 text-sky-700',
  'bg-amber-100 text-amber-700',
  'bg-emerald-100 text-emerald-700',
];

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
const GatewayMark = ({ provider }: { provider: PaymentProvider }) => {
  const logo = provider.gateway?.logoUrl || provider.logoUrl;
  const [broken, setBroken] = useState(false);

  if (logo && !broken) {
    return (
      <span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-100">
        <img
          src={logo}
          alt=""
          className="h-7 w-7 object-contain"
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
        'grid h-11 w-11 shrink-0 place-items-center rounded-xl text-sm font-black',
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

const StatusPill = ({ provider }: { provider: PaymentProvider }) => {
  const meta = gatewayStatus(provider);
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold',
        meta.pill,
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', meta.dot)} />
      {meta.label}
    </span>
  );
};

const Toggle = ({
  on,
  onClick,
  label,
}: {
  on: boolean;
  onClick: () => void;
  label: string;
}) => (
  <button
    type="button"
    role="switch"
    aria-checked={on}
    aria-label={label}
    onClick={onClick}
    className={cn(
      'relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition',
      on ? 'bg-emerald-500' : 'bg-slate-200',
    )}
  >
    <span
      className={cn(
        'absolute h-5 w-5 rounded-full bg-white shadow transition-all',
        // RTL: "on" sits at the leading (right) edge.
        on ? 'right-1' : 'right-6',
      )}
    />
  </button>
);

export type GatewayRowAction = {
  onToggle: (provider: PaymentProvider) => void;
  onEdit: (provider: PaymentProvider) => void;
  onDelete: (provider: PaymentProvider) => void;
  onOpen: (provider: PaymentProvider) => void;
};

export const GatewaysTable = ({
  rows,
  activityByGateway,
  actions,
}: {
  rows: PaymentProvider[];
  activityByGateway: Record<string, GatewayActivity>;
  actions: GatewayRowAction;
}) => (
  <table className="w-full min-w-[920px] text-right">
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

        return (
          <tr
            key={provider.id}
            className="text-sm transition hover:bg-slate-50/70"
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
              <StatusPill provider={provider} />
            </td>

            <td className="px-5 py-4">
              {usage.length > 0 ? (
                <span className="flex flex-wrap gap-1.5">
                  {usage.map((item) => (
                    <span
                      key={item.key}
                      className={cn(
                        'inline-flex items-center rounded-lg px-2.5 py-1 text-[11px] font-bold',
                        item.chip,
                      )}
                    >
                      {item.label}
                    </span>
                  ))}
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
              <Toggle
                on={!!provider.isActive}
                onClick={() => actions.onToggle(provider)}
                label={`تفعيل ${provider.name}`}
              />
            </td>

            <td className="px-5 py-4">
              <span className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`تعديل ${provider.name}`}
                  onClick={() => actions.onEdit(provider)}
                  className="h-8 w-8 rounded-lg text-slate-400 hover:text-slate-700"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`حذف ${provider.name}`}
                  onClick={() => actions.onDelete(provider)}
                  className="h-8 w-8 rounded-lg text-slate-400 hover:text-rose-600"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </span>
            </td>
          </tr>
        );
      })}
    </tbody>
  </table>
);

/** One of the three figures in the drawer's 30-day panel. */
const WindowStat = ({
  label,
  value,
  muted,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) => (
  <div className="rounded-2xl bg-slate-50 px-3 py-3 text-center">
    <div className="text-[11px] font-bold text-slate-500">{label}</div>
    <div
      className={cn(
        'mt-1 text-lg font-black tabular-nums',
        muted ? 'text-slate-300' : 'text-slate-900',
      )}
    >
      {value}
    </div>
  </div>
);

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
   * The probe's answer when one has been run, otherwise the list's trimmed
   * copy. Typed as the narrower shape because that is all this panel reads.
   */
  probed?: ProviderGateway | null;
  onProbe: () => void;
  onToggle: () => void;
}) => {
  const health = probed ?? provider.gateway ?? null;
  const missing = credentialStates(health);
  const status = gatewayStatus(provider);
  const lastRequest = formatRequestedAt(activity?.lastRequestAt);

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3">
        <GatewayMark provider={provider} />
        <div className="min-w-0 flex-1">
          <div className="font-black text-slate-900">{provider.name}</div>
          <div className="text-xs font-semibold text-slate-400">
            {health?.name ?? provider.code}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <Toggle
            on={!!provider.isActive}
            onClick={onToggle}
            label={`تفعيل ${provider.name}`}
          />
          <span
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-bold',
              status.pill,
            )}
          >
            <span className={cn('h-1.5 w-1.5 rounded-full', status.dot)} />
            {status.label}
          </span>
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

          The count underneath is still the recorded traffic, which answers a
          different question from the switch: where it *has* been used, not
          where it *may* be.
        */}
        <div className="grid gap-2">
          {([
            {
              surface: 'STORE_CHECKOUT' as const,
              counter: 'storeCheckout' as const,
              label: 'واجهة التاجر',
              hint: 'دفع المنتجات والخدمات في المتجر',
            },
            {
              surface: 'PLATFORM_BILLING' as const,
              counter: 'platformBilling' as const,
              label: 'اشتراكات العملاء',
              hint: 'الخطط الشهرية والسنوية',
            },
          ]).map((entry) => {
            const count = activity?.surfaces[entry.counter] ?? 0;
            // Absence means enabled — the same default the server applies.
            const enabled = settings?.[entry.surface]?.enabled ?? true;
            const saving = savingSurface === entry.surface;
            const editable = !!provider.gateway && !!onSurfaceToggle;

            return (
              <div
                key={entry.surface}
                className={cn(
                  'flex items-center gap-3 rounded-2xl border px-3 py-2.5 transition',
                  enabled
                    ? 'border-violet-100 bg-violet-50/50'
                    : 'border-slate-100 bg-slate-50',
                  saving && 'opacity-60',
                )}
              >
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-black text-slate-800">
                    {entry.label}
                  </div>
                  <div className="text-[11px] text-slate-400">{entry.hint}</div>
                  <div className="mt-1 text-[11px] font-bold text-slate-500">
                    {count > 0 ? `${formatIqd(count)} معاملة` : 'لا يوجد نشاط'}
                  </div>
                </div>
                {editable ? (
                  <Toggle
                    on={enabled}
                    onClick={() => onSurfaceToggle?.(entry.surface, !enabled)}
                    label={`${entry.label} — ${provider.name}`}
                  />
                ) : (
                  // A provider with no integration behind it has no gateway to
                  // switch; cash on delivery is not "off", it is not a gateway.
                  <span className="text-[11px] font-bold text-slate-300">
                    لا ينطبق
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <h3 className="mb-2 text-sm font-black text-slate-800">
          إحصائيات آخر {activity?.window.days ?? 30} يوم
        </h3>
        <div className="grid grid-cols-3 gap-2">
          <WindowStat
            label="المبلغ الإجمالي"
            value={activity ? `${formatIqd(activity.window.amount)} د.ع` : '—'}
            muted={!activity?.window.amount}
          />
          <WindowStat
            label="إجمالي المعاملات"
            value={activity ? formatIqd(activity.window.transactions) : '—'}
            muted={!activity?.window.transactions}
          />
          {/*
            `null` is drawn as a dash, not as 0%. Nothing decided yet and
            everything failing are different answers, and a new gateway
            reporting 0% reads as an outage.
          */}
          <WindowStat
            label="معدل النجاح"
            value={
              activity?.window.successRate === null ||
              activity?.window.successRate === undefined
                ? '—'
                : `${activity.window.successRate}%`
            }
            muted={activity?.window.successRate == null}
          />
        </div>
        <Sparkline activity={activity} className="mt-3 h-12 w-full" />
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-black text-slate-800">معلومات الربط</h3>
          {health && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onProbe}
              disabled={probing}
              className="h-8 gap-1.5 rounded-xl text-xs font-bold"
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
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-500">الاتصال</span>
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
            </div>

            {/*
              Variable names and whether they are set — never a value, not even
              a masked tail. The last four characters of an API key are still
              key material, and the admin route is explicit that nothing here
              needs to read one back out.
            */}
            {missing.length > 0 ? (
              <div className="space-y-1 pt-1">
                {missing.map((credential) => (
                  <div
                    key={credential.name}
                    className="flex items-center justify-between gap-2 text-[11px]"
                  >
                    <span className="font-mono text-slate-500">
                      {credential.name}
                    </span>
                    <span className="inline-flex items-center gap-1 font-bold text-amber-600">
                      <X className="h-3 w-3" strokeWidth={3} />
                      غير مضبوط
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-1.5 pt-1 text-[11px] font-bold text-emerald-600">
                <Check className="h-3.5 w-3.5" strokeWidth={3} />
                جميع متغيرات الربط مضبوطة
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
          <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-2.5 text-xs">
            <span className="font-bold text-slate-700">
              {lastRequest.date}{' '}
              <span className="text-slate-400">{lastRequest.time}</span>
            </span>
            <span className="font-black text-slate-900">
              {formatIqd(activity?.window.transactions ?? 0)} معاملة خلال النافذة
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
