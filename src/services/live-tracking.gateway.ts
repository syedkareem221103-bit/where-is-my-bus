import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import env from '../config/env';
import logger from '../utils/logger';
import { UserPayload } from '../middlewares/auth.middleware';
import { initializeKeys } from '../utils/crypto';
import { LiveTrackingService } from './live-tracking.service';

export class LiveTrackingGateway {
  private static instance: LiveTrackingGateway;
  private io: Server | null = null;
  private trackingService: LiveTrackingService;
  private locationDebounceMap: Map<string, number> = new Map();

  private constructor() {
    this.trackingService = LiveTrackingService.getInstance();
  }

  public static getInstance(): LiveTrackingGateway {
    if (!LiveTrackingGateway.instance) {
      LiveTrackingGateway.instance = new LiveTrackingGateway();
    }
    return LiveTrackingGateway.instance;
  }

  public init(server: HttpServer): void {
    if (this.io) {
      logger.warn('LiveTrackingGateway already initialized');
      return;
    }

    this.io = new Server(server, {
      cors: {
        origin: '*', // Adjust for production environments
        methods: ['GET', 'POST'],
      },
    });

    // Enforce JWT Handshake Security on Connection
    this.io.use((socket: Socket, next) => {
      const token = socket.handshake.auth.token || socket.handshake.query.token;

      if (!token) {
        return next(new Error('Authentication failed: Token missing'));
      }

      try {
        const parsedToken = token.startsWith('Bearer ') ? token.split(' ')[1] : token as string;
        const { publicKey } = initializeKeys();
        const decoded = jwt.verify(parsedToken, publicKey, { algorithms: ['ES256'] }) as UserPayload;
        
        // Store immutable identity on socket.data
        socket.data.userId = decoded.id;
        socket.data.organizationId = decoded.organizationId;
        socket.data.role = decoded.role;
        
        next();
      } catch (error) {
        return next(new Error('Authentication failed: Invalid token'));
      }
    });

    this.io.on('connection', (socket: Socket) => {
      logger.info(`Socket connected: User ${socket.data.userId} (Org: ${socket.data.organizationId})`);

      socket.on('joinTrip', async (payload: { tripId: string }, callback?: Function) => {
        try {
          if (!payload || !payload.tripId) throw new Error('tripId is required');
          const isAllowed = await this.trackingService.authorizeJoinTrip(payload.tripId, socket.data);
          
          if (!isAllowed) {
            throw new Error('Unauthorized to join this trip');
          }

          const roomName = `trip:${payload.tripId}`;
          socket.join(roomName);
          logger.debug(`Socket joined room: ${roomName}`);
          
          if (callback) callback({ status: 'success', room: roomName });
        } catch (error: any) {
          if (callback) callback({ status: 'error', message: error.message });
          else socket.emit('error', { message: error.message });
        }
      });

      socket.on('joinDriver', (callback?: Function) => {
        if (socket.data.role !== 'DRIVER') {
          const err = 'Only drivers can join driver rooms';
          if (callback) return callback({ status: 'error', message: err });
          return socket.emit('error', { message: err });
        }
        const roomName = `driver:${socket.data.userId}`;
        socket.join(roomName);
        if (callback) callback({ status: 'success', room: roomName });
      });

      socket.on('joinParent', (callback?: Function) => {
        if (socket.data.role !== 'PARENT') {
          const err = 'Only parents can join parent rooms';
          if (callback) return callback({ status: 'error', message: err });
          return socket.emit('error', { message: err });
        }
        const roomName = `parent:${socket.data.userId}`;
        socket.join(roomName);
        if (callback) callback({ status: 'success', room: roomName });
      });

      socket.on('joinOrganization', (callback?: Function) => {
        if (socket.data.role !== 'ORG_ADMIN' && socket.data.role !== 'OPERATOR') {
          const err = 'Unauthorized to join organization room';
          if (callback) return callback({ status: 'error', message: err });
          return socket.emit('error', { message: err });
        }
        const roomName = `organization:${socket.data.organizationId}`;
        socket.join(roomName);
        if (callback) callback({ status: 'success', room: roomName });
      });

      socket.on('disconnect', () => {
        logger.info(`Socket disconnected: User ${socket.data.userId}`);
        if (socket.data.role === 'DRIVER') {
          this.trackingService.publishEvent(`organization:${socket.data.organizationId}`, 'driver.disconnected', {
            driverId: socket.data.userId,
            timestamp: new Date().toISOString(),
          });
        }
      });
      
      // Emit driver.connected if role is DRIVER
      if (socket.data.role === 'DRIVER') {
          this.trackingService.publishEvent(`organization:${socket.data.organizationId}`, 'driver.connected', {
            driverId: socket.data.userId,
            timestamp: new Date().toISOString(),
          });
      }
    });
  }

  // Internal method to be called ONLY by LiveTrackingService
  public broadcast(room: string, payload: any): void {
    if (!this.io) {
      logger.error('Cannot broadcast: LiveTrackingGateway is not initialized');
      return;
    }

    // Debounce ONLY trip.location.updated
    if (payload && payload.type === 'trip.location.updated' && room.startsWith('trip:')) {
      const now = Date.now();
      const lastBroadcast = this.locationDebounceMap.get(room) || 0;
      
      // Throttle to 1 event per second per trip
      if (now - lastBroadcast < 1000) {
        return; // Drop this broadcast to save bandwidth/CPU
      }
      this.locationDebounceMap.set(room, now);
      
      // Clean up old entries periodically to prevent memory leak
      if (this.locationDebounceMap.size > 1000) {
        for (const [key, timestamp] of this.locationDebounceMap.entries()) {
          if (now - timestamp > 60000) {
            this.locationDebounceMap.delete(key);
          }
        }
      }
    }

    this.io.to(room).emit('event', payload);
  }

  public close(callback?: (err?: Error) => void): void {
    if (this.io) {
      this.io.close(callback);
      logger.info('LiveTrackingGateway closed.');
    } else if (callback) {
      callback();
    }
  }
}

export default LiveTrackingGateway;
