import axiosInstance from '../utils/AxiosInstance';

// Enums as const objects
export const TicketPriorityEnum = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL',
} as const;

export const TicketStatusEnum = {
  OPEN: 'OPEN',
  CLOSED: 'CLOSED',
  IN_PROGRESS: 'IN_PROGRESS',
  ON_HOLD: 'ON_HOLD',
  RESOLVED: 'RESOLVED',
  CANCELLED: 'CANCELLED',
} as const;

export const TicketTypeEnum = {
  BUG: 'BUG',
  FEATURE_REQUEST: 'FEATURE_REQUEST',
  QUESTION: 'QUESTION',
  SUPPORT: 'SUPPORT',
  FEEDBACK: 'FEEDBACK',
  REPORT: 'REPORT',
  OTHER: 'OTHER',
} as const;

export const DepartmentEnum = {
  FINANCE: 'FINANCE',
  MARKETING: 'MARKETING',
  SALES: 'SALES',
  CUSTOMER_SERVICE: 'CUSTOMER_SERVICE',
  IT: 'IT',
  OTHER: 'OTHER',
} as const;

export const TicketMessageSenderType = {
  SYSTEM_USER: 'SYSTEM_USER',
  STORE_USER: 'STORE_USER',
  USER: 'USER',
  CUSTOMER: 'CUSTOMER',
} as const;

export type TicketPriorityEnum = typeof TicketPriorityEnum[keyof typeof TicketPriorityEnum];
export type TicketStatusEnum = typeof TicketStatusEnum[keyof typeof TicketStatusEnum];
export type TicketTypeEnum = typeof TicketTypeEnum[keyof typeof TicketTypeEnum];
export type DepartmentEnum = typeof DepartmentEnum[keyof typeof DepartmentEnum];
export type TicketMessageSenderType = typeof TicketMessageSenderType[keyof typeof TicketMessageSenderType];

export interface SupportTicket {
  id: string;
  title: string;
  description: string;
  status: TicketStatusEnum;
  priority?: TicketPriorityEnum;
  type?: TicketTypeEnum;
  department?: DepartmentEnum;
  category?: string;
  createdAt: string;
  updatedAt: string;
  userId?: string;
  storeId?: string;
  unreadCount?: number;
  unreadMessages?: number;
  unread_count?: number;
  lastMessageAt?: string | null;
  lastMessagePreview?: string | null;
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
  priority?: TicketPriorityEnum;
  type?: TicketTypeEnum;
  department?: DepartmentEnum;
  category?: string;
  storeId?: string;
}

export interface SupportTicketStoreOption {
  id: string;
  name: string;
}

export interface SupportTicketAttachment {
  id: string;
  url?: string | null;
  fileUrl?: string | null;
  name?: string;
  fileName?: string;
  mimeType?: string;
  size?: number;
  createdAt?: string;
  available?: boolean;
}

export interface SupportTicketStoresResponse {
  data: SupportTicketStoreOption[];
  total?: number;
  page?: number;
  limit?: number;
}

const isNotFoundError = (error: unknown) => {
  if (typeof error !== 'object' || error === null) return false;
  const possibleError = error as { response?: { status?: number } };
  return possibleError.response?.status === 404;
};

