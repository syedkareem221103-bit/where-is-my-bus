import { useEffect } from 'react';
import { socketClient } from '../../services/realtime/socketClient';
import { NotificationPayloadSchema, type NotificationPayload } from '../../types/notification.types';
import { useNotificationStore } from '../../store/useNotificationStore';
import { useNotificationAck } from './useNotificationAck';
import { useSocketStore } from '../../store/useSocketStore';

export function useNotificationSubscription() {
  const addNotification = useNotificationStore(state => state.addNotification);
  const markAsRead = useNotificationStore(state => state.markAsRead);
  const { acknowledge } = useNotificationAck();
  const socketStatus = useSocketStore(state => state.status);

  useEffect(() => {
    if (socketStatus !== 'CONNECTED') return;

    let mounted = true;

    const handleNewNotification = (rawPayload: unknown) => {
      if (!mounted) return;

      try {
        const payload: NotificationPayload = NotificationPayloadSchema.parse(rawPayload);
        
        // 1. Analytics Stub
        // emitLocalEvent('notification_delivered', { notificationId: payload.notificationId });

        // 2. Add to Store
        const isNew = addNotification(payload);

        // 3. Acknowledge
        if (isNew) {
          acknowledge(payload.notificationId);
        }

        // 4. Browser Visibility check
        if (document.visibilityState === 'visible' && isNew) {
          // Check if we are viewing the notification feed specifically? 
          // For now, if document is visible, we might want to auto-read it or just prevent toast.
          // The actual toast prevention logic is in the UI component layer usually, 
          // but we can also auto-mark as read if they have the feed open.
          // Since we can't easily know if the feed is open from here without more context,
          // we leave the "delivered vs read" alone, and let UI suppress the toast.
        }

      } catch {
        // Silent catch for Zod parse errors to avoid crashing hook
      }
    };

    socketClient.getSocket()?.on('server:notification:new', handleNewNotification);

    return () => {
      mounted = false;
      socketClient.getSocket()?.off('server:notification:new', handleNewNotification);
    };
  }, [socketStatus, addNotification, markAsRead, acknowledge]);
}
