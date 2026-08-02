import { Request, Response, NextFunction } from 'express';
import { AnalyticsService } from './analytics.service';
import { AnalyticsFilterSchema } from './analytics.types';
import logger from '../../utils/logger';

export class AnalyticsController {
  static async getHistorical(req: Request, res: Response, next: NextFunction) {
    try {
      // @ts-ignore - Assuming auth middleware sets req.user
      const organizationId = req.user?.org || req.user?.organizationId;
      if (!organizationId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      
      const payload = {
        organizationId,
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string,
        routeIds: req.query.routeIds ? (req.query.routeIds as string).split(',') : undefined,
        driverIds: req.query.driverIds ? (req.query.driverIds as string).split(',') : undefined
      };
      
      const filter = AnalyticsFilterSchema.parse(payload);
      const data = await AnalyticsService.getInstance().getHistoricalKPIs(filter);
      
      res.json({ data });
    } catch (err: any) {
      logger.error('Error fetching historical analytics:', err);
      next(err);
    }
  }

  static async getLive(req: Request, res: Response, next: NextFunction) {
    try {
      // @ts-ignore
      const organizationId = req.user?.org || req.user?.organizationId;
      if (!organizationId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      
      const data = AnalyticsService.getInstance().getLiveKPIs(organizationId);
      res.json({ data });
    } catch (err: any) {
      logger.error('Error fetching live analytics:', err);
      next(err);
    }
  }
}
