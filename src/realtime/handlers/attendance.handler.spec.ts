import { AttendanceHandler } from './attendance.handler';
import { EventDispatcher } from '../services/event-dispatcher.service';
import { Server, Socket } from 'socket.io';
import crypto from 'crypto';

describe('AttendanceHandler', () => {
  let io: Server;
  let eventDispatcher: EventDispatcher;
  let handler: AttendanceHandler;
  let mockSocket: Partial<Socket>;
  let mockCallback: jest.Mock;

  beforeEach(() => {
    io = new Server();
    eventDispatcher = EventDispatcher.getInstance();
    eventDispatcher.setServer(io);
    jest.spyOn(eventDispatcher, 'broadcast').mockImplementation();
    
    handler = new AttendanceHandler(eventDispatcher);
    handler.clearCaches();
    
    mockSocket = {
      data: {
        user: { id: 'driver1', role: 'DRIVER', organizationId: 'org1' }
      }
    };
    mockCallback = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should process a valid PENDING to BOARDED transition and broadcast', async () => {
    const payload = {
      tripId: crypto.randomUUID(),
      studentId: crypto.randomUUID(),
      status: 'BOARDED',
      timestamp: Date.now(),
      eventId: crypto.randomUUID()
    };

    await handler.handleMarkAttendance(mockSocket as Socket, payload, mockCallback);

    expect(mockCallback).toHaveBeenCalledWith({
      success: true,
      eventId: payload.eventId,
      duplicate: false
    });

    expect(eventDispatcher.broadcast).toHaveBeenCalledWith(
      `trip_room:${payload.tripId}`,
      'server:attendance:updated',
      'org1',
      {
        tripId: payload.tripId,
        studentId: payload.studentId,
        status: payload.status,
        timestamp: payload.timestamp
      },
      payload.tripId
    );
  });

  it('should reject non-DRIVER users', async () => {
    mockSocket.data.user.role = 'PARENT';
    const payload = {
      tripId: crypto.randomUUID(),
      studentId: crypto.randomUUID(),
      status: 'BOARDED',
      timestamp: Date.now(),
      eventId: crypto.randomUUID()
    };

    await handler.handleMarkAttendance(mockSocket as Socket, payload, mockCallback);

    expect(mockCallback).toHaveBeenCalledWith(expect.objectContaining({
      success: false,
      message: 'Unauthorized: Only drivers can mark attendance'
    }));
    expect(eventDispatcher.broadcast).not.toHaveBeenCalled();
  });

  it('should safely return duplicate:true for idempotency keys', async () => {
    const payload = {
      tripId: crypto.randomUUID(),
      studentId: crypto.randomUUID(),
      status: 'BOARDED',
      timestamp: Date.now(),
      eventId: crypto.randomUUID()
    };

    await handler.handleMarkAttendance(mockSocket as Socket, payload, mockCallback);
    expect(mockCallback).toHaveBeenCalledWith(expect.objectContaining({ success: true, duplicate: false }));

    // Send exact same payload again
    await handler.handleMarkAttendance(mockSocket as Socket, payload, mockCallback);
    expect(mockCallback).toHaveBeenCalledWith(expect.objectContaining({ success: true, duplicate: true }));

    // Should only broadcast ONCE
    expect(eventDispatcher.broadcast).toHaveBeenCalledTimes(1);
  });

  it('should reject invalid state transitions (ALIGHTED -> BOARDED)', async () => {
    const tripId = crypto.randomUUID();
    const studentId = crypto.randomUUID();
    
    // 1. Mark Boarded
    await handler.handleMarkAttendance(mockSocket as Socket, {
      tripId, studentId, status: 'BOARDED', timestamp: Date.now() - 2000, eventId: crypto.randomUUID()
    }, mockCallback);

    // 2. Mark Alighted
    await handler.handleMarkAttendance(mockSocket as Socket, {
      tripId, studentId, status: 'ALIGHTED', timestamp: Date.now() - 1000, eventId: crypto.randomUUID()
    }, mockCallback);

    mockCallback.mockClear();
    
    // 3. Mark Boarded again (Invalid)
    await handler.handleMarkAttendance(mockSocket as Socket, {
      tripId, studentId, status: 'BOARDED', timestamp: Date.now(), eventId: crypto.randomUUID()
    }, mockCallback);

    expect(mockCallback).toHaveBeenCalledWith(expect.objectContaining({
      success: false,
      message: 'Invalid state transition from ALIGHTED to BOARDED'
    }));
  });

  it('should resolve conflicts using timestamp', async () => {
    const tripId = crypto.randomUUID();
    const studentId = crypto.randomUUID();
    
    // Device A sends BOARDED at timestamp 2000
    await handler.handleMarkAttendance(mockSocket as Socket, {
      tripId, studentId, status: 'BOARDED', timestamp: 2000, eventId: crypto.randomUUID()
    }, mockCallback);

    mockCallback.mockClear();

    // Device B sends BOARDED at timestamp 1000 (arrived late)
    await handler.handleMarkAttendance(mockSocket as Socket, {
      tripId, studentId, status: 'BOARDED', timestamp: 1000, eventId: crypto.randomUUID()
    }, mockCallback);

    expect(mockCallback).toHaveBeenCalledWith(expect.objectContaining({
      success: false,
      message: 'Outdated timestamp'
    }));
  });
});
