import { FleetSnapshot, VehicleState, DeltaUpdate, FleetSummary } from './fleet.types';
import logger from '../../utils/logger';

export class FleetService {
  private static instance: FleetService;
  
  // organizationId -> FleetSnapshot
  private snapshots: Map<string, FleetSnapshot> = new Map();

  private constructor() {}

  public static getInstance(): FleetService {
    if (!FleetService.instance) {
      FleetService.instance = new FleetService();
    }
    return FleetService.instance;
  }

  private initSnapshot(organizationId: string) {
    if (!this.snapshots.has(organizationId)) {
      this.snapshots.set(organizationId, {
        version: Date.now(),
        vehicles: {},
        summary: {
          totalVehicles: 0,
          activeVehicles: 0,
          runningTrips: 0,
          delayedTrips: 0,
          emergencies: 0,
          driversOnline: 0,
        }
      });
    }
  }

  public getSnapshot(organizationId: string): FleetSnapshot {
    this.initSnapshot(organizationId);
    return this.snapshots.get(organizationId)!;
  }

  public updateVehicleState(organizationId: string, vehicleId: string, partialState: Partial<VehicleState>): DeltaUpdate {
    this.initSnapshot(organizationId);
    const snapshot = this.snapshots.get(organizationId)!;
    
    const existing = snapshot.vehicles[vehicleId] || {};
    const updated: VehicleState = {
      ...(existing as VehicleState),
      ...partialState,
      vehicleId
    } as VehicleState; // Ensure we always have required fields eventually

    snapshot.vehicles[vehicleId] = updated;
    snapshot.version = Date.now();
    
    return {
      version: snapshot.version,
      vehicles: [updated],
      removedVehicles: []
    };
  }

  public removeVehicle(organizationId: string, vehicleId: string): DeltaUpdate {
    this.initSnapshot(organizationId);
    const snapshot = this.snapshots.get(organizationId)!;
    
    delete snapshot.vehicles[vehicleId];
    snapshot.version = Date.now();

    return {
      version: snapshot.version,
      vehicles: [],
      removedVehicles: [vehicleId]
    };
  }

  public updateSummary(organizationId: string, summary: FleetSummary): FleetSnapshot {
    this.initSnapshot(organizationId);
    const snapshot = this.snapshots.get(organizationId)!;
    snapshot.summary = summary;
    snapshot.version = Date.now();
    return snapshot;
  }
}
