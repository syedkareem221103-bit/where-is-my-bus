import { apiClient } from './apiClient';
import type { PaginatedResponse } from '@/types/api';
import type { NotificationRecipientResponse, MarkNotificationReadRequest } from '@/types/notification.dto';

export const notificationService = {
  listMyNotifications: async (page = 1, limit = 20): Promise<PaginatedResponse<NotificationRecipientResponse>> => {
    const { data } = await apiClient.get<{ data: PaginatedResponse<NotificationRecipientResponse> }>('/api/v1/notifications/me', {
      params: { page, limit }
    });
    return data.data;
  },

  markAsRead: async (payload: MarkNotificationReadRequest): Promise<void> => {
    await apiClient.put(`/api/v1/notifications/${payload.notificationId}/read`);
  },

  markAllAsRead: async (): Promise<void> => {
    await apiClient.put('/api/v1/notifications/read-all');
  }
};
