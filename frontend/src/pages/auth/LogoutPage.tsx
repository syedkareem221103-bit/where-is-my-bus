import { useEffect } from 'react';
import { useLogout } from '@/hooks/auth/useAuth';

export function LogoutPage() {
  const { mutate: logout } = useLogout();

  useEffect(() => {
    logout();
  }, [logout]);

  return null;
}
