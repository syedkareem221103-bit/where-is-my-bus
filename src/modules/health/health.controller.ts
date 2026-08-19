import { Request, Response } from 'express';
import { HealthAggregationService } from './health.aggregation.service';

import { prisma } from '../../config/database';


export class HealthController {
  
  public static async getSystemHealth(req: Request, res: Response) {
    // Current health from Redis
    const payload = await HealthAggregationService.getCachedHealth() || await HealthAggregationService.evaluateAndCache();
    
    // RBAC logic: if ORG_ADMIN, filter out infrastructure
    const role = req.user?.role;
    if (role === 'ORG_ADMIN' || role === 'OPERATOR') {
      // Strip out CPU, memory, DB latency, etc.
      return res.status(200).json({
        globalStatus: payload.globalStatus,
        timestamp: payload.timestamp,
        services: payload.services,
        // No infrastructure or runtime metrics
      });
    }

    return res.status(200).json(payload);
  }

  public static async getHistoricalHealth(req: Request, res: Response) {
    const role = req.user?.role;
    if (role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Only SUPER_ADMIN can access historical health data.' });
    }

    const { days = 7 } = req.query;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - Number(days));

    const history = await prisma.systemHealthSnapshot.findMany({
      where: { timestamp: { gte: cutoffDate } },
      orderBy: { timestamp: 'asc' },
    });

    return res.status(200).json(history);
  }

  public static async forceHealthCheck(req: Request, res: Response) {
    const role = req.user?.role;
    if (role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Only SUPER_ADMIN can trigger forced health checks.' });
    }

    const payload = await HealthAggregationService.evaluateAndCache();
    return res.status(200).json(payload);
  }
}
