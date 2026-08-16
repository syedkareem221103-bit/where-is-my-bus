import * as cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import { reportGenerator } from './report.generator';
import { reportService } from './report.service';
import logger from '../../utils/logger';
import AuditService from '../../services/audit.service';

const prisma = new PrismaClient();

export class ReportScheduler {
  private cronJob: cron.ScheduledTask | null = null;
  private isProcessing = false;
  private lastCleanupRun = 0;

  /**
   * Initializes the cron job to check for due reports every minute.
   */
  public start() {
    if (this.cronJob) return;

    logger.info('Starting ReportScheduler...');
    
    // Check every minute
    this.cronJob = cron.schedule('* * * * *', async () => {
      if (this.isProcessing) return; // Prevent overlap if processing takes > 1m
      this.isProcessing = true;
      try {
        await this.processDueSubscriptions();
        await this.processRetries();
        
        const now = Date.now();
        if (now - this.lastCleanupRun > 24 * 60 * 60 * 1000) {
          await this.processCleanup();
          this.lastCleanupRun = now;
        }
      } catch (err) {
        logger.error('Error in ReportScheduler loop', err);
      } finally {
        this.isProcessing = false;
      }
    });
  }

  public stop() {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
      logger.info('Stopped ReportScheduler.');
    }
  }

  private async processDueSubscriptions() {
    const now = new Date();

    // In a multi-node environment, this requires a distributed lock or SKIP LOCKED query.
    // For this implementation, we fetch active subscriptions due for run.
    const dueSubscriptions = await prisma.reportSubscription.findMany({
      where: {
        isActive: true,
        nextRunAt: { lte: now },
      },
    });

    for (const sub of dueSubscriptions) {
      try {
        // Calculate next run immediately to prevent duplicate runs
        const nextRunAt = reportService.calculateNextRun(sub.frequency);
        
        // Optimistic lock update to claim the job
        const updated = await prisma.reportSubscription.updateMany({
          where: {
            id: sub.id,
            nextRunAt: sub.nextRunAt // ensure it hasn't been updated by another instance
          },
          data: {
            nextRunAt,
          }
        });

        if (updated.count > 0) {
          // Claimed successfully, execute report
          await reportGenerator.generateReport(
            sub.organizationId,
            sub.reportType,
            sub.format,
            sub.id
          );
        }
      } catch (err) {
        logger.error(`Failed to process subscription ${sub.id}`, err);
      }
    }
  }

  private async processRetries() {
    const maxRetries = 3;
    const baseDelayMs = 15 * 60 * 1000; // 15 mins
    const now = new Date();

    const failedExecutions = await prisma.reportExecution.findMany({
      where: {
        status: 'FAILED',
        retryCount: { lt: maxRetries }
      },
      include: { subscription: true }
    });

    for (const exec of failedExecutions) {
      if (!exec.subscription) continue;

      // Exponential backoff: 15m, 30m, 60m
      const backoffDelayMs = Math.pow(2, exec.retryCount) * baseDelayMs;
      if (now.getTime() - exec.updatedAt.getTime() < backoffDelayMs) {
        continue;
      }

      try {
        // [CRITICAL FIX] Optimistic lock update to claim the retry job
        const updated = await prisma.reportExecution.updateMany({
          where: { 
            id: exec.id,
            status: 'FAILED',
            retryCount: exec.retryCount // ensures no other node claimed it
          },
          data: {
            status: 'RUNNING',
            retryCount: { increment: 1 }
          }
        });
        
        if (updated.count > 0) {
          await AuditService.getInstance().log({
            organizationId: exec.organizationId,
            userId: 'SYSTEM',
            action: 'REPORT_EXECUTION_RETRY',
            details: { executionId: exec.id, retryCount: exec.retryCount + 1 }
          });

          await reportGenerator.generateReport(
            exec.organizationId,
            exec.subscription.reportType,
            exec.subscription.format,
            exec.subscription.id
          );
        }
      } catch (err) {
        logger.error(`Failed to retry execution ${exec.id}`, err);
      }
    }
  }

  private async processCleanup() {
    const retentionDays = 30;
    const threshold = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

    try {
      // Find old executions
      const oldExecutions = await prisma.reportExecution.findMany({
        where: { createdAt: { lt: threshold } },
        select: { id: true, organizationId: true }
      });

      if (oldExecutions.length > 0) {
        const ids = oldExecutions.map(e => e.id);
        
        // We delete from DB, LocalStorageService can implement file cleanup if needed
        await prisma.reportExecution.deleteMany({
          where: { id: { in: ids } }
        });
        
        for (const exec of oldExecutions) {
          await AuditService.getInstance().log({
             organizationId: exec.organizationId,
             userId: 'SYSTEM',
             action: 'REPORT_EXECUTION_CLEANUP',
             details: { executionId: exec.id }
          });
        }
        
        logger.info(`Cleaned up ${ids.length} expired report executions.`);
      }
    } catch (err) {
      logger.error('Failed to cleanup old reports', err);
    }
  }
}

export const reportScheduler = new ReportScheduler();
