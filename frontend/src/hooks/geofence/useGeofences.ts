import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

export interface Geofence {
  id: string;
  name: string;
  type: string;
  geometry: { type: string; coordinates: unknown[]; radius?: number };
  isActive: boolean;
}

export const useGeofences = () => {
  return useQuery<Geofence[]>({
    queryKey: ['geofences'],
    queryFn: async () => {
      const { data } = await axios.get('/api/v1/geofences');
      return data;
    },
  });
};

export const useCreateGeofence = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (newGeofence: Partial<Geofence>) => {
      const { data } = await axios.post('/api/v1/geofences', newGeofence);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['geofences'] });
    },
  });
};

export const useUpdateGeofence = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Geofence> }) => {
      const { data } = await axios.put(`/api/v1/geofences/${id}`, updates);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['geofences'] });
    },
  });
};

export const useDeleteGeofence = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await axios.delete(`/api/v1/geofences/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['geofences'] });
    },
  });
};
