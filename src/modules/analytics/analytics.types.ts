import { z } from 'zod';

export const AnalyticsFilterSchema = z.object({
  organizationId: z.string().uuid(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  routeIds: z.array(z.string().uuid()).optional(),
  driverIds: z.array(z.string().uuid()).optional()
});

export type AnalyticsFilter = z.infer<typeof AnalyticsFilterSchema>;

export interface LiveKPIs {
  fleetUtilizationPercent: number;
  averageDelayMinutes: number;
  tripsToday: number;
  completedTrips: number;
  cancelledTrips: number;
  averageEtaAccuracyPercent: number;
  attendanceRatePercent: number;
  averageRouteCompletionTimeMinutes: number;
  driversOnline: number;
  vehiclesActive: number;
  parentsConnected: number;
  studentsTransported: number;
  averageSpeedKmH: number;
  distanceTravelledKm: number;
  activeEmergencyCount: number;
  fuelPlaceholder: number;
  maintenancePlaceholder: number;
}

export interface HistoricalKPIs {
  averageIdleTimeMinutes: number;
  routePunctualityPercent: number;
  driverSafetyScore: number;
  attendanceVsCapacityPercent: number;
  fleetHealthScore: number;
  dailyTripsCompleted: Array<{ date: string; count: number }>;
  dailyTripsCancelled: Array<{ date: string; count: number }>;
}

export interface AnalyticsSnapshot {
  organizationId: string;
  live: LiveKPIs;
  timestamp: string;
}

export const GetDriverPerformanceSchema = z.object({
  timeRange: z.enum(['7d', '30d', '90d', '1y', 'all']),
  driverId: z.string().uuid().optional(),
  sortBy: z.enum(['score', 'trips', 'punctuality', 'safety']).default('score'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type GetDriverPerformanceQuery = z.infer<typeof GetDriverPerformanceSchema>;

export interface DriverKPIs {
  driverId: string;
  driverName: string;
  driverScore: number;
  onTimeArrivalPct: number;
  tripCompletionRate: number;
  averageDelayMins: number;
  averageEtaAccuracyMins: number;
  attendanceCompliancePct: number;
  totalTrips: number;
  completedTrips: number;
  cancelledTrips: number;
  emergencyIncidents: number;
  safetyEvents: number;
  averageTripDurationMins: number;
  distanceDrivenKm: number;
  idleTimeMins: number;
  routeCompliancePct: number;
  passengerAttendanceAccuracyPct: number;
}

export const RouteAnalyticsFilterSchema = z.object({
  timeRange: z.enum(['7d', '30d', '90d', '1y', 'all']),
  routeIds: z.array(z.string().uuid()).optional(),
  sortBy: z.enum(['efficiency', 'delay', 'distance']).default('efficiency'),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
});

export type RouteAnalyticsFilterQuery = z.infer<typeof RouteAnalyticsFilterSchema>;

export interface RouteKPIs {
  routeId: string;
  routeName: string;
  efficiencyScore: number;
  plannedDistanceKm: number;
  actualDistanceKm: number;
  distanceDeviationPct: number;
  plannedDurationMins: number;
  actualDurationMins: number;
  timeDeviationMins: number;
  averageStopDelayMins: number;
  routeCompletionRate: number;
  stopCompliancePct: number;
  missedStops: number;
  averageVehicleSpeed: number;
  idleTimeMins: number;
}
