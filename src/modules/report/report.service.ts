import { PrismaClient } from '@prisma/client';
import { CreateReportSubscriptionDTO } from './report.types';
import logger from '../../utils/logger';

const prisma = new PrismaClient();

export class ReportService {
  /**
   * Create a new report subscription
   */
  public async createSubscription(
    organizationId: string,
    creatorId: string,
    data: CreateReportSubscriptionDTO
  ) {
    logger.info(`Creating report subscription for org ${organizationId}`, { data });
    
    // Simple next run calculation based on frequency
    const nextRunAt = this.calculateNextRun(data.frequency);

    return prisma.$transaction(async (tx) => {
      const subscription = await tx.reportSubscription.create({
        data: {
          organizationId,
          creatorId,
          reportType: data.reportType,
          frequency: data.frequency,
          format: data.format,
          targetEmails: data.targetEmails,
          nextRunAt,
        },
      });

      await tx.auditLog.create({
        data: {
          organizationId,
          userId: creatorId,
          action: 'REPORT_SUBSCRIPTION_CREATED',
          metadata: { subscriptionId: subscription.id, reportType: data.reportType },
          ipAddress: '127.0.0.1'
        }
      });

      return subscription;
    });
  }

  /**
   * Get all active subscriptions for an organization
   */
  public async getSubscriptions(organizationId: string) {
    return prisma.reportSubscription.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Delete a subscription
   */
  public async deleteSubscription(organizationId: string, subscriptionId: string, userId: string) {
    return prisma.$transaction(async (tx) => {
      // Verify ownership
      const sub = await tx.reportSubscription.findUnique({
        where: { id: subscriptionId },
      });

      if (!sub || sub.organizationId !== organizationId) {
        throw new Error('Subscription not found or unauthorized');
      }

      await tx.reportSubscription.delete({
        where: { id: subscriptionId },
      });
      
      await tx.auditLog.create({
        data: {
          organizationId,
          userId,
          action: 'REPORT_SUBSCRIPTION_DELETED',
          metadata: { subscriptionId },
          ipAddress: '127.0.0.1'
        }
      });
      
      return { success: true };
    });
  }

  /**
   * Get execution history
   */
  public async getExecutions(organizationId: string, limit = 50) {
    return prisma.reportExecution.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        subscription: true
      }
    });
  }

  /**
   * Calculate next run time based on frequency
   */
  public calculateNextRun(frequency: string): Date {
    const now = new Date();
    switch (frequency) {
      case 'DAILY':
        now.setDate(now.getDate() + 1);
        now.setHours(8, 0, 0, 0); // 8 AM next day
        break;
      case 'WEEKLY':
        now.setDate(now.getDate() + 7);
        now.setHours(8, 0, 0, 0);
        break;
      case 'MONTHLY':
        now.setMonth(now.getMonth() + 1);
        now.setHours(8, 0, 0, 0);
        break;
      default:
        now.setDate(now.getDate() + 1);
    }
    return now;
  }
}

export const reportService = new ReportService();
