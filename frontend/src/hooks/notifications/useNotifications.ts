import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { notificationService } from '@/services/notification.service';
import type { MarkNotificationReadRequest } from '@/types/notification.dto';
import { useToast } from '@/hooks/use-toast';

export const notificationKeys = {
  all: ['notifications'] as const,
  mine: (page?: number, limit?: number) => [...notificationKeys.all, 'mine', { page, limit }] as const,
};

export function useMyNotifications(page = 1, limit = 20) {
  return useQuery({
    queryKey: notificationKeys.mine(page, limit),
    queryFn: () => notificationService.listMyNotifications(page, limit),
    staleTime: 60 * 1000, // 1 minute
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: MarkNotificationReadRequest) => notificationService.markAsRead(payload),
    onMutate: async (payload) => { void payload;
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: notificationKeys.all });
      const previousState = queryClient.getQueryData(notificationKeys.all);
      
      // We don't have the exact page/limit here easily, so invalidating on success is safer
      // but if we wanted pure optimistic, we'd traverse the infinite/paginated cache.
      
      return { previousState };
    },
    onSuccess: (data) => { void data;
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
    onError: (error: unknown, variables, context: { previousState?: unknown } | undefined) => { void error; void variables; void context;
      if (context?.previousState) {
        queryClient.setQueryData(notificationKeys.all, context.previousState);
      }
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: () => notificationService.markAllAsRead(),
    onSuccess: (data) => { void data;
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
      toast({ title: 'Success', description: 'All notifications marked as read.' });
    },
    onError: (error: unknown) => { void error;
      toast({ variant: 'destructive', title: 'Error', description: (error as { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed to update notifications.' });
    },
  });
}