const normalizeAttachmentsResponse = (response: unknown): SupportTicketAttachment[] => {
  if (Array.isArray(response)) return response as SupportTicketAttachment[];
  if (response && typeof response === 'object') {
    const payload = response as { data?: SupportTicketAttachment[] | { data?: SupportTicketAttachment[] }; attachments?: SupportTicketAttachment[] };
    if (Array.isArray(payload.data)) return payload.data;
    if (Array.isArray(payload.attachments)) return payload.attachments;
    if (payload.data && typeof payload.data === 'object' && Array.isArray(payload.data.data)) return payload.data.data;
  }
  return [];
};

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
    return response as unknown as SupportTicket;
  },

  /**
   * الحصول على جميع تذاكر الدعم (System User)
   * GET /api/v1/support-ticket/system
   */
  getAllSystemTickets: async (params?: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
  }): Promise<TicketsListResponse> => {
    const response = await axiosInstance.get('/support-ticket/system', { params });
    if (Array.isArray(response)) {
      return { data: response as SupportTicket[], total: response.length };
    }
    const payload = response as unknown as TicketsListResponse;
    return {
      ...payload,
      data: payload.data || [],
      total: payload.total ?? payload.data?.length ?? 0,
    };
  },

  /**
   * قائمة المتاجر لدروبداون إنشاء التذاكر
   * GET /api/v1/support-ticket/system/stores
   */
  getSystemTicketStores: async (params?: { page?: number; limit?: number; search?: string }): Promise<SupportTicketStoresResponse> => {
    const response = await axiosInstance.get<SupportTicketStoresResponse>('/support-ticket/system/stores', { params });
    return response as unknown as SupportTicketStoresResponse;
  },

  /**
   * مرفقات التذكرة
   * GET /api/v1/support-ticket/{id}/attachments
   */
  getTicketAttachments: async (ticketId: string): Promise<SupportTicketAttachment[]> => {
    const paths = [
      `/support-ticket/${ticketId}/attachments`,
      `/support-ticket/system/${ticketId}/attachments`,
      `/support-ticket/store/${ticketId}/attachments`,
    ];

    for (const path of paths) {
      try {
        const response = await axiosInstance.get(path);
        return normalizeAttachmentsResponse(response);
      } catch (error) {
        if (!isNotFoundError(error)) throw error;
      }
    }

    return [];
  },

  /**
   * رفع مرفقات التذكرة
   * POST /api/v1/support-ticket/{id}/attachments
   */
  uploadTicketAttachments: async (ticketId: string, files: FileList | File[]): Promise<SupportTicketAttachment[]> => {
    const formData = new FormData();
    Array.from(files).forEach((file) => formData.append('files', file));
    const paths = [
      `/support-ticket/${ticketId}/attachments`,
      `/support-ticket/system/${ticketId}/attachments`,
      `/support-ticket/store/${ticketId}/attachments`,
    ];

    let lastError: unknown;
    for (const path of paths) {
      try {
        const response = await axiosInstance.post(
          path,
          formData,
          { headers: { 'Content-Type': 'multipart/form-data' } }
        );
        return normalizeAttachmentsResponse(response);
      } catch (error) {
        lastError = error;
        if (!isNotFoundError(error)) throw error;
      }
    }

    throw lastError;
  },

  /**
   * حذف مرفق من التذكرة
   * DELETE /api/v1/support-ticket/{id}/attachments/{attachmentId}
   */
  deleteTicketAttachment: async (ticketId: string, attachmentId: string): Promise<void> => {
    const paths = [
      `/support-ticket/${ticketId}/attachments/${attachmentId}`,
      `/support-ticket/system/${ticketId}/attachments/${attachmentId}`,
      `/support-ticket/store/${ticketId}/attachments/${attachmentId}`,
    ];

    let lastError: unknown;
    for (const path of paths) {
      try {
        await axiosInstance.delete<void>(path);
        return;
      } catch (error) {
        lastError = error;
        if (!isNotFoundError(error)) throw error;
      }
    }

    throw lastError;
  },

  /**
   * إصلاح مفاتيح المرفقات القديمة (أسماء غير ASCII)
   * POST /api/v1/support-ticket/system/repair-attachments
   */
  repairTicketAttachments: async (ticketId?: string): Promise<{
    repairedIds?: string[];
    missingIds?: string[];
  }> => {
    const response = await axiosInstance.post(
      '/support-ticket/system/repair-attachments',
      undefined,
      { params: ticketId ? { ticketId } : undefined }
    );
    return response as unknown as { repairedIds?: string[]; missingIds?: string[] };
  },

  /**
   * الحصول على تذكرة محددة (System User)
   * GET /api/v1/support-ticket/system/{id}
   */
  getSystemTicketById: async (id: string): Promise<SupportTicket> => {
    const response = await axiosInstance.get<SupportTicket>(
      `/support-ticket/system/${id}`
    );
    return response as unknown as SupportTicket;
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
    return response as unknown as SupportTicket;
  },

  /**
   * إغلاق تذكرة (System User)
   * PUT /api/v1/support-ticket/system/{id}/close
   */
  closeSystemTicket: async (id: string): Promise<SupportTicket> => {
    const response = await axiosInstance.put<SupportTicket>(
      `/support-ticket/system/${id}/close`
    );
    return response as unknown as SupportTicket;
  },

  /**
   * حل تذكرة (System User)
   * PUT /api/v1/support-ticket/system/{id}/resolve
   */
  resolveSystemTicket: async (id: string): Promise<SupportTicket> => {
    const response = await axiosInstance.put<SupportTicket>(
      `/support-ticket/system/${id}/resolve`
    );
    return response as unknown as SupportTicket;
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
    return response as unknown as SupportTicket;
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
    return response as unknown as TicketsListResponse;
  },

  /**
   * الحصول على تذكرة محددة (Store User)
   * GET /api/v1/support-ticket/store/{id}
   */
  getStoreTicketById: async (id: string): Promise<SupportTicket> => {
    const response = await axiosInstance.get<SupportTicket>(
      `/support-ticket/store/${id}`
    );
    return response as unknown as SupportTicket;
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
    return response as unknown as SupportTicket;
  },

  /**
   * إغلاق تذكرة (Store User)
   * PUT /api/v1/support-ticket/store/{id}/close
   */
  closeStoreTicket: async (id: string): Promise<SupportTicket> => {
    const response = await axiosInstance.put<SupportTicket>(
      `/support-ticket/store/${id}/close`
    );
    return response as unknown as SupportTicket;
  },
};
