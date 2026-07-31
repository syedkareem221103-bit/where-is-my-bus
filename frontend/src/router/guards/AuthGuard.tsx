import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/useAuthStore';

export function AuthGuard() {
  const { isAuthenticated, isHydrating, user } = useAuthStore();
  const location = useLocation();

  if (isHydrating) {
    return null; // Handled by AuthProvider
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return <Outlet />;
}

