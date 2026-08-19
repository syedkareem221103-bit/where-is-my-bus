import cron from 'node-cron';
import Redis from 'ioredis';
import { HealthAggregationService } from './health.aggregation.service';
import { HealthAlertService } from './health.alert.service';
import logger from '../../utils/logger';

let redis: Redis;

if (process.env.NODE_ENV === 'test') {
  const RedisMock = require('ioredis-mock');
  redis = new RedisMock();
} else {
  redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
}

import { prisma } from '../../config/database';


export class HealthScheduler {
  private static LOCK_KEY = 'system:health:snapshot:lock';
  private static tasks: any[] = [];

  public static initialize(): void {
    // Every 10 seconds: Deep evaluation, cache in Redis, broadcast over Socket.IO, check alerts
    this.tasks.push(cron.schedule('*/10 * * * * *', async () => {
      try {
        const payload = await HealthAggregationService.evaluateAndCache();
        await HealthAlertService.evaluateStateTransition(payload);
      } catch (e) {
        logger.error('Health live evaluation failed', { error: e });
      }
    }));

    // Every hour: Leader election to persist snapshot
    this.tasks.push(cron.schedule('0 * * * *', async () => {
      try {
        // Distributed lock for 30 seconds to ensure only one node writes the hourly snapshot
        const acquired = await redis.set(this.LOCK_KEY, 'locked', 'EX', 30, 'NX');
        if (acquired) {
          logger.info('[HealthScheduler] Acquired lock. Persisting hourly health snapshot...');
          const payload = await HealthAggregationService.getCachedHealth();
          
          if (payload) {
            await prisma.systemHealthSnapshot.create({
              data: {
                cpuUsage: payload.runtime.cpu,
                memoryUsage: payload.runtime.memory,
                activeSockets: payload.business.activeSockets,
                activeTrips: payload.business.activeTrips,
                errorRate: payload.errorRate,
                status: payload.globalStatus,
                metricsPayload: payload as any,
              }
            });
            logger.info('[HealthScheduler] Hourly health snapshot persisted successfully.');
          }
        }
      } catch (e) {
        logger.error('Failed to persist hourly health snapshot', { error: e });
      }
    }));

    // Every night at 3 AM: Purge snapshots older than 90 days
    this.tasks.push(cron.schedule('0 3 * * *', async () => {
      try {
        const acquired = await redis.set('system:health:retention:lock', 'locked', 'EX', 60, 'NX');
        if (acquired) {
          const cutoffDate = new Date();
          cutoffDate.setDate(cutoffDate.getDate() - 90);
          
          const result = await prisma.systemHealthSnapshot.deleteMany({
            where: {
              timestamp: { lt: cutoffDate }
            }
          });
          logger.info(`[HealthScheduler] Purged ${result.count} historical health snapshots older than 90 days.`);
        }
      } catch (e) {
        logger.error('Failed to purge historical health snapshots', { error: e });
      }
    }));
  }

  public static shutdown(): void {
    this.tasks.forEach(t => t.stop());
    if (redis) redis.disconnect();
  }
}
