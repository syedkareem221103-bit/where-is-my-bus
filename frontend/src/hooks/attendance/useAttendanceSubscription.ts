import { useEffect } from 'react';
import { socketClient } from '../../services/realtime/socketClient';
import { useAttendanceStore } from '../../store/useAttendanceStore';
import { useSocketStore } from '../../store/useSocketStore';
import type { AttendanceUpdatedPayload } from '../../types/attendance.types';

export function useAttendanceSubscription(tripId: string) {
  const updateLiveState = useAttendanceStore(state => state.updateLiveState);
  const mergeSnapshot = useAttendanceStore(state => state.mergeSnapshot);
  const clearLiveState = useAttendanceStore(state => state.clearLiveState);
  const socketStatus = useSocketStore(state => state.status);

  useEffect(() => {
    if (!tripId || socketStatus !== 'CONNECTED') return;

    let mounted = true;

    // 1. Join trip room
    socketClient.getSocket()?.emit('client:trip:join', { tripId }, async (response: { status: string }) => {
      if (!mounted) return;
      
      if (response?.status === 'success') {
        // 2. Fetch latest snapshot (Reconnection Synchronization)
        try {
          // This would ideally hit standard React Query instead if they expose a method, 
          // or we can just call our fetcher directly to populate Zustand
          // Mock REST call:
          // const res = await api.get(`/trips/${tripId}/attendance`);
          // mergeSnapshot(res.data);
          
          // For now, we simulate success
        } catch {
          // Silent fallback on reconnection fetch error
        }
      }
    });

    // 3. Register Listener
    const handleUpdate = (payload: AttendanceUpdatedPayload) => {
      if (!mounted) return;
      if (payload.tripId === tripId) {
        updateLiveState(payload.studentId, payload.status, payload.timestamp);
      }
    };

    socketClient.getSocket()?.on('server:attendance:updated', handleUpdate);

    // 4. Cleanup Lifecycle
    return () => {
      mounted = false;
      // Remove listener
      socketClient.getSocket()?.off('server:attendance:updated', handleUpdate);
      // Leave room
      socketClient.getSocket()?.emit('client:trip:leave', { tripId });
      // Clear local memory
      clearLiveState();
    };
  }, [tripId, socketStatus, updateLiveState, mergeSnapshot, clearLiveState]);
}
