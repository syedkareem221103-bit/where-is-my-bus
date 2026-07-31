import { create } from 'zustand';

export type UserRole =
  | 'SUPER_ADMIN'
  | 'ORG_ADMIN'
  | 'OPERATOR'
  | 'DRIVER'
  | 'PARENT'
  | 'STUDENT';

export interface User {
  id: string;
  organizationId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  status: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isHydrating: boolean;
  setTokens: (accessToken: string, refreshToken: string) => void;
  setUser: (user: User) => void;
  clearAuth: () => void;
  setHydrating: (hydrating: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isHydrating: true, // Start in hydrating state
  setTokens: (accessToken, refreshToken) => {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
  },
  setUser: (user) => set({ user, isAuthenticated: true, isHydrating: false }),
  clearAuth: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    set({ user: null, isAuthenticated: false, isHydrating: false });
  },
  setHydrating: (isHydrating) => set({ isHydrating }),
}));
