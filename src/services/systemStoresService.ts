import axiosInstance from '../utils/AxiosInstance';

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
}

export interface Subscription {
  id: string;
  start_at: string;
  end_at: string;
  status: 'ACTIVE' | 'CANCELLED' | 'EXPIRED' | 'PAUSED';
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

export interface CreateStoreRequest {
  name: string;
  owner: string;
  ownerEmail: string;
  subscriptionPlanId: string;
  status: 'active' | 'inactive';
}

export interface UpdateStoreRequest {
  name?: string;
  owner?: string;
  ownerEmail?: string;
  subscriptionPlanId?: string;
  status?: 'active' | 'inactive';
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
  getAllStores: async (): Promise<StoresListResponse> => {
    // AxiosInstance interceptor already returns response.data
    const response = await axiosInstance.get<StoresListResponse>(
      '/store/system'
    );
    // Response structure: { data: Store[], total: number, page: number | null, limit: number | null }
    return response as unknown as StoresListResponse; // eslint-disable-line @typescript-eslint/no-explicit-any
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
    const response = await axiosInstance.post<Store>(
      '/store/system',
      storeData
    );
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
