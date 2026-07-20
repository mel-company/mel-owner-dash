import axiosInstance from '../utils/AxiosInstance';
import type { SupportTicketAttachment } from './supportTicketsService';

export interface SupportMessageSenderUser {
  id: string;
  name?: string;
  phone?: string;
}

export interface SupportMessage {
  id: string;
  content?: string;
  message?: string;
  ticketId: string;
  userId?: string;
  senderType?: 'SYSTEM_USER' | 'STORE_USER' | 'USER' | 'CUSTOMER' | string;
  senderId?: string | null;
  storeUserId?: string | null;
  createdAt: string;
  updatedAt: string;
  sender?: SupportMessageSenderUser | null;
  storeUser?: {
    id: string;
    user?: SupportMessageSenderUser | null;
  } | null;
  attachments?: SupportTicketAttachment[];
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
  attachments: message.attachments || [],
});

const normalizeMessagesResponse = (response: unknown): MessagesListResponse => {
  if (Array.isArray(response)) {
    const data = response.map((item) => normalizeSupportMessage(item as SupportMessage));
    return { data, total: data.length };
  }

  if (response && typeof response === 'object') {
    const payload = response as MessagesListResponse & { messages?: SupportMessage[] };
    const list = Array.isArray(payload.data)
      ? payload.data
      : Array.isArray(payload.messages)
        ? payload.messages
        : [];
    const data = list.map(normalizeSupportMessage);
    return {
      ...payload,
      data,
      total: payload.total ?? data.length,
    };
  }

  return { data: [], total: 0 };
};

export interface MessagesListParams {
  page?: number;
  limit?: number;
  after?: string;
  afterId?: string;
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
   * الحصول على رسائل تذكرة دعم (System)
   * GET /api/v1/message/system/{ticketId}/messages?after=&afterId=&limit=
   */
  getSystemTicketMessages: async (
    ticketId: string,
    params?: MessagesListParams
  ): Promise<MessagesListResponse> => {
    const response = await axiosInstance.get(`/message/system/${ticketId}/messages`, { params });
    return normalizeMessagesResponse(response);
  },

  /**
   * الحصول على جميع رسائل تذكرة دعم (Store)
   * GET /api/v1/message/store/{ticketId}/messages
   */
  getStoreTicketMessages: async (
    ticketId: string,
    params?: MessagesListParams
  ): Promise<MessagesListResponse> => {
    const response = await axiosInstance.get(`/message/store/${ticketId}/messages`, { params });
    return normalizeMessagesResponse(response);
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
   * عدد الرسائل غير المقروءة (System)
   * GET /api/v1/message/system/unread-count
   */
  getSystemUnreadCount: async (): Promise<number> => {
    const response = await axiosInstance.get('/message/system/unread-count');
    return normalizeUnreadCount(response);
  },

  /**
   * تعليم رسائل التذكرة كمقروءة (System)
   * POST /api/v1/message/system/{ticketId}/read
   */
  markSystemTicketRead: async (ticketId: string): Promise<number> => {
    const response = await axiosInstance.post(`/message/system/${ticketId}/read`);
    if (response && typeof response === 'object' && 'unreadCount' in (response as object)) {
      return Number((response as { unreadCount?: number }).unreadCount || 0);
    }
    return 0;
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

const normalizeUnreadCount = (response: unknown): number => {
  if (typeof response === 'number') return response;
  if (typeof response === 'string') return Number(response) || 0;
  if (response && typeof response === 'object') {
    const payload = response as {
      count?: number;
      unread?: number;
      unreadCount?: number;
      total?: number;
      data?: number | { count?: number; unread?: number; unreadCount?: number; total?: number };
    };
    if (typeof payload.unreadCount === 'number') return payload.unreadCount;
    if (typeof payload.count === 'number') return payload.count;
    if (typeof payload.unread === 'number') return payload.unread;
    if (typeof payload.total === 'number') return payload.total;
    if (typeof payload.data === 'number') return payload.data;
    if (payload.data && typeof payload.data === 'object') {
      return payload.data.unreadCount ?? payload.data.count ?? payload.data.unread ?? payload.data.total ?? 0;
    }
  }
  return 0;
};
