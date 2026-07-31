import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { organizationService } from '@/services/organization.service';
import type { CreateOrganizationRequest, UpdateOrganizationRequest } from '@/types/organization.dto';
import { useToast } from '@/hooks/use-toast';

export const organizationKeys = {
  all: ['organizations'] as const,
  lists: () => [...organizationKeys.all, 'list'] as const,
  list: (page: number, limit: number) => [...organizationKeys.lists(), { page, limit }] as const,
  details: () => [...organizationKeys.all, 'detail'] as const,
  detail: (id: string) => [...organizationKeys.details(), id] as const,
};

export function useOrganizations(page = 1, limit = 10) {
  return useQuery({
    queryKey: organizationKeys.list(page, limit),
    queryFn: () => organizationService.list(page, limit),
    staleTime: 5 * 60 * 1000,
  });
}

export function useOrganization(id: string) {
  return useQuery({
    queryKey: organizationKeys.detail(id),
    queryFn: () => organizationService.getById(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateOrganization() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (payload: CreateOrganizationRequest) => organizationService.create(payload),
    onSuccess: (data) => { void data;
      queryClient.invalidateQueries({ queryKey: organizationKeys.lists() });
      toast({ title: 'Success', description: 'Organization created successfully.' });
    },
    onError: (error: unknown) => { void error;
      toast({ variant: 'destructive', title: 'Error', description: (error as { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed to create organization.' });
    },
  });
}

export function useUpdateOrganization() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateOrganizationRequest }) => organizationService.update(id, payload),
    onSuccess: (data, variables) => { void data; void variables;
      queryClient.invalidateQueries({ queryKey: organizationKeys.lists() });
      queryClient.invalidateQueries({ queryKey: organizationKeys.detail(variables.id) });
      toast({ title: 'Success', description: 'Organization updated successfully.' });
    },
    onError: (error: unknown) => { void error;
      toast({ variant: 'destructive', title: 'Error', description: (error as { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed to update organization.' });
    },
  });
}

export function useDeleteOrganization() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => organizationService.delete(id),
    onSuccess: (data) => { void data;
      queryClient.invalidateQueries({ queryKey: organizationKeys.lists() });
      toast({ title: 'Success', description: 'Organization deleted successfully.' });
    },
    onError: (error: unknown) => { void error;
      toast({ variant: 'destructive', title: 'Error', description: (error as { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed to delete organization.' });
    },
  });
}
