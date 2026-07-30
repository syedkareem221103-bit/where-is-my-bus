import { TripPing, Stop } from '@prisma/client';
import { LRUCache } from 'lru-cache';
import env from '../../config/env';

export interface EtaResult {
  nextStop: {
    id: string;
    name: string;
    etaMinutes: number;
  } | null;
  remainingStops: {
    id: string;
    name: string;
    etaMinutes: number;
  }[];
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
}

export class EtaEngine {
  // Cache to store pre-calculated distances between consecutive stops
  // Key: stop1.id + '-' + stop2.id
  private static geometryCache = new LRUCache<string, number>({
    max: 5000, // Max 5000 segments (plenty for numerous routes)
    ttl: 1000 * 60 * 60 * 24, // 24 hours
  });

  /**
   * Calculates the Estimated Time of Arrival (ETA) for remaining stops.
   * 
   * @param ping The latest GPS telemetry of the trip
   * @param stops All stops associated with the route, ordered by sequenceOrder
   * @param currentStopSequence Optional parameter for future support to prevent moving backward.
   *                            If provided, only stops with sequenceOrder >= this value are considered.
   */
  public calculateEta(
    ping: TripPing,
    stops: Stop[],
    currentStopSequence?: number
  ): EtaResult {
    if (stops.length === 0) {
      return { nextStop: null, remainingStops: [], confidence: 'LOW' };
    }

    // Filter out stops that we've theoretically already passed if currentStopSequence is known
    const eligibleStops = currentStopSequence !== undefined
      ? stops.filter((s) => s.sequenceOrder >= currentStopSequence)
      : stops;

    if (eligibleStops.length === 0) {
      return { nextStop: null, remainingStops: [], confidence: 'LOW' };
    }

    // 1. Find the next stop (Sequence-Preserving Heuristic)
    let closestStop = eligibleStops[0];
    let minDistance = this.getDistanceInKm(ping.latitude, ping.longitude, closestStop.latitude, closestStop.longitude);
    let closestIndex = 0;

    for (let i = 1; i < eligibleStops.length; i++) {
      const stop = eligibleStops[i];
      const dist = this.getDistanceInKm(ping.latitude, ping.longitude, stop.latitude, stop.longitude);
      if (dist < minDistance) {
        minDistance = dist;
        closestStop = stop;
        closestIndex = i;
      }
    }

    // All stops from the closest index onwards are considered remaining
    const remainingStops = eligibleStops.slice(closestIndex);

    // 2. Determine Speed and Confidence
    let speedKmh = ping.speed;
    let confidence: 'HIGH' | 'MEDIUM' | 'LOW' = 'HIGH';

    if (speedKmh <= 0) {
      speedKmh = env.ETA_DEFAULT_SPEED_KMH;
      confidence = 'LOW';
    } else {
      // Check ping freshness. If older than 5 minutes, downgrade confidence.
      const pingAgeMinutes = (Date.now() - new Date(ping.timestamp).getTime()) / 60000;
      if (pingAgeMinutes > 5) {
        confidence = 'MEDIUM';
      }
    }

    // 3. Calculate ETA
    const etaResults = [];
    let cumulativeDistance = minDistance;

    for (let i = 0; i < remainingStops.length; i++) {
      const stop = remainingStops[i];
      
      if (i > 0) {
        const prevStop = remainingStops[i - 1];
        const cacheKey = `${prevStop.id}-${stop.id}`;
        
        let segmentDistance = EtaEngine.geometryCache.get(cacheKey);
        if (segmentDistance === undefined) {
          segmentDistance = this.getDistanceInKm(prevStop.latitude, prevStop.longitude, stop.latitude, stop.longitude);
          EtaEngine.geometryCache.set(cacheKey, segmentDistance);
        }
        
        cumulativeDistance += segmentDistance;
      }

      const etaHours = cumulativeDistance / speedKmh;
      const etaMinutes = Math.round(etaHours * 60);

      etaResults.push({
        id: stop.id,
        name: stop.name,
        etaMinutes,
      });
    }

    return {
      nextStop: etaResults[0] || null,
      remainingStops: etaResults.slice(1),
      confidence,
    };
  }

  /**
   * Calculates the distance between two coordinates in kilometers using the Haversine formula.
   */
  private getDistanceInKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }
}
