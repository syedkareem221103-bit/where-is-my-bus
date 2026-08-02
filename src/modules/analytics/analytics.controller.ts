import { Request, Response, NextFunction } from 'express';
import { AnalyticsService } from './analytics.service';
import { driverPerformanceService } from './driver-performance.service';
import { RouteEfficiencyService } from './route-efficiency.service';
import { RouteReplayService } from './route-replay.service';
import { AnalyticsFilterSchema, GetDriverPerformanceSchema, RouteAnalyticsFilterSchema } from './analytics.types';
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

  static async getDriverPerformance(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = (req as any).user?.org || (req as any).user?.organizationId;
      if (!organizationId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Merge query and params if looking for specific driver via route param
      const query = {
        timeRange: req.query.timeRange || '30d',
        driverId: req.params.id || req.query.driverId,
        sortBy: req.query.sortBy || 'score',
        sortOrder: req.query.sortOrder || 'desc',
      };

      const validatedQuery = GetDriverPerformanceSchema.parse(query);
      const data = await driverPerformanceService.getDriverRankings(organizationId, validatedQuery);

      res.json(data);
    } catch (err: any) {
      logger.error('Error fetching driver performance:', err);
      next(err);
    }
  }

  static async getRoutePerformance(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = (req as any).user?.org || (req as any).user?.organizationId;
      if (!organizationId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const query = {
        timeRange: req.query.timeRange || '30d',
        routeId: req.params.id || req.query.routeId,
        sortBy: req.query.sortBy || 'efficiency',
        sortOrder: req.query.sortOrder || 'desc',
      };

      const validatedQuery = RouteAnalyticsFilterSchema.parse(query);
      let data = await RouteEfficiencyService.getRouteEfficiency(
        organizationId,
        validatedQuery.timeRange,
        req.params.id || (req.query.routeId as string)
      );

      // Sort
      const { sortBy, sortOrder } = validatedQuery;
      data.sort((a: any, b: any) => {
        let valA = a[sortBy] || a.efficiencyScore;
        let valB = b[sortBy] || b.efficiencyScore;
        if (sortBy === 'distance') {
          valA = a.distanceDeviationPct;
          valB = b.distanceDeviationPct;
        } else if (sortBy === 'delay') {
          valA = a.timeDeviationMins;
          valB = b.timeDeviationMins;
        }
        
        return sortOrder === 'desc' ? valB - valA : valA - valB;
      });

      res.json(data);
    } catch (err: any) {
      logger.error('Error fetching route performance:', err);
      next(err);
    }
  }

  static async getRouteReplay(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = (req as any).user?.org || (req as any).user?.organizationId;
      if (!organizationId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const tripId = req.params.tripId;
      if (!tripId) {
        return res.status(400).json({ error: 'Missing tripId' });
      }

      const data = await RouteReplayService.getTripReplay(organizationId, tripId);
      res.json(data);
    } catch (err: any) {
      logger.error('Error fetching route replay:', err);
      next(err);
    }
  }
}
