import type { GatewayActivity } from '@/services/paymentGatewaysService';
import type { PaymentProvider } from '@/services/paymentProviderService';

/**
 * The half of a gateway's health these helpers actually need.
 *
 * Structural rather than one of the two named types, because the list route
 * sends a trimmed `ProviderGateway` on each provider row while the probe
 * returns the full `PaymentGatewayHealth` — and the drawer shows whichever it
 * has. Naming only the fields used here lets both flow in without a cast.
 */
export type GatewayHealthLike = {
  missingCredentials: string[];
};

/**
 * How a payment gateway is described on the gateways page.
 *
 * Pure, and separate from the markup, for the reason the accounting page
 * learned the hard way: when "what is this" is answered inline in JSX it gets
 * answered again in the next component, and the two drift. Everything here
 * takes rows the server sent and returns something to draw — nothing is
 * inferred from an id, a hash, or a substring of a name.
 */

export type GatewayStatus = 'active' | 'needs-setup' | 'disabled';

export type GatewayStatusMeta = {
  status: GatewayStatus;
  label: string;
  /** Tailwind classes for the pill. */
  pill: string;
  dot: string;
};

const STATUS_META: Record<GatewayStatus, Omit<GatewayStatusMeta, 'status'>> = {
  active: {
    label: 'مفعلة',
    pill: 'bg-emerald-50 text-emerald-700',
    dot: 'bg-emerald-500',
  },
  'needs-setup': {
    label: 'تحتاج إعداد',
    pill: 'bg-amber-50 text-amber-700',
    dot: 'bg-amber-500',
  },
  disabled: {
    label: 'معطلة',
    pill: 'bg-slate-100 text-slate-600',
    dot: 'bg-slate-400',
  },
};

/**
 * Three states, and the middle one is the useful one.
 *
 * «تحتاج إعداد» is a provider the platform is *offering* while the integration
 * behind it cannot charge — credentials absent. Without it that row looks
 * identical to a working one until a shopper reaches the gateway, which is the
 * failure the whole health service exists to surface. A provider with no
 * gateway at all (cash on delivery) is never "needs setup": there is nothing
 * to configure.
 */
export function gatewayStatus(provider: PaymentProvider): GatewayStatusMeta {
  const status: GatewayStatus = !provider.isActive
    ? 'disabled'
    : provider.gateway && !provider.gateway.configured
      ? 'needs-setup'
      : 'active';

  return { status, ...STATUS_META[status] };
}

export type GatewayUsage = {
  key: 'storeCheckout' | 'platformBilling';
  label: string;
  /** Tailwind classes for the chip. */
  chip: string;
  transactions: number;
};

/**
 * Where a gateway has actually been used.
 *
 * Derived from recorded traffic rather than drawn as editable checkboxes,
 * because there is no per-gateway surface setting to edit: platform billing
 * follows `PLATFORM_PAYMENT_PROVIDER` and store checkout follows the
 * catalogue. Checkboxes that write nowhere are worse than a read-only answer
 * — they invite an operator to change something and then silently discard it.
 */
export function gatewayUsage(activity?: GatewayActivity | null): GatewayUsage[] {
  if (!activity) return [];

  const usages: GatewayUsage[] = [
    {
      key: 'storeCheckout',
      label: 'واجهة التاجر',
      chip: 'bg-violet-50 text-violet-700',
      transactions: activity.surfaces.storeCheckout,
    },
    {
      key: 'platformBilling',
      label: 'اشتراكات العملاء',
      chip: 'bg-sky-50 text-sky-700',
      transactions: activity.surfaces.platformBilling,
    },
  ];

  return usages.filter((usage) => usage.transactions > 0);
}

/**
 * The credentials a gateway needs, each marked present or absent.
 *
 * **Names only, never values** — not even a masked tail. The admin route is
 * explicit that it reports which variables are missing and that "nothing in
 * this platform needs to read one back out", and the last four characters of
 * an API key are still key material in a browser. What an operator actually
 * needs from this panel is "is it set", which this answers without the leak.
 *
 * The present ones are only knowable when the gateway reports what it wants,
 * so a gateway with nothing missing shows its requirements as satisfied
 * without enumerating them.
 */
export type CredentialState = { name: string; present: boolean };

export function credentialStates(
  health: GatewayHealthLike | null | undefined,
): CredentialState[] {
  if (!health) return [];
  return health.missingCredentials.map((name) => ({ name, present: false }));
}

/** `2026/10/03` + `14:32`, or a dash. Never a guess at a missing date. */
export function formatRequestedAt(value: string | null | undefined): {
  date: string;
  time: string;
} | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;

  const pad = (part: number) => String(part).padStart(2, '0');
  return {
    date: `${parsed.getFullYear()}/${pad(parsed.getMonth() + 1)}/${pad(parsed.getDate())}`,
    time: `${pad(parsed.getHours())}:${pad(parsed.getMinutes())}`,
  };
}

/**
 * Bar heights for the sparkline, as percentages of the busiest day.
 *
 * Returns an empty array when every day is empty, so the caller draws nothing
 * rather than a flat row of zero-height bars that reads as a broken chart.
 */
export function sparklineBars(activity?: GatewayActivity | null): number[] {
  const series = activity?.window.series ?? [];
  const peak = Math.max(0, ...series.map((point) => point.transactions));
  if (peak === 0) return [];
  return series.map((point) => Math.round((point.transactions / peak) * 100));
}

/** `2,480,000` — grouped, never rounded into a lie. */
export const formatIqd = (amount: number): string => amount.toLocaleString('en-US');
