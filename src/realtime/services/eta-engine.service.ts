import { EventDispatcher } from './event-dispatcher.service';
import { ETA_CONFIG } from '../../constants/eta.config';
import { ETAPayload, StopArrivalPayload } from '../types/eta.types';
import logger from '../../utils/logger';

// Simplified types for the ETA Engine
interface LocationData {
  latitude: number;
  longitude: number;
  speed?: number;
  heading?: number;
  accuracy?: number;
  timestamp: number;
}

interface TripState {
  tripId: string;
  organizationId: string;
  lastLocation: LocationData | null;
  lastETA: ETAPayload | null;
  snapshotVersion: number;
  sequenceNumber: number;
  stationarySince: number | null;
  lastValidSpeeds: number[];
  currentStopId: string; // Mocked: In real system, derived from route
  currentStopStatus: 'OUTSIDE' | 'APPROACHING' | 'ARRIVED' | 'DEPARTED';
  remainingStops: string[]; // Mocked: Route schedule
}

export class ETAEngineService {
  private static instance: ETAEngineService;
  private trips = new Map<string, TripState>();

  private constructor() {}

  public static getInstance(): ETAEngineService {
    if (!ETAEngineService.instance) {
      ETAEngineService.instance = new ETAEngineService();
    }
    return ETAEngineService.instance;
  }

