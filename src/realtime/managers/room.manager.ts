import { Socket as IOSocket } from 'socket.io';
import { SocketData } from '../types/socket.types';

type Socket = IOSocket<any, any, any, SocketData>;
import prisma from '../../config/database';
import logger from '../../utils/logger';

export class RoomManager {
  private static instance: RoomManager;

  private constructor() {}

  public static getInstance(): RoomManager {
    if (!RoomManager.instance) {
      RoomManager.instance = new RoomManager();
    }
    return RoomManager.instance;
  }

  /**
   * Evaluates business logic to determine if a user can subscribe to a trip room
   */
  public async joinTripRoom(socket: Socket, tripId: string): Promise<boolean> {
    const user = socket.data.user;
    if (!user) return false;

    const { id: userId, organizationId, role } = user;
    let isAllowed = false;

    try {
      if (role === 'ORG_ADMIN' || role === 'OPERATOR') {
        const trip = await prisma.trip.findFirst({
          where: { id: tripId, organizationId },
        });
        isAllowed = !!trip;
      } else if (role === 'DRIVER') {
        const trip = await prisma.trip.findFirst({
          where: { id: tripId, organizationId, driverId: userId },
        });
        isAllowed = !!trip;
      } else if (role === 'PARENT') {
        const trip = await prisma.trip.findFirst({
          where: { id: tripId, organizationId },
        });
        if (trip) {
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
          isAllowed = !!studentStop;
        }
      }

      if (isAllowed) {
        socket.join(`trip_${tripId}`);
        logger.debug(`Socket ${socket.id} joined room: trip_${tripId}`, { userId, organizationId, eventId: 'sys-room-join' });
        return true;
      }
      
      logger.warn(`Unauthorized attempt to join trip_${tripId} by User ${userId}`);
      return false;
    } catch (error) {
      logger.error(`Error verifying trip room join for trip_${tripId}:`, error);
      return false;
    }
  }

  public joinAdminRoom(socket: Socket): boolean {
    const user = socket.data.user;
    if (!user) return false;

    if (user.role === 'ORG_ADMIN' || user.role === 'OPERATOR' || user.role === 'SUPER_ADMIN') {
      socket.join(`admin_${user.organizationId}`);
      logger.debug(`Socket ${socket.id} joined room: admin_${user.organizationId}`);
      return true;
    }
    
    return false;
  }
}
