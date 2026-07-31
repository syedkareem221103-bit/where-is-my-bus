import { useEffect, useRef } from 'react';
import { useSocketStore } from '../../store/useSocketStore';
import { useETAStore } from '../../store/useETAStore';
import { ETAPayloadSchema } from '../../types/eta.types';
import { socketClient } from '../../services/realtime/socketClient';

export function useETARecovery(tripId: string | undefined) {
  const isConnected = useSocketStore(state => state.status === 'CONNECTED');
  const updateETA = useETAStore(state => state.updateETA);
  
  // Track if we need recovery on next connect
  const needsRecovery = useRef(false);

  useEffect(() => {
    if (!isConnected) {
      needsRecovery.current = true;
      return;
    }

    const socket = socketClient.getSocket();

    if (isConnected && needsRecovery.current && socket && tripId) {
      socket.emit('client:eta:sync', { tripId }, (response: unknown) => {
        const res = response as { status?: string, data?: unknown };
        if (res?.status === 'success' && res.data) {
          try {
            const parsed = ETAPayloadSchema.parse(res.data);
            updateETA(parsed);
          } catch {
            // Invalid snapshot structure
          }
        }
      });
      needsRecovery.current = false;
    }
  }, [isConnected, tripId, updateETA]);
}
