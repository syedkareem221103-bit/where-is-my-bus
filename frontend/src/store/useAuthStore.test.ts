import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore } from './useAuthStore';
import type { User, UserRole } from './useAuthStore';

describe('useAuthStore', () => {
  const mockUser: User = {
    id: '123',
    organizationId: 'org1',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    role: 'DRIVER' as UserRole,
    status: 'ACTIVE',
  };

  beforeEach(() => {
    // Reset store state and local storage before each test
    useAuthStore.getState().clearAuth();
    localStorage.clear();
  });

  it('should initialize with default state', () => {
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(state.isHydrating).toBe(false); // clearAuth sets this to false
  });

  it('should set tokens correctly to localStorage', () => {
    const { setTokens } = useAuthStore.getState();
    setTokens('access123', 'refresh456');

    expect(localStorage.getItem('accessToken')).toBe('access123');
    expect(localStorage.getItem('refreshToken')).toBe('refresh456');
  });

  it('should update user and authentication state on setUser', () => {
    const { setUser } = useAuthStore.getState();
    setUser(mockUser);

    const state = useAuthStore.getState();
    expect(state.user).toEqual(mockUser);
    expect(state.isAuthenticated).toBe(true);
    expect(state.isHydrating).toBe(false);
  });

  it('should clear tokens and user state on clearAuth', () => {
    const { setTokens, setUser, clearAuth } = useAuthStore.getState();
    
    setTokens('access123', 'refresh456');
    setUser(mockUser);
    
    clearAuth();

    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(localStorage.getItem('accessToken')).toBeNull();
    expect(localStorage.getItem('refreshToken')).toBeNull();
  });
});
