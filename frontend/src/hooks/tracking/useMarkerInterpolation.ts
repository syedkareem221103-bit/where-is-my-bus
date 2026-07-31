import { useState, useEffect, useRef } from 'react';
import type { LocationUpdatePayload } from '../../types/tracking.types';
import { calculateDistance } from '../../services/location/distanceUtils';

export function useMarkerInterpolation(
  targetLocation: LocationUpdatePayload | null,
  isTrackingActive: boolean
) {
  const [currentPosition, setCurrentPosition] = useState<{ lat: number; lng: number } | null>(
    targetLocation ? { lat: targetLocation.lat, lng: targetLocation.lng } : null
  );

  const animationFrameRef = useRef<number | null>(null);
  const lastTargetRef = useRef<LocationUpdatePayload | null>(null);

  useEffect(() => {
    if (!isTrackingActive || !targetLocation) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      return;
    }

    if (!lastTargetRef.current) {
      // First fix, snap immediately
      setCurrentPosition({ lat: targetLocation.lat, lng: targetLocation.lng });
      lastTargetRef.current = targetLocation;
      return;
    }

    // Check if target has actually changed
    if (
      lastTargetRef.current.lat === targetLocation.lat &&
      lastTargetRef.current.lng === targetLocation.lng
    ) {
      return;
    }

    // Outlier Rejection: Distance check (> 150km/h ~ 40m/s implies a massive jump if the update is e.g. 3s later)
    const distance = calculateDistance(
      lastTargetRef.current.lat,
      lastTargetRef.current.lng,
      targetLocation.lat,
      targetLocation.lng
    );

    const timeDiffMs = targetLocation.timestamp - lastTargetRef.current.timestamp;
    if (timeDiffMs > 0) {
      const impliedSpeedMps = distance / (timeDiffMs / 1000);
      if (impliedSpeedMps > 45) { // ~ 162 km/h - impossible bus jump
        // Ignore the outlier jump
        return;
      }
    }

    const startPosition = currentPosition || { lat: lastTargetRef.current.lat, lng: lastTargetRef.current.lng };
    const endPosition = { lat: targetLocation.lat, lng: targetLocation.lng };
    const startTime = performance.now();
    // Default to 1000ms animation for smooth transition
    const durationMs = 1000;

    const animate = (time: number) => {
      const elapsed = time - startTime;
      const progress = Math.min(elapsed / durationMs, 1);
      
      // Easing function (linear for now)
      const lat = startPosition.lat + (endPosition.lat - startPosition.lat) * progress;
      const lng = startPosition.lng + (endPosition.lng - startPosition.lng) * progress;

      setCurrentPosition({ lat, lng });

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate);
      }
    };

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    // Only animate if browser tab is visible to save battery
    if (document.visibilityState === 'visible') {
      animationFrameRef.current = requestAnimationFrame(animate);
    } else {
      // Snap instantly if tab is hidden
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCurrentPosition(endPosition);
    }

    lastTargetRef.current = targetLocation;

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [targetLocation, isTrackingActive, currentPosition]);

  return currentPosition;
}
