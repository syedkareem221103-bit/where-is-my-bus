import { useEffect } from 'react';
import { useNotificationStore } from '../../store/useNotificationStore';

export function useNotificationPruner() {
  useEffect(() => {
    // Run cleanup every 10 seconds
    const intervalId = setInterval(() => {
      useNotificationStore.getState().clearExpired();
    }, 10000);

    return () => clearInterval(intervalId);
  }, []);
}
