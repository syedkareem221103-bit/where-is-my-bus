import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/useAuthStore';
import { getDefaultRouteForRole } from '../redirectConfig';

export function GuestGuard() {
  const { isAuthenticated, isHydrating, user } = useAuthStore();
  const location = useLocation();

  if (isHydrating) {
    return null; // Handled by AuthProvider
  }

  if (isAuthenticated && user) {
    // If user has an intended destination from state, send them there, else default route
    const from = (location.state as { from?: string })?.from || getDefaultRouteForRole(user.role);
    return <Navigate to={from} replace />;
  }

  return <Outlet />;
}
