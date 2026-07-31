import { apiClient } from './apiClient';
import type { PaginatedResponse } from '@/types/api';
import type { UserResponse, CreateUserRequest, UpdateUserRequest, UserRole } from '@/types/user.dto';

export const userService = {
  list: async (role?: UserRole, page = 1, limit = 10): Promise<PaginatedResponse<UserResponse>> => {
    const { data } = await apiClient.get<{ data: PaginatedResponse<UserResponse> }>('/api/v1/users', {
      params: { role, page, limit }
    });
    return data.data;
  },

  getById: async (id: string): Promise<UserResponse> => {
    const { data } = await apiClient.get<{ data: UserResponse }>(`/api/v1/users/${id}`);
    return data.data;
  },

  create: async (payload: CreateUserRequest): Promise<UserResponse> => {
    const { data } = await apiClient.post<{ data: UserResponse }>('/api/v1/users', payload);
    return data.data;
  },

  update: async (id: string, payload: UpdateUserRequest): Promise<UserResponse> => {
    const { data } = await apiClient.put<{ data: UserResponse }>(`/api/v1/users/${id}`, payload);
    return data.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/v1/users/${id}`);
  }
};
