import React, { createContext, useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useSocketStore } from '../store/useSocketStore';
import { socketClient } from '../services/realtime/socketClient';

interface SocketContextValue {
  connected: boolean;
}

export const SocketContext = createContext<SocketContextValue>({ connected: false });

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isHydrating } = useAuthStore();
  const status = useSocketStore((state) => state.status);

  useEffect(() => {
    if (isHydrating) return;

    if (isAuthenticated) {
      const token = localStorage.getItem('accessToken');
      if (token) {
        socketClient.connect(token);
      }
    } else {
      socketClient.disconnect();
    }
  }, [isAuthenticated, isHydrating]);

  useEffect(() => {
    if (status === 'AUTH_FAILED') {
      console.warn('Socket authentication failed. Token may be expired.');
      // Future: Integrate with apiClient token refresh logic
    }
  }, [status]);

  useEffect(() => {
    return () => {
      socketClient.disconnect();
    };
  }, []);

  return (
    <SocketContext.Provider value={{ connected: status === 'CONNECTED' }}>
      {children}
    </SocketContext.Provider>
  );
};
