import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../services/apiClient';
import type { ReportExecution } from '../../types/report';

export function useReportExecutions() {
  return useQuery<ReportExecution[]>({
    queryKey: ['report-executions'],
    queryFn: async () => {
      const response = await apiClient.get('/v1/reports/executions');
      return response.data;
    },
    // Poll for updates to catch 'RUNNING' -> 'SUCCESS'
    refetchInterval: (query) => {
      const hasRunning = query.state.data?.some(e => e.status === 'RUNNING');
      return hasRunning ? 5000 : false;
    }
  });
}
