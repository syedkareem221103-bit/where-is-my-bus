import * as cron from 'node-cron';
import logger from '../../utils/logger';
import Redis from 'ioredis';

import { prisma } from '../../config/database';


export class AlertRetentionService {
  private static instance: AlertRetentionService;
  private redis: Redis;
  private cronTask: cron.ScheduledTask | null = null;
  
  // 90 days in milliseconds
  private readonly RETENTION_DAYS = 90;

  private constructor() {
    if (process.env.NODE_ENV === 'test') {
      const RedisMock = require('ioredis-mock');
      this.redis = new RedisMock();
    } else {
      this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    }
    this.scheduleCleanup();
  }

  public static getInstance(): AlertRetentionService {
    if (!AlertRetentionService.instance) {
      AlertRetentionService.instance = new AlertRetentionService();
    }
    return AlertRetentionService.instance;
  }

  private scheduleCleanup() {
    // Prevent node-cron from leaking timeouts in Jest test suites
    if (process.env.NODE_ENV === 'test') {
      logger.info('AlertRetentionService: Cleanup cron disabled in test environment.');
      return;
    }

    // Run nightly at 2:00 AM
    this.cronTask = cron.schedule('0 2 * * *', async () => {
      // Optimistic lock to prevent cluster duplicate runs
      const lockKey = `cron:lock:alert-retention:${new Date().toISOString().split('T')[0]}`;
      const lock = await this.redis.set(lockKey, '1', 'EX', 86400, 'NX');
      
      if (lock) {
        await this.cleanupExpiredAlerts();
      } else {
        logger.info('AlertRetentionService: Cleanup skipped, another cluster node already acquired lock.');
      }
    });
    logger.info('AlertRetentionService: Scheduled nightly cleanup job for 90-day retention.');
  }

  public async cleanupExpiredAlerts() {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.RETENTION_DAYS);

      // Asynchronous chunked retrieval could be added if organizations scale beyond tens of thousands.
      // Currently grabbing only the ID for iteration to limit memory usage.
      const orgs = await prisma.organization.findMany({ select: { organizationId: true } });

      for (const org of orgs) {
        await prisma.$transaction(async (tx) => {
          const result = await tx.smartAlert.deleteMany({
            where: {
              organizationId: org.organizationId,
              createdAt: { lt: cutoffDate },
              status: { not: 'ACTIVE' }
            }
          });

          if (result.count > 0) {
            logger.info(`AlertRetentionService: Purged ${result.count} expired alerts for org ${org.organizationId}.`);
            
            // Log to DataPurgeLog atomically
            await tx.dataPurgeLog.create({
              data: {
                organizationId: org.organizationId,
                purgedEntity: 'SmartAlert',
                purgedId: 'BATCH_CLEANUP',
                purgedBy: 'SYSTEM_CRON',
              }
            });
          }
        });
      }
    } catch (error) {
      logger.error('AlertRetentionService: Failed to cleanup expired alerts', { error });
    }
  }

  public shutdown(): void {
    if (this.cronTask) {
      this.cronTask.stop();
    }
    if (this.redis) {
      this.redis.disconnect();
    }
  }
}

export default AlertRetentionService.getInstance();
