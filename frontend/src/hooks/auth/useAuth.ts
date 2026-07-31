import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authService } from '@/services/auth.service';
import type { LoginRequest } from '@/types/auth.dto';
import { useAuthStore } from '@/store/useAuthStore';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

export const authKeys = {
  all: ['auth'] as const,
  currentUser: () => [...authKeys.all, 'currentUser'] as const,
};

export function useLogin() {
  const setTokens = useAuthStore(state => state.setTokens);
  const setUser = useAuthStore(state => state.setUser);
  const { toast } = useToast();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (credentials: LoginRequest) => authService.login(credentials),
    onSuccess: (data) => { void data;
      setTokens(data.token, data.token); // Assuming token acts as both for now, or interceptor handles refresh
      setUser(data.user);
      toast({ title: 'Welcome back', description: 'You have successfully logged in.' });
      
      if (data.user.role === 'SUPER_ADMIN' || data.user.role === 'ORG_ADMIN') {
        navigate('/admin');
      } else if (data.user.role === 'DRIVER') {
        navigate('/driver');
      } else if (data.user.role === 'PARENT') {
        navigate('/parent');
      }
    },
    onError: (error: unknown) => { void error;
      toast({
        variant: 'destructive',
        title: 'Login failed',
        description: (error as { response?: { data?: { message?: string } } }).response?.data?.message || 'Invalid credentials.',
      });
    },
  });
}

export function useLogout() {
  const clearAuth = useAuthStore(state => state.clearAuth);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { toast } = useToast();

  return useMutation({
    mutationFn: () => authService.logout(),
    onSuccess: (data) => { void data;
      clearAuth();
      queryClient.clear();
      navigate('/login');
      toast({ title: 'Logged out', description: 'You have been safely logged out.' });
    },
    onError: () => { 
      // Even if API fails, clear local state
      clearAuth();
      queryClient.clear();
      navigate('/login');
    }
  });
}

export function useCurrentUser() {
  const token = localStorage.getItem('accessToken');
  const setUser = useAuthStore(state => state.setUser);
  
  return useQuery({
    queryKey: authKeys.currentUser(),
    queryFn: async () => {
      const user = await authService.getCurrentUser();
      // Keep zustand in sync
      if (token) {
         setUser(user);
      }
      return user;
    },
    enabled: !!token,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
