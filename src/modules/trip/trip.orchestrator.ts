import { TripRepository } from './trip.repository';
import { TripValidationEngine } from './trip.validation.engine';
import { AuditService } from '../audit/audit.service';
import { TripStateMachine } from './trip.state-machine';
import { TripStatus } from '@prisma/client';
import { prisma } from '../../config/database';
import { NotFoundError } from '../../errors';
import { LiveTrackingService } from '../../services/live-tracking.service';

export class TripLifecycleOrchestrator {
  private tripRepository = new TripRepository();
  private validationEngine: TripValidationEngine = new TripValidationEngine();
  private auditService = AuditService.getInstance();

  async startTrip(
    organizationId: string,
    data: { scheduleId: string; vehicleId: string; driverId: string },
    actorId: string,
    ipAddress?: string
  ) {
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

    // Validate Business Rules
    this.validationEngine.validateStart(existingTrip);

    if (existingTrip.driverId !== data.driverId) {
      throw new Error('Driver is not assigned to this trip');
    }
    if (existingTrip.vehicleId !== data.vehicleId) {
      throw new Error('Vehicle is not assigned to this trip');
    }

    // Validate State Machine
    TripStateMachine.validateTransition(existingTrip.status, TripStatus.STARTED);

    // Execute Transition with concurrency control
    const updateResult = await prisma.trip.updateMany({
      where: {
        id: existingTrip.id,
        organizationId,
        status: existingTrip.status,
      },
      data: { status: TripStatus.STARTED },
    });

    if (updateResult.count === 0) {
      throw new Error('Concurrency error: Trip status changed while attempting to update');
    }

    const updatedTrip = (await prisma.trip.findUnique({ where: { id: existingTrip.id } }))!;

    // Log the Event
    await this.auditService.logEvent({
      organizationId,
      userId: actorId,
      action: 'TRIP_STATUS_UPDATED',
      metadata: { tripId: updatedTrip.id, from: existingTrip.status, to: updatedTrip.status },
      ipAddress,
    });

    const trackingService = LiveTrackingService.getInstance();
    trackingService.publishEvent(`trip:${updatedTrip.id}`, 'trip.status.updated', {
      tripId: updatedTrip.id,
      oldStatus: existingTrip.status,
      newStatus: updatedTrip.status,
    });
    trackingService.publishEvent(`trip:${updatedTrip.id}`, 'trip.started', {
      tripId: updatedTrip.id,
    });

    return updatedTrip;
  }

  async endTrip(organizationId: string, tripId: string, actorId: string, ipAddress?: string) {
    const trip = await this.tripRepository.findByIdAndOrg(tripId, organizationId);
    if (!trip) throw new NotFoundError('Trip not found');

    TripStateMachine.validateTransition(trip.status, TripStatus.COMPLETED);

    const updateResult = await prisma.trip.updateMany({
      where: {
        id: tripId,
        organizationId,
        status: trip.status,
      },
      data: { status: TripStatus.COMPLETED },
    });

    if (updateResult.count === 0) {
      throw new Error('Concurrency error: Trip status changed while attempting to update');
    }

    const updatedTrip = (await prisma.trip.findUnique({ where: { id: tripId } }))!;

    await this.auditService.logEvent({
      organizationId,
      userId: actorId,
      action: 'TRIP_STATUS_UPDATED',
      metadata: { tripId: updatedTrip.id, from: trip.status, to: updatedTrip.status },
      ipAddress,
    });

    const trackingService = LiveTrackingService.getInstance();
    trackingService.publishEvent(`trip:${updatedTrip.id}`, 'trip.status.updated', {
      tripId: updatedTrip.id,
      oldStatus: trip.status,
      newStatus: updatedTrip.status,
    });
    trackingService.publishEvent(`trip:${updatedTrip.id}`, 'trip.completed', {
      tripId: updatedTrip.id,
    });

    return updatedTrip;
  }

  async updateTripStatus(
    organizationId: string,
    tripId: string,
    newStatus: TripStatus,
    actorId: string,
    ipAddress?: string
  ) {
    const trip = await this.tripRepository.findByIdAndOrg(tripId, organizationId);
    if (!trip) throw new NotFoundError('Trip not found');

    TripStateMachine.validateTransition(trip.status, newStatus);

    const updateResult = await prisma.trip.updateMany({
      where: {
        id: tripId,
        organizationId,
        status: trip.status,
      },
      data: { status: newStatus },
    });

    if (updateResult.count === 0) {
      throw new Error('Concurrency error: Trip status changed while attempting to update');
    }

    const updatedTrip = (await prisma.trip.findUnique({ where: { id: tripId } }))!;

    await this.auditService.logEvent({
      organizationId,
      userId: actorId,
      action: 'TRIP_STATUS_UPDATED',
      metadata: { tripId: updatedTrip.id, from: trip.status, to: updatedTrip.status },
      ipAddress,
    });

    LiveTrackingService.getInstance().publishEvent(`trip:${updatedTrip.id}`, 'trip.status.updated', {
      tripId: updatedTrip.id,
      oldStatus: trip.status,
      newStatus: updatedTrip.status,
    });

    return updatedTrip;
  }
}
