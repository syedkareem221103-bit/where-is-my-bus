import { PrismaClient } from '@prisma/client';
import { RouteKPIs } from './analytics.types';
import winston from 'winston';

const prisma = new PrismaClient();

export class RouteEfficiencyService {
  /**
   * Calculate exact distance between two coordinates in km using Haversine
   */
  private static calculateHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  /**
   * Get historical performance and efficiency metrics for routes
   */
  public static async getRouteEfficiency(
    organizationId: string,
    timeRange: string,
    routeId?: string
  ): Promise<RouteKPIs[]> {
    const now = new Date();
    const startDate = new Date();

    switch (timeRange) {
      case '7d': startDate.setDate(now.getDate() - 7); break;
      case '30d': startDate.setDate(now.getDate() - 30); break;
      case '90d': startDate.setDate(now.getDate() - 90); break;
      case '1y': startDate.setFullYear(now.getFullYear() - 1); break;
      case 'all': startDate.setFullYear(2000); break; // effectively all
      default: startDate.setDate(now.getDate() - 30); break;
    }

    const routeWhereClause = routeId ? { id: routeId } : {};

    // Fetch Routes and their historical trips
    const routes = await prisma.route.findMany({
      where: {
        organizationId,
        ...routeWhereClause,
      },
      include: {
        stops: true,
        trips: {
          where: {
            createdAt: { gte: startDate },
            status: 'COMPLETED'
          },
          include: {
            schedule: true,
            pings: {
              orderBy: { timestamp: 'asc' }
            }
          }
        }
      }
    });

    const results: RouteKPIs[] = [];

    for (const route of routes) {
      if (route.trips.length < 5) {
        // Minimum of 5 trips required for leaderboard inclusion, but for specific routeId we still show it
        if (!routeId) continue;
      }

      let totalActualDistance = 0;
      let totalActualDurationMins = 0;
      let totalPlannedDurationMins = 0;
      let totalPlannedDistance = 0; // Approximated
      let totalMissedStops = 0;
      let totalIdleTimeMins = 0;

      for (const trip of route.trips) {
        // Calculate Actual Distance and Idle Time from Pings
        let tripDistance = 0;
        let tripIdle = 0;
        
        let pings = trip.pings;
        // [CRITICAL FIX] Down-sample pings to prevent Node.js event-loop CPU blocking on massive trip histories
        if (pings.length > 50) {
          const step = Math.ceil(pings.length / 50);
          pings = pings.filter((_, index) => index % step === 0);
        }
        
        for (let i = 1; i < pings.length; i++) {
          const prev = pings[i-1];
          const curr = pings[i];
          const segmentDist = this.calculateHaversineDistance(
            prev.latitude, prev.longitude, curr.latitude, curr.longitude
          );
          tripDistance += segmentDist;
          
          const timeDiffMins = (curr.timestamp.getTime() - prev.timestamp.getTime()) / 60000;
          if (curr.speed && curr.speed < 2 && timeDiffMins > 0) {
            tripIdle += timeDiffMins;
          }
        }
        totalActualDistance += tripDistance;
        totalIdleTimeMins += tripIdle;

        // Actual Duration
        const actualDuration = (trip.updatedAt.getTime() - trip.createdAt.getTime()) / 60000;
        totalActualDurationMins += actualDuration;

        // Planned Duration from Schedule
        if (trip.schedule) {
          // If no startTime, assume 2 hours prior to cutoff as planned duration
          const plannedMins = 120;
          totalPlannedDurationMins += plannedMins;
        }

        // Planned Distance approximation (straight line between stops)
        let plannedDist = 0;
        const stops = [...route.stops].sort((a, b) => a.sequenceOrder - b.sequenceOrder);
        for (let i = 1; i < stops.length; i++) {
          plannedDist += this.calculateHaversineDistance(
            stops[i-1].latitude, stops[i-1].longitude,
            stops[i].latitude, stops[i].longitude
          );
        }
        // Multiply by roughly 1.3 to account for road curvature realistically
        totalPlannedDistance += (plannedDist * 1.3);

        // Simulated missed stops metric
        totalMissedStops += 0; 
      }

      const totalTrips = route.trips.length;
      
      // Calculate Averages
      const avgActualDistance = totalTrips > 0 ? totalActualDistance / totalTrips : 0;
      const avgPlannedDistance = totalTrips > 0 ? totalPlannedDistance / totalTrips : 0;
      const avgActualDuration = totalTrips > 0 ? totalActualDurationMins / totalTrips : 0;
      const avgPlannedDuration = totalTrips > 0 ? totalPlannedDurationMins / totalTrips : 0;
      const avgIdleTime = totalTrips > 0 ? totalIdleTimeMins / totalTrips : 0;
      const avgMissedStops = totalTrips > 0 ? totalMissedStops / totalTrips : 0;

      // Calculate Deviations
      const distanceDeviationPct = avgPlannedDistance > 0 
        ? ((avgActualDistance - avgPlannedDistance) / avgPlannedDistance) * 100 
        : 0;
        
      const timeDeviationMins = avgActualDuration - avgPlannedDuration;
      const timeDeviationPct = avgPlannedDuration > 0
        ? (timeDeviationMins / avgPlannedDuration) * 100
        : 0;

      // Route Efficiency Score calculation
      const distancePenalty = Math.max(0, (distanceDeviationPct - 5) * 2);
      const timePenalty = Math.max(0, (timeDeviationPct - 5) * 1.5);
      const stopPenalty = route.stops.length > 0 ? (avgMissedStops / route.stops.length) * 20 : 0;
      
      let efficiencyScore = 100 - distancePenalty - timePenalty - stopPenalty;
      efficiencyScore = Math.max(0, Math.min(100, efficiencyScore));

      const stopCompliancePct = route.stops.length > 0 
        ? Math.max(0, ((route.stops.length - avgMissedStops) / route.stops.length) * 100)
        : 100;

      const avgVehicleSpeed = avgActualDuration > 0 ? (avgActualDistance / (avgActualDuration / 60)) : 0;

      // Completion rate logic
      const allTripsCount = await prisma.trip.count({
        where: {
          routeId: route.id,
          createdAt: { gte: startDate }
        }
      });
      const routeCompletionRate = allTripsCount > 0 ? (totalTrips / allTripsCount) * 100 : 0;

      results.push({
        routeId: route.id,
        routeName: route.name,
        efficiencyScore: Math.round(efficiencyScore * 10) / 10,
        plannedDistanceKm: Math.round(avgPlannedDistance * 10) / 10,
        actualDistanceKm: Math.round(avgActualDistance * 10) / 10,
        distanceDeviationPct: Math.round(distanceDeviationPct * 10) / 10,
        plannedDurationMins: Math.round(avgPlannedDuration * 10) / 10,
        actualDurationMins: Math.round(avgActualDuration * 10) / 10,
        timeDeviationMins: Math.round(timeDeviationMins * 10) / 10,
        averageStopDelayMins: Math.round(Math.max(0, timeDeviationMins / Math.max(1, route.stops.length)) * 10) / 10,
        routeCompletionRate: Math.round(routeCompletionRate * 10) / 10,
        stopCompliancePct: Math.round(stopCompliancePct * 10) / 10,
        missedStops: Math.round(avgMissedStops),
        averageVehicleSpeed: Math.round(avgVehicleSpeed * 10) / 10,
        idleTimeMins: Math.round(avgIdleTime * 10) / 10
      });
    }

    return results;
  }
}
