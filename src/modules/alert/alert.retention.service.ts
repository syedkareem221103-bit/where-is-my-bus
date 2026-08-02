import { PrismaClient } from '@prisma/client';
import cron from 'node-cron';
import logger from '../../utils/logger';

const prisma = new PrismaClient();

export class AlertRetentionService {
  private static instance: AlertRetentionService;
  
  // 90 days in milliseconds
  private readonly RETENTION_DAYS = 90;

  private constructor() {
    this.scheduleCleanup();
  }

  public static getInstance(): AlertRetentionService {
    if (!AlertRetentionService.instance) {
      AlertRetentionService.instance = new AlertRetentionService();
    }
    return AlertRetentionService.instance;
  }

  private scheduleCleanup() {
    // Run nightly at 2:00 AM
    cron.schedule('0 2 * * *', async () => {
      await this.cleanupExpiredAlerts();
    });
    logger.info('AlertRetentionService: Scheduled nightly cleanup job for 90-day retention.');
  }

  public async cleanupExpiredAlerts() {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.RETENTION_DAYS);

      // We should ideally iterate per organization to log properly to DataPurgeLog
      // But for simplicity in this implementation, we can group or do a bulk delete.
      const orgs = await prisma.organization.findMany({ select: { organizationId: true } });

      for (const org of orgs) {
        const result = await prisma.smartAlert.deleteMany({
          where: {
            organizationId: org.organizationId,
            createdAt: { lt: cutoffDate },
            status: { not: 'ACTIVE' }
          }
        });

        if (result.count > 0) {
          logger.info(`AlertRetentionService: Purged ${result.count} expired alerts for org ${org.organizationId}.`);
          
          // Log to DataPurgeLog
          await prisma.dataPurgeLog.create({
            data: {
              organizationId: org.organizationId,
              purgedEntity: 'SmartAlert',
              purgedId: 'BATCH_CLEANUP',
              purgedBy: 'SYSTEM_CRON',
            }
          });
        }
      }
    } catch (error) {
      logger.error('AlertRetentionService: Failed to cleanup expired alerts', { error });
    }
  }
}

export default AlertRetentionService.getInstance();
