import { useEffect, useCallback, useRef } from 'react';
import { gpsManager } from '../../services/location/gpsManager';
import { useSocket } from '../realtime/useSocket';
import { useLocationStore } from '../../store/useLocationStore';

export function useLocationBroadcast() {
  const { emit } = useSocket();
  const sequenceNumberRef = useRef(0);
  const setLastKnownLocation = useLocationStore((state) => state.setLastKnownLocation);
  const setError = useLocationStore((state) => state.setError);
  const isTracking = useLocationStore((state) => state.isTracking);
  const setTracking = useLocationStore((state) => state.setTracking);

  const startTracking = useCallback((tripId: string, vehicleId: string) => {
    sequenceNumberRef.current = 0;
    
    gpsManager.startTracking(
      (location) => {
        sequenceNumberRef.current += 1;
        
        // 1. Update UI state
        setLastKnownLocation({ lat: location.lat, lng: location.lng });
        setError(null);
        // 2. Initial Trip Start Emit (if first fix)
        if (sequenceNumberRef.current === 1) {
          emit('client:driver:trip:start', {
            tripId,
            vehicleId,
            initialLocation: { lat: location.lat, lng: location.lng }
          });
        }
        
        // 3. Broadcast via Socket
        emit('client:driver:location:update', {
          ...location,
          sequenceNumber: sequenceNumberRef.current
        });
      },
      (error) => {
        setError(error.message);
        emit('client:driver:location:error', {
          code: error.code,
          message: error.message
        });
      }
    );
    
    setTracking(true);
  }, [emit, setLastKnownLocation, setError, setTracking]);

  const stopTracking = useCallback((reason: 'trip_ended' | 'user_paused' | 'error' = 'user_paused') => {
    gpsManager.stopTracking();
    emit('client:driver:location:stop', { reason });
    setTracking(false);
  }, [emit, setTracking]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      gpsManager.stopTracking();
    };
  }, []);

  return { startTracking, stopTracking, isTracking };
}
