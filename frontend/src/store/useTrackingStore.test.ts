import { describe, it, expect, beforeEach } from 'vitest';
import { useTrackingStore } from './useTrackingStore';
import type { LocationUpdatePayload } from '../types/tracking.types';

describe('useTrackingStore', () => {
  beforeEach(() => {
    useTrackingStore.setState({ activeChildId: null, activeTripId: null, trips: {} });
  });

  it('should initialize a trip', () => {
    const store = useTrackingStore.getState();
    store.initTrip('trip-1');
    
    const state = useTrackingStore.getState();
    expect(state.trips['trip-1']).toBeDefined();
    expect(state.trips['trip-1'].isLive).toBe(true);
    expect(state.trips['trip-1'].lastSequenceNumber).toBe(-1);
  });

  it('should update location and respect sequence ordering', () => {
    const store = useTrackingStore.getState();
    store.initTrip('trip-1');

    const payload1: LocationUpdatePayload = {
      tripId: 'trip-1',
      lat: 10, lng: 10,
      speed: null, heading: null,
      timestamp: Date.now(),
      sequenceNumber: 1
    };

    useTrackingStore.getState().updateLocation(payload1);
    expect(useTrackingStore.getState().trips['trip-1'].lastSequenceNumber).toBe(1);

    const payloadOld: LocationUpdatePayload = {
      ...payload1,
      sequenceNumber: 0 // Older packet
    };

    useTrackingStore.getState().updateLocation(payloadOld);
    // Should still be 1 (replay protection)
    expect(useTrackingStore.getState().trips['trip-1'].lastSequenceNumber).toBe(1);
  });
});
