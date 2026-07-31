import { useCallback } from 'react';
import { useETAStore } from '../../store/useETAStore';
import { ETAPayloadSchema } from '../../types/eta.types';
import { useSocketEvent } from '../realtime/useSocketEvent';

export function useETAUpdates() {
  const updateETA = useETAStore(state => state.updateETA);

  const handleETAUpdate = useCallback((payload: unknown) => {
    try {
      const parsed = ETAPayloadSchema.parse(payload);
      updateETA(parsed);
    } catch {
      // Silent catch for schema validation errors
    }
  }, [updateETA]);

  useSocketEvent('server:eta:update', handleETAUpdate);
}
