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

    return prisma.reportSubscription.create({
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
  public async deleteSubscription(organizationId: string, subscriptionId: string) {
    // Verify ownership
    const sub = await prisma.reportSubscription.findUnique({
      where: { id: subscriptionId },
    });

    if (!sub || sub.organizationId !== organizationId) {
      throw new Error('Subscription not found or unauthorized');
    }

    await prisma.reportSubscription.delete({
      where: { id: subscriptionId },
    });
    
    // Note: the relation is SetNull for ReportExecution, so executions remain.
    return { success: true };
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
