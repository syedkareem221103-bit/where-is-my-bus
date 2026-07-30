import { createContext, useContext, useEffect, useState } from "react";

interface AuthContextType {
  isHydrated: boolean;
}

const AuthContext = createContext<AuthContextType>({ isHydrated: false });

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    // Basic session hydration logic placeholder
    const token = localStorage.getItem('accessToken');
    if (token) {
      // Decode or validate token here in future
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsHydrated(true);
    } else {
      setIsHydrated(true);
    }
  }, []);

  if (!isHydrated) {
    return <div>Loading session...</div>;
  }

  return (
    <AuthContext.Provider value={{ isHydrated }}>
      {children}
    </AuthContext.Provider>
  );
}
