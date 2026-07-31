import { useRef, useCallback } from 'react';

import { useAttendanceStore } from '../../store/useAttendanceStore';
import type { AttendanceStatus, MarkAttendancePayload } from '../../types/attendance.types';

export function useAttendanceBroadcaster(tripId: string) {
  const enqueueOffline = useAttendanceStore(state => state.enqueueOffline);
  const updateLiveState = useAttendanceStore(state => state.updateLiveState);
  
  // Track locks by studentId
  const lockRef = useRef<Record<string, number>>({});

  const markAttendance = useCallback((studentId: string, status: AttendanceStatus) => {
    const now = Date.now();
    const lastLock = lockRef.current[studentId] || 0;
    
    // 500ms multi-tap lock
    if (now - lastLock < 500) {
      return;
    }
    
    lockRef.current[studentId] = now;

    const eventId = crypto.randomUUID();
    const payload: MarkAttendancePayload = {
      tripId,
      studentId,
      status,
      timestamp: now,
      eventId
    };

    // 1. Optimistic UI update
    updateLiveState(studentId, status, now);

    // 2. Offline Queue insertion
    enqueueOffline(payload);

    // 3. Attempt immediate broadcast if socket claims to be connected
    // The actual emit and ack handling is managed by `useAttendanceSync` hook, 
    // but we can try to fast-path it here to avoid waiting for the sync interval if we want.
    // For purity of the FIFO queue, it's safer to let `useAttendanceSync` process everything.
    
  }, [tripId, enqueueOffline, updateLiveState]);

  return { markAttendance };
}
