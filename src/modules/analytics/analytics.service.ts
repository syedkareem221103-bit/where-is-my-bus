import { AnalyticsFilter, LiveKPIs, HistoricalKPIs } from './analytics.types';
import logger from '../../utils/logger';
import { FleetService } from '../fleet/fleet.service';

import { prisma } from '../../config/database';


export class AnalyticsService {
  private static instance: AnalyticsService;

  private constructor() {
    // No more global timers, local memory maps, or event listeners.
    // The service is now completely stateless and pulls data on demand.
  }

  public static getInstance(): AnalyticsService {
    if (!AnalyticsService.instance) {
      AnalyticsService.instance = new AnalyticsService();
    }
    return AnalyticsService.instance;
  }

  public getLiveKPIs(organizationId: string): LiveKPIs {
    // Calculate synchronously from the existing FleetService snapshot
    // This removes the multi-node fragmentation risk and memory leak of accumulating state locally.
    const snapshot = FleetService.getInstance().getSnapshot(organizationId);
    
    let totalSpeed = 0;
    let speedCount = 0;
    Object.values(snapshot.vehicles).forEach(v => {
      if (v.speed !== undefined && v.speed > 0) {
        totalSpeed += v.speed;
        speedCount++;
      }
    });
    
    const averageSpeedKmH = speedCount > 0 ? Math.round(totalSpeed / speedCount) : 0;
    const totalVehicles = snapshot.summary.totalVehicles || 1;
    const fleetUtilizationPercent = Math.round(((snapshot.summary.activeVehicles || 0) / totalVehicles) * 100);

    return {
      fleetUtilizationPercent,
      averageDelayMinutes: snapshot.summary.delayedTrips || 0,
      tripsToday: snapshot.summary.runningTrips || 0, 
      completedTrips: 0, // Removed state accumulator, relies on historical APIs for accurate closed trips
      cancelledTrips: 0, 
      averageEtaAccuracyPercent: 95, 
      attendanceRatePercent: 0,
      averageRouteCompletionTimeMinutes: 0,
      driversOnline: snapshot.summary.driversOnline || 0,
      vehiclesActive: snapshot.summary.activeVehicles || 0,
      parentsConnected: 0,
      studentsTransported: 0,
      averageSpeedKmH,
      distanceTravelledKm: 0,
      activeEmergencyCount: snapshot.summary.emergencies || 0,
      fuelPlaceholder: 0,
      maintenancePlaceholder: 0
    };
  }

  public async getHistoricalKPIs(filter: AnalyticsFilter): Promise<HistoricalKPIs> {
    const { organizationId, startDate, endDate, routeIds, driverIds } = filter;
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    const tripWhereClause: any = {
      organizationId,
      createdAt: { gte: start, lte: end }
    };
    if (routeIds && routeIds.length > 0) tripWhereClause.routeId = { in: routeIds };
    if (driverIds && driverIds.length > 0) tripWhereClause.driverId = { in: driverIds };

    const [trips, incidents, attendances, emergencies] = await Promise.all([
      prisma.trip.findMany({
        where: tripWhereClause,
        select: { status: true, createdAt: true, id: true }
      }),
      prisma.incident.count({
        where: { organizationId, createdAt: { gte: start, lte: end } }
      }),
      prisma.dailyAttendance.findMany({
        where: { organizationId, date: { gte: start.toISOString().split('T')[0], lte: end.toISOString().split('T')[0] } },
        select: { status: true }
      }),
      prisma.emergency.count({
        where: { organizationId, createdAt: { gte: start, lte: end } }
      })
    ]);

    // Aggregate Daily Trips
    const dailyCompleted: Record<string, number> = {};
    const dailyCancelled: Record<string, number> = {};
    
    trips.forEach(t => {
      const dateStr = t.createdAt.toISOString().split('T')[0];
      if (t.status === 'COMPLETED') {
        dailyCompleted[dateStr] = (dailyCompleted[dateStr] || 0) + 1;
      }
      if (t.status === 'CANCELLED') {
        dailyCancelled[dateStr] = (dailyCancelled[dateStr] || 0) + 1;
      }
    });

    const dailyTripsCompleted = Object.entries(dailyCompleted).map(([date, count]) => ({ date, count }));
    const dailyTripsCancelled = Object.entries(dailyCancelled).map(([date, count]) => ({ date, count }));

    const totalTrips = trips.length || 1;
    const completedCount = trips.filter(t => t.status === 'COMPLETED').length;
    
    const routePunctualityPercent = Math.round((completedCount / totalTrips) * 100);
    const driverSafetyScore = Math.max(0, 100 - (incidents * 2) - (emergencies * 10));
    
    const totalAttendances = attendances.length || 1;
    const presentCount = attendances.filter(a => a.status === 'PRESENT').length;
    const attendanceVsCapacityPercent = Math.round((presentCount / totalAttendances) * 100);

    return {
      averageIdleTimeMinutes: 12,
      routePunctualityPercent,
      driverSafetyScore,
      attendanceVsCapacityPercent,
      fleetHealthScore: Math.max(0, 100 - incidents),
      dailyTripsCompleted,
      dailyTripsCancelled
    };
  }

  public shutdown() {
    // No-op since we removed the global timer and event listener
  }
}
