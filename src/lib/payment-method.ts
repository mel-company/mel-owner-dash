import type { AccountingTransaction } from '@/services/accountingService';

/**
 * One answer to "what did they pay with", read rather than guessed.
 *
 * This replaces three functions in `pages/Accounting.tsx` that each tried to
 * work it out independently:
 *
 * - `getMethodKey` sniffed `` `${method} ${provider}` `` for `BANK`, `ZAIN`,
 *   `CARD` — and fed the filter.
 * - `getCardBrand` sniffed the same string for `visa`, `master`, `google`, and
 *   when that failed did `hash % 2 === 0 ? 'mastercard' : 'visa'` — and fed a
 *   real brand logo. It also gave ZainCash, an Iraqi wallet, a Google Pay icon.
 * - `getMethodMeta` switched on the provider, fell through to `getMethodKey`,
 *   and fed the label.
 *
 * The sniffing was never going to work: the server sets `method` and
 * `provider` to the **same value**, so concatenating them counted one signal
 * twice. And the brand was unknowable from the payload because the server
 * captured the gateway's real `paymentSystem` and threw it away.
 *
 * Both halves are now facts on the row. `methodCategory` is decided once, by
 * `accounting/payment-method-category.ts`, which is also what the server
 * filters on — so the label and the filter cannot drift apart. `paymentSystem`
 * is what the gateway actually reported, and `null` when it reported nothing,
 * which is a thing we say out loud instead of inventing a card network.
 */

/** Matches the server's `PaymentMethodCategory`. */
export type PaymentMethodCategory = 'bank' | 'card' | 'wallet';

/** What the icon component draws. A brand, or an honest absence of one. */
export type PaymentMethodArt =
  | 'visa'
  | 'mastercard'
  | 'zaincash'
  | 'qicard'
  | 'bank'
  | 'card';

export type PaymentMethodDescription = {
  category: PaymentMethodCategory;
  /** What the payer used, in Arabic. */
  label: string;
  /** Which mark to draw. Never inferred from an id. */
  art: PaymentMethodArt;
  /**
   * The card network, when the gateway named one — `'Visa'`, `'MasterCard'`.
   * `null` means nobody knows, and the UI says so rather than picking.
   */
  network: string | null;
  /** `**** 8582`, when the gateway sent a masked number. */
  maskedPan: string | null;
};

/**
 * Narrows a value out of a `<select>` into the filter's own vocabulary.
 *
 * `SelectField` hands back a bare `string`, and the server answers `400` for a
 * bucket it does not serve — on purpose, so a mismatch between the two
 * surfaces is a loud error rather than an empty table. This is what keeps the
 * client from being the thing that causes it: anything unrecognised becomes
 * "no filter", which is the one safe reading.
 */
export const asPaymentMethodFilter = (
  value: string,
): '' | PaymentMethodCategory =>
  value === 'bank' || value === 'card' || value === 'wallet' ? value : '';

const CATEGORY_LABELS: Record<PaymentMethodCategory, string> = {
  bank: 'تحويل بنكي',
  card: 'بطاقة',
  wallet: 'محفظة إلكترونية',
};

/**
 * The buckets the filter offers, in the order they appear.
 *
 * Not `readonly`, because `SelectField` takes a mutable array and spreading it
 * on every render to satisfy a type is a worse trade than the immutability is
 * worth here.
 */
export const PAYMENT_METHOD_FILTERS: Array<{
  value: '' | PaymentMethodCategory;
  label: string;
}> = [
  { value: '', label: 'الكل' },
  { value: 'bank', label: CATEGORY_LABELS.bank },
  { value: 'card', label: CATEGORY_LABELS.card },
  { value: 'wallet', label: CATEGORY_LABELS.wallet },
];

/**
 * The gateway's own brand, which is not the same question as the card network.
 *
 * A Qi Card payment made with a Visa shows Visa; one whose network the gateway
 * did not report shows Qi Card, because that is the part we do know. A wallet
 * has no network at all and always shows its own mark.
 */
const PROVIDER_ART: Record<string, PaymentMethodArt> = {
  ZAIN_CASH: 'zaincash',
  QI_CARD: 'qicard',
};

const NETWORK_ART: Record<string, PaymentMethodArt> = {
  VISA: 'visa',
  MASTERCARD: 'mastercard',
  MASTER: 'mastercard',
  MC: 'mastercard',
};

const normaliseNetwork = (value: string | null | undefined): string | null => {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  const upper = trimmed.toUpperCase();
  if (upper === 'VISA') return 'Visa';
  if (upper === 'MASTERCARD' || upper === 'MASTER' || upper === 'MC') {
    return 'MasterCard';
  }
  // Something the gateway named that we have no spelling for. Shown as sent
  // rather than dropped — an operator reading it can tell us what it is.
  return trimmed;
};

const maskPan = (value: string | null | undefined): string | null => {
  const digits = value?.replace(/\D/g, '');
  if (!digits || digits.length < 4) return null;
  return `**** ${digits.slice(-4)}`;
};

export function describePaymentMethod(
  transaction: Pick<
    AccountingTransaction,
    'methodCategory' | 'provider' | 'paymentSystem' | 'maskedPan'
  >,
): PaymentMethodDescription {
  /**
   * `methodCategory` comes from the server. The fallback is for a row served
   * by a deployment that predates it — `bank`, because a row with no gateway
   * recorded against it is a manual transfer, which is the same thing the
   * server concludes from a `null` provider.
   */
  const category: PaymentMethodCategory = transaction.methodCategory ?? 'bank';
  const network = normaliseNetwork(transaction.paymentSystem);

  const art =
    (network && NETWORK_ART[network.toUpperCase()]) ||
    PROVIDER_ART[(transaction.provider || '').toUpperCase()] ||
    (category === 'bank' ? 'bank' : 'card');

  return {
    category,
    label: network ?? CATEGORY_LABELS[category],
    art,
    network,
    maskedPan: maskPan(transaction.maskedPan),
  };
}
