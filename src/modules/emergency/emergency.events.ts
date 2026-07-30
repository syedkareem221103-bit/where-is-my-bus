export const EmergencyEvents = {
  CREATED: 'emergency.created',
  ACKNOWLEDGED: 'emergency.acknowledged',
  RESPONDING: 'emergency.responding',
  RESOLVED: 'emergency.resolved',
  CANCELLED: 'emergency.cancelled',
};

export interface EmergencyEventPayload {
  organizationId: string;
  emergencyId: string;
  tripId: string;
  reporterId: string;
  category: string;
  severity: string;
  status: string;
  correlationId: string;
  timestamp: string;
  latitude?: number;
  longitude?: number;
}
