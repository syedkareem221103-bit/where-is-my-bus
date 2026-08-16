import { Request, Response, NextFunction } from 'express';
import { PrismaClient, Prisma } from '@prisma/client';
import { AlertFilterSchema, UpdateAlertStatusSchema } from './alert.types';
import AlertProcessingService from './alert.processing.service';

const prisma = new PrismaClient();

export class AlertController {
  
  public static async getAlerts(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = req.user!.organizationId || (req.user as any).org;
      const filters = AlertFilterSchema.parse(req.query);

      const where: Prisma.SmartAlertWhereInput = {
        organizationId: orgId,
      };

      if (filters.status) where.status = filters.status;
      if (filters.priority) where.priority = filters.priority;
      if (filters.category) where.category = filters.category;
      if (filters.tripId) where.tripId = filters.tripId;

      if (filters.startDate || filters.endDate) {
        where.createdAt = {};
        if (filters.startDate) where.createdAt.gte = new Date(filters.startDate);
        if (filters.endDate) where.createdAt.lte = new Date(filters.endDate);
      }

      const alerts = await prisma.smartAlert.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 100 // pagination simplistic limit
      });

      res.json(alerts);
    } catch (error) {
      next(error);
    }
  }

  public static async acknowledgeAlert(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = req.user!.organizationId || (req.user as any).org;
      const userId = req.user!.id || (req.user as any).sub;
      const id = req.params.id;
      const alert = await AlertProcessingService.acknowledgeAlert(orgId, id, userId);
      res.json(alert);
    } catch (error) {
      next(error);
    }
  }

  public static async resolveAlert(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = req.user!.organizationId || (req.user as any).org;
      const userId = req.user!.id || (req.user as any).sub;
      const id = req.params.id;
      const { resolutionNotes } = UpdateAlertStatusSchema.parse(req.body);
      
      const alert = await AlertProcessingService.resolveAlert(orgId, id, userId, resolutionNotes);
      res.json(alert);
    } catch (error) {
      next(error);
    }
  }
}
