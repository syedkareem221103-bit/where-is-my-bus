import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { user, token } = useAuth();
  const [socket, setSocket] = useState(null);
  const [online, setOnline] = useState(false);

  const activeTripIdRef = useRef(null);
  const isAdminTrackingRef = useRef(false);

  useEffect(() => {
    if (!token || !user) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      return;
    }

    // Connect to WebSocket server directly
    const socketUrl = import.meta.env.VITE_BACKEND_URL || (window.location.hostname === 'localhost' ? 'http://localhost:5001' : 'https://where-is-my-bus-production.up.railway.app');
    
    const socketInstance = io(socketUrl, {
      auth: { token },
      transports: ['websocket'],
    });

    socketInstance.on('connect', () => {
      console.log('Connected to socket server');
      setOnline(true);
      
      // Auto-rejoin rooms if they were active before disconnection
      if (activeTripIdRef.current) {
        console.log(`Auto-rejoining trip room: ${activeTripIdRef.current}`);
        socketInstance.emit('join-trip', { tripId: activeTripIdRef.current });
      }
      if (isAdminTrackingRef.current) {
        console.log('Auto-rejoining admin tracker room');
        socketInstance.emit('join-admin-tracker');
      }
    });

    socketInstance.on('disconnect', () => {
      console.log('Disconnected from socket server');
      setOnline(false);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [token, user]);

  const joinTrip = (tripId) => {
    activeTripIdRef.current = tripId;
    if (socket) {
      socket.emit('join-trip', { tripId });
    }
  };

  const leaveTrip = (tripId) => {
    if (activeTripIdRef.current === tripId) {
      activeTripIdRef.current = null;
    }
    if (socket) {
      socket.emit('leave-trip', { tripId });
    }
  };

  const emitGpsUpdate = (data) => {
    if (socket) {
      socket.emit('gps-update', data);
    }
  };

  const joinAdminTracker = () => {
    isAdminTrackingRef.current = true;
    if (socket) {
      socket.emit('join-admin-tracker');
    }
  };

  const leaveAdminTracker = () => {
    isAdminTrackingRef.current = false;
    if (socket) {
      socket.emit('leave-admin-tracker');
    }
  };

  const value = {
    socket,
    online,
    joinTrip,
    leaveTrip,
    emitGpsUpdate,
    joinAdminTracker,
    leaveAdminTracker,
  };

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};
