import axiosInstance from '../utils/AxiosInstance';

export interface PlanFeature {
  feature: {
    id: string;
  name: string;
  description?: string;
  };
}

/**
 * A module attached to a plan, **as the server sends it**.
 *
 * `findAllForOperator` selects `modules: { select: { module: { select: { id,
 * name } } } }`, so each element is a join row wrapping the module — exactly
 * like `PlanFeature` above it. This was declared flat, so the edit drawer read
 * `item.id` off the wrapper and got `undefined`: attach a module to a plan once
 * and every later save sent `moduleIds: [undefined]`, which the server rejects.
 */
export interface PlanModule {
  module: {
    id: string;
    name: string;
    description?: string;
  };
}

export interface Plan {
  id: string;
  name: string;
  description: string;
  monthly_price: number;
  yearly_price: number;
  enabled: boolean;
  most_popular: boolean;
  /** Stable machine key: GO | PLUS. Entitlement checks look this up, not the name. */
  code: string | null;
  max_users: number;
  ai_store_credits: number;
  ai_editor_credits: number;
  has_mobile_app: boolean;
  has_ai_editor: boolean;
  /** POS is a gated PLUS feature; two server gates read this column. */
  has_pos: boolean;
  is_free: boolean;
  order_number: number | null;
  /**
   * The intro offer on monthly billing: `promo_free_months` free for a new
   * customer, then `promo_discount_months` at `promo_discount_percent` off.
   * Optional because a server without the columns does not send them.
   */
  promo_enabled?: boolean;
  promo_free_months?: number;
  promo_discount_months?: number;
  promo_discount_percent?: number;
  features: PlanFeature[];
  modules: PlanModule[];
  _count?: {
    subscriptions: number;
  };
}

/** A feature a plan can be given, from `GET /plan/system/features`. */
export interface FeatureOption {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
}

/** A module a plan can be given, from `GET /plan/system/modules`. */
export interface ModuleOption {
  id: string;
  name: string;
}

/**
 * What the drawer sends.
 *
 * It used to carry only name, description, the two prices, `enabled` and
 * `most_popular` — so every column that decides what a plan actually *grants*
 * fell to its schema default. A plan created here got `code: null`,
 * `max_users: 1`, no AI editor and no mobile app, whatever the operator meant by
 * it: entitlement checks read those columns, and `upgradeAvailable` reads
 * `code !== 'PLUS'`, so an admin-created "PLUS" was a GO with a different name.
 * The real catalogue only works because `PLAN_CATALOG` seeds it.
 *
 * `features`/`modules` are gone. They were free-text names, and the server
 * validates them as uuids (`featureIds ?? features`), so creating a plan with any
 * feature text typed in it returned "One or more feature IDs are invalid" — and in
 * edit mode `featureIds` won, so the text box was silently ignored instead. Ids
 * only, from the pickers.
 */
export interface PlanPayload {
  name: string;
  description: string;
  monthly_price: number;
  yearly_price: number;
  enabled: boolean;
  most_popular: boolean;
  code?: string | null;
  max_users: number;
  ai_store_credits: number;
  ai_editor_credits: number;
  has_mobile_app: boolean;
  has_ai_editor: boolean;
  /**
   * Missing until now, so a plan created here always got the schema default of
   * `false` whatever the operator intended — and POS is gated on this column by
   * `PlanService.assertPosAccess` and by the POS sign-in check. An operator
   * could not grant POS to a plan they had made. The same defect the docblock
   * above records for `code`, `max_users` and the rest, one column later.
   */
  has_pos: boolean;
  is_free: boolean;
  order_number?: number | null;
  promo_enabled: boolean;
  promo_free_months: number;
  promo_discount_months: number;
  promo_discount_percent: number;
  featureIds: string[];
  moduleIds: string[];
}

export interface PlansListResponse {
  data: Plan[];
  total: number;
}

/**
 * Plans Service
 * Handles plan-related API endpoints
 */
export const plansService = {
  /**
   * قائمة الخطط للإدارة — including disabled and free plans.
   * GET /api/v1/plan/system/all
   *
   * This used to read the public `GET /plan`, which filters
   * `enabled: true, is_free: false`. So switching a plan off removed it from the
   * only list that could switch it back on, and the page's own "الباقات المفعلة"
   * stat and «معطل» badge described states it could never show.
   */
  getAllPlans: async (): Promise<PlansListResponse> => {
    const response = await axiosInstance.get<PlansListResponse>(
      '/plan/system/all',
    );
    return response as unknown as PlansListResponse;
  },

  /** Features a plan can be given, for the drawer's picker. */
  getFeatureOptions: async (): Promise<FeatureOption[]> => {
    const response = await axiosInstance.get<{ data: FeatureOption[] }>(
      '/plan/system/features',
    );
    return (response as unknown as { data: FeatureOption[] })?.data ?? [];
  },

  /** Modules a plan can be given, for the drawer's picker. */
  getModuleOptions: async (): Promise<ModuleOption[]> => {
    const response = await axiosInstance.get<{ data: ModuleOption[] }>(
      '/plan/system/modules',
    );
    return (response as unknown as { data: ModuleOption[] })?.data ?? [];
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
