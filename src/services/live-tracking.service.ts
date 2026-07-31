import { prisma } from '../config/database';
import { EventDispatcher } from '../realtime/services/event-dispatcher.service';
import logger from '../utils/logger';

export interface SocketIdentity {
  userId: string;
  organizationId: string;
  role: string;
  driverId?: string;
  parentId?: string;
}

export class LiveTrackingService {
  private static instance: LiveTrackingService;

  private constructor() {}

  public static getInstance(): LiveTrackingService {
    if (!LiveTrackingService.instance) {
      LiveTrackingService.instance = new LiveTrackingService();
    }
    return LiveTrackingService.instance;
  }

  /**
   * Evaluates business logic to determine if a user can subscribe to a trip room
   */
  public async authorizeJoinTrip(tripId: string, identity: SocketIdentity): Promise<boolean> {
    const { userId, organizationId, role } = identity;

    if (role === 'ORG_ADMIN' || role === 'OPERATOR') {
      const trip = await prisma.trip.findFirst({
        where: { id: tripId, organizationId },
      });
      return !!trip;
    }

    if (role === 'DRIVER') {
      const trip = await prisma.trip.findFirst({
        where: { id: tripId, organizationId, driverId: userId },
      });
      return !!trip;
    }

    if (role === 'PARENT') {
      const trip = await prisma.trip.findFirst({
        where: { id: tripId, organizationId },
      });
      if (!trip) return false;

      // Parent must have a child assigned to a stop on this route
      const studentStop = await prisma.studentStop.findFirst({
        where: {
          organizationId,
          stop: { routeId: trip.routeId },
          student: {
            parentChildren: {
              some: { parentId: userId },
            },
          },
        },
      });
      return !!studentStop;
    }

    return false;
  }

  /**
   * Single source for websocket broadcasting.
   * Wraps the payload in a standardized envelope.
   */
  public publishEvent(room: string, type: string, data: any): void {
    const envelope = {
      type,
      version: 1,
      timestamp: new Date().toISOString(),
      data,
    };

    logger.debug(`Publishing event ${type} to room ${room}`);
    EventDispatcher.getInstance().broadcast(room, type, 'legacy', data);
  }
}
