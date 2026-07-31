export interface SocketEventEnvelope<T = any> {
  eventId: string;
  version: string;
  timestamp: string;
  organizationId: string;
  tripId?: string;
  payload: T;
  correlationId?: string;
}

export interface UserContext {
  id: string;
  organizationId: string;
  role: string;
}

// Standardized data attached to every socket
export interface SocketData {
  user: UserContext;
  [key: string]: any;
}

