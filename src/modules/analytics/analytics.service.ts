import { PrismaClient } from '@prisma/client';
import { eventBus } from '../../utils/event-bus';
import { AnalyticsFilter, LiveKPIs, HistoricalKPIs } from './analytics.types';
import logger from '../../utils/logger';
import crypto from 'crypto';
import { EventDispatcher } from '../../realtime/services/event-dispatcher.service';
import { FleetService } from '../fleet/fleet.service';

const prisma = new PrismaClient();

export class AnalyticsService {
  private static instance: AnalyticsService;

  // In-memory real-time state per organization
  private liveState: Map<string, { kpis: LiveKPIs; lastUpdated: number }> = new Map();
  private processedEvents: Set<string> = new Set();
  private eventQueue: string[] = [];
  private globalTimer: NodeJS.Timeout | null = null;
  private readonly MAX_EVENTS = 1000;
  private readonly ORG_TIMEOUT_MS = 60 * 60 * 1000; // 1 hour

  private constructor() {
    this.initEventListeners();
    this.startGlobalTimer();
  }

  public static getInstance(): AnalyticsService {
    if (!AnalyticsService.instance) {
      AnalyticsService.instance = new AnalyticsService();
    }
    return AnalyticsService.instance;
  }

  private initLiveState(organizationId: string): LiveKPIs {
    if (!this.liveState.has(organizationId)) {
      this.liveState.set(organizationId, {
        kpis: {
          fleetUtilizationPercent: 0,
          averageDelayMinutes: 0,
          tripsToday: 0,
          completedTrips: 0,
          cancelledTrips: 0,
          averageEtaAccuracyPercent: 0,
          attendanceRatePercent: 0,
          averageRouteCompletionTimeMinutes: 0,
          driversOnline: 0,
          vehiclesActive: 0,
          parentsConnected: 0,
          studentsTransported: 0,
          averageSpeedKmH: 0,
          distanceTravelledKm: 0,
          activeEmergencyCount: 0,
          fuelPlaceholder: 0,
          maintenancePlaceholder: 0
        },
        lastUpdated: Date.now()
      });
    } else {
      this.liveState.get(organizationId)!.lastUpdated = Date.now();
    }
    return this.liveState.get(organizationId)!.kpis;
  }

  private startGlobalTimer() {
    if (this.globalTimer) return;
    
    // Broadcast every 5 seconds as per Analytics Refresh Matrix
    this.globalTimer = setInterval(() => {
      const now = Date.now();
      for (const [orgId, state] of this.liveState.entries()) {
        if (now - state.lastUpdated > this.ORG_TIMEOUT_MS) {
          this.liveState.delete(orgId); // Cleanup stale orgs
        } else {
          this.broadcastLiveKPIs(orgId);
        }
      }
    }, 5000);
  }

  private initEventListeners() {
    eventBus.on('socket:broadcast', (event) => {
      const { eventName, organizationId, payload, eventId } = event;
      if (!organizationId) return;

      // Deduplicate events to prevent duplicate calculations
      if (eventId) {
        if (this.processedEvents.has(eventId)) return;
        this.processedEvents.add(eventId);
        this.eventQueue.push(eventId);
        if (this.eventQueue.length > this.MAX_EVENTS) {
          const oldest = this.eventQueue.shift();
          if (oldest) this.processedEvents.delete(oldest);
        }
      }

      const state = this.initLiveState(organizationId);

      try {
        switch (eventName) {
          case 'emergency:created':
          case 'emergency:updated':
            // Recalculate from fleet summary
            const snapshot = FleetService.getInstance().getSnapshot(organizationId);
            state.activeEmergencyCount = snapshot.summary.emergencies || 0;
            break;
            
          case 'fleet:location':
            // payload is FleetSnapshot or DeltaUpdate. We just pull latest from FleetService to be safe.
            const latestFleet = FleetService.getInstance().getSnapshot(organizationId);
            state.vehiclesActive = latestFleet.summary.activeVehicles || 0;
            state.driversOnline = latestFleet.summary.driversOnline || 0;
            
            // Calculate Average Speed
            let totalSpeed = 0;
            let count = 0;
            Object.values(latestFleet.vehicles).forEach(v => {
              if (v.speed !== undefined && v.speed > 0) {
                totalSpeed += v.speed;
                count++;
              }
            });
            state.averageSpeedKmH = count > 0 ? Math.round(totalSpeed / count) : 0;
            
            const totalVehicles = latestFleet.summary.totalVehicles || 1; // prevent div by zero
            state.fleetUtilizationPercent = Math.round((state.vehiclesActive / totalVehicles) * 100);
            
            state.averageDelayMinutes = latestFleet.summary.delayedTrips || 0; // naive mapping for now, ideally calc
            break;
            
          case 'trip:started':
            state.tripsToday++;
            break;
          case 'trip:completed':
            state.completedTrips++;
            break;
          case 'trip:cancelled':
            state.cancelledTrips++;
            break;
          case 'attendance:logged':
            state.studentsTransported++;
            break;
        }
      } catch (err) {
        logger.error(`Error updating live KPIs for org ${organizationId}:`, err);
      }
    });
  }

  public getLiveKPIs(organizationId: string): LiveKPIs {
    return this.initLiveState(organizationId);
  }

  private broadcastLiveKPIs(organizationId: string) {
    const kpis = this.getLiveKPIs(organizationId);
    EventDispatcher.getInstance().broadcast(
      `admin_${organizationId}`,
      'analytics:live',
      organizationId,
      {
        live: kpis,
        timestamp: new Date().toISOString()
      }
    );
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

    // Mock calculations for complex derived metrics to fit within no-DB-change constraint
    const totalTrips = trips.length || 1;
    const completedCount = trips.filter(t => t.status === 'COMPLETED').length;
    
    const routePunctualityPercent = Math.round((completedCount / totalTrips) * 100);
    const driverSafetyScore = Math.max(0, 100 - (incidents * 2) - (emergencies * 10));
    
    const totalAttendances = attendances.length || 1;
    const presentCount = attendances.filter(a => a.status === 'PRESENT').length;
    const attendanceVsCapacityPercent = Math.round((presentCount / totalAttendances) * 100);

    return {
      averageIdleTimeMinutes: 12, // derived dynamically in full scale, using placeholder for structure
      routePunctualityPercent,
      driverSafetyScore,
      attendanceVsCapacityPercent,
      fleetHealthScore: Math.max(0, 100 - incidents),
      dailyTripsCompleted,
      dailyTripsCancelled
    };
  }

  public shutdown() {
    if (this.globalTimer) {
      clearInterval(this.globalTimer);
      this.globalTimer = null;
    }
    this.liveState.clear();
    this.processedEvents.clear();
    this.eventQueue = [];
  }
}