  // Pure function for Haversine distance
  private calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // metres
    const φ1 = lat1 * Math.PI / 180; // φ, λ in radians
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // in metres
  }

  // Expose snapshot for client reconnects
  public getSnapshot(tripId: string): ETAPayload | null {
    const trip = this.trips.get(tripId);
    return trip?.lastETA || null;
  }

  // Handle GPS disconnect / clear state
  public clearTrip(tripId: string) {
    this.trips.delete(tripId);
  }

  // Process incoming GPS ping
  public processLocationUpdate(organizationId: string, tripId: string, location: LocationData) {
    // 1. GPS Noise Filtering
    if (location.accuracy && location.accuracy > ETA_CONFIG.MIN_GPS_ACCURACY_METERS) {
      logger.debug(`ETA Engine: Dropped noisy GPS (Accuracy: ${location.accuracy}m) for trip ${tripId}`);
      return;
    }
    if (location.speed && (location.speed * 3.6) > ETA_CONFIG.MAX_SPEED_KMH) {
      logger.debug(`ETA Engine: Dropped noisy GPS (Speed: ${location.speed}m/s) for trip ${tripId}`);
      return;
    }
    // Prevent impossible coordinates
    if (location.latitude < -90 || location.latitude > 90 || location.longitude < -180 || location.longitude > 180) {
       return;
    }

    let trip = this.trips.get(tripId);
    if (!trip) {
      trip = {
        tripId,
        organizationId,
        lastLocation: null,
        lastETA: null,
        snapshotVersion: 0,
        sequenceNumber: 0,
        stationarySince: null,
        lastValidSpeeds: [],
        currentStopId: 'stop-mock-id', // Stub: We would fetch from route
        currentStopStatus: 'OUTSIDE',
        remainingStops: ['stop-mock-id', 'stop-mock-id-2']
      };
      this.trips.set(tripId, trip);
    } else {
      if (trip.lastLocation && location.timestamp <= trip.lastLocation.timestamp) {
         return; // Out of order packet
      }
    }

    // 2. Minimum Movement Threshold
    let distanceMoved = 0;
    if (trip.lastLocation) {
      distanceMoved = this.calculateDistanceMeters(
        trip.lastLocation.latitude, trip.lastLocation.longitude,
        location.latitude, location.longitude
      );

      if (distanceMoved < ETA_CONFIG.MOVEMENT_THRESHOLD_METERS) {
        trip.lastLocation.timestamp = location.timestamp;
        
        if (location.speed === 0 || distanceMoved < 2) {
            if (!trip.stationarySince) trip.stationarySince = Date.now();
        }
        
        // If a heartbeat is due, let it fall through to broadcast
        const timeSinceLast = trip.lastETA ? (Date.now() - trip.lastETA.timestamp) : 0;
        if (timeSinceLast < 30000) {
            return; // Skip calculation
        }
      } else {
        trip.stationarySince = null; // Reset stationary timer
      }
    }

    trip.lastLocation = location;
    
    // Smooth speed (moving average of last 5)
    if (location.speed !== undefined) {
        trip.lastValidSpeeds.push(location.speed);
        if (trip.lastValidSpeeds.length > 5) trip.lastValidSpeeds.shift();
    }
    
    const avgSpeed = trip.lastValidSpeeds.length > 0 
        ? trip.lastValidSpeeds.reduce((a,b)=>a+b, 0) / trip.lastValidSpeeds.length 
        : 8.33; // Default 30km/h

    // 3. Distance to next stop (MOCK: assumes fixed coord for testing)
    const nextStopLat = location.latitude + 0.05; // mock distance
    const nextStopLon = location.longitude + 0.05;
    
    const remainingDistance = this.calculateDistanceMeters(
      location.latitude, location.longitude,
      nextStopLat, nextStopLon
    );

    // 4. Geofence State Machine (OUTSIDE / APPROACHING / ARRIVED / DEPARTED)
    if (trip.currentStopStatus !== 'ARRIVED' && remainingDistance <= ETA_CONFIG.GEOFENCE_APPROACHING_METERS && remainingDistance > ETA_CONFIG.GEOFENCE_ARRIVED_METERS) {
       if (trip.currentStopStatus !== 'APPROACHING') {
           trip.currentStopStatus = 'APPROACHING';
           this.emitStopEvent(organizationId, tripId, trip.currentStopId, 'APPROACHING', ++trip.sequenceNumber);
       }
    } else if (remainingDistance <= ETA_CONFIG.GEOFENCE_ARRIVED_METERS) {
       if (trip.currentStopStatus !== 'ARRIVED') {
           trip.currentStopStatus = 'ARRIVED';
           this.emitStopEvent(organizationId, tripId, trip.currentStopId, 'ARRIVED', ++trip.sequenceNumber);
       }
    } else if (trip.currentStopStatus === 'ARRIVED' && remainingDistance > ETA_CONFIG.GEOFENCE_ARRIVED_METERS) {
       // Departed
       trip.currentStopStatus = 'DEPARTED';
       this.emitStopEvent(organizationId, tripId, trip.currentStopId, 'DEPARTED', ++trip.sequenceNumber);
       
       // Move to next stop
       trip.remainingStops.shift();
       if (trip.remainingStops.length > 0) {
           trip.currentStopId = trip.remainingStops[0];
           trip.currentStopStatus = 'OUTSIDE';
       }
    }

    // 5. ETA Calculation
    const remainingTimeSeconds = Math.max(0, remainingDistance / (avgSpeed > 0 ? avgSpeed : 1));
    const estimatedArrivalAt = Date.now() + (remainingTimeSeconds * 1000);

    // Confidence Scoring
    let confidence: 'HIGH' | 'MEDIUM' | 'LOW' = 'HIGH';
    if (trip.lastValidSpeeds.length < 3) confidence = 'LOW';
    else if (location.accuracy && location.accuracy > 20) confidence = 'MEDIUM';

    // Delay Detection
    let isDelayed = false;
    if (trip.stationarySince && (Date.now() - trip.stationarySince) > ETA_CONFIG.DELAY_STATIONARY_TIMEOUT_MS) {
        isDelayed = true;
    }
    if (trip.lastETA && estimatedArrivalAt - trip.lastETA.estimatedArrivalAt > ETA_CONFIG.DELAY_ETA_INCREASE_THRESHOLD_MS) {
        isDelayed = true;
    }

    // 6. Broadcast Decision (Throttling)
    let shouldBroadcast = false;
    if (!trip.lastETA) {
        shouldBroadcast = true;
    } else {
        const timeSinceLast = Date.now() - trip.lastETA.timestamp;
        const etaDelta = Math.abs(estimatedArrivalAt - trip.lastETA.estimatedArrivalAt);
        
        // Broadcast if ETA shifted heavily or if 30s elapsed for heartbeat
        if (etaDelta > (ETA_CONFIG.ETA_BROADCAST_DELTA_SECONDS * 1000) || timeSinceLast > 30000) {
            shouldBroadcast = true;
        }
    }

    if (shouldBroadcast) {
       trip.snapshotVersion++;
       trip.sequenceNumber++;

       const payload: ETAPayload = {
          tripId,
          nextStopId: trip.currentStopId,
          estimatedArrivalAt,
          remainingDistanceMeters: remainingDistance,
          remainingTimeSeconds,
          confidence,
          isDelayed,
          snapshotVersion: trip.snapshotVersion,
          sequenceNumber: trip.sequenceNumber,
          timestamp: Date.now()
       };

       trip.lastETA = payload;

       EventDispatcher.getInstance().broadcast(
          `trip_room:${tripId}`,
          'server:eta:update',
          organizationId,
          payload,
          tripId
       );
    }
  }

  private emitStopEvent(organizationId: string, tripId: string, stopId: string, status: 'APPROACHING' | 'ARRIVED' | 'DEPARTED', sequenceNumber: number) {
      const payload: StopArrivalPayload = {
          tripId,
          stopId,
          status,
          sequenceNumber,
          timestamp: Date.now()
      };
      
      EventDispatcher.getInstance().broadcast(
          `trip_room:${tripId}`,
          `server:stop:${status.toLowerCase()}`,
          organizationId,
          payload,
          tripId
      );
  }
}
