import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { userService } from '@/services/user.service';
import type { CreateUserRequest, UpdateUserRequest, UserRole } from '@/types/user.dto';
import { useToast } from '@/hooks/use-toast';

export const userKeys = {
  all: ['users'] as const,
  lists: () => [...userKeys.all, 'list'] as const,
  list: (role?: UserRole, page?: number, limit?: number) => [...userKeys.lists(), { role, page, limit }] as const,
  details: () => [...userKeys.all, 'detail'] as const,
  detail: (id: string) => [...userKeys.details(), id] as const,
};

export function useUsers(role?: UserRole, page = 1, limit = 10) {
  return useQuery({
    queryKey: userKeys.list(role, page, limit),
    queryFn: () => userService.list(role, page, limit),
    staleTime: 5 * 60 * 1000,
  });
}

export function useUser(id: string) {
  return useQuery({
    queryKey: userKeys.detail(id),
    queryFn: () => userService.getById(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (payload: CreateUserRequest) => userService.create(payload),
    onSuccess: (data) => { void data;
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
      toast({ title: 'Success', description: 'User created successfully.' });
    },
    onError: (error: unknown) => { void error;
      toast({ variant: 'destructive', title: 'Error', description: (error as { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed to create user.' });
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateUserRequest }) => userService.update(id, payload),
    onSuccess: (data, variables) => { void data; void variables;
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
      queryClient.invalidateQueries({ queryKey: userKeys.detail(variables.id) });
      toast({ title: 'Success', description: 'User updated successfully.' });
    },
    onError: (error: unknown) => { void error;
      toast({ variant: 'destructive', title: 'Error', description: (error as { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed to update user.' });
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => userService.delete(id),
    onSuccess: (data) => { void data;
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
      toast({ title: 'Success', description: 'User deleted successfully.' });
    },
    onError: (error: unknown) => { void error;
      toast({ variant: 'destructive', title: 'Error', description: (error as { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed to delete user.' });
    },
  });
}
