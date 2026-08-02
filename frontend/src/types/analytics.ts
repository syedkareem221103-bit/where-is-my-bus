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

export interface AnalyticsFilter {
  startDate: string;
  endDate: string;
  routeIds?: string[];
  driverIds?: string[];
}
