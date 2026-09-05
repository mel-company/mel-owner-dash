import axiosInstance from '../utils/AxiosInstance';

/** Every figure arrives in both currencies so the page's toggle is a display choice. */
export interface Money {
  usd: number;
  iqd: number;
}

export type CurrencyCode = 'IQD' | 'USD';

export interface ModelCost {
  model: string;
  calls: number;
  cost: Money;
}

export interface MonthlyPoint {
  month: string;
  cost: Money;
  revenue: Money;
  margin: Money;
}

export interface FinancialAiSummary {
  rate: number;
  range: { from: string | null; to: string | null };
  cost: Money;
  creditRevenue: Money;
  subscriptionRevenue: Money;
  revenue: Money;
  margin: Money;
  marginPercent: number | null;
  deferredLiability: Money;
  deferredCredits: { generations: number; editor: number };
  usage: {
    runs: number;
    generations: number;
    editorCalls: number;
    modelCalls: number;
    promptTokens: number;
    completionTokens: number;
    cachedTokens: number;
    cacheHitPercent: number;
    failedRuns: number;
  };
  fullyPriced: boolean;
  byModel: ModelCost[];
  monthly: MonthlyPoint[];
}

export interface FinancialAiStoreOwner {
  id: string;
  name: string | null;
  phone: string | null;
  email: string;
}

export interface FinancialAiStoreRow {
  store: {
    id: string | null;
    name: string | null;
    domain: string | null;
    owner: FinancialAiStoreOwner | null;
    createdAt: string | null;
  };
  cost: Money;
  creditRevenue: Money;
  subscriptionRevenue: Money;
  revenue: Money;
  margin: Money;
  usage: {
    runs: number;
    generations: number;
    editorCalls: number;
    modelCalls: number;
    promptTokens: number;
    completionTokens: number;
    cachedTokens: number;
  };
  fullyPriced: boolean;
}

export interface FinancialAiStoresResponse {
  data: FinancialAiStoreRow[];
  total: number;
  page: number;
  limit: number;
  rate: number;
}

export type AiSpendKind =
  | 'STORE_GENERATION'
  | 'DESIGN_PROPOSAL'
  | 'DESIGN_REVISION'
  | 'EDITOR_CHAT'
  | 'EDITOR_BRAND';

export interface FinancialAiRun {
  id: string;
  kind: AiSpendKind;
  succeeded: boolean;
  generationId: string | null;
  calls: number;
  promptTokens: number;
  completionTokens: number;
  cachedTokens: number;
  cost: Money;
  priced: boolean;
  createdAt: string;
}

export interface CreditPurchase {
  id: string;
  user: FinancialAiStoreOwner;
  pack: { id: string | null; name: string | null; generations: number; editor: number } | null;
  amount: Money;
  currency: string;
  status: 'PENDING' | 'PAID' | 'FAILED' | 'EXPIRED';
  provider: string;
  orderId: string;
  transactionId: string | null;
  paidAt: string | null;
  fulfilledAt: string | null;
  createdAt: string;
}

export interface FinancialAiStoreDetail {
  rate: number;
  store: {
    id: string;
    name: string | null;
    domain: string | null;
    createdAt: string;
    owner: FinancialAiStoreOwner | null;
  };
  cost: Money;
  subscriptionRevenue: Money;
  margin: Money;
  usage: FinancialAiStoreRow['usage'];
  fullyPriced: boolean;
  byModel: ModelCost[];
  runs: FinancialAiRun[];
  purchases: CreditPurchase[];
}

export interface CreditPurchasesResponse {
  data: CreditPurchase[];
  total: number;
  page: number;
  limit: number;
  rate: number;
  paidTotal: Money;
}

export interface DateRangeParams {
  from?: string;
  to?: string;
}

export interface FinancialAiStoresParams extends DateRangeParams {
  page?: number;
  limit?: number;
  search?: string;
  sort?: 'cost' | 'revenue' | 'margin' | 'generations';
}

export interface CreditPurchasesParams extends DateRangeParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}

export const financialAiService = {
  getSummary: async (params?: DateRangeParams): Promise<FinancialAiSummary> => {
    const response = await axiosInstance.get<FinancialAiSummary>('/financial-ai/summary', { params });
    return response as unknown as FinancialAiSummary;
  },

  getStores: async (params?: FinancialAiStoresParams): Promise<FinancialAiStoresResponse> => {
    const response = await axiosInstance.get<FinancialAiStoresResponse>('/financial-ai/stores', { params });
    return response as unknown as FinancialAiStoresResponse;
  },

  getStoreDetail: async (storeId: string, params?: DateRangeParams): Promise<FinancialAiStoreDetail> => {
    const response = await axiosInstance.get<FinancialAiStoreDetail>(`/financial-ai/stores/${storeId}`, { params });
    return response as unknown as FinancialAiStoreDetail;
  },

  getPurchases: async (params?: CreditPurchasesParams): Promise<CreditPurchasesResponse> => {
    const response = await axiosInstance.get<CreditPurchasesResponse>('/financial-ai/purchases', { params });
    return response as unknown as CreditPurchasesResponse;
  },
};
