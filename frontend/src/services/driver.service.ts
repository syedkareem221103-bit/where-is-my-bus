import { apiClient } from './apiClient';
import type { PaginatedResponse } from '@/types/api';
import type { DriverResponse, CreateDriverRequest, UpdateDriverRequest } from '@/types/driver.dto';

export const driverService = {
  list: async (page = 1, limit = 10): Promise<PaginatedResponse<DriverResponse>> => {
    const { data } = await apiClient.get<{ data: PaginatedResponse<DriverResponse> }>('/api/v1/drivers', {
      params: { page, limit }
    });
    return data.data;
  },

  getById: async (id: string): Promise<DriverResponse> => {
    const { data } = await apiClient.get<{ data: DriverResponse }>(`/api/v1/drivers/${id}`);
    return data.data;
  },

  create: async (payload: CreateDriverRequest): Promise<DriverResponse> => {
    const { data } = await apiClient.post<{ data: DriverResponse }>('/api/v1/drivers', payload);
    return data.data;
  },

  update: async (id: string, payload: UpdateDriverRequest): Promise<DriverResponse> => {
    const { data } = await apiClient.put<{ data: DriverResponse }>(`/api/v1/drivers/${id}`, payload);
    return data.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/v1/drivers/${id}`);
  }
};
