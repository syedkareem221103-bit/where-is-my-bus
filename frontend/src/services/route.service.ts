import { apiClient } from './apiClient';
import type { PaginatedResponse } from '@/types/api';
import type { RouteResponse, CreateRouteRequest, UpdateRouteRequest } from '@/types/route.dto';

export const routeService = {
  list: async (page = 1, limit = 10): Promise<PaginatedResponse<RouteResponse>> => {
    const { data } = await apiClient.get<{ data: PaginatedResponse<RouteResponse> }>('/api/v1/routes', {
      params: { page, limit }
    });
    return data.data;
  },

  getById: async (id: string): Promise<RouteResponse> => {
    const { data } = await apiClient.get<{ data: RouteResponse }>(`/api/v1/routes/${id}`);
    return data.data;
  },

  create: async (payload: CreateRouteRequest): Promise<RouteResponse> => {
    const { data } = await apiClient.post<{ data: RouteResponse }>('/api/v1/routes', payload);
    return data.data;
  },

  update: async (id: string, payload: UpdateRouteRequest): Promise<RouteResponse> => {
    const { data } = await apiClient.put<{ data: RouteResponse }>(`/api/v1/routes/${id}`, payload);
    return data.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/v1/routes/${id}`);
  }
};
