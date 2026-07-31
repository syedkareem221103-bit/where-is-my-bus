import { NotificationHandler } from './notification.handler';
import { EventDispatcher } from '../services/event-dispatcher.service';
import { Server, Socket } from 'socket.io';
import crypto from 'crypto';
import { NotificationCategory } from '../types/notification.types';

describe('NotificationHandler', () => {
  let io: Server;
  let eventDispatcher: EventDispatcher;
  let handler: NotificationHandler;
  let mockSocket: Partial<Socket>;
  let mockCallback: jest.Mock;
  let mockEmit: jest.Mock;

  beforeEach(() => {
    io = new Server();
    eventDispatcher = EventDispatcher.getInstance();
    eventDispatcher.setServer(io);
    
    handler = new NotificationHandler(eventDispatcher);
    handler.clearCaches();
    
    mockEmit = jest.fn();
    mockSocket = {
      data: {
        user: { id: 'parent1', role: 'PARENT' }
      },
      emit: mockEmit
    };
    mockCallback = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should enqueue payloads and flush valid ones on reconnect', () => {
    const payload = {
      notificationId: crypto.randomUUID(),
      tripId: crypto.randomUUID(),
      category: 'ATTENDANCE',
      priority: 'HIGH' as const,
      title: 'Test',
      body: 'Test Body',
      timestamp: Date.now(),
      expiresAt: Date.now() + 10000 // Future
    };

    handler.enqueue('parent1', payload);
    
    handler.flushOfflineQueue('parent1', mockSocket as Socket);

    expect(mockEmit).toHaveBeenCalledWith('server:notification:new', payload);
  });

  it('should prevent duplicate items in the queue', () => {
    const payload = {
      notificationId: 'duplicate-id',
      tripId: crypto.randomUUID(),
      category: 'ETA',
      priority: 'NORMAL' as const,
      title: 'Test',
      body: 'Test Body',
      timestamp: Date.now(),
      expiresAt: Date.now() + 10000
    };

    handler.enqueue('parent1', payload);
    handler.enqueue('parent1', payload); // duplicate
    
    handler.flushOfflineQueue('parent1', mockSocket as Socket);

    expect(mockEmit).toHaveBeenCalledTimes(1);
  });

  it('should enforce the 100 item queue limit, removing oldest first', () => {
    for (let i = 0; i < 150; i++) {
      handler.enqueue('parent1', {
        notificationId: `id-${i}`,
        tripId: 'test',
        category: 'SYSTEM',
        priority: 'LOW',
        title: 'Test',
        body: 'Test',
        timestamp: i, // Oldest have lower timestamp
        expiresAt: Date.now() + 10000
      });
    }

    handler.flushOfflineQueue('parent1', mockSocket as Socket);

    // Only 100 should remain
    expect(mockEmit).toHaveBeenCalledTimes(100);
    // The very first item (timestamp 0) should be dropped
    expect(mockEmit).not.toHaveBeenCalledWith('server:notification:new', expect.objectContaining({ timestamp: 0 }));
    // The last item (timestamp 149) should be present
    expect(mockEmit).toHaveBeenCalledWith('server:notification:new', expect.objectContaining({ timestamp: 149 }));
  });

  it('should drop expired items during flush', () => {
    const payload1 = {
      notificationId: crypto.randomUUID(),
      category: 'ATTENDANCE',
      priority: 'HIGH' as const,
      title: 'Valid',
      body: 'Body',
      timestamp: Date.now(),
      expiresAt: Date.now() + 10000 // Future
    };

    const payload2 = {
      notificationId: crypto.randomUUID(),
      category: 'ATTENDANCE',
      priority: 'HIGH' as const,
      title: 'Expired',
      body: 'Body',
      timestamp: Date.now(),
      expiresAt: Date.now() - 10000 // Past
    };

    handler.enqueue('parent1', payload1);
    handler.enqueue('parent1', payload2);
    
    handler.flushOfflineQueue('parent1', mockSocket as Socket);

    expect(mockEmit).toHaveBeenCalledTimes(1);
    expect(mockEmit).toHaveBeenCalledWith('server:notification:new', payload1);
  });

  it('should remove items from queue upon ACK', () => {
    const notificationId = crypto.randomUUID();
    const payload = {
      notificationId,
      category: 'ETA',
      priority: 'NORMAL' as const,
      title: 'Test',
      body: 'Test',
      timestamp: Date.now(),
      expiresAt: Date.now() + 10000
    };

    // Add to queue
    handler.enqueue('parent1', payload);

    // Ack
    handler.handleNotificationAck(mockSocket as Socket, {
      notificationId,
      timestamp: Date.now()
    }, mockCallback);

    expect(mockCallback).toHaveBeenCalledWith(expect.objectContaining({ success: true }));

    // Flush - queue should be empty
    handler.flushOfflineQueue('parent1', mockSocket as Socket);
    expect(mockEmit).not.toHaveBeenCalled();
  });

  it('should reject invalid ACKs', () => {
    handler.handleNotificationAck(mockSocket as Socket, {
      // missing notificationId
      timestamp: Date.now()
    }, mockCallback);

    expect(mockCallback).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
  });
});
