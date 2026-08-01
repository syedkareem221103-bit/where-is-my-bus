import { Server } from 'socket.io';
import { SocketEventEnvelope } from '../types/socket.types';
import crypto from 'crypto';
import logger from '../../utils/logger';

import { eventBus } from '../../utils/event-bus';

export class EventDispatcher {
  private static instance: EventDispatcher;
  private io: Server | null = null;

  private constructor() {}

  public static getInstance(): EventDispatcher {
    if (!EventDispatcher.instance) {
      EventDispatcher.instance = new EventDispatcher();
    }
    return EventDispatcher.instance;
  }

  public setServer(io: Server) {
    this.io = io;
  }

  /**
   * Builds the standardized event envelope
   */
  private createEnvelope<T>(organizationId: string, payload: T, tripId?: string, correlationId?: string): SocketEventEnvelope<T> {
    return {
      eventId: crypto.randomUUID(),
      version: '1.0',
      timestamp: new Date().toISOString(),
      organizationId,
      tripId,
      payload,
      correlationId,
    };
  }

  /**
   * Broadcasts an event to a specific room
   */
  public broadcast<T>(room: string, eventName: string, organizationId: string, payload: T, tripId?: string, correlationId?: string): void {
    if (!this.io) {
      logger.error('Cannot broadcast: EventDispatcher not initialized with Socket.IO Server');
      return;
    }

    const envelope = this.createEnvelope(organizationId, payload, tripId, correlationId);
    
    logger.debug(`Broadcasting ${eventName} to ${room}`, { 
      eventId: envelope.eventId, 
      organizationId,
      correlationId
    });
    
    this.io.to(room).emit(eventName, envelope);
    
    // Intercept and broadcast internally for aggregators
    eventBus.emitEvent('socket:broadcast', { room, eventName, organizationId, payload, tripId, correlationId });
  }

  // Common helpers for REST controllers
  
  public emitToUser<T>(userId: string, organizationId: string, eventName: string, payload: T): void {
    this.broadcast(`user_${userId}`, eventName, organizationId, payload);
  }

  public emitToOrg<T>(organizationId: string, eventName: string, payload: T): void {
    this.broadcast(`org_${organizationId}`, eventName, organizationId, payload);
  }
}
