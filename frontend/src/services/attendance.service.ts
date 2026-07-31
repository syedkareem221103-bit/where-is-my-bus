import { apiClient } from './apiClient';
import type { PaginatedResponse } from '@/types/api';
import type { DailyAttendanceResponse, LogAttendanceRequest, BulkLogAttendanceRequest } from '@/types/attendance.dto';

export const attendanceService = {
  listByTrip: async (tripId: string): Promise<DailyAttendanceResponse[]> => {
    const { data } = await apiClient.get<{ data: DailyAttendanceResponse[] }>(`/api/v1/trips/${tripId}/attendance`);
    return data.data;
  },

  listByStudent: async (studentId: string, page = 1, limit = 10): Promise<PaginatedResponse<DailyAttendanceResponse>> => {
    const { data } = await apiClient.get<{ data: PaginatedResponse<DailyAttendanceResponse> }>(`/api/v1/students/${studentId}/attendance`, {
      params: { page, limit }
    });
    return data.data;
  },

  logAttendance: async (payload: LogAttendanceRequest): Promise<DailyAttendanceResponse> => {
    const { data } = await apiClient.post<{ data: DailyAttendanceResponse }>('/api/v1/attendance/log', payload);
    return data.data;
  },

  bulkLogAttendance: async (payload: BulkLogAttendanceRequest): Promise<{ success: boolean; updatedCount: number }> => {
    const { data } = await apiClient.post<{ data: { success: boolean; updatedCount: number } }>('/api/v1/attendance/bulk-log', payload);
    return data.data;
  }
};
