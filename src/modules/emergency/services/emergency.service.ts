import { EmergencyRepository } from '../repositories/emergency.repository';
import { eventBus } from '../../../utils/event-bus';
import { EmergencyEvents } from '../emergency.events';
import { EmergencyStatus, EmergencyCategory, EmergencySeverity, Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import logger from '../../../utils/logger';

export class EmergencyService {
  constructor(private repository: EmergencyRepository) {}

  async createEmergency(data: {
    organizationId: string;
    tripId: string;
    reporterId: string;
    tripPingId?: string;
    category: EmergencyCategory;
    severity?: EmergencySeverity;
    description?: string;
    priority?: string;
  }): Promise<any> {
    // 1. Validate only 1 active emergency per trip
    const active = await this.repository.findActiveByTripId(data.tripId);
    if (active) {
      throw new Error('An active emergency already exists for this trip');
    }

    const correlationId = randomUUID();

    // 2. Persist using Repository (transactional)
    const emergency = await this.repository.createWithHistory({
      organizationId: data.organizationId,
      tripId: data.tripId,
      reporterId: data.reporterId,
      tripPingId: data.tripPingId,
      category: data.category,
      severity: data.severity || EmergencySeverity.HIGH,
      description: data.description,
      priority: data.priority || 'HIGH',
      correlationId
    }, data.reporterId, 'Initial creation');

    // 3. Emit Domain Event
    eventBus.emitEvent(EmergencyEvents.CREATED, {
      organizationId: emergency.organizationId,
      emergencyId: emergency.id,
      tripId: emergency.tripId,
      reporterId: emergency.reporterId,
      category: emergency.category,
      severity: emergency.severity,
      status: emergency.status,
      correlationId: emergency.correlationId,
      timestamp: new Date().toISOString()
    });

    return emergency;
  }

  async transitionState(
    id: string,
    expectedVersion: number,
    newState: EmergencyStatus,
    actorId: string,
    reason?: string
  ): Promise<any> {
    // 1. Validate transition
    const emergency = await this.repository.findById(id);
    if (!emergency) throw new Error('Emergency not found');

    this.validateTransition(emergency.status, newState);

    // 2. Persist transition (transactional with optimistic concurrency)
    const updated = await this.repository.transitionState(
      id,
      expectedVersion,
      newState,
      actorId,
      reason
    );

    // 3. Determine Event Name
    let eventName = '';
    switch (newState) {
      case EmergencyStatus.ACKNOWLEDGED: eventName = EmergencyEvents.ACKNOWLEDGED; break;
      case EmergencyStatus.RESPONDING: eventName = EmergencyEvents.RESPONDING; break;
      case EmergencyStatus.RESOLVED: eventName = EmergencyEvents.RESOLVED; break;
      case EmergencyStatus.CANCELLED: eventName = EmergencyEvents.CANCELLED; break;
    }

    // 4. Emit Domain Event
    if (eventName) {
      eventBus.emitEvent(eventName, {
        organizationId: updated.organizationId,
        emergencyId: updated.id,
        tripId: updated.tripId,
        status: updated.status,
        correlationId: updated.correlationId,
        timestamp: new Date().toISOString()
      });
    }

    return updated;
  }

  private validateTransition(current: EmergencyStatus, next: EmergencyStatus) {
    if (current === EmergencyStatus.RESOLVED || current === EmergencyStatus.CANCELLED) {
      throw new Error(`Cannot transition from terminal state ${current}`);
    }

    const validTransitions: Record<EmergencyStatus, EmergencyStatus[]> = {
      [EmergencyStatus.ACTIVE]: [EmergencyStatus.ACKNOWLEDGED, EmergencyStatus.CANCELLED],
      [EmergencyStatus.ACKNOWLEDGED]: [EmergencyStatus.RESPONDING, EmergencyStatus.RESOLVED],
      [EmergencyStatus.RESPONDING]: [EmergencyStatus.RESOLVED],
      [EmergencyStatus.RESOLVED]: [],
      [EmergencyStatus.CANCELLED]: []
    };

    if (!validTransitions[current].includes(next)) {
      throw new Error(`Invalid transition from ${current} to ${next}`);
    }
  }
}
