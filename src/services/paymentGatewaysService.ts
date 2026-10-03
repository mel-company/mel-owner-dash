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

const paymentGatewaysService = {
  /** كل البوابات وحالة إعدادها — بدون أي اتصال بالبوابة. GET /payments/gateways */
  getGateways: async (): Promise<{ data: PaymentGatewayHealth[] }> => {
    const response = await axiosInstance.get('/payments/gateways');
    return response as unknown as { data: PaymentGatewayHealth[] };
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
