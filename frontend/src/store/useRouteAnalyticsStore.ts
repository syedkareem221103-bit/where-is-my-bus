import { create } from 'zustand';

interface RouteAnalyticsState {
  timeRange: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  selectedRouteId: string | undefined;
  setTimeRange: (range: string) => void;
  setSortBy: (sortBy: string) => void;
  setSortOrder: (order: 'asc' | 'desc') => void;
  setSelectedRouteId: (id: string | undefined) => void;
}

export const useRouteAnalyticsStore = create<RouteAnalyticsState>((set) => ({
  timeRange: '30d',
  sortBy: 'efficiency',
  sortOrder: 'desc',
  selectedRouteId: undefined,
  setTimeRange: (timeRange) => set({ timeRange }),
  setSortBy: (sortBy) => set({ sortBy }),
  setSortOrder: (sortOrder) => set({ sortOrder }),
  setSelectedRouteId: (selectedRouteId) => set({ selectedRouteId }),
}));
