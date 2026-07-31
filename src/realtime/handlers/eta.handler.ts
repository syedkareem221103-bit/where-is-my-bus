import { Socket as IOSocket } from 'socket.io';
import { SocketData } from '../types/socket.types';
import { ETAEngineService } from '../services/eta-engine.service';
import { ClientETAStateRequestSchema } from '../types/eta.types';
import logger from '../../utils/logger';

type Socket = IOSocket<any, any, any, SocketData>;

export function registerETAHandlers(socket: Socket) {
  const user = socket.data.user;

  socket.on('client:eta:sync', (payload: unknown, callback?: Function) => {
    try {
      const parsed = ClientETAStateRequestSchema.parse(payload);
      
      // Verify the user is in the room
      if (!socket.rooms.has(`trip_room:${parsed.tripId}`)) {
        throw new Error('Unauthorized to sync ETA for this trip');
      }

      const snapshot = ETAEngineService.getInstance().getSnapshot(parsed.tripId);
      if (callback) {
          callback({ status: 'success', data: snapshot });
      }
    } catch (error: any) {
      logger.warn(`ETA Sync failed for user ${user.id}: ${error.message}`);
      if (callback) callback({ status: 'error', message: error.message });
    }
  });
}
