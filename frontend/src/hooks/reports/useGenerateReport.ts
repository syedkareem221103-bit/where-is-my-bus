import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../services/apiClient';
import type { OnDemandExportDTO } from '../../types/report';

export function useGenerateReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: OnDemandExportDTO) => {
      const response = await apiClient.post('/v1/reports/export', data);
      return response.data;
    },
    onSuccess: () => {
      // Invalidate executions so the new one appears in history
      queryClient.invalidateQueries({ queryKey: ['report-executions'] });
    },
  });
}
