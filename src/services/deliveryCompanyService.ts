import axiosInstance from '../utils/AxiosInstance';

export type DeliveryCompanyStatus = 'ACTIVE' | 'INACTIVE';

export interface DeliveryCompany {
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

export interface DeliveryCompanyPayload {
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
};
