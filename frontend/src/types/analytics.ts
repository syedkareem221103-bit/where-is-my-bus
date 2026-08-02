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

export interface TripPingReplay {
  lat: number;
  lng: number;
  speed: number;
  timestamp: string;
}

export interface TripReplay {
  tripId: string;
  routeId: string;
  routeName: string;
  vehicleNumber: string;
  driverName: string;
  startTime: string;
  endTime: string;
  pings: TripPingReplay[];
}
