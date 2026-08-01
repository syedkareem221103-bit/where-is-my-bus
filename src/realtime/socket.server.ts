import { Server as HttpServer } from 'http';
import { Server, Socket as IOSocket } from 'socket.io';
import { SocketData } from './types/socket.types';

type Socket = IOSocket<any, any, any, SocketData>;
import env from '../config/env';
import logger from '../utils/logger';
import { socketAuthMiddleware } from './middlewares/socket.auth';
import { RoomManager } from './managers/room.manager';
import { PresenceManager } from './managers/presence.manager';
import { EventDispatcher } from './services/event-dispatcher.service';
import { registerLocationHandlers } from './handlers/location.handler';
import { registerAttendanceHandlers } from './handlers/attendance.handler';
import { registerNotificationHandlers } from './handlers/notification.handler';
import { registerETAHandlers } from './handlers/eta.handler';
import { FleetService } from '../modules/fleet/fleet.service';
import crypto from 'crypto';

export class SocketServer {
  private static instance: SocketServer;
  private io: Server | null = null;
  private roomManager = RoomManager.getInstance();
  private presenceManager = PresenceManager.getInstance();
  private eventDispatcher = EventDispatcher.getInstance();

  private constructor() {}

  public static getInstance(): SocketServer {
    if (!SocketServer.instance) {
      SocketServer.instance = new SocketServer();
    }
    return SocketServer.instance;
  }

  public init(server: HttpServer): void {
    if (this.io) {
      logger.warn('SocketServer already initialized');
      return;
    }

    this.io = new Server(server, {
      cors: {
        origin: env.SOCKET_CORS_ORIGIN,
        methods: ['GET', 'POST'],
      },
      pingInterval: env.SOCKET_PING_INTERVAL,
      pingTimeout: env.SOCKET_PING_TIMEOUT,
    });

    // Provide IO instance to managers that need to emit
    this.presenceManager.setServer(this.io);
    this.eventDispatcher.setServer(this.io);

    // Apply Authentication Middleware
    this.io.use(socketAuthMiddleware);

    // Handle Connection Lifecycle
    this.io.on('connection', (socket: Socket) => {
      const user = socket.data.user;
      if (!user) return; // Should be impossible due to auth middleware

      logger.info(`Socket connected: User ${user.id} (Role: ${user.role}, Org: ${user.organizationId})`, {
        socketId: socket.id,
        userId: user.id,
        organizationId: user.organizationId
      });

      // 1. Join Default Rooms
      socket.join(`user_${user.id}`);
      socket.join(`org_${user.organizationId}`);
      
      if (['ORG_ADMIN', 'OPERATOR', 'SUPER_ADMIN'].includes(user.role)) {
        if (this.roomManager.joinAdminRoom(socket)) {
          const snapshot = FleetService.getInstance().getSnapshot(user.organizationId);
          socket.emit('fleet:snapshot', {
            eventId: crypto.randomUUID(),
            version: '1.0',
            timestamp: new Date().toISOString(),
            organizationId: user.organizationId,
            payload: snapshot
          });
        }
      }

      // 2. Mark Online
      this.presenceManager.markOnline(socket.id, user);

      // 3. Register Event Listeners
      socket.on('client:trip:join', async (payload: { tripId: string }, callback?: Function) => {
        try {
          if (!payload?.tripId) throw new Error('tripId is required');
          const joined = await this.roomManager.joinTripRoom(socket, payload.tripId);
          if (!joined) throw new Error('Unauthorized to join this trip');
          if (callback) callback({ status: 'success' });
        } catch (error: any) {
          logger.warn(`Trip join failed for User ${user.id}: ${error.message}`);
          socket.emit('server:error', { code: 'UNAUTHORIZED', message: error.message });
          if (callback) callback({ status: 'error', message: error.message });
        }
      });

      socket.on('client:trip:leave', (payload: { tripId: string }, callback?: Function) => {
        if (payload?.tripId) {
          socket.leave(`trip_${payload.tripId}`);
          logger.debug(`Socket ${socket.id} left room trip_${payload.tripId}`);
          if (callback) callback({ status: 'success' });
        }
      });

      // Register specific business handlers
      registerLocationHandlers(socket);
      registerNotificationHandlers(socket);
      registerETAHandlers(socket);
      registerAttendanceHandlers(socket);

      // 4. Handle Disconnect
      socket.on('disconnect', () => {
        logger.info(`Socket disconnected: User ${user.id}`, { socketId: socket.id });
        this.presenceManager.markOffline(socket.id, user);
      });
    });
  }

  public close(callback?: (err?: Error) => void): void {
    if (this.io) {
      this.io.close(callback);
      logger.info('SocketServer closed.');
    } else if (callback) {
      callback();
    }
  }
}

export default SocketServer;
