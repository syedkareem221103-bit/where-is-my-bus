import { describe, it, expect, beforeEach } from 'vitest';
import { useSocketStore } from './useSocketStore';

describe('useSocketStore', () => {
  beforeEach(() => {
    // Reset state before each test
    useSocketStore.setState({
      status: 'DISCONNECTED',
      lastPing: null,
    });
  });

  it('should initialize with DISCONNECTED state', () => {
    expect(useSocketStore.getState().status).toBe('DISCONNECTED');
    expect(useSocketStore.getState().lastPing).toBeNull();
  });

  it('should update status correctly', () => {
    useSocketStore.getState().setStatus('CONNECTED');
    expect(useSocketStore.getState().status).toBe('CONNECTED');

    useSocketStore.getState().setStatus('RECONNECTING');
    expect(useSocketStore.getState().status).toBe('RECONNECTING');
  });

  it('should update lastPing correctly', () => {
    const now = Date.now();
    useSocketStore.getState().setLastPing(now);
    expect(useSocketStore.getState().lastPing).toBe(now);
  });
});
