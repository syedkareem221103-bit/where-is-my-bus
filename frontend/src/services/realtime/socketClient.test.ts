/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach } from 'vitest';
import { socketClient } from './socketClient';
import { useSocketStore } from '../../store/useSocketStore';

describe('SocketClient Offline Queue', () => {
  beforeEach(() => {
    // Reset singleton internal state for testing
    (socketClient as any).offlineQueue = [];
    (socketClient as any).socket = null; 
    useSocketStore.setState({ status: 'DISCONNECTED' });
  });

  it('should queue events when disconnected', () => {
    socketClient.emit('test_event', { data: 1 });
    const queue = (socketClient as any).offlineQueue;
    expect(queue.length).toBe(1);
    expect(queue[0].event).toBe('test_event');
  });

  it('should bound the queue to 100 items (drop oldest, keep newest)', () => {
    // Emit 105 events
    for (let i = 0; i < 105; i++) {
      socketClient.emit('test_event', i);
    }

    const queue = (socketClient as any).offlineQueue;
    expect(queue.length).toBe(100);
    
    // The oldest 5 should be dropped. 
    // The queue should contain events from 5 to 104.
    expect(queue[0].args[0]).toBe(5);
    expect(queue[99].args[0]).toBe(104);
  });
});
