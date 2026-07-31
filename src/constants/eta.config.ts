export const ETA_CONFIG = {
  ETA_BROADCAST_DELTA_SECONDS: 30, // Minimum time change required to trigger a broadcast
  MOVEMENT_THRESHOLD_METERS: 10,   // Minimum distance moved to process a new GPS ping
  GEOFENCE_APPROACHING_METERS: 500,// Radius to trigger approaching state
  GEOFENCE_ARRIVED_METERS: 50,     // Radius to trigger arrived state
  DELAY_STATIONARY_TIMEOUT_MS: 180000, // Trigger delay if speed=0 for 3 mins
  DELAY_ETA_INCREASE_THRESHOLD_MS: 300000, // Trigger delay if ETA grows by 5 mins
  DELAY_OFF_ROUTE_METERS: 150,     // Trigger delay if vehicle drifts off-route
  OFFLINE_TIMEOUT_MS: 30000,       // Mark vehicle offline if no GPS for this duration
  MAX_SPEED_KMH: 120,              // Used for noise filtering
  MIN_GPS_ACCURACY_METERS: 50,     // Ignore GPS pings with worse accuracy
};
