import { apiClient } from './apiClient';
import type { PaginatedResponse } from '@/types/api';
import type { VehicleResponse, CreateVehicleRequest, UpdateVehicleRequest } from '@/types/vehicle.dto';

export const vehicleService = {
  list: async (page = 1, limit = 10): Promise<PaginatedResponse<VehicleResponse>> => {
    const { data } = await apiClient.get<{ data: PaginatedResponse<VehicleResponse> }>('/api/v1/vehicles', {
      params: { page, limit }
    });
    return data.data;
  },

  getById: async (id: string): Promise<VehicleResponse> => {
    const { data } = await apiClient.get<{ data: VehicleResponse }>(`/api/v1/vehicles/${id}`);
    return data.data;
  },

  create: async (payload: CreateVehicleRequest): Promise<VehicleResponse> => {
    const { data } = await apiClient.post<{ data: VehicleResponse }>('/api/v1/vehicles', payload);
    return data.data;
  },

  update: async (id: string, payload: UpdateVehicleRequest): Promise<VehicleResponse> => {
    const { data } = await apiClient.put<{ data: VehicleResponse }>(`/api/v1/vehicles/${id}`, payload);
    return data.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/v1/vehicles/${id}`);
  }
};
