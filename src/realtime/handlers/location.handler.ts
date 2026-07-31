import { Socket as IOSocket } from 'socket.io';
import { SocketData } from '../types/socket.types';
import logger from '../../utils/logger';
import { 
  LocationUpdateSchema, 
  TripStartSchema,
  TripEndSchema,
  LocationStopSchema
} from '../types/location.types';
import { EventDispatcher } from '../services/event-dispatcher.service';
import { ETAEngineService } from '../services/eta-engine.service';

type Socket = IOSocket<any, any, any, SocketData>;

// In-memory cache to validate sequence numbers (Live Presence memory)
// In a distributed production env, this would be Redis.
const driverSequenceCache = new Map<string, number>();

export function registerLocationHandlers(socket: Socket) {
  const user = socket.data.user;

  socket.on('client:driver:trip:start', (payload: unknown, callback?: Function) => {
    try {
      if (user.role !== 'DRIVER') {
        throw new Error('Unauthorized: Only drivers can start trips');
      }

      const parsed = TripStartSchema.parse(payload);
      const { tripId } = parsed;

      // Security: Validate driver is assigned to trip and org matches (stubbed here)
      // For now, we trust the socket and join the room
      socket.data.activeTripId = tripId;
      socket.join(`trip_room:${tripId}`);
      
      // Reset sequence cache for this new trip
      driverSequenceCache.set(user.id, -1);

      logger.info(`Driver ${user.id} started trip ${tripId}`);
      if (callback) callback({ status: 'success' });
    } catch (error: any) {
      logger.warn(`Trip start failed for Driver ${user.id}: ${error.message}`);
      if (callback) callback({ status: 'error', message: error.message });
    }
  });

  socket.on('client:driver:location:update', (payload: unknown) => {
    try {
      if (user.role !== 'DRIVER') return;
      const tripId = socket.data.activeTripId;
      if (!tripId) return; // Ignore GPS updates if not in a trip

      const parsed = LocationUpdateSchema.parse(payload);
      
      // Sequence & Timestamp validation
      const lastSeq = driverSequenceCache.get(user.id) ?? -1;
      if (parsed.sequenceNumber <= lastSeq) {
        // Out of order or duplicate packet, drop it
        logger.debug(`Dropped out-of-order GPS packet from Driver ${user.id} (Seq: ${parsed.sequenceNumber})`);
        return;
      }
      
      // Clock skew validation (e.g., ignore timestamps from the future or way too old)
      const now = Date.now();
      if (parsed.timestamp > now + 60000 || parsed.timestamp < now - 3600000) {
         logger.warn(`Dropped skewed GPS packet from Driver ${user.id} (Timestamp: ${parsed.timestamp})`);
         return;
      }

      // Update sequence cache
      driverSequenceCache.set(user.id, parsed.sequenceNumber);

      // Broadcast to Room via EventDispatcher
      EventDispatcher.getInstance().broadcast(
        `trip_room:${tripId}`,
        'server:trip:location:updated',
        user.organizationId,
        parsed,
        tripId
      );

      // Process ETA
      ETAEngineService.getInstance().processLocationUpdate(user.organizationId, tripId, {
        latitude: parsed.latitude,
        longitude: parsed.longitude,
        speed: parsed.speed,
        heading: parsed.heading,
        accuracy: parsed.accuracy,
        timestamp: parsed.timestamp
      });

      // (Future: Persistence Strategy)
      // Send raw payload to a batch processor/queue to save to PostgreSQL

    } catch (error: any) {
      logger.warn(`Invalid location update from Driver ${user.id}: ${error.message}`);
    }
  });

  socket.on('client:driver:location:stop', (payload: unknown, callback?: Function) => {
    try {
      if (user.role !== 'DRIVER') return;
      const parsed = LocationStopSchema.parse(payload);
      const tripId = socket.data.activeTripId;
      
      logger.info(`Driver ${user.id} stopped location tracking. Reason: ${parsed.reason}`);
      
      if (tripId) {
        socket.leave(`trip_room:${tripId}`);
        socket.data.activeTripId = undefined;
      }

      if (callback) callback({ status: 'success' });
    } catch (error: any) {
      if (callback) callback({ status: 'error', message: error.message });
    }
  });

  socket.on('client:driver:trip:end', (payload: unknown, callback?: Function) => {
    try {
      if (user.role !== 'DRIVER') return;
      const parsed = TripEndSchema.parse(payload);
      
      if (socket.data.activeTripId === parsed.tripId) {
        socket.leave(`trip_room:${parsed.tripId}`);
        socket.data.activeTripId = undefined;
      }

      ETAEngineService.getInstance().clearTrip(parsed.tripId);

      logger.info(`Driver ${user.id} ended trip ${parsed.tripId}`);
      if (callback) callback({ status: 'success' });
    } catch (error: any) {
      if (callback) callback({ status: 'error', message: error.message });
    }
  });
}
