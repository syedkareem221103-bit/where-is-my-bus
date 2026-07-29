import { TripRepository } from './trip.repository';
import { TripStateMachine } from './trip.state-machine';
import { BadRequestError } from '../../errors';
import { TripPing } from '@prisma/client';

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

    return { ping, discarded: false };
  }
}
