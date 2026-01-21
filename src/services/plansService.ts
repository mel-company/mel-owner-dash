import axiosInstance from '../utils/AxiosInstance';

export interface PlanFeature {
  id: string;
  name: string;
  description?: string;
}

export interface PlanModule {
  id: string;
  name: string;
  description?: string;
}

export interface Plan {
  id: string;
  name: string;
  description: string;
  monthly_price: number;
  yearly_price: number;
  enabled: boolean;
  most_popular: boolean;
  features: PlanFeature[];
  modules: PlanModule[];
  subscriptions?: unknown[];
  _count: {
    subscriptions: number;
  };
}

export interface PlansListResponse {
  data: Plan[];
  total: number;
  page: number;
  limit: number;
}

export interface GetPlansParams {
  page?: number;
  limit?: number;
}

/**
 * Plans Service
 * Handles plan-related API endpoints
 */
export const plansService = {
  /**
   * قائمة الخطط
   * GET /api/v1/plan
   * @param params - Query parameters (page, limit)
   */
  getAllPlans: async (params?: GetPlansParams): Promise<PlansListResponse> => {
    const queryParams = new URLSearchParams();
    if (params?.page) {
      queryParams.append('page', params.page.toString());
    }
    if (params?.limit) {
      queryParams.append('limit', params.limit.toString());
    }
    
    const queryString = queryParams.toString();
    const url = `/plan${queryString ? `?${queryString}` : ''}`;
    
    const response = await axiosInstance.get<PlansListResponse>(url);
    return response as unknown as PlansListResponse; // eslint-disable-line @typescript-eslint/no-explicit-any
  },

  /**
   * تفاصيل خطة محددة
   * GET /api/v1/plan/store-plans/{id}
   * @param id - Plan ID (UUID)
   */
  getPlanById: async (id: string): Promise<Plan> => {
    const response = await axiosInstance.get<Plan>(`/plan/store-plans/${id}`);
    return response as unknown as Plan; // eslint-disable-line @typescript-eslint/no-explicit-any
  },
};
