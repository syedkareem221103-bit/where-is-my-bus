export type VehicleStatus = 'ACTIVE' | 'MAINTENANCE' | 'INACTIVE';

export interface VehicleResponse {
  id: string;
  organizationId: string;
  registrationNo: string;
  capacity: number;
  status: VehicleStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateVehicleRequest {
  registrationNo: string;
  capacity: number;
}

export interface UpdateVehicleRequest {
  registrationNo?: string;
  capacity?: number;
  status?: VehicleStatus;
}
