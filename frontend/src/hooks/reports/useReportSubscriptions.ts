import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../services/apiClient';
import type { ReportSubscription, CreateReportSubscriptionDTO } from '../../types/report';

export function useReportSubscriptions() {
  const queryClient = useQueryClient();

  const query = useQuery<ReportSubscription[]>({
    queryKey: ['report-subscriptions'],
    queryFn: async () => {
      const response = await apiClient.get('/v1/reports/subscriptions');
      return response.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: CreateReportSubscriptionDTO) => {
      const response = await apiClient.post('/v1/reports/subscriptions', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report-subscriptions'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/v1/reports/subscriptions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report-subscriptions'] });
    },
  });

  return {
    ...query,
    createSubscription: createMutation.mutateAsync,
    deleteSubscription: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
