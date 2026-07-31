import { useCallback } from 'react';
import { socketClient } from '../../services/realtime/socketClient';

export function useNotificationAck() {
  const acknowledge = useCallback((notificationId: string) => {
    const socket = socketClient.getSocket();
    if (!socket?.connected) return;

    socket.emit('client:notification:ack', {
      notificationId,
      timestamp: Date.now()
    }, (response: { success: boolean, eventId: string }) => {
      if (response?.success) {
        // Analytics extension point:
        // emitLocalEvent('notification_acknowledged', { notificationId });
      } else {
        // Fallback retry logic could be placed here if necessary
      }
    });
  }, []);

  return { acknowledge };
}
