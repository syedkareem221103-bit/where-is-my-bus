import { apiClient } from './apiClient';
import type { PaginatedResponse } from '@/types/api';
import type { OrganizationResponse, CreateOrganizationRequest, UpdateOrganizationRequest } from '@/types/organization.dto';

export const organizationService = {
  list: async (page = 1, limit = 10): Promise<PaginatedResponse<OrganizationResponse>> => {
    const { data } = await apiClient.get<{ data: PaginatedResponse<OrganizationResponse> }>('/api/v1/organizations', {
      params: { page, limit }
    });
    return data.data;
  },

  getById: async (id: string): Promise<OrganizationResponse> => {
    const { data } = await apiClient.get<{ data: OrganizationResponse }>(`/api/v1/organizations/${id}`);
    return data.data;
  },

  create: async (payload: CreateOrganizationRequest): Promise<OrganizationResponse> => {
    const { data } = await apiClient.post<{ data: OrganizationResponse }>('/api/v1/organizations', payload);
    return data.data;
  },

  update: async (id: string, payload: UpdateOrganizationRequest): Promise<OrganizationResponse> => {
    const { data } = await apiClient.put<{ data: OrganizationResponse }>(`/api/v1/organizations/${id}`, payload);
    return data.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/v1/organizations/${id}`);
  }
};
