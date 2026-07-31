import { createContext, useContext, useEffect } from "react";
import { useAuthStore } from '@/store/useAuthStore';
import { authService } from '@/services/auth.service';

interface AuthContextType {
  isHydrating: boolean;
}

const AuthContext = createContext<AuthContextType>({ isHydrating: true });

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setHydrating, setUser, clearAuth, isHydrating } = useAuthStore();

  useEffect(() => {
    const hydrateSession = async () => {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        setHydrating(false);
        return;
      }

      try {
        const user = await authService.getCurrentUser();
        setUser(user);
      } catch (error) {
        console.error('Session hydration failed:', error);
        clearAuth();
      } finally {
        setHydrating(false);
      }
    };

    hydrateSession();
  }, [setHydrating, setUser, clearAuth]);

  if (isHydrating) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="text-muted-foreground text-sm font-medium">Verifying Session...</p>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ isHydrating }}>
      {children}
    </AuthContext.Provider>
  );
}
