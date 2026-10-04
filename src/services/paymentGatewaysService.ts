import axiosInstance from '../utils/AxiosInstance';

/**
 * بوابات الدفع — الحالة التشغيلية
 *
 * Distinct from `paymentProviderService`, which is the *catalogue* a merchant
 * picks from. This is the integration behind it: whether the platform can
 * actually charge through a gateway right now, and what is missing if not.
 */

export interface GatewayCapabilities {
  refund: boolean;
  partialRefund: boolean;
  cancel: boolean;
  webhookRetriesUntilOk: boolean;
  idempotentRefund: boolean;
}

export interface PaymentGatewayHealth {
  gateway: 'ZAIN_CASH' | 'QI_CARD';
  name: string;
  logoUrl: string;
  /** Every credential this gateway needs is present. */
  configured: boolean;
  /**
   * Running live against the real gateway. False whenever anything is
   * missing — an unconfigured gateway never reports itself as production.
   */
  production: boolean;
  mode: 'TEST' | 'PRODUCTION';
  /** Names of the absent environment variables. Never values. */
  missingCredentials: string[];
  /** The gateway accepted the credentials and could do the job. */
  credentialsValid: boolean;
  authOk: boolean;
  callOk: boolean;
  reason: string;
  latencyMs: number | null;
  capabilities: GatewayCapabilities;
  checkedAt: string;
}

/** One day of the 30-day window, for the sparkline. */
export interface GatewayDailyPoint {
  /** `YYYY-MM-DD`, UTC. */
  date: string;
  transactions: number;
  /** Integer IQD, settled only. */
  amount: number;
}

/**
 * What a gateway has actually done — separate from whether it *could*.
 *
 * Read from the two status ledgers, both of them: a gateway cannot tell which
 * of the platform's pipelines sent it a transaction, so a page about the
 * gateway sums store checkout and platform billing.
 */
export interface GatewayActivity {
  gateway: PaymentGatewayHealth['gateway'];
  /** Every transaction ever opened through it, settled or not. */
  transactions: number;
  /**
   * Which of the platform's two surfaces have actually sent it anything.
   *
   * Counts, not booleans, because there is no per-gateway surface setting:
   * platform billing follows `PLATFORM_PAYMENT_PROVIDER` and store checkout
   * follows the catalogue. Where it has been used is the knowable answer.
   */
  surfaces: {
    storeCheckout: number;
    platformBilling: number;
  };
  lastRequestAt: string | null;
  window: {
    days: number;
    /** Settled money only — a pending transaction is not revenue. */
    amount: number;
    transactions: number;
    /**
     * `null` rather than `0` when nothing has been decided yet. "Nothing has
     * failed" and "nothing exists" are different facts, and 0% on a new
     * gateway reads as an outage.
     */
    successRate: number | null;
    series: GatewayDailyPoint[];
  };
}

export type PaymentSurface = 'STORE_CHECKOUT' | 'PLATFORM_BILLING';

/**
 * Whether the operator allows a gateway to take money on a given surface.
 *
 * Narrower than `PaymentProvider.isActive`, which withdraws the brand from the
 * catalogue entirely. This is "keep taking store orders through it, stop
 * billing subscriptions with it" — which nothing could express before.
 *
 * `updatedAt` is `null` when nobody has expressed an opinion. Absence means
 * enabled, so that is a real state the page has to draw, not a gap.
 */
export interface GatewaySurfaceSetting {
  gateway: PaymentGatewayHealth['gateway'];
  surface: PaymentSurface;
  enabled: boolean;
  updatedAt: string | null;
}

const paymentGatewaysService = {
  /** كل البوابات وحالة إعدادها — بدون أي اتصال بالبوابة. GET /payments/gateways */
  getGateways: async (): Promise<{ data: PaymentGatewayHealth[] }> => {
    const response = await axiosInstance.get('/payments/gateways');
    return response as unknown as { data: PaymentGatewayHealth[] };
  },

  /**
   * حركة كل بوابة — المعاملات، آخر طلب، ونافذة 30 يوم.
   * GET /payments/gateways/activity
   *
   * Reads the ledgers and contacts no gateway, so unlike `checkGateway` it is
   * safe to call on page load.
   */
  getActivity: async (): Promise<{ data: GatewayActivity[] }> => {
    const response = await axiosInstance.get('/payments/gateways/activity');
    return response as unknown as { data: GatewayActivity[] };
  },

  /** إعدادات التفعيل لكل بوابة وكل سطح. GET /payments/gateways/settings */
  getSettings: async (): Promise<{ data: GatewaySurfaceSetting[] }> => {
    const response = await axiosInstance.get('/payments/gateways/settings');
    return response as unknown as { data: GatewaySurfaceSetting[] };
  },

  /** PATCH /payments/gateways/settings/:gateway/:surface */
  setSurfaceEnabled: async (
    gateway: PaymentGatewayHealth['gateway'],
    surface: PaymentSurface,
    enabled: boolean,
  ): Promise<GatewaySurfaceSetting> => {
    const response = await axiosInstance.patch(
      `/payments/gateways/settings/${gateway}/${surface}`,
      { enabled },
    );
    return response as unknown as GatewaySurfaceSetting;
  },

  /**
   * فحص اتصال حقيقي ببوابة واحدة.
   * GET /payments/gateways/:gateway/health
   *
   * A real round trip, which is why it is a button and not part of the list.
   */
  checkGateway: async (
    gateway: PaymentGatewayHealth['gateway'],
  ): Promise<PaymentGatewayHealth> => {
    const response = await axiosInstance.get(
      `/payments/gateways/${gateway}/health`,
    );
    return response as unknown as PaymentGatewayHealth;
  },
};

export default paymentGatewaysService;
export { paymentGatewaysService };
