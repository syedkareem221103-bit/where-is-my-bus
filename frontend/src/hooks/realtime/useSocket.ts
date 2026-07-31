import { useCallback } from 'react';
import { socketClient } from '../../services/realtime/socketClient';

/**
 * Basic hook for accessing emit capabilities.
 */
export const useSocket = () => {
  const emit = useCallback((event: string, ...args: unknown[]) => {
    socketClient.emit(event, ...args);
  }, []);

  return { emit };
};
