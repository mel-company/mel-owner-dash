import axiosInstance from '../utils/AxiosInstance';
import type { SubscriptionStatus } from '@/utils/subscriptionStatus';

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
}

export interface Subscription {
  id: string;
  start_at: string;
  end_at: string;
  /** `INACTIVE` is an operator's pause. There is no `PAUSED` in the enum. */
  status: SubscriptionStatus;
  plan: SubscriptionPlan;
}

export interface Owner {
  id: string;
  name: string;
  phone?: string;
  location?: string;
  email?: string;
}

export interface Store {
  id: string;
  name: string;
  description: string | null;
  logo: string | null;
  fav_icon: string | null;
  location: string | null;
  instagram: string | null;
  facebook: string | null;
  tiktok: string | null;
  x: string | null;
  createdAt: string;
  updatedAt: string;
  email: string | null;
  phone: string | null;
  currency: string | null;
  language: string | null;
  timezone: string | null;
  is_deleted: boolean;
  deleted_at: string | null;
  store_type: string;
  domain: string | null;
  domain_last_update: string | null;
  ownerId: string | null;
  deliveryCompanyId: string | null;
  subscription: Subscription | null;
  owner: Owner | null;
}

export interface StoresListResponse {
  data: Store[];
  total: number;
  page: number | null;
  limit: number | null;
}

export interface StoresListParams {
  page?: number;
  limit?: number;
}

/**
 * What `POST /store/system` actually accepts.
 *
 * This declared `{ name, owner, ownerEmail, subscriptionPlanId, status }` and
 * not one of the last four is a field any store DTO has. The global pipe is
 * `ValidationPipe({ whitelist: true })`, so every one of them was stripped
 * before `createSystem` ran: the operator filled in an owner and a plan, got a
 * success response, and the platform created a nameless-owner store on no plan.
 *
 * `owner_phone` is the field that decides whether an owner is attached at all,
 * which is why it is required here rather than optional.
 *
 * `createSystem` creates **no subscription** — it ignores `planId` — so a plan
 * is deliberately absent. A new store's subscription is created separately with
 * `POST /subscription/system`, which is the only route that can.
 */
export interface CreateStoreRequest {
  name: string;
  description?: string;
  domain?: string;
  phone?: string;
  email?: string;
  owner_name?: string;
  owner_email?: string;
  owner_phone: string;
  /**
   * The logo file. Sent as multipart, because `POST /store/system` runs a
   * `FileInterceptor('logo')` and uploads the file to R2 — a JSON body could
   * never carry it, which is why the image the drawer demanded was discarded.
   */
  logo?: File | null;
}

/**
 * What `PUT /store/system/:id` applies: the `Store` row's own columns.
 *
 * Deliberately **no `owner_*` and no plan**. `updateSystem` writes 13 store
 * columns and touches neither the owner nor the subscription, so sending either
 * is a request that reports success and changes nothing — which is exactly the
 * failure this type used to encode.
 */
export interface UpdateStoreRequest {
  name?: string;
  description?: string;
  domain?: string;
  phone?: string;
  email?: string;
}


export interface PlanFeature {
  id: string;
  feature: {
    id: string;
    name: string;
    description?: string;
    enabled?: boolean;
  };
}

/**
 * System Stores Service
 * Handles system-level store management endpoints
 */
export const systemStoresService = {
  /**
   * قائمة المتاجر (System)
   * GET /stores/system
   */
  getAllStores: async (params?: StoresListParams): Promise<StoresListResponse> => {
    // AxiosInstance interceptor already returns response.data
    const response = await axiosInstance.get<StoresListResponse>(
      '/store/system',
      { params }
    );
    // Response structure: { data: Store[], total: number, page: number | null, limit: number | null }
    return response as unknown as StoresListResponse;
  },

  /**
   * تفاصيل متجر (System)
   * GET /stores/system/{id}
   */
  getStoreById: async (id: string): Promise<Store> => {
    const response = await axiosInstance.get<Store>(
      `/store/system/${id}`
    );
    return response as unknown as Store;
  },

  /**
   * إنشاء متجر (System)
   * POST /stores/system
   */
  createStore: async (storeData: CreateStoreRequest): Promise<Store> => {
    /**
     * Multipart, not JSON. The route consumes `multipart/form-data` and its
     * interceptor reads the `logo` part; the axios instance drops its JSON
     * `Content-Type` for a FormData body so the browser sets the boundary.
     */
    const body = new FormData();
    Object.entries(storeData).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') return;
      if (value instanceof File) {
        body.append(key, value);
        return;
      }
      body.append(key, String(value));
    });

    const response = await axiosInstance.post<Store>('/store/system', body);
    return response as unknown as Store;
  },

  /**
   * تحديث متجر (System)
   * PUT /stores/system/{id}
   */
  updateStore: async (id: string, storeData: UpdateStoreRequest): Promise<Store> => {
    const response = await axiosInstance.put<Store>(
      `/store/system/${id}`,
      storeData
    );
    return response as unknown as Store;
  },

  /**
   * حذف متجر (System)
   * DELETE /stores/system/{id}
   */
  deleteStore: async (id: string): Promise<void> => {
    await axiosInstance.delete<void>(`/store/system/${id}`);
  },
};
