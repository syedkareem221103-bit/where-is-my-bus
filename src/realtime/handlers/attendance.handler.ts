import { Socket } from 'socket.io';
import { EventDispatcher } from '../services/event-dispatcher.service';
import {
  MarkAttendancePayloadSchema,
  AttendanceAck,
  AttendanceStatus,
  IdempotencyCacheRecord
} from '../types/attendance.types';
import logger from '../../utils/logger';

// In-memory idempotency cache (Mocking Redis for Sprint 5)
// key: eventId -> IdempotencyCacheRecord
const idempotencyCache = new Map<string, IdempotencyCacheRecord>();

// In-memory state tracking to validate sequence/state machine (Mocking DB for Sprint 5)
// key: tripId_studentId -> { status: AttendanceStatus, lastTimestamp: number }
const studentStateCache = new Map<string, { status: AttendanceStatus, lastTimestamp: number }>();

export class AttendanceHandler {
  constructor(private eventDispatcher: EventDispatcher) {}

  public handleMarkAttendance = async (
    socket: Socket,
    payload: any,
    callback: (ack: AttendanceAck) => void
  ) => {
    try {
      // 1. Role Enforcement (Only Drivers can mark attendance)
      const user = socket.data.user;
      if (!user || user.role !== 'DRIVER') {
        logger.warn(`Unauthorized attendance mark attempt by user ${user?.id || 'unknown'}`);
        if (typeof callback === 'function') {
          return callback({
            success: false,
            eventId: payload?.eventId || 'unknown',
            duplicate: false,
            message: 'Unauthorized: Only drivers can mark attendance'
          });
        }
        return;
      }

      // 2. Payload Validation
      const parseResult = MarkAttendancePayloadSchema.safeParse(payload);
      if (!parseResult.success) {
        logger.warn(`Invalid attendance payload format: ${parseResult.error.message}`);
        if (typeof callback === 'function') {
          return callback({
            success: false,
            eventId: payload?.eventId || 'unknown',
            duplicate: false,
            message: 'Invalid payload format'
          });
        }
        return;
      }

      const validData = parseResult.data;

      // 3. Idempotency Check
      if (idempotencyCache.has(validData.eventId)) {
        logger.info(`Duplicate attendance event ${validData.eventId} ignored.`);
        if (typeof callback === 'function') {
          return callback({
            success: true,
            eventId: validData.eventId,
            duplicate: true,
            message: 'Event already processed'
          });
        }
        return;
      }

      // 4. State Machine & Sequence Validation
      const stateKey = `${validData.tripId}_${validData.studentId}`;
      const currentState = studentStateCache.get(stateKey) || { status: 'PENDING', lastTimestamp: 0 };

      // Conflict Resolution using timestamp
      if (validData.timestamp <= currentState.lastTimestamp) {
        logger.warn(`Outdated attendance event ${validData.eventId} rejected.`);
        if (typeof callback === 'function') {
          return callback({
            success: false,
            eventId: validData.eventId,
            duplicate: false,
            message: 'Outdated timestamp'
          });
        }
        return;
      }

      // Validate Transition
      const isValidTransition = this.validateTransition(currentState.status, validData.status);
      if (!isValidTransition) {
        logger.warn(`Invalid attendance state transition from ${currentState.status} to ${validData.status}`);
        if (typeof callback === 'function') {
          return callback({
            success: false,
            eventId: validData.eventId,
            duplicate: false,
            message: `Invalid state transition from ${currentState.status} to ${validData.status}`
          });
        }
        return;
      }

      // 5. Update State (DB mock)
      studentStateCache.set(stateKey, {
        status: validData.status,
        lastTimestamp: validData.timestamp
      });

      // Update Idempotency Cache
      idempotencyCache.set(validData.eventId, {
        eventId: validData.eventId,
        processedAt: Date.now(),
        status: validData.status
      });

      // 6. Broadcast via EventDispatcher
      this.eventDispatcher.broadcast(
        `trip_room:${validData.tripId}`, 
        'server:attendance:updated', 
        user.organizationId,
        {
          tripId: validData.tripId,
          studentId: validData.studentId,
          status: validData.status,
          timestamp: validData.timestamp
        },
        validData.tripId
      );

      // 7. Acknowledge Success
      if (typeof callback === 'function') {
        callback({
          success: true,
          eventId: validData.eventId,
          duplicate: false
        });
      }

    } catch (error) {
      logger.error(`Error processing attendance: ${error}`);
      if (typeof callback === 'function') {
        callback({
          success: false,
          eventId: payload?.eventId || 'unknown',
          duplicate: false,
          message: 'Internal server error'
        });
      }
    }
  };

  /**
   * Validates if the transition from current status to new status is allowed.
   */
  private validateTransition(current: AttendanceStatus, next: AttendanceStatus): boolean {
    if (current === next) return true; // Technically redundant but safe
    
    switch (current) {
      case 'PENDING':
        return next === 'BOARDED' || next === 'ABSENT';
      case 'BOARDED':
        return next === 'ALIGHTED';
      case 'ALIGHTED':
        return false; // Terminal state
      case 'ABSENT':
        return false; // Terminal state
      default:
        return false;
    }
  }

  // Exposed for testing
  public clearCaches() {
    idempotencyCache.clear();
    studentStateCache.clear();
  }
}

import { EventDispatcher as RealtimeEventDispatcher } from '../services/event-dispatcher.service';

export const registerAttendanceHandlers = (socket: Socket) => {
  const eventDispatcher = RealtimeEventDispatcher.getInstance();
  const handler = new AttendanceHandler(eventDispatcher);

  socket.on('client:attendance:mark', (payload, callback) => {
    handler.handleMarkAttendance(socket, payload, callback);
  });
};
