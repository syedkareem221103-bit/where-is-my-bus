import type { UserRole } from '@/store/useAuthStore';

export const ROLE_REDIRECT_MAP: Record<UserRole, string> = {
  SUPER_ADMIN: '/admin',
  ORG_ADMIN: '/admin',
  OPERATOR: '/admin', // Maybe /operator in future, but /admin covers staff right now
  DRIVER: '/driver',
  PARENT: '/parent',
  STUDENT: '/student',
};

export const getDefaultRouteForRole = (role?: UserRole): string => {
  if (!role) return '/login';
  return ROLE_REDIRECT_MAP[role] || '/login';
};
