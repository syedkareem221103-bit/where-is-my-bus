import { create } from 'zustand';

interface DriverAnalyticsState {
  timeRange: string;
  selectedDriverId: string | null;
  setTimeRange: (range: string) => void;
  setSelectedDriverId: (id: string | null) => void;
  
  // Optimistic updates placeholders
  liveEmergencyCount: number;
  incrementLiveEmergency: () => void;
}

export const useDriverAnalyticsStore = create<DriverAnalyticsState>((set) => ({
  timeRange: '30d',
  selectedDriverId: null,
  setTimeRange: (range) => set({ timeRange: range }),
  setSelectedDriverId: (id) => set({ selectedDriverId: id }),
  
  liveEmergencyCount: 0,
  incrementLiveEmergency: () => set((state) => ({ liveEmergencyCount: state.liveEmergencyCount + 1 })),
}));
