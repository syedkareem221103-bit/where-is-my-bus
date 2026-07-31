import { Socket } from 'socket.io';
import { EventDispatcher } from '../services/event-dispatcher.service';
import logger from '../../utils/logger';
import { 
  NotificationAckPayloadSchema, 
  NotificationPayload, 
  NotificationAckPayload 
} from '../types/notification.types';

// In-memory offline queue bounded by 100 items per user to prevent leaks.
// For robust horizontal scaling, this would be backed by Redis.
const offlineQueueCache = new Map<string, NotificationPayload[]>();

export class NotificationHandler {
  private eventDispatcher: EventDispatcher;

  constructor(eventDispatcher: EventDispatcher) {
    this.eventDispatcher = eventDispatcher;
  }

  /**
   * Helper to add a payload to the offline queue
   */
  public enqueue(userId: string, payload: NotificationPayload) {
    let queue = offlineQueueCache.get(userId) || [];
    
    // Prevent duplicate entries
    if (!queue.some(n => n.notificationId === payload.notificationId)) {
      queue.push(payload);
    }

    // Bounded Queue logic: Cap at 100 per user
    if (queue.length > 100) {
      // Sort to remove the oldest items first
      queue.sort((a, b) => a.timestamp - b.timestamp);
      queue = queue.slice(queue.length - 100);
    }
    
    offlineQueueCache.set(userId, queue);
  }

  /**
   * Helper to dispatch offline queue upon reconnect
   */
  public flushOfflineQueue(userId: string, socket: Socket) {
    const queue = offlineQueueCache.get(userId) || [];
    if (queue.length === 0) return;

    const now = Date.now();
    const validQueue = queue.filter(payload => payload.expiresAt > now);
    
    offlineQueueCache.set(userId, validQueue); // immediately remove expired

    validQueue.forEach(payload => {
      // Direct emit to socket (bypassing dispatcher to avoid generating new eventId/correlationId envelope wrappers if we want raw)
      // Since EventDispatcher uses envelopes, we should ideally use EventDispatcher here too.
      // But EventDispatcher broadcast doesn't target a specific socket instance easily unless via room `user_${userId}`.
      // The socket is already in that room upon reconnect.
      socket.emit('server:notification:new', payload);
    });
    
    logger.debug(`Flushed ${validQueue.length} offline notifications for user ${userId}`);
  }

  /**
   * Handle incoming ACK from frontend
   */
  public handleNotificationAck(socket: Socket, payload: unknown, callback?: Function) {
    try {
      const user = socket.data.user;
      if (!user) {
        throw new Error('Unauthorized');
      }

      // 1. Validate payload
      const validData: NotificationAckPayload = NotificationAckPayloadSchema.parse(payload);

      // 2. Remove from offline queue
      const queue = offlineQueueCache.get(user.id) || [];
      const updatedQueue = queue.filter(n => n.notificationId !== validData.notificationId);
      offlineQueueCache.set(user.id, updatedQueue);

      // 3. (Reserved Analytics Stub)
      // emitLocalEvent('notification_acknowledged', { notificationId: validData.notificationId, userId: user.id });

      // 4. Acknowledge Success
      if (typeof callback === 'function') {
        callback({
          success: true,
          eventId: validData.notificationId,
          duplicate: false
        });
      }

    } catch (error: any) {
      logger.warn(`Failed to process notification ack: ${error.message}`);
      if (typeof callback === 'function') {
        callback({
          success: false,
          message: error.message || 'Invalid payload'
        });
      }
    }
  }

  // Exposed for testing
  public clearCaches() {
    offlineQueueCache.clear();
  }
}

import { EventDispatcher as RealtimeEventDispatcher } from '../services/event-dispatcher.service';

export const registerNotificationHandlers = (socket: Socket) => {
  const eventDispatcher = RealtimeEventDispatcher.getInstance();
  const handler = new NotificationHandler(eventDispatcher);

  socket.on('client:notification:ack', (payload, callback) => {
    handler.handleNotificationAck(socket, payload, callback);
  });

  // Automatically flush on connect/reconnect since this runs on 'connection'
  const userId = socket.data.user?.id;
  if (userId) {
    handler.flushOfflineQueue(userId, socket);
  }
};
