import { create } from 'zustand';
import type { LocationUpdatePayload } from '../types/tracking.types';

export interface TripLiveState {
  tripId: string;
  isLive: boolean;
  isDriverOffline: boolean;
  status: string; // 'scheduled', 'in_progress', 'completed', 'delayed'
  lastKnownLocation: LocationUpdatePayload | null;
  lastSequenceNumber: number;
  lastUpdateTimestamp: number;
  emergency?: { type: string; message: string };
  isDeviated: boolean;
}

interface TrackingState {
  activeChildId: string | null;
  activeTripId: string | null;
  trips: Record<string, TripLiveState>;
  
  setActiveChild: (childId: string | null) => void;
  setActiveTrip: (tripId: string | null) => void;
  
  initTrip: (tripId: string) => void;
  updateLocation: (payload: LocationUpdatePayload) => void;
  updateStatus: (tripId: string, status: string, isDriverOffline?: boolean) => void;
  setEmergency: (tripId: string, type: string, message: string) => void;
  setDeviation: (tripId: string, isDeviated: boolean) => void;
  removeTrip: (tripId: string) => void;
}

export const useTrackingStore = create<TrackingState>((set) => ({
  activeChildId: null,
  activeTripId: null,
  trips: {},
  
  setActiveChild: (childId) => set({ activeChildId: childId }),
  setActiveTrip: (tripId) => set({ activeTripId: tripId }),
  
  initTrip: (tripId) => set((state) => ({
    trips: {
      ...state.trips,
      [tripId]: state.trips[tripId] || {
        tripId,
        isLive: true,
        isDriverOffline: false,
        status: 'in_progress',
        lastKnownLocation: null,
        lastSequenceNumber: -1,
        lastUpdateTimestamp: 0,
        isDeviated: false
      }
    }
  })),
  
  updateLocation: (payload) => set((state) => {
    const trip = state.trips[payload.tripId];
    if (!trip) return state; // Drop if trip not initialized
    
    // Replay protection & Sequence ordering
    if (payload.sequenceNumber <= trip.lastSequenceNumber) {
      return state; 
    }
    
    return {
      trips: {
        ...state.trips,
        [payload.tripId]: {
          ...trip,
          lastKnownLocation: payload,
          lastSequenceNumber: payload.sequenceNumber,
          lastUpdateTimestamp: Date.now(),
          isDriverOffline: false
        }
      }
    };
  }),
  
  updateStatus: (tripId, status, isDriverOffline = false) => set((state) => {
    const trip = state.trips[tripId];
    if (!trip) return state;
    
    return {
      trips: {
        ...state.trips,
        [tripId]: {
          ...trip,
          status,
          isDriverOffline,
          isLive: status !== 'completed'
        }
      }
    };
  }),
  
  setEmergency: (tripId, type, message) => set((state) => {
    const trip = state.trips[tripId];
    if (!trip) return state;
    return {
      trips: {
        ...state.trips,
        [tripId]: {
          ...trip,
          emergency: { type, message }
        }
      }
    };
  }),

  setDeviation: (tripId, isDeviated) => set((state) => {
    const trip = state.trips[tripId];
    if (!trip) return state;
    return {
      trips: {
        ...state.trips,
        [tripId]: {
          ...trip,
          isDeviated
        }
      }
    };
  }),
  
  removeTrip: (tripId) => set((state) => {
    const newTrips = { ...state.trips };
    delete newTrips[tripId];
    return { trips: newTrips };
  })
}));
