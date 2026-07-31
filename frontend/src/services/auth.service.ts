import { apiClient } from './apiClient';
import type { LoginRequest, LoginResponse } from '@/types/auth.dto';
import type { UserResponse } from '@/types/user.dto';

export const authService = {
  login: async (credentials: LoginRequest): Promise<LoginResponse> => {
    const { data } = await apiClient.post<{ data: LoginResponse }>('/api/v1/auth/login', credentials);
    return data.data;
  },

  logout: async (): Promise<void> => {
    await apiClient.post('/api/v1/auth/logout');
  },

  getCurrentUser: async (): Promise<UserResponse> => {
    const { data } = await apiClient.get<{ data: UserResponse }>('/api/v1/auth/me');
    return data.data;
  }
};
