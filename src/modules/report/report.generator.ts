import { PrismaClient } from '@prisma/client';
import { Readable, PassThrough } from 'stream';
import { LocalStorageService } from '../../services/storage.service';
import { ExportEngine } from './export.engine';
import crypto from 'crypto';
import logger from '../../utils/logger';
import AuditService from '../../services/audit.service';
import { driverPerformanceService } from '../analytics/driver-performance.service';
import { RouteEfficiencyService } from '../analytics/route-efficiency.service';

const prisma = new PrismaClient();
const storage = LocalStorageService.getInstance();

export class ReportGenerator {
  /**
   * Generates a report and returns the execution record
   */
  public async generateReport(
    organizationId: string,
    reportType: string,
    format: string,
    subscriptionId?: string
  ) {
    // 1. Create execution record
    let execution = await prisma.reportExecution.create({
      data: {
        organizationId,
        subscriptionId,
        status: 'RUNNING',
      },
    });

    try {
      // 2. Fetch Data (mocking stream from DB for large datasets)
      // For this implementation we will simulate fetching from analytics or DB
      const dataStream = await this.fetchDataStream(organizationId, reportType);

      // 3. Generate file name and token
      const token = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      const fileName = `report_${organizationId}_${execution.id}.${format.toLowerCase()}`;
      
      const writeStream = storage.writeStream(fileName);

      // 4. Stream to export engine
      if (format === 'CSV') {
        await ExportEngine.streamToCsv(dataStream, writeStream);
      } else {
        await ExportEngine.streamToJson(dataStream, writeStream);
      }

      // 5. Finalize execution record
      const fileSize = storage.getFileSize(fileName);
      const tokenExpiresAt = new Date();
      tokenExpiresAt.setHours(tokenExpiresAt.getHours() + 24); // 24 hours expiry

      execution = await prisma.reportExecution.update({
        where: { id: execution.id },
        data: {
          status: 'SUCCESS',
          fileSize,
          tokenHash,
          tokenExpiresAt,
        },
      });
      
      await AuditService.getInstance().log({
        organizationId,
        userId: 'SYSTEM',
        action: 'REPORT_GENERATION_SUCCESS',
        details: { executionId: execution.id, reportType }
      });

      // 6. Notify subscribers if scheduled
      if (subscriptionId) {
        const sub = await prisma.reportSubscription.findUnique({
          where: { id: subscriptionId }
        });
        if (sub && sub.targetEmails.length > 0) {
          await this.notifySubscribers(sub.targetEmails, token);
        }
      }

      return { executionId: execution.id, token }; // token returned for on-demand
    } catch (error: any) {
      logger.error(`Report generation failed for execution ${execution.id}`, error);
      
      await prisma.reportExecution.update({
        where: { id: execution.id },
        data: {
          status: 'FAILED',
          errorMessage: error.message || 'Unknown error',
        },
      });
      
      await AuditService.getInstance().log({
        organizationId,
        userId: 'SYSTEM',
        action: 'REPORT_GENERATION_FAILED',
        details: { executionId: execution.id, reportType, error: error.message }
      });

      throw error;
    }
  }

  private async fetchDataStream(organizationId: string, reportType: string): Promise<Readable> {
    // In a real scenario, this would use prisma.$queryRaw to stream results 
    // or AnalyticsService querying historical data.
    // We mock a readable stream of objects here to satisfy streaming pipeline constraints.
    const pt = new PassThrough({ objectMode: true });
    
    // Simulate async data fetching
    process.nextTick(async () => {
      try {
        if (reportType === 'FLEET_UTILIZATION') {
          // Mock data
          pt.push({ date: new Date().toISOString(), metric: 'Active Vehicles', value: 12 });
          pt.push({ date: new Date().toISOString(), metric: 'Idle Time', value: '45m' });
        } else if (reportType === 'DRIVER_PERFORMANCE') {
          const data = await driverPerformanceService.getDriverRankings(organizationId, {
            timeRange: '30d',
            sortBy: 'score',
            sortOrder: 'desc'
          });
          data.forEach(d => pt.push(d));
        } else if (reportType === 'ROUTE_EFFICIENCY') {
          const data = await RouteEfficiencyService.getRouteEfficiency(organizationId, '30d');
          data.forEach(d => pt.push(d));
        } else {
          // ATTENDANCE_SUMMARY
          pt.push({ studentId: 'stu-1', present: 20, absent: 2 });
          pt.push({ studentId: 'stu-2', present: 19, absent: 3 });
        }
        pt.push(null); // End of stream
      } catch (err) {
        pt.destroy(err as Error);
      }
    });

    return pt;
  }

  private async notifySubscribers(emails: string[], token: string) {
    // We would integrate with the true NotificationService here.
    // For now we mock the dispatch.
    logger.info(`Sending report download link to ${emails.join(', ')}. Token: ${token}`);
  }
}

export const reportGenerator = new ReportGenerator();
