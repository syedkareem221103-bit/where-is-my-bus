import { apiClient } from './apiClient';
import type { PaginatedResponse } from '@/types/api';
import type { EmergencyResponse, TriggerEmergencyRequest, UpdateEmergencyStatusRequest } from '@/types/emergency.dto';

export const emergencyService = {
  list: async (page = 1, limit = 10, status?: string): Promise<PaginatedResponse<EmergencyResponse>> => {
    const { data } = await apiClient.get<{ data: PaginatedResponse<EmergencyResponse> }>('/api/v1/emergencies', {
      params: { page, limit, status }
    });
    return data.data;
  },

  getById: async (id: string): Promise<EmergencyResponse> => {
    const { data } = await apiClient.get<{ data: EmergencyResponse }>(`/api/v1/emergencies/${id}`);
    return data.data;
  },

  trigger: async (payload: TriggerEmergencyRequest): Promise<EmergencyResponse> => {
    const { data } = await apiClient.post<{ data: EmergencyResponse }>('/api/v1/emergencies', payload);
    return data.data;
  },

  updateStatus: async (id: string, payload: UpdateEmergencyStatusRequest): Promise<EmergencyResponse> => {
    const { data } = await apiClient.put<{ data: EmergencyResponse }>(`/api/v1/emergencies/${id}/status`, payload);
    return data.data;
  }
};
