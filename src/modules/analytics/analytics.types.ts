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
