import type { UserResponse } from './user.dto';

export interface LoginRequest {
  email: string;
  password?: string;
}

export interface LoginResponse {
  token: string;
  user: UserResponse;
}

export interface RefreshResponse {
  token: string;
}
