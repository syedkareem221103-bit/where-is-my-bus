import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSocketEvent } from '../realtime/useSocketEvent';
import { useAnalyticsStore } from '../../store/useAnalyticsStore';
import type { AnalyticsFilter, HistoricalKPIs, LiveKPIs } from '../../types/analytics';
import { apiClient } from '../../services/apiClient';
import type { SocketEventEnvelope } from '../../types/socket.types';

export const useFleetAnalytics = (filter: AnalyticsFilter) => {
  const setLiveKPIs = useAnalyticsStore((state) => state.setLiveKPIs);
  const liveKPIs = useAnalyticsStore((state) => state.liveKPIs);

  // 1. Listen to live socket events (analytics:live)
  useSocketEvent<SocketEventEnvelope<{ live: LiveKPIs, timestamp: string }>>(
    'analytics:live',
    useCallback((envelope) => {
      if (envelope?.payload?.live) {
        setLiveKPIs(envelope.payload.live, envelope.payload.timestamp);
      }
    }, [setLiveKPIs])
  );

  // 2. Fetch historical data with React Query
  const { data: historicalKPIs, isLoading, error, refetch } = useQuery<HistoricalKPIs>({
    queryKey: ['analytics', 'historical', filter],
    queryFn: async () => {
      const response = await apiClient.get('/api/v1/analytics/historical', { params: filter });
      return response.data.data;
    },
    staleTime: 5 * 60 * 1000, // cache for 5 minutes
  });

  return {
    liveKPIs,
    historicalKPIs,
    isLoading,
    error,
    refetchHistorical: refetch
  };
};
