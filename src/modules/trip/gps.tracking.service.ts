import { TripRepository } from './trip.repository';
import { TripStateMachine } from './trip.state-machine';
import { BadRequestError } from '../../errors';
import { TripPing } from '@prisma/client';
import { LiveTrackingService } from '../../services/live-tracking.service';
import { TripService } from './trip.service';
import GeofenceEvaluationService from '../geofence/geofence.evaluation.service';
import AlertProcessingService from '../alert/alert.processing.service';
import logger from '../../utils/logger';

export class GpsTrackingService {
  private tripRepository = new TripRepository();

  async recordPing(
    organizationId: string,
    tripId: string,
    data: {
      latitude: number;
      longitude: number;
      speed?: number;
      heading?: number;
      accuracy?: number;
      recordedAt: string;
    }
  ): Promise<{ ping: TripPing | null; discarded: boolean }> {
    const trip = await this.tripRepository.findByIdAndOrg(tripId, organizationId);
    if (!trip) {
      throw new BadRequestError('Trip not found');
    }

    if (!TripStateMachine.isActiveState(trip.status)) {
      throw new BadRequestError('Trip is not active');
    }

    const recordedAtDate = new Date(data.recordedAt);
    const lastPing = await this.tripRepository.findLatestPing(tripId, organizationId);

    // Silently discard stale or duplicate pings
    if (lastPing && recordedAtDate <= lastPing.timestamp) {
      return { ping: lastPing, discarded: true };
    }

    const nextSequence = lastPing ? lastPing.sequence + 1 : 1;

    const ping = await this.tripRepository.createPing({
      tripId,
      organizationId,
      latitude: data.latitude,
      longitude: data.longitude,
      speed: data.speed ?? 0,
      heading: data.heading,
      accuracy: data.accuracy ?? 1.0,
      sequence: nextSequence,
      timestamp: recordedAtDate,
      receivedTimestamp: new Date(),
    });

    LiveTrackingService.getInstance().publishEvent(`trip:${tripId}`, 'trip.location.updated', {
      tripId,
      latitude: ping.latitude,
      longitude: ping.longitude,
      speed: ping.speed,
      heading: ping.heading,
      recordedAt: ping.timestamp.toISOString(),
    });

    // 🚀 NEW: Trigger Geofencing & Smart Alerts Evaluation 
    try {
      const gfResults = await GeofenceEvaluationService.evaluateLocation(organizationId, ping.latitude, ping.longitude);
      await AlertProcessingService.evaluateRulesAndDispatch(organizationId, tripId, ping, gfResults);
    } catch (err) {
      logger.error('Geofencing evaluation error:', { error: err });
    }

    // Also calculate and broadcast ETA
    try {
      const tripService = new TripService();
      const etaData = await tripService.getEta(organizationId, tripId);
      LiveTrackingService.getInstance().publishEvent(`trip:${tripId}`, 'trip.eta.updated', {
        tripId,
        nextStop: etaData.nextStop,
        remainingStops: etaData.remainingStops,
      });
    } catch (error) {
      // Ignore ETA calculation errors if stops are empty or similar
    }

    return { ping, discarded: false };
  }
}
