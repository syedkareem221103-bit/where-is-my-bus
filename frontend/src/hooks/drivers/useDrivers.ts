import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { driverService } from '@/services/driver.service';
import type { CreateDriverRequest, UpdateDriverRequest } from '@/types/driver.dto';
import { useToast } from '@/hooks/use-toast';

export const driverKeys = {
  all: ['drivers'] as const,
  lists: () => [...driverKeys.all, 'list'] as const,
  list: (page?: number, limit?: number) => [...driverKeys.lists(), { page, limit }] as const,
  details: () => [...driverKeys.all, 'detail'] as const,
  detail: (id: string) => [...driverKeys.details(), id] as const,
};

export function useDrivers(page = 1, limit = 10) {
  return useQuery({
    queryKey: driverKeys.list(page, limit),
    queryFn: () => driverService.list(page, limit),
    staleTime: 5 * 60 * 1000,
  });
}

export function useDriver(id: string) {
  return useQuery({
    queryKey: driverKeys.detail(id),
    queryFn: () => driverService.getById(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateDriver() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (payload: CreateDriverRequest) => driverService.create(payload),
    onSuccess: (data) => { void data;
      queryClient.invalidateQueries({ queryKey: driverKeys.lists() });
      toast({ title: 'Success', description: 'Driver created successfully.' });
    },
    onError: (error: unknown) => { void error;
      toast({ variant: 'destructive', title: 'Error', description: (error as { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed to create driver.' });
    },
  });
}

export function useUpdateDriver() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateDriverRequest }) => driverService.update(id, payload),
    onSuccess: (data, variables) => { void data; void variables;
      queryClient.invalidateQueries({ queryKey: driverKeys.lists() });
      queryClient.invalidateQueries({ queryKey: driverKeys.detail(variables.id) });
      toast({ title: 'Success', description: 'Driver updated successfully.' });
    },
    onError: (error: unknown) => { void error;
      toast({ variant: 'destructive', title: 'Error', description: (error as { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed to update driver.' });
    },
  });
}

export function useDeleteDriver() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => driverService.delete(id),
    onSuccess: (data) => { void data;
      queryClient.invalidateQueries({ queryKey: driverKeys.lists() });
      toast({ title: 'Success', description: 'Driver deleted successfully.' });
    },
    onError: (error: unknown) => { void error;
      toast({ variant: 'destructive', title: 'Error', description: (error as { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed to delete driver.' });
    },
  });
}
