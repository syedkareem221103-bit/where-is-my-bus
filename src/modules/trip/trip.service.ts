import { TripRepository } from './trip.repository';
import { ScheduleService } from '../schedule/schedule.service';
import { NotFoundError, BadRequestError } from '../../errors';
import { TripStatus } from '@prisma/client';
import { TripStateMachine } from './trip.state-machine';
import { prisma } from '../../config/database';
import { TripLifecycleOrchestrator } from './trip.orchestrator';

export class TripService {
  private tripRepository = new TripRepository();
  private scheduleService = new ScheduleService();
  private orchestrator = new TripLifecycleOrchestrator();

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
    },
    actorId: string,
    ipAddress?: string
  ) {
    return this.orchestrator.startTrip(organizationId, data, actorId, ipAddress);
  }

  async endTrip(organizationId: string, id: string, actorId: string, ipAddress?: string) {
    return this.orchestrator.endTrip(organizationId, id, actorId, ipAddress);
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

  async updateTripStatus(
    organizationId: string,
    id: string,
    newStatus: TripStatus,
    actorId: string,
    ipAddress?: string
  ) {
    return this.orchestrator.updateTripStatus(organizationId, id, newStatus, actorId, ipAddress);
  }
}

export default TripService;
