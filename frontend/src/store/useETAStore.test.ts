import { useETAStore } from './useETAStore';
import type { ETAPayload } from '../types/eta.types';

describe('useETAStore', () => {
  beforeEach(() => {
    useETAStore.getState().clearETA();
  });

  const createPayload = (seq: number, ts: number): ETAPayload => ({
    tripId: 'trip-1',
    nextStopId: 'stop-1',
    estimatedArrivalAt: Date.now() + 60000,
    remainingDistanceMeters: 500,
    remainingTimeSeconds: 60,
    confidence: 'HIGH',
    isDelayed: false,
    snapshotVersion: 1,
    sequenceNumber: seq,
    timestamp: ts
  });

  it('should accept the initial ETA update', () => {
    const payload = createPayload(1, Date.now());
    useETAStore.getState().updateETA(payload);
    
    expect(useETAStore.getState().currentETA).toEqual(payload);
  });

  it('should reject stale sequence numbers', () => {
    const payload1 = createPayload(5, Date.now());
    useETAStore.getState().updateETA(payload1);
    
    // Older sequence number
    const payload2 = createPayload(4, Date.now() + 1000);
    useETAStore.getState().updateETA(payload2);
    
    expect(useETAStore.getState().currentETA?.sequenceNumber).toBe(5);
  });

  it('should reject stale timestamps if sequence is same (duplicate edge case)', () => {
    const ts = Date.now();
    const payload1 = createPayload(5, ts);
    useETAStore.getState().updateETA(payload1);
    
    const payload2 = createPayload(5, ts - 1000);
    useETAStore.getState().updateETA(payload2);
    
    expect(useETAStore.getState().currentETA?.timestamp).toBe(ts);
  });
});
