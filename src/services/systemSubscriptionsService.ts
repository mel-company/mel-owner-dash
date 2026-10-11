import axiosInstance from '../utils/AxiosInstance';
import type { SubscriptionStatus } from '@/utils/subscriptionStatus';

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
  /** `INACTIVE` is an operator's pause. There is no `PAUSED` in the enum. */
  status: SubscriptionStatus;
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

/**
 * `POST /subscription/system`.
 *
 * Needed because `createSystem` — the operator's store-creation route — creates
 * **no subscription**: it ignores `planId` entirely, so a store made from the
 * admin dashboard has no plan and no term until one is created here. There was
 * no method for it and no screen that could call one, so those stores stayed
 * unsubscribed with nothing in the product able to fix it.
 *
 * `status` is genuinely optional now; the DTO used to carry `@IsNotEmpty()`
 * without `@IsOptional()`, which made it required while documenting a default.
 */
export interface CreateSubscriptionRequest {
  storeId: string;
  planId: string;
  start_at: string;
  end_at: string;
  status?: SubscriptionStatus;
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

/** A page of subscriptions, as `GET /subscription/system/all` answers it. */
export interface SubscriptionsListResponse {
  data: Subscription[];
  total: number;
  page?: number | null;
  limit?: number | null;
}

export interface SubscriptionsListParams {
  page?: number;
  limit?: number;
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
  /**
   * Takes `page`/`limit`, which the server has always supported and this never
   * sent — so the only subscriptions view loaded every row on the platform in
   * one request and counted the array for its stat.
   *
   * The response shape depends on the parameters: with both, the server returns
   * `{ data, total, page, limit }`; with neither, a bare array. Normalized here
   * so callers do not have to know that.
   */
  getAllSubscriptions: async (
    params?: SubscriptionsListParams,
  ): Promise<SubscriptionsListResponse> => {
    const response = (await axiosInstance.get('/subscription/system/all', {
      params,
    })) as unknown as Subscription[] | SubscriptionsListResponse;

    if (Array.isArray(response)) {
      return { data: response, total: response.length };
    }
    return {
      data: response?.data ?? [],
      total: response?.total ?? response?.data?.length ?? 0,
      page: response?.page,
      limit: response?.limit,
    };
  },

  /**
   * البحث في الاشتراكات (System)
   * GET /subscription/system/search
   */
  searchSubscriptions: async (
    searchParams: SearchSubscriptionsRequest,
  ): Promise<SubscriptionsListResponse> => {
    const response = (await axiosInstance.get(
      '/subscription/system/search',
      { params: searchParams },
    )) as unknown as Subscription[] | SubscriptionsListResponse;

    if (Array.isArray(response)) {
      return { data: response, total: response.length };
    }
    return {
      data: response?.data ?? [],
      total: response?.total ?? response?.data?.length ?? 0,
      page: response?.page,
      limit: response?.limit,
    };
  },

  /**
   * إنشاء اشتراك (System)
   * POST /subscription/system
   *
   * Revives a previously deleted subscription for the same store rather than
   * failing — `Subscription.storeId` is unique, so the dead row holds the key.
   */
  createSubscription: async (
    payload: CreateSubscriptionRequest,
  ): Promise<Subscription> => {
    const response = await axiosInstance.post<Subscription>(
      '/subscription/system',
      payload,
    );
    return response as unknown as Subscription;
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
    return response as unknown as Subscription;  
  },

  /**
   * إيقاف الاشتراك مؤقتاً (System)
   * PUT /subscription/system/{id}/pause
   */
  pauseSubscription: async (id: string): Promise<Subscription> => {
    const response = await axiosInstance.put<Subscription>(
      `/subscription/system/${id}/pause`
    );
    return response as unknown as Subscription;  
  },

  /**
   * استئناف الاشتراك (System)
   * PUT /subscription/system/{id}/resume
   */
  resumeSubscription: async (id: string): Promise<Subscription> => {
    const response = await axiosInstance.put<Subscription>(
      `/subscription/system/${id}/resume`
    );
    return response as unknown as Subscription;  
  },

  /**
   * إلغاء الاشتراك (System)
   * PUT /subscription/system/{id}/cancel
   */
  cancelSubscription: async (id: string): Promise<Subscription> => {
    const response = await axiosInstance.put<Subscription>(
      `/subscription/system/${id}/cancel`
    );
    return response as unknown as Subscription;  
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
    return response as unknown as Subscription;  
  },
};
