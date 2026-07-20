import axiosInstance from '../utils/AxiosInstance';

export interface SupportMessage {
  id: string;
  content?: string;
  message?: string;
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
  content?: string;
  message?: string;
  ticketId: string;
}

export interface ReplyMessageRequest {
  content?: string;
  message?: string;
  ticketId: string;
}

export interface UpdateMessageRequest {
  content?: string;
  message?: string;
}

const normalizeMessagePayload = <T extends { content?: string; message?: string }>(payload: T) => {
  const message = payload.message || payload.content || '';
  return {
    ...payload,
    message,
    content: message,
  };
};

const normalizeSupportMessage = (message: SupportMessage): SupportMessage => ({
  ...message,
  content: message.content || message.message || '',
  message: message.message || message.content || '',
});

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
      normalizeMessagePayload(replyData)
    );
    return normalizeSupportMessage(response as unknown as SupportMessage);
  },

  /**
   * إرسال رسالة إلى تذكرة دعم
   * POST /api/v1/message/send
   */
  sendMessage: async (messageData: CreateMessageRequest): Promise<SupportMessage> => {
    const response = await axiosInstance.post<SupportMessage>(
      '/message/send',
      normalizeMessagePayload(messageData)
    );
    return normalizeSupportMessage(response as unknown as SupportMessage);
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
    const payload = response as unknown as MessagesListResponse;
    return { ...payload, data: (payload.data || []).map(normalizeSupportMessage) };
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
    const payload = response as unknown as MessagesListResponse;
    return { ...payload, data: (payload.data || []).map(normalizeSupportMessage) };
  },

  /**
   * تحديث رسالة
   * PUT /api/v1/message/{id}
   */
  updateMessage: async (id: string, messageData: UpdateMessageRequest): Promise<SupportMessage> => {
    const response = await axiosInstance.put<SupportMessage>(
      `/message/${id}`,
      normalizeMessagePayload(messageData)
    );
    return normalizeSupportMessage(response as unknown as SupportMessage);
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
