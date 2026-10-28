import axiosInstance from '../utils/AxiosInstance';

/**
 * AI store generations, for the «توليدات الذكاء» page.
 *
 * What used to need the server logs: whether a build succeeded, the step it
 * stopped at and why, what it cost and how long it took. Costs are in USD, the
 * currency the model bill comes in.
 */

export type GenerationStatus = 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED';

export interface GenerationsSummary {
  range: { from: string; to: string };
  counts: Record<GenerationStatus, number>;
  /** Of the runs that finished, built or failed. Null when none did. */
  successPercent: number | null;
  /** Built, but on the stock template because the designer produced nothing. */
  fallback: number;
  /** Built after the final check dropped sections it would have failed on. */
  salvaged: number;
  failures: Array<{ code: string; step: string | null; count: number }>;
  cost: {
    totalUsd: number;
    byKind: Array<{ kind: string; runs: number; cost: number }>;
    perBuildUsd: number | null;
  };
  durationSeconds: { median: number | null; p90: number | null };
}

export interface GenerationRow {
  id: string;
  status: GenerationStatus;
  prompt: string;
  error: string | null;
  createdAt: string;
  storeName: string | null;
  store: { id: string; domain: string | null } | null;
  user: { id: string; name: string | null; phone: string | null } | null;
  step: string | null;
  failureCode: string | null;
  fallback: boolean;
  salvagedSections: number;
  referenceImages: number;
  costUsd: number;
  durationSeconds: number | null;
}

export interface GenerationList {
  page: number;
  limit: number;
  total: number;
  rows: GenerationRow[];
}

export interface QaPage {
  page: string;
  passed: boolean;
  hardFindings: string[];
  softFindings: string[];
  criticScore?: number;
  regenerated: boolean;
}

export interface GenerationDetail {
  id: string;
  status: GenerationStatus;
  prompt: string;
  error: string | null;
  createdAt: string;
  updatedAt: string;
  referenceImages: string[];
  figmaUrl: string | null;
  store: { id: string; name: string | null; domain: string | null } | null;
  user: { id: string; name: string | null; phone: string | null; email: string } | null;
  storeName: string | null;
  businessType: string | null;
  step: string | null;
  message: string | null;
  durationSeconds: number | null;
  steps: Array<{ key: string; label: string; seconds: number | null }>;
  failure: { code: string; detail: string; step: string | null; where: string[]; at: string } | null;
  fallbackReason: string | null;
  qaSummary: { pages?: QaPage[]; repairSignals?: Record<string, number> } | null;
  repairStats: Record<string, number> | null;
  spend: Array<{
    kind: string;
    succeeded: boolean;
    calls: number;
    promptTokens: number;
    completionTokens: number;
    cachedTokens: number;
    costUsd: number;
    createdAt: string;
  }>;
  costUsd: number;
}

const BASE = '/admin/ai-generations';

// The interceptor already unwraps `response.data`, so the call resolves to the body.

export const aiGenerationsService = {
  async summary(params: { from?: string; to?: string }): Promise<GenerationsSummary> {
    const response = await axiosInstance.get(`${BASE}/summary`, { params });
    return response as unknown as GenerationsSummary;
  },
  async list(params: {
    page: number;
    limit: number;
    status?: GenerationStatus;
    search?: string;
    from?: string;
    to?: string;
  }): Promise<GenerationList> {
    const response = await axiosInstance.get(BASE, { params });
    return response as unknown as GenerationList;
  },
  async detail(id: string): Promise<GenerationDetail> {
    const response = await axiosInstance.get(`${BASE}/${id}`);
    return response as unknown as GenerationDetail;
  },
};
