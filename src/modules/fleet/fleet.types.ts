export enum FleetStatus {
  ON_TIME = 'ON_TIME',
  DELAYED = 'DELAYED',
  EMERGENCY = 'EMERGENCY',
  IDLE = 'IDLE',
  OFFLINE = 'OFFLINE'
}

export type FleetSummary = {
  totalVehicles: number;
  activeVehicles: number;
  runningTrips: number;
  delayedTrips: number;
  emergencies: number;
  driversOnline: number;
};

export type VehicleState = {
  vehicleId: string;
  driverId: string;
  tripId: string | null;
  location: { lat: number; lng: number };
  heading: number;
  speed: number;
  status: FleetStatus;
  lastHeartbeat: Date;
};

export type DeltaUpdate = {
  version: number;
  vehicles: Partial<VehicleState>[];
  removedVehicles: string[];
};

export type FleetSnapshot = {
  version: number;
  vehicles: Record<string, VehicleState>;
  summary: FleetSummary;
};
