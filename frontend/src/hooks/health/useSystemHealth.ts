import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

import { useSocketEvent } from '../realtime/useSocketEvent';
import { useQueryClient } from '@tanstack/react-query';

export interface SystemHealthPayload {
  globalStatus: 'HEALTHY' | 'WARNING' | 'DEGRADED' | 'CRITICAL' | 'OFFLINE';
  timestamp: string;
  infrastructure?: {
    postgres: { status: string; latencyMs?: number };
    redis: { status: string; latencyMs?: number };
  };
  runtime?: {
    cpu: number;
    memory: number;
    eventLoopDelay: number;
  };
  services: Record<string, { status: string; message?: string }>;
  business?: {
    activeTrips: number;
    connectedDrivers: number;
    activeSockets: number;
    queueBacklog: number;
  };
  errorRate?: number;
}

export const useSystemHealth = () => {
  const queryClient = useQueryClient();

  const query = useQuery<SystemHealthPayload>({
    queryKey: ['system-health'],
    queryFn: async () => {
      const { data } = await axios.get('/api/v1/system/health');
      return data;
    },
    refetchInterval: 10000, // Fallback if socket fails
  });

  useSocketEvent<SystemHealthPayload>('health.updated', (payload) => {
    queryClient.setQueryData(['system-health'], payload);
  });

  return query;
};

export const useHistoricalHealth = (days = 7) => {
  return useQuery<unknown[]>({
    queryKey: ['historical-health', days],
    queryFn: async () => {
      const { data } = await axios.get(`/api/v1/system/health/history?days=${days}`);
      return data;
    },
  });
};
