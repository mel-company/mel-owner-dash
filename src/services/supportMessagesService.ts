import axiosInstance from '../utils/AxiosInstance';

export interface SupportMessage {
  id: string;
  content: string;
  ticketId: string;
  userId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MessagesListResponse {
  data: SupportMessage[];
  total: number;
  page?: number;
  limit?: number;
}

export interface CreateMessageRequest {
  content: string;
  ticketId: string;
}

export interface ReplyMessageRequest {
  content: string;
  ticketId: string;
}

export interface UpdateMessageRequest {
  content: string;
}

/**
 * Support Messages Service
 * Handles support ticket messages endpoints
 */
export const supportMessagesService = {
  /**
   * الرد على تذكرة دعم (System)
   * POST /api/v1/message/system/reply
   */
  replySystemTicket: async (replyData: ReplyMessageRequest): Promise<SupportMessage> => {
    const response = await axiosInstance.post<SupportMessage>(
      '/message/system/reply',
      replyData
    );
    return response as unknown as SupportMessage; // eslint-disable-line @typescript-eslint/no-explicit-any
  },

  /**
   * إرسال رسالة إلى تذكرة دعم
   * POST /api/v1/message/send
   */
  sendMessage: async (messageData: CreateMessageRequest): Promise<SupportMessage> => {
    const response = await axiosInstance.post<SupportMessage>(
      '/message/send',
      messageData
    );
    return response as unknown as SupportMessage; // eslint-disable-line @typescript-eslint/no-explicit-any
  },

  /**
   * الحصول على جميع رسائل تذكرة دعم (System)
   * GET /api/v1/message/system/{ticketId}/messages
   */
  getSystemTicketMessages: async (
    ticketId: string,
    params?: { page?: number; limit?: number }
  ): Promise<MessagesListResponse> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    const queryString = queryParams.toString();
    const url = `/message/system/${ticketId}/messages${queryString ? `?${queryString}` : ''}`;

    const response = await axiosInstance.get<MessagesListResponse>(url);
    return response as unknown as MessagesListResponse; // eslint-disable-line @typescript-eslint/no-explicit-any
  },

  /**
   * الحصول على جميع رسائل تذكرة دعم (Store)
   * GET /api/v1/message/store/{ticketId}/messages
   */
  getStoreTicketMessages: async (
    ticketId: string,
    params?: { page?: number; limit?: number }
  ): Promise<MessagesListResponse> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    const queryString = queryParams.toString();
    const url = `/message/store/${ticketId}/messages${queryString ? `?${queryString}` : ''}`;

    const response = await axiosInstance.get<MessagesListResponse>(url);
    return response as unknown as MessagesListResponse; // eslint-disable-line @typescript-eslint/no-explicit-any
  },

  /**
   * تحديث رسالة
   * PUT /api/v1/message/{id}
   */
  updateMessage: async (id: string, messageData: UpdateMessageRequest): Promise<SupportMessage> => {
    const response = await axiosInstance.put<SupportMessage>(
      `/message/${id}`,
      messageData
    );
    return response as unknown as SupportMessage; // eslint-disable-line @typescript-eslint/no-explicit-any
  },

  /**
   * حذف رسالة
   * DELETE /api/v1/message/{id}
   */
  deleteMessage: async (id: string): Promise<void> => {
    await axiosInstance.delete<void>(`/message/${id}`);
  },

  /**
   * حذف رد
   * DELETE /api/v1/message/reply/{id}
   */
  deleteReply: async (id: string): Promise<void> => {
    await axiosInstance.delete<void>(`/message/reply/${id}`);
  },
};
