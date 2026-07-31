import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { emergencyService } from '@/services/emergency.service';
import type { TriggerEmergencyRequest, UpdateEmergencyStatusRequest } from '@/types/emergency.dto';
import { useToast } from '@/hooks/use-toast';

export const emergencyKeys = {
  all: ['emergencies'] as const,
  lists: () => [...emergencyKeys.all, 'list'] as const,
  list: (page?: number, limit?: number, status?: string) => [...emergencyKeys.lists(), { page, limit, status }] as const,
  details: () => [...emergencyKeys.all, 'detail'] as const,
  detail: (id: string) => [...emergencyKeys.details(), id] as const,
};

export function useEmergencies(page = 1, limit = 10, status?: string) {
  return useQuery({
    queryKey: emergencyKeys.list(page, limit, status),
    queryFn: () => emergencyService.list(page, limit, status),
    staleTime: 30 * 1000,
    refetchInterval: (query) => query.state.data?.data.some(e => e.status === 'ACTIVE') ? 10000 : false,
  });
}

export function useEmergency(id: string) {
  return useQuery({
    queryKey: emergencyKeys.detail(id),
    queryFn: () => emergencyService.getById(id),
    enabled: !!id,
    staleTime: 30 * 1000,
  });
}

export function useTriggerEmergency() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (payload: TriggerEmergencyRequest) => emergencyService.trigger(payload),
    onSuccess: (data) => { void data;
      queryClient.invalidateQueries({ queryKey: emergencyKeys.lists() });
      toast({ variant: 'destructive', title: 'Emergency Triggered', description: 'Emergency protocols activated.' });
    },
    onError: (error: unknown) => { void error;
      toast({ variant: 'destructive', title: 'Error', description: (error as { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed to trigger emergency.' });
    },
  });
}

export function useUpdateEmergencyStatus() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateEmergencyStatusRequest }) => emergencyService.updateStatus(id, payload),
    onSuccess: (data, variables) => { void data; void variables;
      queryClient.invalidateQueries({ queryKey: emergencyKeys.lists() });
      queryClient.invalidateQueries({ queryKey: emergencyKeys.detail(variables.id) });
      toast({ title: 'Success', description: `Emergency status updated to ${variables.payload.status}.` });
    },
    onError: (error: unknown) => { void error;
      toast({ variant: 'destructive', title: 'Error', description: (error as { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed to update emergency status.' });
    },
  });
}
