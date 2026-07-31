export interface LocationUpdatePayload {
  lat: number;
  lng: number;
  speed: number | null;
  heading: number | null;
  accuracy: number;
  timestamp: number;
  sequenceNumber: number;
}

export interface LocationStopPayload {
  reason: 'trip_ended' | 'error' | 'user_paused';
}

export interface LocationErrorPayload {
  code: number;
  message: string;
}

export interface TripStartPayload {
  tripId: string;
  vehicleId: string;
  initialLocation: {
    lat: number;
    lng: number;
  };
}

export interface TripEndPayload {
  tripId: string;
}
