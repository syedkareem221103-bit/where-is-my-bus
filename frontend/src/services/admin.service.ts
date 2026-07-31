import { apiClient } from './apiClient';

export interface DashboardStats {
  totalStudents: number;
  totalDrivers: number;
  totalVehicles: number;
  totalRoutes: number;
  activeTrips: number;
  systemAlerts: number;
}

export const adminService = {
  getDashboardStats: async (): Promise<DashboardStats> => {
    // Assuming backend returns this structure
    const { data } = await apiClient.get<{ data: DashboardStats }>('/api/v1/admin/dashboard-stats');
    return data.data;
  },
};
