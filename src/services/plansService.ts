import axiosInstance from '../utils/AxiosInstance';

export interface PlanFeature {
  feature: {
    id: string;
  name: string;
  description?: string;
  };
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
  features: PlanFeature[
      ];
  modules: PlanModule[];
  subscriptions?: unknown[];
  _count: {
    subscriptions: number;
  };
}

export interface PlanPayload {
  name: string;
  description: string;
  monthly_price: number;
  yearly_price: number;
  enabled: boolean;
  most_popular: boolean;
  features?: string[];
  featureIds?: string[];
  modules?: string[];
  moduleIds?: string[];
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
    const response = await axiosInstance.get<PlansListResponse>('/plan', { params });
    return response as unknown as PlansListResponse;
  },

  /**
   * تفاصيل خطة محددة
   * GET /api/v1/plan/{id}
   * @param id - Plan ID (UUID)
   */
  getPlanById: async (id: string): Promise<Plan> => {
    const response = await axiosInstance.get<Plan>(`/plan/${id}`);
    return response as unknown as Plan;
  },

  createPlan: async (payload: PlanPayload): Promise<Plan> => {
    const response = await axiosInstance.post<Plan>('/plan', payload);
    return response as unknown as Plan;
  },

  updatePlan: async (id: string, payload: PlanPayload): Promise<Plan> => {
    const response = await axiosInstance.put<Plan>(`/plan/${id}`, payload);
    return response as unknown as Plan;
  },

  deletePlan: async (id: string): Promise<void> => {
    await axiosInstance.delete<void>(`/plan/${id}`);
  },
};
