import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useMarkerInterpolation } from './useMarkerInterpolation';

describe('useMarkerInterpolation', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should immediately snap to first location if no previous location exists', () => {
    const targetLocation = {
      tripId: '1', lat: 10, lng: 10, speed: 0, heading: 0, timestamp: Date.now(), sequenceNumber: 1
    };
    
    const { result } = renderHook(() => useMarkerInterpolation(targetLocation, true));
    
    expect(result.current).toEqual({ lat: 10, lng: 10 });
  });

  it('should handle null target location gracefully', () => {
    const { result } = renderHook(() => useMarkerInterpolation(null, true));
    expect(result.current).toBeNull();
  });
});
