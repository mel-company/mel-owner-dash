import axiosInstance from '../utils/AxiosInstance';

export interface PaymentMethod {
  id: string;
  name: string;
  code: string;
  providerId: string;
  provider?: {
    id: string;
    name: string;
    code: string;
    type?: 'ONLINE' | 'OFFLINE';
  };
  isActive?: boolean;
  sortOrder?: number;
  requirements?: Record<string, {
    type: string;
    required: boolean;
  }> | null;
  createdAt?: string;
  is_deleted?: boolean;
  deleted_at?: string | null;
}

export interface PaymentMethodsListResponse {
  data: PaymentMethod[];
  total: number;
  page?: number;
  limit?: number;
}

export interface CreatePaymentMethodRequest {
  name: string;
  code: string;
  providerId: string;
  isActive?: boolean;
  sortOrder?: number;
  requirements?: Record<string, {
    type: string;
    required: boolean;
  }> | null;
}

export interface UpdatePaymentMethodRequest {
  name?: string;
  code?: string;
  providerId?: string;
  isActive?: boolean;
  sortOrder?: number;
  requirements?: Record<string, {
    type: string;
    required: boolean;
  }> | null;
}

/**
 * Payment Method Service
 * Handles payment method management endpoints
 */
export const paymentMethodService = {
  /**
   * إنشاء طريقة دفع جديدة
   * POST /api/v1/payment-method
   */
  createPaymentMethod: async (methodData: CreatePaymentMethodRequest): Promise<PaymentMethod> => {
    const response = await axiosInstance.post<PaymentMethod>(
      '/payment-method',
      methodData
    );
    return response as unknown as PaymentMethod;
  },

  /**
   * الحصول على جميع طرق الدفع
   * GET /api/v1/payment-method
   */
  getAllPaymentMethods: async (params?: { page?: number; limit?: number }): Promise<PaymentMethodsListResponse> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    const queryString = queryParams.toString();
    const url = `/payment-method${queryString ? `?${queryString}` : ''}`;

    const response = await axiosInstance.get<PaymentMethod[] | PaymentMethodsListResponse>(url);
    
    // Handle both array response and object with data property
    if (Array.isArray(response)) {
      return {
        data: response,
        total: response.length,
      } as PaymentMethodsListResponse;
    }
    
    return response as unknown as PaymentMethodsListResponse;
  },

  /**
   * الحصول على طرق الدفع حسب المزود
   * GET /api/v1/payment-method/by-provider/{providerId}
   */
  getPaymentMethodsByProvider: async (providerId: string): Promise<PaymentMethodsListResponse> => {
    const response = await axiosInstance.get<PaymentMethodsListResponse>(
      `/payment-method/by-provider/${providerId}`
    );
    return response as unknown as PaymentMethodsListResponse;
  },

  /**
   * الحصول على طريقة دفع محددة
   * GET /api/v1/payment-method/{id}
   */
  getPaymentMethodById: async (id: string): Promise<PaymentMethod> => {
    const response = await axiosInstance.get<PaymentMethod>(
      `/payment-method/${id}`
    );
    return response as unknown as PaymentMethod;
  },

  /**
   * تحديث طريقة دفع
   * PUT /api/v1/payment-method/{id}
   */
  updatePaymentMethod: async (id: string, methodData: UpdatePaymentMethodRequest): Promise<PaymentMethod> => {
    const response = await axiosInstance.put<PaymentMethod>(
      `/payment-method/${id}`,
      methodData
    );
    return response as unknown as PaymentMethod;
  },

  /**
   * حذف طريقة دفع
   * DELETE /api/v1/payment-method/{id}
   */
  deletePaymentMethod: async (id: string): Promise<void> => {
    await axiosInstance.delete<void>(`/payment-method/${id}`);
  },
};
