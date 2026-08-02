import { useQuery } from '@tanstack/react-query';
import type { DriverKPIs } from '../../types/analytics';
import { env } from '../../config/env';

export const useDriverRankings = (timeRange: string = '30d', sortBy: string = 'score', sortOrder: string = 'desc') => {
  const token = localStorage.getItem('accessToken');

  return useQuery<DriverKPIs[]>({
    queryKey: ['driver-rankings', timeRange, sortBy, sortOrder],
    queryFn: async () => {
      const params = new URLSearchParams({ timeRange, sortBy, sortOrder });
      const response = await fetch(`${env.VITE_API_URL}/analytics/drivers/performance?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) {
        throw new Error('Failed to fetch driver rankings');
      }
      return response.json();
    },
    refetchInterval: 300000, // 5 minutes
    enabled: !!token
  });
};

export const useDriverKPIs = (driverId: string | undefined, timeRange: string = '30d') => {
  const token = localStorage.getItem('accessToken');

  return useQuery<DriverKPIs[]>({
    queryKey: ['driver-kpis', driverId, timeRange],
    queryFn: async () => {
      const response = await fetch(`${env.VITE_API_URL}/analytics/drivers/performance/${driverId}?timeRange=${timeRange}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) {
        throw new Error('Failed to fetch driver KPIs');
      }
      return response.json();
    },
    enabled: !!token && !!driverId
  });
};
