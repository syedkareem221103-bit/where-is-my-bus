import { calculateDistance } from './distanceUtils';
import type { LocationUpdatePayload } from '../../types/location.types';

export type GpsCallback = (location: Omit<LocationUpdatePayload, 'sequenceNumber'>) => void;
export type ErrorCallback = (error: GeolocationPositionError) => void;

class GpsManager {
  private static instance: GpsManager;
  private watchId: number | null = null;
  private lastSentLocation: { lat: number; lng: number; timestamp: number } | null = null;
  private lastSentTime = 0;
  private isFirstFix = true;
  private callback: GpsCallback | null = null;
  private errorCallback: ErrorCallback | null = null;

  private constructor() {}

  public static getInstance(): GpsManager {
    if (!GpsManager.instance) {
      GpsManager.instance = new GpsManager();
    }
    return GpsManager.instance;
  }

  public startTracking(onLocation: GpsCallback, onError: ErrorCallback): void {
    if (this.watchId !== null) {
      this.stopTracking();
    }

    if (!navigator.geolocation) {
      onError({
        code: 2,
        message: 'Geolocation is not supported by this browser.',
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3,
      } as GeolocationPositionError);
      return;
    }

    this.callback = onLocation;
    this.errorCallback = onError;
    this.isFirstFix = true;
    this.lastSentLocation = null;
    this.lastSentTime = 0;

    this.watchId = navigator.geolocation.watchPosition(
      this.handlePosition.bind(this),
      this.handleError.bind(this),
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000,
      }
    );
  }

  public stopTracking(): void {
    if (this.watchId !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    this.callback = null;
    this.errorCallback = null;
    this.isFirstFix = true;
  }

  private handlePosition(position: GeolocationPosition): void {
    const { latitude, longitude, accuracy, speed, heading } = position.coords;
    const timestamp = position.timestamp;

    // 1. Accuracy Filtering (>50m dropped, except first fix)
    if (accuracy > 50 && !this.isFirstFix) {
      return; // Ignore inaccurate fix
    }

    // Convert speed from m/s to km/h for thresholding
    const speedKmh = speed !== null ? speed * 3.6 : 0;

    // 2. Adaptive Broadcast Interval based on speed
    let requiredInterval = 10000; // Default slow: 10s
    if (speedKmh > 40) {
      requiredInterval = 3000; // High speed: 3s
    } else if (speedKmh > 10) {
      requiredInterval = 5000; // Mod speed: 5s
    } else if (speedKmh === 0) {
      requiredInterval = 60000; // Stationary: 60s
    }

    const timeSinceLastSend = timestamp - this.lastSentTime;

    // 3. Duplicate/Drift Suppression (<2m ignored)
    let movedEnough = true;
    if (this.lastSentLocation) {
      const distance = calculateDistance(
        latitude,
        longitude,
        this.lastSentLocation.lat,
        this.lastSentLocation.lng
      );
      if (distance < 2) {
        movedEnough = false;
      }
    }

    // If it hasn't been long enough for the required interval AND we didn't move much, skip.
    // However, if we just started, or time elapsed > required interval, we send it.
    if (!this.isFirstFix && timeSinceLastSend < requiredInterval && !movedEnough) {
      return; // Throttled
    }

    // Accept this fix
    this.isFirstFix = false;
    this.lastSentTime = timestamp;
    this.lastSentLocation = { lat: latitude, lng: longitude, timestamp };

    if (this.callback) {
      this.callback({
        lat: latitude,
        lng: longitude,
        speed,
        heading,
        accuracy,
        timestamp,
      });
    }
  }

  private handleError(error: GeolocationPositionError): void {
    if (this.errorCallback) {
      this.errorCallback(error);
    }
  }
}

export const gpsManager = GpsManager.getInstance();
