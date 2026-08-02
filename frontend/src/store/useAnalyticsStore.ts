import { create } from 'zustand';
import type { LiveKPIs } from '../types/analytics';

interface AnalyticsState {
  liveKPIs: LiveKPIs | null;
  lastUpdated: string | null;
  setLiveKPIs: (kpis: LiveKPIs, timestamp: string) => void;
}

export const useAnalyticsStore = create<AnalyticsState>((set) => ({
  liveKPIs: null,
  lastUpdated: null,
  setLiveKPIs: (kpis, timestamp) => {
    set((state) => {
      // Reject stale updates
      if (state.lastUpdated && new Date(timestamp).getTime() < new Date(state.lastUpdated).getTime()) {
        return state;
      }
      return { liveKPIs: kpis, lastUpdated: timestamp };
    });
  },
}));
