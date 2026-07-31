import type { RouteResponse, ScheduleResponse } from './route.dto';
import type { VehicleResponse } from './vehicle.dto';
import type { UserResponse } from './user.dto';

export type TripStatus = 'SCHEDULED' | 'STARTED' | 'EN_ROUTE' | 'AT_STOP' | 'ATTENDANCE_OPEN' | 'ATTENDANCE_CLOSED' | 'ROUTE_OPTIMIZED' | 'READY' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'EMERGENCY';

export interface TripPingResponse {
  id: string;
  organizationId: string;
  tripId: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  speed: number;
  heading: number | null;
  sequence: number;
  timestamp: string;
}

export interface TripResponse {
  id: string;
  organizationId: string;
  scheduleId: string;
  routeId: string;
  serviceDate: string;
  vehicleId: string;
  driverId: string;
  status: TripStatus;
  createdAt: string;
  updatedAt: string;
  schedule?: ScheduleResponse;
  route?: RouteResponse;
  vehicle?: VehicleResponse;
  driver?: UserResponse;
  pings?: TripPingResponse[];
}

export interface CreateTripRequest {
  scheduleId: string;
  routeId: string;
  serviceDate: string;
  vehicleId: string;
  driverId: string;
}

export interface UpdateTripStatusRequest {
  status: TripStatus;
}
