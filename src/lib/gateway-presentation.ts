import type { StatusTone } from '@/components/dashboard';
import type {
  GatewayActivity,
  PaymentSurface,
} from '@/services/paymentGatewaysService';
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
  /**
   * The shared `StatusPill`'s own vocabulary, not raw Tailwind.
   *
   * This used to hand back class strings, which is what made the gateways
   * table grow a private pill component: once a module is emitting colours,
   * the component that renders them has to be the one that understands them.
   * Naming a tone instead lets the shared pill stay the only pill.
   */
  tone: StatusTone;
};

const STATUS_META: Record<GatewayStatus, Omit<GatewayStatusMeta, 'status'>> = {
  active: { label: 'مفعلة', tone: 'green' },
  'needs-setup': { label: 'تحتاج إعداد', tone: 'amber' },
  disabled: { label: 'معطلة', tone: 'slate' },
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

/** Which lucide glyph stands for a surface. Named, not imported — this module stays React-free. */
export type SurfaceIcon = 'store' | 'users';

export type GatewaySurface = {
  /** The code the settings route writes. */
  surface: PaymentSurface;
  /** The matching counter on `GatewayActivity.surfaces`. */
  counter: keyof GatewayActivity['surfaces'];
  label: string;
  /** One line under the label, in the drawer's cards. */
  hint: string;
  /** Tailwind classes for the table's chip. */
  chip: string;
  icon: SurfaceIcon;
};

/**
 * The two places the platform can open a payment, described once.
 *
 * The table's chips, the drawer's switches and the usage filter are three
 * views of this list, and they each used to carry their own copy of the
 * labels — the drawer's inline array said «واجهة التاجر» while the chip said
 * the same thing from a different literal, which is a rename away from a page
 * that calls one surface two names. There is no third entry: the server's
 * `PAYMENT_SURFACES` has exactly these two, and a control for a surface the
 * settings route would reject is a switch that writes nowhere.
 */
export const GATEWAY_SURFACES: readonly GatewaySurface[] = [
  {
    surface: 'STORE_CHECKOUT',
    counter: 'storeCheckout',
    label: 'واجهة التاجر',
    hint: 'دفع المنتجات والخدمات في المتجر',
    chip: 'bg-violet-50 text-violet-700',
    icon: 'store',
  },
  {
    surface: 'PLATFORM_BILLING',
    counter: 'platformBilling',
    label: 'اشتراكات العملاء',
    hint: 'الخطط الشهرية والسنوية',
    chip: 'bg-sky-50 text-sky-700',
    icon: 'users',
  },
];

export type GatewayUsage = GatewaySurface & { transactions: number };

/**
 * Where a gateway has actually been used — recorded traffic, not permission.
 *
 * The drawer's switches answer the neighbouring question (where it *may* be
 * used) and are backed by `PaymentGatewaySetting`. These chips are the
 * ledger's answer, so a gateway switched on everywhere and used nowhere still
 * shows nothing here, which is the state worth seeing.
 */
export function gatewayUsage(activity?: GatewayActivity | null): GatewayUsage[] {
  if (!activity) return [];
  return GATEWAY_SURFACES.map((surface) => ({
    ...surface,
    transactions: activity.surfaces[surface.counter] ?? 0,
  })).filter((usage) => usage.transactions > 0);
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

/**
 * The 30-day window as a chart reads it: one bar per day, labelled.
 *
 * Returns `[]` when the window carried nothing, so the caller draws its empty
 * state instead of an axis over a flat row of zeroes — a chart with no bars
 * reads as broken rather than as quiet.
 *
 * `ar-IQ-u-nu-latn` is the dashboard's date idiom (`CourierDetailDrawer` uses
 * it for the same axis): Iraqi month names, Latin digits, matching the Latin
 * digits every other figure on this page is grouped with.
 */
export type GatewayChartPoint = { label: string; transactions: number };

export function chartPoints(
  activity?: GatewayActivity | null,
): GatewayChartPoint[] {
  const series = activity?.window.series ?? [];
  if (!series.some((point) => point.transactions > 0)) return [];

  return series.map((point) => {
    const parsed = new Date(point.date);
    return {
      label: Number.isNaN(parsed.getTime())
        ? point.date
        : parsed.toLocaleDateString('ar-IQ-u-nu-latn', {
            day: 'numeric',
            month: 'short',
          }),
      transactions: point.transactions,
    };
  });
}
