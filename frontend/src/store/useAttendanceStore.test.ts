import { describe, it, expect, beforeEach } from 'vitest';
import { useAttendanceStore } from './useAttendanceStore';
import type { MarkAttendancePayload } from '../types/attendance.types';

describe('useAttendanceStore', () => {
  beforeEach(() => {
    useAttendanceStore.setState({ offlineQueue: [], liveAttendanceState: {} });
  });

  it('should enqueue and dequeue offline records', () => {
    const payload: MarkAttendancePayload = {
      tripId: '1', studentId: '2', status: 'BOARDED', timestamp: 123, eventId: 'event1'
    };

    useAttendanceStore.getState().enqueueOffline(payload);
    expect(useAttendanceStore.getState().offlineQueue.length).toBe(1);

    useAttendanceStore.getState().dequeueOffline('event1');
    expect(useAttendanceStore.getState().offlineQueue.length).toBe(0);
  });

  it('should update live state with newer timestamp', () => {
    useAttendanceStore.getState().updateLiveState('student1', 'BOARDED', 1000);
    expect(useAttendanceStore.getState().liveAttendanceState['student1'].status).toBe('BOARDED');

    // Newer timestamp should update
    useAttendanceStore.getState().updateLiveState('student1', 'ALIGHTED', 2000);
    expect(useAttendanceStore.getState().liveAttendanceState['student1'].status).toBe('ALIGHTED');

    // Older timestamp should NOT update (conflict resolution)
    useAttendanceStore.getState().updateLiveState('student1', 'BOARDED', 1500);
    expect(useAttendanceStore.getState().liveAttendanceState['student1'].status).toBe('ALIGHTED'); // Preserved
  });
});
