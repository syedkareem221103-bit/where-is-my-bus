import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTrackingStore } from '../../store/useTrackingStore';
import { useTripSubscription } from '../../hooks/tracking/useTripSubscription';
import { useMarkerInterpolation } from '../../hooks/tracking/useMarkerInterpolation';
import { useRouteDeviation } from '../../hooks/tracking/useRouteDeviation';
import { LiveMap, type MapConfig } from '../maps/LiveMap';
import { BusMarker, HomeMarker, SchoolMarker, RoutePolyline } from '../maps/MapMarkers';
import { ConnectionIndicator, ETACard, DriverStatusCard, TrackingStatusBanner } from './TrackingUI';

interface TrackingDashboardProps {
  tripId: string;
}

const mapConfig: MapConfig = {
  provider: 'leaflet', // Default placeholder
  theme: 'light',
  defaultZoom: 14
};

// Mock fetcher for trip server state (React Query)
const fetchTripDetails = async (tripId: string) => {
  // In a real implementation, this hits the backend REST API
  return {
    id: tripId,
    driverName: 'John Doe',
    vehiclePlate: 'XYZ-123',
    route: [
      { lat: 40.7128, lng: -74.0060 },
      { lat: 40.7138, lng: -74.0050 },
      { lat: 40.7148, lng: -74.0040 }
    ],
    schoolLocation: { lat: 40.7150, lng: -74.0030 },
    homeLocation: { lat: 40.7120, lng: -74.0070 }
  };
};

export const TrackingDashboard: React.FC<TrackingDashboardProps> = ({ tripId }) => {
  // 1. Server State (React Query)
  const { data: tripDetails, isLoading } = useQuery({
    queryKey: ['trip', tripId],
    queryFn: () => fetchTripDetails(tripId)
  });

  // 2. Real-time Subscription
  useTripSubscription(tripId);

  // 3. Live State (Zustand)
  const tripLiveState = useTrackingStore(state => state.trips[tripId]);
  
  // 4. Interpolation & Deviation Hooks
  const interpolatedLocation = useMarkerInterpolation(
    tripLiveState?.lastKnownLocation || null,
    tripLiveState?.isLive || false
  );

  useRouteDeviation(
    tripId,
    tripLiveState?.lastKnownLocation || null,
    tripDetails?.route || []
  );

  // Memoize map center
  const mapCenter = useMemo(() => {
    if (interpolatedLocation) return interpolatedLocation;
    if (tripDetails?.schoolLocation) return tripDetails.schoolLocation;
    return { lat: 0, lng: 0 };
  }, [interpolatedLocation, tripDetails]);

  if (isLoading) {
    return <div className="p-8 text-center text-slate-500">Loading trip details...</div>;
  }

  if (!tripDetails) {
    return <div className="p-8 text-center text-red-500">Trip not found.</div>;
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] w-full bg-slate-50 relative">
      {/* Header Overlay */}
      <div className="absolute top-4 left-4 right-4 z-20 pointer-events-none flex justify-between items-start">
        <div className="flex flex-col w-full max-w-lg pointer-events-auto gap-2">
          {tripLiveState && (
            <TrackingStatusBanner 
              isDeviated={tripLiveState.isDeviated}
              isDriverOffline={tripLiveState.isDriverOffline}
              emergency={tripLiveState.emergency}
              gpsAccuracy={tripLiveState.lastKnownLocation?.accuracy}
            />
          )}
          
          <div className="flex gap-4 w-full">
            <DriverStatusCard 
              driverName={tripDetails.driverName}
              vehiclePlate={tripDetails.vehiclePlate}
              status={tripLiveState?.status || 'Waiting'}
            />
            <ETACard 
              etaMinutes={tripLiveState?.isLive ? 12 : null} // Placeholder ETA logic
              distanceKm={tripLiveState?.isLive ? 2.4 : null}
            />
          </div>
        </div>

        <div className="pointer-events-auto">
          <ConnectionIndicator />
        </div>
      </div>

      {/* Map Layer */}
      <div className="flex-1 w-full h-full relative z-0">
        <LiveMap config={mapConfig} center={mapCenter}>
          <RoutePolyline 
            path={tripDetails.route} 
            isDeviated={tripLiveState?.isDeviated}
          />
          <SchoolMarker lat={tripDetails.schoolLocation.lat} lng={tripDetails.schoolLocation.lng} />
          <HomeMarker lat={tripDetails.homeLocation.lat} lng={tripDetails.homeLocation.lng} />
          
          {interpolatedLocation && (
            <BusMarker 
              lat={interpolatedLocation.lat} 
              lng={interpolatedLocation.lng} 
              heading={tripLiveState?.lastKnownLocation?.heading}
              speed={tripLiveState?.lastKnownLocation?.speed}
              accuracy={tripLiveState?.lastKnownLocation?.accuracy}
              isOffline={tripLiveState?.isDriverOffline}
            />
          )}
        </LiveMap>
      </div>
    </div>
  );
};
