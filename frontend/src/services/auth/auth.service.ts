import { apiClient } from '../apiClient';
import type { User } from '@/store/useAuthStore';

interface LoginResponse {
  status: string;
  message: string;
  data: {
    accessToken: string;
    refreshToken: string;
    user: User;
  };
}

interface ProfileResponse {
  status: string;
  data: {
    user: User;
  };
}

export const authService = {
  login: async (email: string, password: string): Promise<LoginResponse> => {
    // Collect deviceType
    const deviceType = navigator.userAgent;
    const response = await apiClient.post<LoginResponse>('/api/v1/auth/login', {
      email,
      password,
      deviceType,
    });
    return response.data;
  },

  logout: async (): Promise<void> => {
    try {
      await apiClient.post('/api/v1/auth/logout');
    } catch (error) {
      console.error('Logout API failed, ignoring locally', error);
    }
  },

  getProfile: async (): Promise<User> => {
    const response = await apiClient.get<ProfileResponse>('/api/v1/users/me');
    return response.data.data.user;
  },
};
