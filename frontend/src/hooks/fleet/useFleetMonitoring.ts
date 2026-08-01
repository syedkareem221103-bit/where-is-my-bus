import { useCallback } from 'react';
import { useFleetStore } from '../../store/useFleetStore';
import { useSocketEvent } from '../realtime/useSocketEvent';
import { socketClient } from '../../services/realtime/socketClient';

export const useFleetMonitoring = () => {
  const { setSnapshot, applyDelta, addAlert } = useFleetStore();

  const requestSnapshot = useCallback(() => {
    const socket = socketClient.getSocket();
    if (socket) {
      socket.emit('client:fleet:request_snapshot');
    }
  }, []);

  const handleSnapshot = useCallback((envelope: unknown) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payload = (envelope as Record<string, unknown>).payload as any;
    setSnapshot(payload.version, payload.vehicles || {}, payload.summary);
  }, [setSnapshot]);

  const handleDelta = useCallback((envelope: unknown) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payload = (envelope as Record<string, unknown>).payload as any;
    const localVersion = useFleetStore.getState().version;
    
    if (payload.version > localVersion) {
      applyDelta(payload.version, payload.vehicles || [], payload.removedVehicles || []);
    }
  }, [applyDelta]);

  const handleAlert = useCallback((envelope: unknown) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    addAlert((envelope as Record<string, unknown>).payload as any);
  }, [addAlert]);

  useSocketEvent('fleet:snapshot', handleSnapshot);
  useSocketEvent('fleet:delta', handleDelta);
  useSocketEvent('fleet:alert', handleAlert);
  useSocketEvent('fleet:notification', handleAlert);

  return { requestSnapshot };
};
