import { useEffect, useRef } from 'react';
import { useSocket } from '../realtime/useSocket';
import { useTrackingStore } from '../../store/useTrackingStore';
import { useSocketEvent } from '../realtime/useSocketEvent';
import { 
  LocationUpdatePayloadSchema, 
  TripStatusPayloadSchema,
  TripCompletedPayloadSchema,
  DriverOfflinePayloadSchema,
  EmergencyPayloadSchema
} from '../../types/tracking.types';
import { useQueryClient } from '@tanstack/react-query';

export function useTripSubscription(tripId: string) {
  const { emit } = useSocket();
  const initTrip = useTrackingStore((state) => state.initTrip);
  const removeTrip = useTrackingStore((state) => state.removeTrip);
  const updateLocation = useTrackingStore((state) => state.updateLocation);
  const updateStatus = useTrackingStore((state) => state.updateStatus);
  const setEmergency = useTrackingStore((state) => state.setEmergency);
  const queryClient = useQueryClient();
  
  const hasJoined = useRef(false);

  useEffect(() => {
    if (!tripId) return;

    // 1. Initialize store for this trip
    initTrip(tripId);

    // 2. Join Socket Room
    if (!hasJoined.current) {
      emit('client:trip:join', { tripId });
      hasJoined.current = true;
    }

    // 3. Cleanup on unmount
    return () => {
      emit('client:trip:leave', { tripId });
      removeTrip(tripId);
      hasJoined.current = false;
    };
  }, [tripId, emit, initTrip, removeTrip]);

  // Handle Location Updates
  useSocketEvent('server:trip:location:updated', (payload) => {
    try {
      const parsed = LocationUpdatePayloadSchema.parse(payload);
      if (parsed.tripId === tripId) {
        updateLocation(parsed);
      }
    } catch (e) {
      console.warn('Invalid location payload', e);
    }
  });

  // Handle Trip Status Updates
  useSocketEvent('server:trip:status', (payload) => {
    try {
      const parsed = TripStatusPayloadSchema.parse(payload);
      if (parsed.tripId === tripId) {
        updateStatus(tripId, parsed.status);
        // Invalidate React Query to fetch latest server state
        queryClient.invalidateQueries({ queryKey: ['trip', tripId] });
      }
    } catch (e) {
      console.warn('Invalid status payload', e);
    }
  });

  // Handle Trip Completed
  useSocketEvent('server:trip:completed', (payload) => {
    try {
      const parsed = TripCompletedPayloadSchema.parse(payload);
      if (parsed.tripId === tripId) {
        updateStatus(tripId, 'completed');
        queryClient.invalidateQueries({ queryKey: ['trip', tripId] });
      }
    } catch (e) {
      console.warn('Invalid completion payload', e);
    }
  });

  // Handle Driver Offline
  useSocketEvent('server:driver:offline', (payload) => {
    try {
      const parsed = DriverOfflinePayloadSchema.parse(payload);
      if (parsed.tripId === tripId) {
        updateStatus(tripId, 'in_progress', true);
      }
    } catch (e) {
      console.warn('Invalid driver offline payload', e);
    }
  });

  // Handle Emergency
  useSocketEvent('server:emergency', (payload) => {
    try {
      const parsed = EmergencyPayloadSchema.parse(payload);
      if (parsed.tripId === tripId) {
        setEmergency(tripId, parsed.type, parsed.message);
      }
    } catch (e) {
      console.warn('Invalid emergency payload', e);
    }
  });
}
