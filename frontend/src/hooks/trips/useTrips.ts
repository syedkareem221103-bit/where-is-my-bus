import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { tripService } from '@/services/trip.service';
import type { CreateTripRequest, UpdateTripStatusRequest } from '@/types/trip.dto';
import { useToast } from '@/hooks/use-toast';

export const tripKeys = {
  all: ['trips'] as const,
  lists: () => [...tripKeys.all, 'list'] as const,
  list: (page?: number, limit?: number, status?: string) => [...tripKeys.lists(), { page, limit, status }] as const,
  details: () => [...tripKeys.all, 'detail'] as const,
  detail: (id: string) => [...tripKeys.details(), id] as const,
  pings: (id: string) => [...tripKeys.detail(id), 'pings'] as const,
  myActive: () => [...tripKeys.all, 'myActive'] as const,
};

export function useTrips(page = 1, limit = 10, status?: string) {
  return useQuery({
    queryKey: tripKeys.list(page, limit, status),
    queryFn: () => tripService.list(page, limit, status),
    staleTime: 30 * 1000,
  });
}

export function useTrip(id: string) {
  return useQuery({
    queryKey: tripKeys.detail(id),
    queryFn: () => tripService.getById(id),
    enabled: !!id,
    staleTime: 30 * 1000,
  });
}

export function useTripPings(id: string) {
  return useQuery({
    queryKey: tripKeys.pings(id),
    queryFn: () => tripService.getPings(id),
    enabled: !!id,
    refetchInterval: 10 * 1000, // Poll every 10 seconds for active pings
  });
}

export function useMyActiveTrip() {
  return useQuery({
    queryKey: tripKeys.myActive(),
    queryFn: () => tripService.getMyActiveTrip(),
    refetchOnWindowFocus: true,
  });
}

export function useCreateTrip() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (payload: CreateTripRequest) => tripService.create(payload),
    onSuccess: (data) => { void data;
      queryClient.invalidateQueries({ queryKey: tripKeys.lists() });
      toast({ title: 'Success', description: 'Trip created successfully.' });
    },
    onError: (error: unknown) => { void error;
      toast({ variant: 'destructive', title: 'Error', description: (error as { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed to create trip.' });
    },
  });
}

export function useUpdate() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateTripStatusRequest }) => tripService.updateStatus(id, payload),
    onSuccess: (data, variables) => { void data; void variables;
      queryClient.invalidateQueries({ queryKey: tripKeys.lists() });
      queryClient.invalidateQueries({ queryKey: tripKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: tripKeys.myActive() });
      toast({ title: 'Success', description: `Trip status updated to ${variables.payload.status}.` });
    },
    onError: (error: unknown) => { void error;
      toast({ variant: 'destructive', title: 'Error', description: (error as { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed to update trip status.' });
    },
  });
}
