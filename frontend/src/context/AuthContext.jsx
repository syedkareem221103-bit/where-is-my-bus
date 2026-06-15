import React, { createContext, useState, useEffect, useContext } from 'react';

const AuthContext = createContext(null);

const API_URL = import.meta.env.VITE_API_URL || 
  (window.location.hostname === 'localhost' ? '' : 'https://where-is-my-bus-backend-olxt.onrender.com');

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('wimb_token'));
  const [loading, setLoading] = useState(true);

  // Sync token changes and fetch user details
  useEffect(() => {
    const loadProfile = async () => {
      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`${API_URL}/api/auth/profile`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (res.ok) {
          const profileData = await res.json();
          setUser(profileData);
        } else {
          // Token expired or invalid
          logout();
        }
      } catch (err) {
        console.error('Error fetching user profile:', err);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [token]);

  // Login handler
  const login = async (email, password) => {
    const res = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Login failed');
    }

    localStorage.setItem('wimb_token', data.token);
    setToken(data.token);
    setUser(data.user);
    return data.user;
  };

  // Register handler
  const registerInstitution = async (regData) => {
    const res = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(regData),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Registration failed');
    }

    return data;
  };

  // Logout handler
  const logout = () => {
    localStorage.removeItem('wimb_token');
    setToken(null);
    setUser(null);
  };

  // Helper fetch with authentication header
  const authFetch = async (url, options = {}) => {
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    };

    const res = await fetch(url.startsWith('http') ? url : `${API_URL}${url}`, {
      ...options,
      headers,
    });

    if (res.status === 401) {
      logout();
    }
    return res;
  };

  const value = {
    user,
    token,
    loading,
    login,
    registerInstitution,
    logout,
    authFetch,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
