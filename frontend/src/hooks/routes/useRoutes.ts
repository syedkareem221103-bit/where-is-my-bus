import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { routeService } from '@/services/route.service';
import type { CreateRouteRequest, UpdateRouteRequest } from '@/types/route.dto';
import { useToast } from '@/hooks/use-toast';

export const routeKeys = {
  all: ['routes'] as const,
  lists: () => [...routeKeys.all, 'list'] as const,
  list: (page?: number, limit?: number) => [...routeKeys.lists(), { page, limit }] as const,
  details: () => [...routeKeys.all, 'detail'] as const,
  detail: (id: string) => [...routeKeys.details(), id] as const,
};

export function useRoutes(page = 1, limit = 10) {
  return useQuery({
    queryKey: routeKeys.list(page, limit),
    queryFn: () => routeService.list(page, limit),
    staleTime: 5 * 60 * 1000,
  });
}

export function useRoute(id: string) {
  return useQuery({
    queryKey: routeKeys.detail(id),
    queryFn: () => routeService.getById(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateRoute() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (payload: CreateRouteRequest) => routeService.create(payload),
    onSuccess: (data) => { void data;
      queryClient.invalidateQueries({ queryKey: routeKeys.lists() });
      toast({ title: 'Success', description: 'Route created successfully.' });
    },
    onError: (error: unknown) => { void error;
      toast({ variant: 'destructive', title: 'Error', description: (error as { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed to create route.' });
    },
  });
}

export function useUpdateRoute() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateRouteRequest }) => routeService.update(id, payload),
    onSuccess: (data, variables) => { void data; void variables;
      queryClient.invalidateQueries({ queryKey: routeKeys.lists() });
      queryClient.invalidateQueries({ queryKey: routeKeys.detail(variables.id) });
      toast({ title: 'Success', description: 'Route updated successfully.' });
    },
    onError: (error: unknown) => { void error;
      toast({ variant: 'destructive', title: 'Error', description: (error as { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed to update route.' });
    },
  });
}

export function useDeleteRoute() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => routeService.delete(id),
    onSuccess: (data) => { void data;
      queryClient.invalidateQueries({ queryKey: routeKeys.lists() });
      toast({ title: 'Success', description: 'Route deleted successfully.' });
    },
    onError: (error: unknown) => { void error;
      toast({ variant: 'destructive', title: 'Error', description: (error as { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed to delete route.' });
    },
  });
}
