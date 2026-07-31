import { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/useAuthStore';
import { authService } from '@/services/auth/auth.service';

export function LogoutPage() {
  const { clearAuth } = useAuthStore();

  useEffect(() => {
    const handleLogout = async () => {
      // Fire and forget backend logout
      authService.logout();
      // Clear local session state immediately
      clearAuth();
    };

    handleLogout();
  }, [clearAuth]);

  return <Navigate to="/login" replace />;
}
