import { useQuery } from '@tanstack/react-query';
import type { RouteKPIs, TripReplay } from '../../types/analytics';
import { env } from '../../config/env';

export const useRouteRankings = (timeRange: string = '30d', sortBy: string = 'efficiency', sortOrder: string = 'desc') => {
  const token = localStorage.getItem('accessToken');

  return useQuery<RouteKPIs[]>({
    queryKey: ['route-rankings', timeRange, sortBy, sortOrder],
    queryFn: async () => {
      const params = new URLSearchParams({ timeRange, sortBy, sortOrder });
      const response = await fetch(`${env.VITE_API_URL}/analytics/routes/performance?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) {
        throw new Error('Failed to fetch route performance');
      }
      return response.json();
    },
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
    staleTime: 5 * 60 * 1000
  });
};

export const useRouteReplay = (tripId: string | undefined) => {
  const token = localStorage.getItem('accessToken');

  return useQuery<TripReplay>({
    queryKey: ['route-replay', tripId],
    queryFn: async () => {
      const response = await fetch(`${env.VITE_API_URL}/analytics/routes/replay/${tripId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) {
        throw new Error('Failed to fetch route replay');
      }
      return response.json();
    },
    enabled: !!tripId,
    staleTime: Infinity, // Replay data doesn't change
  });
};
