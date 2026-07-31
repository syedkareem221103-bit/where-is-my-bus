import type { UserResponse } from './user.dto';
import type { TripResponse, TripPingResponse } from './trip.dto';

export type EmergencyStatus = 'ACTIVE' | 'ACKNOWLEDGED' | 'RESPONDING' | 'RESOLVED' | 'CANCELLED';
export type EmergencyCategory = 'SOS' | 'MEDICAL' | 'FIRE' | 'ACCIDENT' | 'BREAKDOWN' | 'SECURITY' | 'OTHER';
export type EmergencySeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface EmergencyResponse {
  id: string;
  organizationId: string;
  tripId: string;
  reporterId: string;
  tripPingId: string | null;
  status: EmergencyStatus;
  category: EmergencyCategory;
  description: string | null;
  priority: string;
  severity: EmergencySeverity;
  createdAt: string;
  updatedAt: string;
  trip?: TripResponse;
  reporter?: UserResponse;
  tripPing?: TripPingResponse;
}

export interface TriggerEmergencyRequest {
  tripId: string;
  category: EmergencyCategory;
  severity: EmergencySeverity;
  description?: string;
  tripPingId?: string;
}

export interface UpdateEmergencyStatusRequest {
  status: EmergencyStatus;
  resolutionNotes?: string;
}
