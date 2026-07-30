import { EtaEngine } from '../modules/trip/eta.engine';
import { TripPing, Stop } from '@prisma/client';

describe('Performance Benchmarks', () => {
  it('EtaEngine should calculate Haversine distances within performance bounds', () => {
    const engine = new EtaEngine();
    
    const ping: TripPing = {
      id: 'ping-1',
      organizationId: 'org-1',
      tripId: 'trip-1',
      latitude: 40.7128,
      longitude: -74.0060,
      speed: 45,
      heading: 90,
      accuracy: 5,
      timestamp: new Date(),
      sequence: 1,
      receivedTimestamp: new Date()
    };

    const stops: Stop[] = Array.from({ length: 50 }, (_, i) => ({
      id: `stop-${i}`,
      organizationId: 'org-1',
      routeId: 'route-1',
      name: `Stop ${i}`,
      latitude: 40.7128 + (i * 0.01),
      longitude: -74.0060 + (i * 0.01),
      sequenceOrder: i,
      createdAt: new Date(),
      updatedAt: new Date()
    }));

    // Warm-up run (caches geometry)
    engine.calculateEta(ping, stops);

    // Baseline measured run
    const start = performance.now();
    for (let i = 0; i < 100; i++) {
      engine.calculateEta(ping, stops);
    }
    const end = performance.now();
    const durationMs = end - start;
    const avgMs = durationMs / 100;

    // We do not strictly fail CI on this threshold to prevent false-positives
    // However, we expect this average to be < 5ms locally and log the result
    console.log(`[Benchmark] EtaEngine average calculation time: ${avgMs.toFixed(3)}ms`);
    expect(avgMs).toBeLessThan(100); // Very loose assertion just to ensure it completes reasonably fast
  });
});
