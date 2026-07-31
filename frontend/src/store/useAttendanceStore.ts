import { create } from 'zustand';
import type { MarkAttendancePayload, AttendanceStatus, StudentAttendanceSnapshot } from '../types/attendance.types';

interface AttendanceState {
  offlineQueue: MarkAttendancePayload[];
  liveAttendanceState: Record<string, StudentAttendanceSnapshot>; // key: studentId

  // Actions
  enqueueOffline: (payload: MarkAttendancePayload) => void;
  dequeueOffline: (eventId: string) => void;
  clearQueue: () => void;
  
  updateLiveState: (studentId: string, status: AttendanceStatus, timestamp: number) => void;
  mergeSnapshot: (snapshot: StudentAttendanceSnapshot[]) => void;
  clearLiveState: () => void;
}

export const useAttendanceStore = create<AttendanceState>((set) => ({
  offlineQueue: [],
  liveAttendanceState: {},

  enqueueOffline: (payload) => set((state) => ({
    offlineQueue: [...state.offlineQueue, payload]
  })),

  dequeueOffline: (eventId) => set((state) => ({
    offlineQueue: state.offlineQueue.filter(item => item.eventId !== eventId)
  })),

  clearQueue: () => set({ offlineQueue: [] }),

  updateLiveState: (studentId, status, timestamp) => set((state) => {
    const existing = state.liveAttendanceState[studentId];
    // Conflict resolution: only update if timestamp is newer
    if (existing && existing.lastUpdated >= timestamp) {
      return state;
    }
    return {
      liveAttendanceState: {
        ...state.liveAttendanceState,
        [studentId]: { studentId, status, lastUpdated: timestamp }
      }
    };
  }),

  mergeSnapshot: (snapshot) => set((state) => {
    const newState = { ...state.liveAttendanceState };
    snapshot.forEach(record => {
      const existing = newState[record.studentId];
      if (!existing || existing.lastUpdated < record.lastUpdated) {
        newState[record.studentId] = record;
      }
    });
    return { liveAttendanceState: newState };
  }),

  clearLiveState: () => set({ liveAttendanceState: {} })
}));
