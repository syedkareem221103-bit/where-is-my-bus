import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { vehicleService } from '@/services/vehicle.service';
import type { CreateVehicleRequest, UpdateVehicleRequest } from '@/types/vehicle.dto';
import { useToast } from '@/hooks/use-toast';

export const vehicleKeys = {
  all: ['vehicles'] as const,
  lists: () => [...vehicleKeys.all, 'list'] as const,
  list: (page?: number, limit?: number) => [...vehicleKeys.lists(), { page, limit }] as const,
  details: () => [...vehicleKeys.all, 'detail'] as const,
  detail: (id: string) => [...vehicleKeys.details(), id] as const,
};

export function useVehicles(page = 1, limit = 10) {
  return useQuery({
    queryKey: vehicleKeys.list(page, limit),
    queryFn: () => vehicleService.list(page, limit),
    staleTime: 5 * 60 * 1000,
  });
}

export function useVehicle(id: string) {
  return useQuery({
    queryKey: vehicleKeys.detail(id),
    queryFn: () => vehicleService.getById(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateVehicle() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (payload: CreateVehicleRequest) => vehicleService.create(payload),
    onSuccess: (data) => { void data;
      queryClient.invalidateQueries({ queryKey: vehicleKeys.lists() });
      toast({ title: 'Success', description: 'Vehicle created successfully.' });
    },
    onError: (error: unknown) => { void error;
      toast({ variant: 'destructive', title: 'Error', description: (error as { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed to create vehicle.' });
    },
  });
}

export function useUpdateVehicle() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateVehicleRequest }) => vehicleService.update(id, payload),
    onSuccess: (data, variables) => { void data; void variables;
      queryClient.invalidateQueries({ queryKey: vehicleKeys.lists() });
      queryClient.invalidateQueries({ queryKey: vehicleKeys.detail(variables.id) });
      toast({ title: 'Success', description: 'Vehicle updated successfully.' });
    },
    onError: (error: unknown) => { void error;
      toast({ variant: 'destructive', title: 'Error', description: (error as { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed to update vehicle.' });
    },
  });
}

export function useDeleteVehicle() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => vehicleService.delete(id),
    onSuccess: (data) => { void data;
      queryClient.invalidateQueries({ queryKey: vehicleKeys.lists() });
      toast({ title: 'Success', description: 'Vehicle deleted successfully.' });
    },
    onError: (error: unknown) => { void error;
      toast({ variant: 'destructive', title: 'Error', description: (error as { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed to delete vehicle.' });
    },
  });
}
