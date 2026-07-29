import { TripRepository } from './trip.repository';
import { ScheduleService } from '../schedule/schedule.service';
import { NotFoundError, BadRequestError } from '../../errors';
import { TripStatus } from '@prisma/client';
import { TripStateMachine } from './trip.state-machine';
import { prisma } from '../../config/database';

export class TripService {
  private tripRepository = new TripRepository();
  private scheduleService = new ScheduleService();

  async assignTrip(
    organizationId: string,
    data: {
      vehicleId: string;
      driverId: string;
      routeId: string;
      scheduleId: string;
      serviceDate: string;
    }
  ) {
    const { TripAssignmentEngine } = await import('./trip.assignment.engine');
    const engine = new TripAssignmentEngine();
    await engine.validateAssignment(organizationId, data);

    return this.tripRepository.create({
      organizationId,
      vehicleId: data.vehicleId,
      driverId: data.driverId,
      routeId: data.routeId,
      scheduleId: data.scheduleId,
      serviceDate: data.serviceDate,
      status: TripStatus.SCHEDULED,
    });
  }

  async startTrip(
    organizationId: string,
    data: {
      scheduleId: string;
      vehicleId: string;
      driverId: string;
    }
  ) {
    // Determine today's serviceDate based on organization timezone
    const organization = await prisma.organization.findUnique({ where: { organizationId } });
    if (!organization) throw new NotFoundError('Organization not found');

    const serviceDate = new Intl.DateTimeFormat('en-CA', {
      timeZone: organization.timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(new Date());

    const existingTrip = await this.tripRepository.findAssignedTripByScheduleAndDate(
      data.scheduleId,
      serviceDate,
      organizationId
    );

    if (!existingTrip) {
      throw new BadRequestError('No scheduled trip found for today');
    }
    if (existingTrip.status === 'COMPLETED') {
      throw new BadRequestError('Completed trips cannot restart');
    }
    if (existingTrip.status === 'CANCELLED') {
      throw new BadRequestError('Cancelled trips cannot restart');
    }
    if (existingTrip.status !== 'SCHEDULED') {
      throw new BadRequestError('Trip is already active');
    }
    
    // Update it to STARTED
    return this.tripRepository.update(existingTrip.id, organizationId, {
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
