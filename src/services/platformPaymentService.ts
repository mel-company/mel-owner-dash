import axiosInstance from '../utils/AxiosInstance';

export interface RefundPlatformPaymentPayload {
  amount?: number;
  message?: string;
}

export interface RefundPlatformPaymentResult {
  id: string;
  status: string;
  amount: number;
  refundedAmount: number;
  remaining: number;
  currency: string;
  provider: string;
  transactionId: string | null;
  refund: {
    refundId?: string;
    requestId: string;
    amount: number;
    status: string;
    message?: string;
    details?: Record<string, unknown>;
  };
}

export const platformPaymentService = {
  refund: async (
    paymentId: string,
    payload: RefundPlatformPaymentPayload = {},
  ): Promise<RefundPlatformPaymentResult> => {
    const response = await axiosInstance.post<RefundPlatformPaymentResult>(
      `/platform-payments/${paymentId}/refund`,
      payload,
    );
    return response as unknown as RefundPlatformPaymentResult;
  },
};
