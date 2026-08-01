import { describe, it, expect, beforeEach } from 'vitest';
import { useFleetStore } from './useFleetStore';

describe('useFleetStore', () => {
  beforeEach(() => {
    useFleetStore.setState({
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
      alerts: []
    });
  });

  it('should apply delta update correctly', () => {
    const store = useFleetStore.getState();
    store.applyDelta(1, [{
      vehicleId: 'v1',
      driverId: 'd1',
      tripId: null,
      location: { lat: 10, lng: 20 },
      heading: 0,
      speed: 50,
      status: 'ON_TIME',
      lastHeartbeat: new Date().toISOString()
    }], []);

    const newState = useFleetStore.getState();
    expect(newState.version).toBe(1);
    expect(newState.vehicles['v1']).toBeDefined();
    expect(newState.vehicles['v1'].speed).toBe(50);
  });

  it('should ignore older delta versions', () => {
    useFleetStore.setState({ version: 5 });
    const store = useFleetStore.getState();
    store.applyDelta(4, [{
      vehicleId: 'v1',
      driverId: 'd1',
      tripId: null,
      location: { lat: 10, lng: 20 },
      heading: 0,
      speed: 100,
      status: 'ON_TIME',
      lastHeartbeat: new Date().toISOString()
    }], []);

    const newState = useFleetStore.getState();
    expect(newState.version).toBe(5);
    expect(newState.vehicles['v1']).toBeUndefined();
  });
});
