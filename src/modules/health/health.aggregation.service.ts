import Redis from 'ioredis';
import { SystemHealthPayload, HealthStatus, ServiceHealth } from './health.types';
import { SystemMetricsCollector } from './system.metrics.collector';
import { HealthCheckRegistry } from './health.check.registry';
import { EventDispatcher } from '../../realtime/services/event-dispatcher.service';

import { prisma } from '../../config/database';

let redis: Redis;

if (process.env.NODE_ENV === 'test') {
  const RedisMock = require('ioredis-mock');
  redis = new RedisMock();
} else {
  redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
}

export class HealthAggregationService {
  private static CACHE_KEY = 'system:health:current';

  /**
   * Performs deep evaluation of the system, updates cache, and returns payload.
   */
  public static async evaluateAndCache(): Promise<SystemHealthPayload> {
    const [pgHealth, redisHealth] = await Promise.all([
      this.checkPostgres(),
      this.checkRedis(),
    ]);

    const cpu = SystemMetricsCollector.getCpuUsage();
    const memory = SystemMetricsCollector.getMemoryUsage();
    const eventLoopDelay = await SystemMetricsCollector.getEventLoopDelay();

    const services = HealthCheckRegistry.getInstance().getAllServices();

    // Mock business logic for active trips/sockets since counting in real time across cluster requires specific setup
    const activeTrips = await prisma.trip.count({ where: { status: { in: ['STARTED', 'EN_ROUTE'] } } }).catch(() => 0);
    
    let errorRate = 0; // Would be pulled from an APM or custom middleware counter
    let queueBacklog = 0;

    let globalStatus: HealthStatus = 'HEALTHY';

    // 1. Evaluate offline/critical infra
    if (pgHealth.status === 'OFFLINE' || redisHealth.status === 'OFFLINE') {
      globalStatus = 'OFFLINE';
    } else if (pgHealth.status === 'CRITICAL' || redisHealth.status === 'CRITICAL' || eventLoopDelay > 500) {
      globalStatus = 'CRITICAL';
    } else if (cpu > 85 || eventLoopDelay > 100 || pgHealth.status === 'DEGRADED') {
      globalStatus = 'DEGRADED';
    } else if (cpu > 70 || eventLoopDelay > 20 || pgHealth.status === 'WARNING') {
      globalStatus = 'WARNING';
    }

    // Evaluate domain services
    for (const service of Object.values(services)) {
      if (service.status === 'CRITICAL' && globalStatus !== 'OFFLINE') {
        globalStatus = 'CRITICAL';
      }
    }

    const payload: SystemHealthPayload = {
      globalStatus,
      timestamp: new Date().toISOString(),
      infrastructure: {
        postgres: pgHealth,
        redis: redisHealth,
      },
      runtime: {
        cpu,
        memory,
        eventLoopDelay,
      },
      services,
      business: {
        activeTrips,
        connectedDrivers: 0, // Mock
        activeSockets: 0, // Mock
        queueBacklog,
      },
      errorRate,
    };

    // Cache in Redis for fast API retrieval
    if (redisHealth.status !== 'OFFLINE') {
      await redis.set(this.CACHE_KEY, JSON.stringify(payload), 'EX', 60); // 1 min expiry
    }

    // Broadcast globally to SUPER_ADMINs
    try {
      EventDispatcher.getInstance().broadcast('super_admin_system', 'health.updated', 'SYSTEM', payload);
    } catch (e) {
      // Ignore if socket dispatcher not ready
    }

    return payload;
  }

  public static async getCachedHealth(): Promise<SystemHealthPayload | null> {
    try {
      const cached = await redis.get(this.CACHE_KEY);
      if (cached) return JSON.parse(cached);
    } catch (e) {
      // Redis offline
    }
    return null;
  }

  private static async checkPostgres(): Promise<ServiceHealth> {
    const start = Date.now();
    try {
      await prisma.$queryRaw`SELECT 1`;
      const latencyMs = Date.now() - start;
      let status: HealthStatus = 'HEALTHY';
      if (latencyMs > 200) status = 'DEGRADED';
      else if (latencyMs > 50) status = 'WARNING';

      return { status, latencyMs, updatedAt: new Date().toISOString() };
    } catch (e: any) {
      return { status: 'OFFLINE', message: e.message, updatedAt: new Date().toISOString() };
    }
  }

  private static async checkRedis(): Promise<ServiceHealth> {
    const start = Date.now();
    try {
      await redis.ping();
      const latencyMs = Date.now() - start;
      return { status: 'HEALTHY', latencyMs, updatedAt: new Date().toISOString() };
    } catch (e: any) {
      return { status: 'OFFLINE', message: e.message, updatedAt: new Date().toISOString() };
    }
  }

  public static shutdown(): void {
    if (redis) redis.disconnect();
  }
}
