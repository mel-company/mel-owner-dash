import axiosInstance from '../utils/AxiosInstance';

/**
 * The integration behind a provider row, when there is one.
 *
 * `null` for cash on delivery and for any brand the platform has no adapter
 * for — which is not the same as unhealthy, and must not be drawn as a fault.
 */
export interface ProviderGateway {
  gateway: 'ZAIN_CASH' | 'QI_CARD';
  name: string;
  logoUrl: string;
  configured: boolean;
  production: boolean;
  mode: 'TEST' | 'PRODUCTION';
  missingCredentials: string[];
  credentialsValid: boolean;
  reason: string;
}

export interface PaymentProvider {
  /** Joined server-side so no client keeps its own code → logo mapping. */
  gateway?: ProviderGateway | null;
  id: string;
  name: string;
  code: string;
  description?: string;
  logoUrl?: string;
  isActive?: boolean;
  type?: 'ONLINE' | 'OFFLINE';
  configSchema?: Record<string, {
    type: string;
    required: boolean;
  }>;
  config?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
  is_deleted?: boolean;
  deleted_at?: string | null;
  _count?: {
    methods: number;
  };
}

export interface PaymentProvidersListResponse {
  data: PaymentProvider[];
  total: number;
  page?: number;
  limit?: number;
}

export interface CreatePaymentProviderRequest {
  name: string;
  code: string;
  description?: string;
  logoUrl?: string;
  isActive?: boolean;
  type?: 'ONLINE' | 'OFFLINE';
  configSchema?: Record<string, {
    type: string;
    required: boolean;
  }>;
  config?: Record<string, unknown>;
}

export interface UpdatePaymentProviderRequest {
  name?: string;
  code?: string;
  description?: string;
  logoUrl?: string;
  isActive?: boolean;
  type?: 'ONLINE' | 'OFFLINE';
  configSchema?: Record<string, {
    type: string;
    required: boolean;
  }>;
  config?: Record<string, unknown>;
}

/**
 * Payment Provider Service
 * Handles payment provider management endpoints
 */
export const paymentProviderService = {
  /**
   * إنشاء مزود دفع جديد
   * POST /api/v1/payment-provider
   */
  createPaymentProvider: async (providerData: CreatePaymentProviderRequest): Promise<PaymentProvider> => {
    const response = await axiosInstance.post<PaymentProvider>(
      '/payment-provider',
      providerData
    );
    return response as unknown as PaymentProvider;
  },

  /**
   * الحصول على جميع مزودي الدفع
   * GET /api/v1/payment-provider
   */
  getAllPaymentProviders: async (params?: { page?: number; limit?: number }): Promise<PaymentProvidersListResponse> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    const queryString = queryParams.toString();
    const url = `/payment-provider${queryString ? `?${queryString}` : ''}`;

    const response = await axiosInstance.get<PaymentProvider[] | PaymentProvidersListResponse>(url);
    
    // Handle both array response and object with data property
    if (Array.isArray(response)) {
      return {
        data: response,
        total: response.length,
      } as PaymentProvidersListResponse;
    }
    
    return response as unknown as PaymentProvidersListResponse;
  },

  /**
   * الحصول على مزود دفع بالكود
   * GET /api/v1/payment-provider/by-code/{code}
   */
  getPaymentProviderByCode: async (code: string): Promise<PaymentProvider> => {
    const response = await axiosInstance.get<PaymentProvider>(
      `/payment-provider/by-code/${code}`
    );
    return response as unknown as PaymentProvider;
  },

  /**
   * الحصول على مزود دفع محدد
   * GET /api/v1/payment-provider/{id}
   */
  getPaymentProviderById: async (id: string): Promise<PaymentProvider> => {
    const response = await axiosInstance.get<PaymentProvider>(
      `/payment-provider/${id}`
    );
    return response as unknown as PaymentProvider;
  },

  /**
   * تحديث مزود دفع
   * PUT /api/v1/payment-provider/{id}
   */
  updatePaymentProvider: async (id: string, providerData: UpdatePaymentProviderRequest): Promise<PaymentProvider> => {
    const response = await axiosInstance.put<PaymentProvider>(
      `/payment-provider/${id}`,
      providerData
    );
    return response as unknown as PaymentProvider;
  },

  /**
   * حذف مزود دفع
   * DELETE /api/v1/payment-provider/{id}
   */
  deletePaymentProvider: async (id: string): Promise<void> => {
    await axiosInstance.delete<void>(`/payment-provider/${id}`);
  },
};
