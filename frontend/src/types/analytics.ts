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
