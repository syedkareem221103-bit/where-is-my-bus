import { EtaEngine } from './eta.engine';
import { TripPing, Stop } from '@prisma/client';
import env from '../../config/env';

describe('EtaEngine', () => {
  let engine: EtaEngine;

  const stops: Stop[] = [
    {
      id: 'stop-1',
      name: 'Stop 1',
      latitude: 10.0,
      longitude: 20.0,
      sequenceOrder: 1,
      organizationId: 'org-1',
      routeId: 'route-1',
    },
    {
      id: 'stop-2',
      name: 'Stop 2',
      latitude: 10.1, // roughly 11km north
      longitude: 20.0,
      sequenceOrder: 2,
      organizationId: 'org-1',
      routeId: 'route-1',
    },
    {
      id: 'stop-3',
      name: 'Stop 3',
      latitude: 10.2, // roughly 22km north
      longitude: 20.0,
      sequenceOrder: 3,
      organizationId: 'org-1',
      routeId: 'route-1',
    },
  ];

  beforeEach(() => {
    engine = new EtaEngine();
    env.ETA_DEFAULT_SPEED_KMH = 20;
  });

  describe('calculateEta', () => {
    it('should return empty result if no stops are provided', () => {
      const ping = {
        latitude: 10.0,
        longitude: 20.0,
        speed: 40,
        timestamp: new Date(),
      } as TripPing;

      const result = engine.calculateEta(ping, []);
      expect(result.nextStop).toBeNull();
      expect(result.remainingStops.length).toBe(0);
      expect(result.confidence).toBe('LOW');
    });

    it('should calculate ETA with HIGH confidence for fresh ping with speed', () => {
      const ping = {
        latitude: 10.0, // Exactly at stop 1
        longitude: 20.0,
        speed: 60, // 60 km/h = 1 km/min
        timestamp: new Date(),
      } as TripPing;

      const result = engine.calculateEta(ping, stops);

      expect(result.confidence).toBe('HIGH');
      expect(result.nextStop?.id).toBe('stop-1');
      expect(result.nextStop?.etaMinutes).toBe(0);
      
      // Stop 2 is ~11km away, should take ~11 mins
      expect(result.remainingStops[0].id).toBe('stop-2');
      expect(result.remainingStops[0].etaMinutes).toBeGreaterThan(10);
      expect(result.remainingStops[0].etaMinutes).toBeLessThan(13);
    });

    it('should calculate ETA with MEDIUM confidence for stale ping (>5 mins)', () => {
      const ping = {
        latitude: 10.0,
        longitude: 20.0,
        speed: 60,
        timestamp: new Date(Date.now() - 6 * 60000), // 6 minutes ago
      } as TripPing;

      const result = engine.calculateEta(ping, stops);

      expect(result.confidence).toBe('MEDIUM');
    });

    it('should use fallback speed and LOW confidence if speed is 0', () => {
      const ping = {
        latitude: 10.0,
        longitude: 20.0,
        speed: 0,
        timestamp: new Date(),
      } as TripPing;

      const result = engine.calculateEta(ping, stops);

      expect(result.confidence).toBe('LOW');
      // With fallback 20km/h (1km/3min), 11km takes ~33 mins
      expect(result.remainingStops[0].etaMinutes).toBeGreaterThan(30);
      expect(result.remainingStops[0].etaMinutes).toBeLessThan(35);
    });

    it('should filter out stops before currentStopSequence', () => {
      const ping = {
        latitude: 10.0, // Bus is physically near stop 1
        longitude: 20.0,
        speed: 40,
        timestamp: new Date(),
      } as TripPing;

      // But the state machine says we are already at stop 2!
      const result = engine.calculateEta(ping, stops, 2);

      // Stop 1 should be completely ignored
      expect(result.nextStop?.id).toBe('stop-2');
      expect(result.remainingStops.length).toBe(1);
      expect(result.remainingStops[0].id).toBe('stop-3');
    });

    it('should find closest stop when currentStopSequence is undefined', () => {
      const ping = {
        latitude: 10.11, // Bus is physically near stop 2
        longitude: 20.0,
        speed: 40,
        timestamp: new Date(),
      } as TripPing;

      const result = engine.calculateEta(ping, stops);

      expect(result.nextStop?.id).toBe('stop-2');
      expect(result.remainingStops.length).toBe(1);
      expect(result.remainingStops[0].id).toBe('stop-3');
    });
  });
});
