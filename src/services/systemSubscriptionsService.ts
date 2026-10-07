import axiosInstance from '../utils/AxiosInstance';

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  monthly_price: number;
  yearly_price: number;
}

export interface SubscriptionStore {
  id: string;
  name: string;
}

export interface Subscription {
  id: string;
  storeId: string;
  planId: string;
  start_at: string;
  end_at: string;
  status: 'ACTIVE' | 'CANCELLED' | 'EXPIRED' | 'PAUSED';
  createdAt: string;
  updatedAt: string;
  is_deleted: boolean;
  deleted_at: string | null;
  plan: SubscriptionPlan;
  store: SubscriptionStore;
}

/**
 * What `GET /subscription/system/search` actually takes.
 *
 * This used to declare `{ storeId, planId, status, dateFrom, dateTo }` and be
 * sent as a `PUT` body. The route is a `GET` and reads one `query` parameter,
 * matched against the store's name — so the method was wrong, the shape was
 * wrong, and every filter named here was silently discarded. Nothing in the UI
 * calls it yet, which is the only reason it never showed up as a bug.
 */
export interface SearchSubscriptionsRequest {
  /** Free text, matched against the store name. */
  query?: string;
  page?: number;
  limit?: number;
}

export interface UpdateSubscriptionRequest {
  planId?: string;
  start_at?: string;
  end_at?: string;
}

/**
 * `durationMonths`, which is the field the server reads.
 *
 * It was `{ duration: 'monthly' | 'yearly' }` — a name and a vocabulary the
 * server has never had — so a renewal silently fell back to the default of one
 * month however long an operator asked for. Capped at 24 to match
 * `InitPlatformPaymentDto`, which is the ceiling the paid path enforces.
 */
export interface RenewSubscriptionRequest {
  durationMonths?: number;
}

/**
 * System Subscriptions Service
 * Handles system-level subscription management endpoints
 */
export const systemSubscriptionsService = {
  /**
   * جميع الاشتراكات (System)
   * GET /subscription/system/all
   */
  getAllSubscriptions: async (): Promise<Subscription[]> => {
    const response = await axiosInstance.get<Subscription[]>(
      '/subscription/system/all'
    );
    // Response is directly an array
    return response as unknown as Subscription[]; // eslint-disable-line @typescript-eslint/no-explicit-any
  },

  /**
   * البحث في الاشتراكات (System)
   * GET /subscription/system/search
   */
  searchSubscriptions: async (
    searchParams: SearchSubscriptionsRequest
  ): Promise<Subscription[]> => {
    const response = await axiosInstance.get<Subscription[]>(
      '/subscription/system/search',
      { params: searchParams }
    );
    return response as unknown as Subscription[]; // eslint-disable-line @typescript-eslint/no-explicit-any
  },

  /**
   * تحديث اشتراك (System)
   * PUT /subscription/system/{id}
   */
  updateSubscription: async (
    id: string,
    updateData: UpdateSubscriptionRequest
  ): Promise<Subscription> => {
    const response = await axiosInstance.put<Subscription>(
      `/subscription/system/${id}`,
      updateData
    );
    return response as unknown as Subscription; // eslint-disable-line @typescript-eslint/no-explicit-any
  },

  /**
   * إيقاف الاشتراك مؤقتاً (System)
   * PUT /subscription/system/{id}/pause
   */
  pauseSubscription: async (id: string): Promise<Subscription> => {
    const response = await axiosInstance.put<Subscription>(
      `/subscription/system/${id}/pause`
    );
    return response as unknown as Subscription; // eslint-disable-line @typescript-eslint/no-explicit-any
  },

  /**
   * استئناف الاشتراك (System)
   * PUT /subscription/system/{id}/resume
   */
  resumeSubscription: async (id: string): Promise<Subscription> => {
    const response = await axiosInstance.put<Subscription>(
      `/subscription/system/${id}/resume`
    );
    return response as unknown as Subscription; // eslint-disable-line @typescript-eslint/no-explicit-any
  },

  /**
   * إلغاء الاشتراك (System)
   * PUT /subscription/system/{id}/cancel
   */
  cancelSubscription: async (id: string): Promise<Subscription> => {
    const response = await axiosInstance.put<Subscription>(
      `/subscription/system/${id}/cancel`
    );
    return response as unknown as Subscription; // eslint-disable-line @typescript-eslint/no-explicit-any
  },

  /**
   * تجديد الاشتراك (System)
   * PUT /subscription/system/{id}/renew
   */
  renewSubscription: async (
    id: string,
    renewData?: RenewSubscriptionRequest
  ): Promise<Subscription> => {
    const response = await axiosInstance.put<Subscription>(
      `/subscription/system/${id}/renew`,
      renewData
    );
    return response as unknown as Subscription; // eslint-disable-line @typescript-eslint/no-explicit-any
  },
};
