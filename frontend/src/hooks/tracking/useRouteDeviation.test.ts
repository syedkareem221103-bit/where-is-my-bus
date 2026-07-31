import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useRouteDeviation } from './useRouteDeviation';
import { useTrackingStore } from '../../store/useTrackingStore';

describe('useRouteDeviation', () => {
  beforeEach(() => {
    useTrackingStore.setState({ activeChildId: null, activeTripId: null, trips: {} });
  });

  it('should detect deviation when location is far from route', () => {
    useTrackingStore.getState().initTrip('trip-1');
    
    // Simple route
    const route = [
      { lat: 0, lng: 0 },
      { lat: 0, lng: 1 }
    ];

    // Location far away (1 degree lat is approx 111km)
    const currentLocation = {
      tripId: 'trip-1', lat: 1, lng: 0, speed: 0, heading: 0, timestamp: Date.now(), sequenceNumber: 1
    };

    renderHook(() => useRouteDeviation('trip-1', currentLocation, route));

    const state = useTrackingStore.getState();
    expect(state.trips['trip-1'].isDeviated).toBe(true);
  });

  it('should not detect deviation when location is on route', () => {
    useTrackingStore.getState().initTrip('trip-1');
    
    // Simple route
    const route = [
      { lat: 0, lng: 0 },
      { lat: 0, lng: 1 }
    ];

    // Location exactly on route
    const currentLocation = {
      tripId: 'trip-1', lat: 0, lng: 0.5, speed: 0, heading: 0, timestamp: Date.now(), sequenceNumber: 1
    };

    renderHook(() => useRouteDeviation('trip-1', currentLocation, route));

    const state = useTrackingStore.getState();
    expect(state.trips['trip-1'].isDeviated).toBe(false);
  });
});
