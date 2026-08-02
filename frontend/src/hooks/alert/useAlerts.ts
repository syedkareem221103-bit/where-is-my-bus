import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

export interface SmartAlert {
  id: string;
  tripId: string | null;
  geofenceId: string | null;
  category: string;
  priority: string;
  status: string;
  message: string;
  createdAt: string;
}

export const useAlerts = () => {
  return useQuery<SmartAlert[]>({
    queryKey: ['alerts'],
    queryFn: async () => {
      const { data } = await axios.get('/api/v1/alerts');
      return data;
    },
    refetchInterval: 5000, // simple polling or rely on sockets
  });
};

export const useAcknowledgeAlert = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await axios.post(`/api/v1/alerts/${id}/acknowledge`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    },
  });
};

export const useResolveAlert = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes?: string }) => {
      const { data } = await axios.post(`/api/v1/alerts/${id}/resolve`, { resolutionNotes: notes });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    },
  });
};
