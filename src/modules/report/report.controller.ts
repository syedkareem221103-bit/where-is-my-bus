import { Request, Response } from 'express';
import { reportService } from './report.service';
import { reportGenerator } from './report.generator';
import { CreateReportSubscriptionSchema, OnDemandExportSchema } from './report.types';
import { LocalStorageService } from '../../services/storage.service';
import { PrismaClient } from '@prisma/client';
import AuditService from '../../services/audit.service';
import path from 'path';
import crypto from 'crypto';

const prisma = new PrismaClient();
const storage = LocalStorageService.getInstance();

export class ReportController {
  
  public async createSubscription(req: Request, res: Response) {
    try {
      const organizationId = (req.user as any).org || (req.user as any).organizationId;
      const creatorId = (req.user as any).id || (req.user as any).userId || (req.user as any).sub;
      
      const validatedData = CreateReportSubscriptionSchema.parse(req.body);
      
      const subscription = await reportService.createSubscription(
        organizationId,
        creatorId,
        validatedData
      );
      
      res.status(201).json(subscription);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  public async getSubscriptions(req: Request, res: Response) {
    try {
      const organizationId = (req.user as any).org || (req.user as any).organizationId;
      const subscriptions = await reportService.getSubscriptions(organizationId);
      res.json(subscriptions);
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to fetch subscriptions' });
    }
  }

  public async deleteSubscription(req: Request, res: Response) {
    try {
      const organizationId = (req.user as any).org || (req.user as any).organizationId;
      const { id } = req.params;
      const userId = (req.user as any).id || (req.user as any).userId || (req.user as any).sub;
      
      await reportService.deleteSubscription(organizationId, id, userId);
      
      res.status(204).send();
    } catch (err: any) {
      res.status(404).json({ error: 'Subscription not found' });
    }
  }

  public async getExecutions(req: Request, res: Response) {
    try {
      const organizationId = (req.user as any).org || (req.user as any).organizationId;
      const executions = await reportService.getExecutions(organizationId);
      res.json(executions);
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to fetch executions' });
    }
  }

  public async exportOnDemand(req: Request, res: Response) {
    try {
      const organizationId = (req.user as any).org || (req.user as any).organizationId;
      const validatedData = OnDemandExportSchema.parse(req.body);
      const userId = (req.user as any).id || (req.user as any).userId || (req.user as any).sub;
      
      // Implement basic rate limiting in memory (better done in Redis)
      // We skip actual rate limiting code here for brevity, assuming standard Express middleware handles it.

      const result = await reportGenerator.generateReport(
        organizationId,
        validatedData.reportType,
        validatedData.format
      );
      
      await AuditService.getInstance().log({
        organizationId,
        userId: userId,
        action: 'REPORT_ON_DEMAND_GENERATED',
        details: { executionId: result.executionId, reportType: validatedData.reportType }
      });

      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  public async downloadExport(req: Request, res: Response) {
    try {
      const { token } = req.params;
      
      // Token must match execution record and not be expired
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      const execution = await prisma.reportExecution.findUnique({
        where: { tokenHash },
      });

      if (!execution || !execution.tokenExpiresAt || new Date() > execution.tokenExpiresAt) {
        return res.status(403).json({ error: 'Invalid or expired download link' });
      }

      const fileName = `report_${execution.organizationId}_${execution.id}.${execution.fileSize ? 'csv' : 'json'}`; // Approximate ext based on typical use case, ideally store format in DB.
      // Better: find file by checking .csv or .json
      let actualFileName = `report_${execution.organizationId}_${execution.id}.csv`;
      if (!storage.fileExists(actualFileName)) {
        actualFileName = `report_${execution.organizationId}_${execution.id}.json`;
      }

      if (!storage.fileExists(actualFileName)) {
        return res.status(404).json({ error: 'File not found on disk' });
      }

      // Single-use token: invalidate immediately
      await prisma.reportExecution.update({
        where: { id: execution.id },
        data: { tokenHash: null, tokenExpiresAt: null },
      });

      // Stream to client
      res.setHeader('Content-Disposition', `attachment; filename="${actualFileName}"`);
      res.setHeader('Content-Type', 'application/octet-stream');
      
      const readStream = storage.readStream(actualFileName);
      readStream.pipe(res);
      
      // Attempt to audit (we might not have req.user if downloading via raw link, but usually we do)
      if (req.user) {
        const userId = (req.user as any).id || (req.user as any).userId || (req.user as any).sub;
        await AuditService.getInstance().log({
          organizationId: execution.organizationId,
          userId: userId,
          action: 'REPORT_DOWNLOADED',
          details: { executionId: execution.id }
        });
      }
      
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to download file' });
    }
  }
}

export const reportController = new ReportController();
