import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAttendanceBroadcaster } from './useAttendanceBroadcaster';
import { useAttendanceStore } from '../../store/useAttendanceStore';

describe('useAttendanceBroadcaster', () => {
  beforeEach(() => {
    useAttendanceStore.setState({ offlineQueue: [], liveAttendanceState: {} });
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should optimistically update live state and enqueue offline on markAttendance', () => {
    const { result } = renderHook(() => useAttendanceBroadcaster('trip-1'));
    
    act(() => {
      result.current.markAttendance('student-1', 'BOARDED');
    });

    const state = useAttendanceStore.getState();
    expect(state.liveAttendanceState['student-1'].status).toBe('BOARDED');
    expect(state.offlineQueue.length).toBe(1);
    expect(state.offlineQueue[0].tripId).toBe('trip-1');
  });

  it('should block multi-taps within 500ms', () => {
    const { result } = renderHook(() => useAttendanceBroadcaster('trip-1'));
    
    act(() => {
      result.current.markAttendance('student-1', 'BOARDED');
    });

    // Immediate second tap
    act(() => {
      result.current.markAttendance('student-1', 'ALIGHTED');
    });

    const state = useAttendanceStore.getState();
    // Second tap should be ignored
    expect(state.liveAttendanceState['student-1'].status).toBe('BOARDED');
    expect(state.offlineQueue.length).toBe(1);

    // Fast forward 600ms
    act(() => {
      vi.advanceTimersByTime(600);
      result.current.markAttendance('student-1', 'ALIGHTED');
    });

    // Now it should pass
    expect(useAttendanceStore.getState().liveAttendanceState['student-1'].status).toBe('ALIGHTED');
    expect(useAttendanceStore.getState().offlineQueue.length).toBe(2);
  });
});
