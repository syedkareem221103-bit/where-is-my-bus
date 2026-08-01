import { FleetService } from '../fleet.service';
import { FleetStatus } from '../fleet.types';

describe('FleetService', () => {
  it('should create and update a snapshot', () => {
    const service = FleetService.getInstance();
    const orgId = 'org-1';
    
    service.updateVehicleState(orgId, 'veh-1', {
      speed: 60,
      status: FleetStatus.ON_TIME,
      location: { lat: 0, lng: 0 }
    });

    const snapshot = service.getSnapshot(orgId);
    expect(snapshot.vehicles['veh-1']).toBeDefined();
    expect(snapshot.vehicles['veh-1'].speed).toBe(60);
  });

  it('should generate delta properly', () => {
    const service = FleetService.getInstance();
    const orgId = 'org-2';
    
    const delta = service.updateVehicleState(orgId, 'veh-2', {
      speed: 40
    });

    expect(delta.vehicles.length).toBe(1);
    expect(delta.vehicles[0].vehicleId).toBe('veh-2');
    expect(delta.vehicles[0].speed).toBe(40);
  });
});
