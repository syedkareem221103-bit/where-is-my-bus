export type UserRole = 'SUPER_ADMIN' | 'ORG_ADMIN' | 'OPERATOR' | 'DRIVER' | 'PARENT' | 'STUDENT';
export type UserStatus = 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED';

export interface UserResponse {
  id: string;
  organizationId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserRequest {
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  password?: string;
}

export interface UpdateUserRequest {
  email?: string;
  firstName?: string;
  lastName?: string;
  role?: UserRole;
  status?: UserStatus;
}
