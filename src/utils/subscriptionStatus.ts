import type { StatusTone } from '@/components/dashboard';

/**
 * The four statuses a subscription can actually be in.
 *
 * Both services declared this union as `'ACTIVE' | 'CANCELLED' | 'EXPIRED' |
 * 'PAUSED'`, and **`PAUSED` does not exist** — the Prisma enum is `INACTIVE`,
 * which is what an operator's pause writes. So `StoreDetails`' Arabic map
 * translated a value that never arrives and fell through to raw English for the
 * one that does, while `SubscriptionPlans` printed the bare enum.
 */
export type SubscriptionStatus =
  | 'ACTIVE'
  | 'INACTIVE'
  | 'EXPIRED'
  | 'CANCELLED';

const LABELS: Record<SubscriptionStatus, string> = {
  ACTIVE: 'نشط',
  INACTIVE: 'موقوف مؤقتاً',
  EXPIRED: 'منتهي',
  CANCELLED: 'ملغى',
};

const TONES: Record<SubscriptionStatus, StatusTone> = {
  ACTIVE: 'green',
  INACTIVE: 'amber',
  EXPIRED: 'red',
  CANCELLED: 'slate',
};

/**
 * Arabic for a subscription status, in one place.
 *
 * The map existed twice — in `StoreDetails` and in `Stores` — and a third screen
 * printed the enum instead. An unknown value is returned as-is rather than
 * hidden, so a status this app has not been taught is visible rather than blank.
 */
export const subscriptionStatusLabel = (
  status?: string | null,
): string => {
  if (!status) return 'بدون اشتراك';
  return LABELS[status as SubscriptionStatus] ?? status;
};

/** The pill colour for a status. `EXPIRED` is red; a pause is only amber. */
export const subscriptionStatusTone = (
  status?: string | null,
): StatusTone => {
  if (!status) return 'slate';
  return TONES[status as SubscriptionStatus] ?? 'slate';
};

/**
 * Whether this status means the store is currently entitled to its plan.
 *
 * Deliberately **not** the whole answer — the server also requires the term to
 * cover today (`isSubscriptionInForce`), which a status alone cannot tell you.
 * Used only to decide which actions to offer, never to grant anything.
 */
export const isLiveStatus = (status?: string | null): boolean =>
  status === 'ACTIVE';
