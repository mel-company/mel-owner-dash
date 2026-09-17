import axiosInstance from '../utils/AxiosInstance';

export type DeliveryCompanyStatus = 'ACTIVE' | 'INACTIVE';

/**
 * What a courier charges when it cannot be asked for a live price, and what to
 * add for a parcel bigger than a normal one.
 *
 * Every quote can fail — the courier's API is down, or the shopper's city has
 * no code mapped for this company yet. Checkout still has to show a number,
 * and these are it.
 */
export interface ShippingRules {
  /** Fallback fee, IQD. */
  baseFee?: number;
  /** Fallback when the parcel does not leave the province it started in. */
  sameStateFee?: number | null;
  /** Above these, the step fees apply. Null means no ceiling. */
  maxWeightGrams?: number | null;
  maxVolumeCm3?: number | null;
  maxQty?: number | null;
  /** Charged per started step above the matching ceiling. */
  weightStepGrams?: number;
  weightStepFee?: number;
  volumeStepCm3?: number;
  volumeStepFee?: number;
  qtyStepFee?: number;
}

export interface DeliveryCompany extends ShippingRules {
  id: string;
  code?: string | null;
  name: string;
  description?: string | null;
  logo?: string | null;
  website?: string | null;
  contact?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  zip?: string | null;
  status: DeliveryCompanyStatus;
  rating?: number | null;
  storesCount?: number;
  monthlyOrders?: number;
  _count?: {
    stores?: number;
  };
}

export interface DeliveryCompaniesListResponse {
  data: DeliveryCompany[];
  total: number;
  page?: number;
  limit?: number;
}

export interface DeliveryCompanyParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: DeliveryCompanyStatus | '';
}

export interface DeliveryCompanyPayload extends ShippingRules {
  name: string;
  code?: string;
  description?: string;
  logo?: string;
  website?: string;
  contact?: string;
  email?: string;
  phone?: string;
  address?: string;
  zip?: string;
  status?: DeliveryCompanyStatus;
  rating?: number;
}

type DeliveryCompaniesApiResponse = DeliveryCompaniesListResponse | DeliveryCompany[];

const normalizeDeliveryCompany = (company: DeliveryCompany): DeliveryCompany => ({
  ...company,
  status: company.status || 'ACTIVE',
  storesCount: company.storesCount ?? company._count?.stores ?? 0,
  monthlyOrders: company.monthlyOrders ?? 0,
});

const normalizeDeliveryCompaniesResponse = (response: DeliveryCompaniesApiResponse): DeliveryCompaniesListResponse => {
  if (Array.isArray(response)) {
    return {
      data: response.map(normalizeDeliveryCompany),
      total: response.length,
    };
  }

  return {
    ...response,
    data: (response.data || []).map(normalizeDeliveryCompany),
    total: response.total ?? response.data?.length ?? 0,
  };
};

/** One province or city, with this courier's own code for it where mapped. */
export interface DeliveryZone {
  id: string;
  stateId?: string;
  name: unknown;
  externalCode: string | null;
}

export interface DeliveryZones {
  deliveryCompany: { id: string; name: string; code?: string | null };
  states: DeliveryZone[];
  regions: DeliveryZone[];
}

export interface ZoneSyncReport {
  deliveryCompanyId: string;
  states: { matched: number; total: number; unmatched: string[] };
  regions: { matched: number; total: number; unmatched: string[] };
}

export const deliveryCompanyService = {
  getSystemDeliveryCompanies: async (params?: DeliveryCompanyParams): Promise<DeliveryCompaniesListResponse> => {
    const response = await axiosInstance.get<DeliveryCompaniesApiResponse>('/delivery-company/system', { params });
    return normalizeDeliveryCompaniesResponse(response as unknown as DeliveryCompaniesApiResponse);
  },

  getSystemDeliveryCompanyById: async (id: string): Promise<DeliveryCompany> => {
    const response = await axiosInstance.get<DeliveryCompany>(`/delivery-company/system/${id}`);
    return normalizeDeliveryCompany(response as unknown as DeliveryCompany);
  },

  createDeliveryCompany: async (payload: DeliveryCompanyPayload): Promise<DeliveryCompany> => {
    const response = await axiosInstance.post<DeliveryCompany>('/delivery-company', payload);
    return response as unknown as DeliveryCompany;
  },

  updateDeliveryCompany: async (id: string, payload: DeliveryCompanyPayload): Promise<DeliveryCompany> => {
    const response = await axiosInstance.put<DeliveryCompany>(`/delivery-company/${id}`, payload);
    return response as unknown as DeliveryCompany;
  },

  deleteDeliveryCompany: async (id: string): Promise<void> => {
    await axiosInstance.delete<void>(`/delivery-company/${id}`);
  },

  /** Every province and city, with this courier's code where one is set. */
  getZones: async (deliveryCompanyId: string): Promise<DeliveryZones> => {
    const response = await axiosInstance.get<DeliveryZones>(`/shipping/zones/${deliveryCompanyId}`);
    return response as unknown as DeliveryZones;
  },

  setStateCode: async (deliveryCompanyId: string, stateId: string, externalCode: string | null) => {
    await axiosInstance.put(`/shipping/zones/${deliveryCompanyId}/states/${stateId}`, { externalCode });
  },

  setRegionCode: async (deliveryCompanyId: string, regionId: string, externalCode: string | null) => {
    await axiosInstance.put(`/shipping/zones/${deliveryCompanyId}/regions/${regionId}`, { externalCode });
  },

  /**
   * Fetch the courier's own list of places and map the ones whose names match.
   * Returns what it could not match, for mapping by hand.
   */
  syncZones: async (deliveryCompanyId: string): Promise<ZoneSyncReport> => {
    const response = await axiosInstance.post<ZoneSyncReport>(`/shipping/zones/${deliveryCompanyId}/sync`);
    return response as unknown as ZoneSyncReport;
  },
};
