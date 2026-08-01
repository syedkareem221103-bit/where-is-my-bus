import { create } from 'zustand';

export type FleetStatus = 'ON_TIME' | 'DELAYED' | 'EMERGENCY' | 'IDLE' | 'OFFLINE';

export type VehicleState = {
  vehicleId: string;
  driverId: string;
  tripId: string | null;
  location: { lat: number; lng: number };
  heading: number;
  speed: number;
  status: FleetStatus;
  lastHeartbeat: string;
};

export type FleetSummary = {
  totalVehicles: number;
  activeVehicles: number;
  runningTrips: number;
  delayedTrips: number;
  emergencies: number;
  driversOnline: number;
};

export type FleetAlert = {
  id: string;
  title?: string;
  message?: string;
  timestamp?: string | number;
};

interface FleetState {
  version: number;
  vehicles: Record<string, VehicleState>;
  summary: FleetSummary;
  alerts: FleetAlert[];
  
  // Actions
  setSnapshot: (version: number, vehicles: Record<string, VehicleState>, summary: FleetSummary) => void;
  applyDelta: (version: number, updatedVehicles: VehicleState[], removedVehicles: string[]) => void;
  addAlert: (alert: FleetAlert) => void;
  removeAlert: (alertId: string) => void;
  setSummary: (summary: FleetSummary) => void;
}

export const useFleetStore = create<FleetState>((set) => ({
  version: 0,
  vehicles: {},
  summary: {
    totalVehicles: 0,
    activeVehicles: 0,
    runningTrips: 0,
    delayedTrips: 0,
    emergencies: 0,
    driversOnline: 0,
  },
  alerts: [],
  
  setSnapshot: (version, vehicles, summary) => 
    set({ version, vehicles, summary }),
    
  applyDelta: (version, updatedVehicles, removedVehicles) => 
    set((state) => {
      if (version < state.version) return state; // Ignore old deltas
      
      const newVehicles = { ...state.vehicles };
      
      updatedVehicles.forEach(v => {
        newVehicles[v.vehicleId] = v;
      });
      
      removedVehicles.forEach(id => {
        delete newVehicles[id];
      });
      
      return { version, vehicles: newVehicles };
    }),

  addAlert: (alert) => set((state) => ({ alerts: [alert, ...state.alerts] })),
  
  removeAlert: (alertId) => set((state) => ({
    alerts: state.alerts.filter((a) => a.id !== alertId)
  })),

  setSummary: (summary) => set({ summary })
}));
