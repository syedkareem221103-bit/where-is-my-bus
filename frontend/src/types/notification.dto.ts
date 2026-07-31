export type NotificationDeliveryStatus = 'QUEUED' | 'PROCESSING' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED' | 'EXPIRED';

export interface NotificationResponse {
  id: string;
  organizationId: string;
  tripId: string | null;
  eventKey: string;
  priority: string;
  payload: Record<string, unknown>;
  createdAt: string;
  expiresAt: string | null;
}

export interface NotificationRecipientResponse {
  id: string;
  organizationId: string;
  notificationId: string;
  userId: string;
  channel: string;
  status: NotificationDeliveryStatus;
  queuedAt: string;
  readAt: string | null;
  notification?: NotificationResponse;
}

export interface MarkNotificationReadRequest {
  notificationId: string;
}
