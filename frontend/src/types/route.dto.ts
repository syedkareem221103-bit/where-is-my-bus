export type RouteStatus = 'ACTIVE' | 'INACTIVE';

export interface StopResponse {
  id: string;
  organizationId: string;
  routeId: string;
  name: string;
  latitude: number;
  longitude: number;
  sequenceOrder: number;
}

export interface ScheduleResponse {
  id: string;
  organizationId: string;
  routeId: string;
  name: string;
  cutoffTime: string;
  operatingDays: number[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RouteResponse {
  id: string;
  organizationId: string;
  name: string;
  version: number;
  status: RouteStatus;
  createdAt: string;
  updatedAt: string;
  stops?: StopResponse[];
  schedules?: ScheduleResponse[];
}

export interface CreateRouteRequest {
  name: string;
  stops: Omit<StopResponse, 'id' | 'organizationId' | 'routeId'>[];
  schedules?: Omit<ScheduleResponse, 'id' | 'organizationId' | 'routeId' | 'createdAt' | 'updatedAt'>[];
}

export interface UpdateRouteRequest {
  name?: string;
  status?: RouteStatus;
  stops?: Omit<StopResponse, 'organizationId' | 'routeId'>[];
}
