import { HealthStatus as PrismaHealthStatus } from '@prisma/client';

export type HealthStatus = PrismaHealthStatus;

export interface ServiceHealth {
  status: HealthStatus;
  latencyMs?: number;
  message?: string;
  updatedAt: string;
}

export interface SystemHealthPayload {
  globalStatus: HealthStatus;
  timestamp: string;
  infrastructure: {
    postgres: ServiceHealth;
    redis: ServiceHealth;
  };
  runtime: {
    cpu: number;
    memory: number;
    eventLoopDelay: number;
  };
  services: Record<string, ServiceHealth>;
  business: {
    activeTrips: number;
    connectedDrivers: number;
    activeSockets: number;
    queueBacklog: number;
  };
  errorRate: number;
}
