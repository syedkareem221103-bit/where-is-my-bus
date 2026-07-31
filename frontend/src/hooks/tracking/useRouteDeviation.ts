import { useEffect, useRef } from 'react';
import type { LocationUpdatePayload } from '../../types/tracking.types';
import { calculateDistance } from '../../services/location/distanceUtils';
import { useTrackingStore } from '../../store/useTrackingStore';

const DEVIATION_THRESHOLD_METERS = 150;



export function useRouteDeviation(
  tripId: string,
  currentLocation: LocationUpdatePayload | null,
  routePolyline: { lat: number; lng: number }[]
) {
  const setDeviation = useTrackingStore((state) => state.setDeviation);
  const isDeviatedRef = useRef(false);

  useEffect(() => {
    if (!tripId || !currentLocation || !routePolyline || routePolyline.length < 2) return;

    let minDistanceMeters = Infinity;

    for (let i = 0; i < routePolyline.length - 1; i++) {
      const p1 = routePolyline[i];
      const p2 = routePolyline[i + 1];

      // Approximate the closest point on the segment
      const dx = p2.lng - p1.lng;
      const dy = p2.lat - p1.lat;
      const lenSq = dx * dx + dy * dy;

      let t = 0;
      if (lenSq !== 0) {
        t = ((currentLocation.lng - p1.lng) * dx + (currentLocation.lat - p1.lat) * dy) / lenSq;
      }
      
      t = Math.max(0, Math.min(1, t));

      const closestLat = p1.lat + t * dy;
      const closestLng = p1.lng + t * dx;

      const dist = calculateDistance(currentLocation.lat, currentLocation.lng, closestLat, closestLng);
      if (dist < minDistanceMeters) {
        minDistanceMeters = dist;
      }
    }

    const isDeviated = minDistanceMeters > DEVIATION_THRESHOLD_METERS;

    if (isDeviated !== isDeviatedRef.current) {
      isDeviatedRef.current = isDeviated;
      setDeviation(tripId, isDeviated);
    }
  }, [tripId, currentLocation, routePolyline, setDeviation]);
}
