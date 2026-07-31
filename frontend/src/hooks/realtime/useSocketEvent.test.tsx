import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useSocketEvent } from './useSocketEvent';
import { socketClient } from '../../services/realtime/socketClient';
import { listenerRegistry } from '../../services/realtime/listenerRegistry';

// Mock the socketClient and listenerRegistry
vi.mock('../../services/realtime/socketClient', () => ({
  socketClient: {
    getSocket: vi.fn(),
  },
}));

vi.mock('../../services/realtime/listenerRegistry', () => ({
  listenerRegistry: {
    addListener: vi.fn(),
    removeListener: vi.fn(),
  },
}));

describe('useSocketEvent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should register event listener if successfully added to registry', () => {
    const mockOn = vi.fn();
    const mockOff = vi.fn();
    const mockSocket = { on: mockOn, off: mockOff };

    vi.mocked(socketClient.getSocket as unknown as () => typeof mockSocket).mockReturnValue(mockSocket);
    vi.mocked(listenerRegistry.addListener).mockReturnValue(true);

    const callback = vi.fn();
    const { unmount } = renderHook(() => useSocketEvent('test_event', callback));

    // Verify registry was checked
    expect(listenerRegistry.addListener).toHaveBeenCalledWith('test_event', callback);
    
    // Verify socket.on was called
    expect(mockOn).toHaveBeenCalledWith('test_event', callback);

    // Unmount should trigger cleanup
    unmount();
    
    expect(listenerRegistry.removeListener).toHaveBeenCalledWith('test_event', callback);
    expect(mockOff).toHaveBeenCalledWith('test_event', callback);
  });

  it('should NOT register event listener if registry rejects it (duplicate)', () => {
    const mockOn = vi.fn();
    const mockOff = vi.fn();
    const mockSocket = { on: mockOn, off: mockOff };

    vi.mocked(socketClient.getSocket as unknown as () => typeof mockSocket).mockReturnValue(mockSocket);
    vi.mocked(listenerRegistry.addListener).mockReturnValue(false); // Duplicate

    const callback = vi.fn();
    renderHook(() => useSocketEvent('test_event', callback));

    expect(listenerRegistry.addListener).toHaveBeenCalledWith('test_event', callback);
    expect(mockOn).not.toHaveBeenCalled();
  });
});
