import axiosInstance from '../utils/AxiosInstance';

export interface SupportTicket {
  id: string;
  title: string;
  description: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED' | 'CANCELLED';
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  category?: string;
  createdAt: string;
  updatedAt: string;
  userId?: string;
  storeId?: string;
}

export interface TicketsListResponse {
  data: SupportTicket[];
  total: number;
  page?: number;
  limit?: number;
}

export interface CreateTicketRequest {
  title: string;
  description: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  category?: string;
  storeId?: string;
}

/**
 * Support Tickets Service
 * Handles support ticket management endpoints for both System and Store users
 */
export const supportTicketsService = {
  // ========== System User Tickets ==========

  /**
   * إنشاء تذكرة دعم (System User)
   * POST /api/v1/support-ticket/system
   */
  createSystemTicket: async (ticketData: CreateTicketRequest): Promise<SupportTicket> => {
    const response = await axiosInstance.post<SupportTicket>(
      '/support-ticket/system',
      ticketData
    );
    return response as unknown as SupportTicket; // eslint-disable-line @typescript-eslint/no-explicit-any
  },

  /**
   * الحصول على جميع تذاكر الدعم (System User)
   * GET /api/v1/support-ticket/system
   */
  getAllSystemTickets: async (params?: { page?: number; limit?: number }): Promise<TicketsListResponse> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    const queryString = queryParams.toString();
    const url = `/support-ticket/system${queryString ? `?${queryString}` : ''}`;

    const response = await axiosInstance.get<TicketsListResponse>(url);
    return response as unknown as TicketsListResponse; // eslint-disable-line @typescript-eslint/no-explicit-any
  },

  /**
   * الحصول على تذكرة محددة (System User)
   * GET /api/v1/support-ticket/system/{id}
   */
  getSystemTicketById: async (id: string): Promise<SupportTicket> => {
    const response = await axiosInstance.get<SupportTicket>(
      `/support-ticket/system/${id}`
    );
    return response as unknown as SupportTicket; // eslint-disable-line @typescript-eslint/no-explicit-any
  },

  /**
   * حذف تذكرة (System User)
   * DELETE /api/v1/support-ticket/system/{id}
   */
  deleteSystemTicket: async (id: string): Promise<void> => {
    await axiosInstance.delete<void>(`/support-ticket/system/${id}`);
  },

  /**
   * إلغاء تذكرة (System User)
   * PUT /api/v1/support-ticket/system/{id}/cancel
   */
  cancelSystemTicket: async (id: string): Promise<SupportTicket> => {
    const response = await axiosInstance.put<SupportTicket>(
      `/support-ticket/system/${id}/cancel`
    );
    return response as unknown as SupportTicket; // eslint-disable-line @typescript-eslint/no-explicit-any
  },

  /**
   * إغلاق تذكرة (System User)
   * PUT /api/v1/support-ticket/system/{id}/close
   */
  closeSystemTicket: async (id: string): Promise<SupportTicket> => {
    const response = await axiosInstance.put<SupportTicket>(
      `/support-ticket/system/${id}/close`
    );
    return response as unknown as SupportTicket; // eslint-disable-line @typescript-eslint/no-explicit-any
  },

  /**
   * حل تذكرة (System User)
   * PUT /api/v1/support-ticket/system/{id}/resolve
   */
  resolveSystemTicket: async (id: string): Promise<SupportTicket> => {
    const response = await axiosInstance.put<SupportTicket>(
      `/support-ticket/system/${id}/resolve`
    );
    return response as unknown as SupportTicket; // eslint-disable-line @typescript-eslint/no-explicit-any
  },

  // ========== Store User Tickets ==========

  /**
   * إنشاء تذكرة دعم (Store User)
   * POST /api/v1/support-ticket/store
   */
  createStoreTicket: async (ticketData: CreateTicketRequest): Promise<SupportTicket> => {
    const response = await axiosInstance.post<SupportTicket>(
      '/support-ticket/store',
      ticketData
    );
    return response as unknown as SupportTicket; // eslint-disable-line @typescript-eslint/no-explicit-any
  },

  /**
   * الحصول على جميع تذاكر الدعم (Store User)
   * GET /api/v1/support-ticket/store
   */
  getAllStoreTickets: async (params?: { page?: number; limit?: number }): Promise<TicketsListResponse> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    const queryString = queryParams.toString();
    const url = `/support-ticket/store${queryString ? `?${queryString}` : ''}`;

    const response = await axiosInstance.get<TicketsListResponse>(url);
    return response as unknown as TicketsListResponse; // eslint-disable-line @typescript-eslint/no-explicit-any
  },

  /**
   * الحصول على تذكرة محددة (Store User)
   * GET /api/v1/support-ticket/store/{id}
   */
  getStoreTicketById: async (id: string): Promise<SupportTicket> => {
    const response = await axiosInstance.get<SupportTicket>(
      `/support-ticket/store/${id}`
    );
    return response as unknown as SupportTicket; // eslint-disable-line @typescript-eslint/no-explicit-any
  },

  /**
   * حذف تذكرة (Store User)
   * DELETE /api/v1/support-ticket/store/{id}
   */
  deleteStoreTicket: async (id: string): Promise<void> => {
    await axiosInstance.delete<void>(`/support-ticket/store/${id}`);
  },

  /**
   * إلغاء تذكرة (Store User)
   * PUT /api/v1/support-ticket/store/{id}/cancel
   */
  cancelStoreTicket: async (id: string): Promise<SupportTicket> => {
    const response = await axiosInstance.put<SupportTicket>(
      `/support-ticket/store/${id}/cancel`
    );
    return response as unknown as SupportTicket; // eslint-disable-line @typescript-eslint/no-explicit-any
  },

  /**
   * إغلاق تذكرة (Store User)
   * PUT /api/v1/support-ticket/store/{id}/close
   */
  closeStoreTicket: async (id: string): Promise<SupportTicket> => {
    const response = await axiosInstance.put<SupportTicket>(
      `/support-ticket/store/${id}/close`
    );
    return response as unknown as SupportTicket; // eslint-disable-line @typescript-eslint/no-explicit-any
  },
};
