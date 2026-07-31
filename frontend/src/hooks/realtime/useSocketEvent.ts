import { useEffect } from 'react';
import { socketClient } from '../../services/realtime/socketClient';
import { listenerRegistry } from '../../services/realtime/listenerRegistry';
import type { SocketCallback } from '../../services/realtime/listenerRegistry';

/**
 * Registers an event listener on the socket securely.
 * Cleans up the listener when the component unmounts.
 */
export const useSocketEvent = <T = unknown>(event: string, callback: (payload: T) => void) => {
  useEffect(() => {
    const socket = socketClient.getSocket();
    
    // Register internally to prevent duplicates during React Strict Mode HMR
    const added = listenerRegistry.addListener(event, callback as unknown as SocketCallback);
    
    if (added && socket) {
      socket.on(event, callback);
    }

    return () => {
      listenerRegistry.removeListener(event, callback as unknown as SocketCallback);
      const activeSocket = socketClient.getSocket();
      if (activeSocket) {
        activeSocket.off(event, callback);
      }
    };
  }, [event, callback]);
};
