import { useQuery } from '@tanstack/react-query';
import { adminService } from '@/services/admin.service';

export const adminKeys = {
  all: ['admin'] as const,
  dashboardStats: () => [...adminKeys.all, 'stats'] as const,
};

export function useDashboardStats() {
  return useQuery({
    queryKey: adminKeys.dashboardStats(),
    queryFn: () => adminService.getDashboardStats(),
    staleTime: 60 * 1000, // 1 minute
    refetchOnWindowFocus: true,
  });
}
