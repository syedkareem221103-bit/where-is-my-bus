import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import DriverPortal from './pages/DriverPortal';
import ParentPortal from './pages/ParentPortal';

function AppContent() {
  const { user, loading } = useAuth();
  const [activePage, setActivePage] = useState('');

  // Set default starting page based on user role when they log in
  useEffect(() => {
    if (user) {
      if (user.role === 'INST_ADMIN' || user.role === 'SUPER_ADMIN') {
        setActivePage('dashboard');
      } else if (user.role === 'DRIVER') {
        setActivePage('driver');
      } else if (user.role === 'PARENT' || user.role === 'STUDENT') {
        setActivePage('parent');
      }
    }
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#070b13] text-cyan-400">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin"></div>
          <p className="text-xs uppercase tracking-widest font-bold">Verifying Session...</p>
        </div>
      </div>
    );
  }

  // Not logged in -> Show Login Page
  if (!user) {
    return <Login />;
  }

  // Logged in -> Show App Layout + Child Page
  return (
    <Layout activePage={activePage} setActivePage={setActivePage}>
      {activePage === 'dashboard' && <Dashboard />}
      {activePage === 'driver' && <DriverPortal />}
      {activePage === 'parent' && <ParentPortal />}
    </Layout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <AppContent />
      </SocketProvider>
    </AuthProvider>
  );
}
