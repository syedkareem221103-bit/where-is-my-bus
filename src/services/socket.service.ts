import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import env from '../config/env';
import logger from '../utils/logger';
import { UserPayload } from '../middlewares/auth.middleware';
import { initializeKeys } from '../utils/crypto';

export class SocketService {
  private static instance: SocketService;
  private io: Server | null = null;

  private constructor() {}

  public static getInstance(): SocketService {
    if (!SocketService.instance) {
      SocketService.instance = new SocketService();
    }
    return SocketService.instance;
  }

  public init(server: HttpServer): void {
    if (this.io) {
      logger.warn('Socket.io server already initialized');
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
        const parsedToken = token.startsWith('Bearer ') ? token.split(' ')[1] : token;
        const { publicKey } = initializeKeys();
        const decoded = jwt.verify(parsedToken, publicKey, { algorithms: ['ES256'] }) as UserPayload;
        socket.data.user = decoded;
        next();
      } catch (error) {
        return next(new Error('Authentication failed: Invalid token'));
      }
    });

    this.io.on('connection', (socket: Socket) => {
      const user = socket.data.user as UserPayload;
      logger.info(`Socket connected: User ${user.email} (ID: ${user.id}) joined`);

      // Passenger room subscription: Join room 'trip:{tripId}'
      socket.on('join_trip', (data: { tripId: string }) => {
        if (!data.tripId) {
          socket.emit('error_message', 'Trip ID is required');
          return;
        }
        socket.join(`trip:${data.tripId}`);
        logger.debug(`Socket client joined room: trip:${data.tripId}`);
        socket.emit('joined', { room: `trip:${data.tripId}` });
      });

      // Passenger room unsubscription: Leave room
      socket.on('leave_trip', (data: { tripId: string }) => {
        socket.leave(`trip:${data.tripId}`);
        logger.debug(`Socket client left room: trip:${data.tripId}`);
        socket.emit('left', { room: `trip:${data.tripId}` });
      });

      socket.on('disconnect', () => {
        logger.info(`Socket disconnected: User ${user.email}`);
      });
    });
  }

  // Emits real-time locations to all passengers subscribed to 'trip:{tripId}'
  public broadcastLocation(tripId: string, payload: {
    latitude: number;
    longitude: number;
    speedKmh: number | null;
    timestamp: Date;
  }): void {
    if (!this.io) {
      logger.error('Cannot broadcast: Socket.io server is not initialized');
      return;
    }

    this.io.to(`trip:${tripId}`).emit('location_update', payload);
    logger.debug(`Real-time coordinate broadcasted for trip ${tripId}: ${JSON.stringify(payload)}`);
  }
}

export default SocketService;
