import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import { calculateDistance } from './distanceUtils';
import { gpsManager } from './gpsManager';

describe('Location Services', () => {
  describe('distanceUtils', () => {
    it('should calculate distance correctly between two points', () => {
      // New York (40.7128, -74.0060) to London (51.5074, -0.1278)
      // Distance is approx 5570 km
      const dist = calculateDistance(40.7128, -74.0060, 51.5074, -0.1278);
      expect(dist).toBeGreaterThan(5500000);
      expect(dist).toBeLessThan(5600000);
    });

    it('should return 0 for same coordinates', () => {
      const dist = calculateDistance(10, 10, 10, 10);
      expect(dist).toBe(0);
    });
  });

  describe('gpsManager', () => {
    let mockWatchPosition: Mock;
    let mockClearWatch: Mock;

    beforeEach(() => {
      mockWatchPosition = vi.fn();
      mockClearWatch = vi.fn();
      
      const geo = {
        watchPosition: mockWatchPosition,
        clearWatch: mockClearWatch
      };
      
      vi.stubGlobal('navigator', { geolocation: geo });
    });

    afterEach(() => {
      vi.unstubAllGlobals();
      gpsManager.stopTracking();
    });

    it('should initialize watchPosition when startTracking is called', () => {
      const onLocation = vi.fn();
      const onError = vi.fn();

      gpsManager.startTracking(onLocation, onError);

      expect(mockWatchPosition).toHaveBeenCalled();
      const options = mockWatchPosition.mock.calls[0][2];
      expect(options.enableHighAccuracy).toBe(true);
      expect(options.timeout).toBe(10000);
      expect(options.maximumAge).toBe(5000);
    });

    it('should clear watch on stopTracking', () => {
      mockWatchPosition.mockReturnValue(123);
      gpsManager.startTracking(vi.fn(), vi.fn());
      
      gpsManager.stopTracking();
      expect(mockClearWatch).toHaveBeenCalledWith(123);
    });

    it('should drop inaccurate fixes (>50m) except first fix', () => {
      const onLocation = vi.fn();
      gpsManager.startTracking(onLocation, vi.fn());

      const successCallback = mockWatchPosition.mock.calls[0][0];

      // 1st fix: highly inaccurate but should be accepted as it's the first fix
      successCallback({
        coords: { latitude: 10, longitude: 10, accuracy: 100, speed: 0, heading: 0 },
        timestamp: 1000
      });
      expect(onLocation).toHaveBeenCalledTimes(1);

      // 2nd fix: highly inaccurate, should be DROPPED
      successCallback({
        coords: { latitude: 10, longitude: 10, accuracy: 100, speed: 0, heading: 0 },
        timestamp: 2000
      });
      expect(onLocation).toHaveBeenCalledTimes(1);

      // 3rd fix: accurate, should be processed (subject to throttling, but let's assume it passes time checks)
      successCallback({
        coords: { latitude: 11, longitude: 11, accuracy: 10, speed: 50, heading: 0 },
        timestamp: 60000 // force it past throttle threshold
      });
      expect(onLocation).toHaveBeenCalledTimes(2);
    });
  });
});
