import { create } from 'zustand';

export type PermissionStatus = 'prompt' | 'granted' | 'denied' | 'unknown';

interface LocationState {
  isTracking: boolean;
  permissionStatus: PermissionStatus;
  lastKnownLocation: { lat: number; lng: number } | null;
  error: string | null;
  
  setTracking: (isTracking: boolean) => void;
  setPermissionStatus: (status: PermissionStatus) => void;
  setLastKnownLocation: (loc: { lat: number; lng: number }) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

export const useLocationStore = create<LocationState>((set) => ({
  isTracking: false,
  permissionStatus: 'unknown',
  lastKnownLocation: null,
  error: null,
  
  setTracking: (isTracking) => set({ isTracking }),
  setPermissionStatus: (permissionStatus) => set({ permissionStatus }),
  setLastKnownLocation: (loc) => set({ lastKnownLocation: loc }),
  setError: (error) => set({ error }),
  
  reset: () => set({ 
    isTracking: false, 
    lastKnownLocation: null, 
    error: null 
  }),
}));
