/**
 * Shared Socket DTOs
 * Mirrored from the backend real-time architecture.
 */

export interface SocketEventEnvelope<T = unknown> {
  eventId: string;
  version: string;
  timestamp: string;
  organizationId: string;
  tripId?: string;
  payload: T;
  correlationId?: string;
}

export type ConnectionStatus =
  | 'DISCONNECTED'
  | 'CONNECTING'
  | 'CONNECTED'
  | 'RECONNECTING'
  | 'AUTH_FAILED'
  | 'OFFLINE';
