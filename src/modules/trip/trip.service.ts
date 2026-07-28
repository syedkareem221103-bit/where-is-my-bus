import { TripRepository } from './trip.repository';
import { ScheduleService } from '../schedule/schedule.service';
import { NotFoundError, BadRequestError } from '../../errors';
import { TripStatus } from '@prisma/client';
import { TripStateMachine } from './trip.state-machine';

export class TripService {
  private tripRepository = new TripRepository();
  private scheduleService = new ScheduleService();

  async startTrip(
    organizationId: string,
    data: {
      scheduleId: string;
      vehicleId: string;
      driverId: string;
    }
  ) {
    const schedule = await this.scheduleService.getScheduleById(organizationId, data.scheduleId);

    // 2. Verify no active trip exists for this driver
    const activeTrip = await this.tripRepository.findActiveByDriver(data.driverId, organizationId);
    if (activeTrip) {
      throw new BadRequestError('Driver already has an active trip');
    }

    return this.tripRepository.create({
      scheduleId: data.scheduleId,
      vehicleId: data.vehicleId,
      driverId: data.driverId,
      organizationId,
      status: TripStatus.STARTED,
    });
  }

  async endTrip(organizationId: string, id: string) {
    const trip = await this.tripRepository.findByIdAndOrg(id, organizationId);
    if (!trip) {
      throw new NotFoundError('Trip not found');
    }

    TripStateMachine.validateTransition(trip.status, TripStatus.COMPLETED);

    return this.tripRepository.update(id, organizationId, {
      status: TripStatus.COMPLETED,
    });
  }

  async recordPing(
    organizationId: string,
    tripId: string,
    data: {
      latitude: number;
      longitude: number;
      speed: number;
      accuracy: number;
      sequence: number;
    }
  ) {
    const trip = await this.tripRepository.findByIdAndOrg(tripId, organizationId);
    if (!trip || !TripStateMachine.isActiveState(trip.status)) {
      throw new BadRequestError('Trip not found or not active');
    }

    return this.tripRepository.createPing({
      tripId,
      organizationId,
      latitude: data.latitude,
      longitude: data.longitude,
      speed: data.speed,
      accuracy: data.accuracy,
      sequence: data.sequence,
      timestamp: new Date(),
      receivedTimestamp: new Date(),
    });
  }

  async getLatestLocation(organizationId: string, id: string) {
    const trip = await this.tripRepository.findByIdAndOrg(id, organizationId);
    if (!trip) {
      throw new NotFoundError('Trip not found');
    }

    const ping = await this.tripRepository.findLatestPing(id, organizationId);
    if (!ping) {
      throw new NotFoundError('No location ping recorded for this trip');
    }

    return {
      tripId: id,
      status: trip.status,
      latitude: ping.latitude,
      longitude: ping.longitude,
      speed: ping.speed,
      timestamp: ping.timestamp,
    };
  }

  async updateTripStatus(organizationId: string, id: string, newStatus: TripStatus) {
    const trip = await this.tripRepository.findByIdAndOrg(id, organizationId);
    if (!trip) {
      throw new NotFoundError('Trip not found');
    }

    TripStateMachine.validateTransition(trip.status, newStatus);

    return this.tripRepository.update(id, organizationId, {
      status: newStatus,
    });
  }
}

export default TripService;
