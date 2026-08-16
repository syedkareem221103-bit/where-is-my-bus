import { Request, Response, NextFunction } from 'express';
import { routeService } from './route.service';
import { RouteStatus } from '@prisma/client';

export class RouteController {
  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = req.body;
      const actorId = req.user!.sub || req.user!.id;
      const actorRole = req.user!.role;
      const organizationId = req.user!.org || req.user!.organizationId;
      const ipAddress = req.ip || '127.0.0.1';

      const route = await routeService.createRoute(data, actorId, actorRole, organizationId, ipAddress);

      res.status(201).json({
        status: 'success',
        data: { route },
      });
    } catch (error) {
      next(error);
    }
  };

  getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 10;
      const status = req.query.status as RouteStatus | undefined;
      const search = req.query.search as string | undefined;
      const organizationId = req.user!.org || req.user!.organizationId;

      const result = await routeService.getRoutes(organizationId, page, limit, status, search);

      res.status(200).json({
        status: 'success',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const organizationId = req.user!.org || req.user!.organizationId;
      const { id } = req.params;

      const route = await routeService.getRoute(id, organizationId);

      res.status(200).json({
        status: 'success',
        data: { route },
      });
    } catch (error) {
      next(error);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const organizationId = req.user!.org || req.user!.organizationId;
      const { id } = req.params;
      const actorId = req.user!.sub || req.user!.id;
      const actorRole = req.user!.role;
      const data = req.body;
      const ipAddress = req.ip || '127.0.0.1';

      const route = await routeService.updateRoute(id, organizationId, data, actorId, actorRole, ipAddress);

      res.status(200).json({
        status: 'success',
        data: { route },
      });
    } catch (error) {
      next(error);
    }
  };

  delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const organizationId = req.user!.org || req.user!.organizationId;
      const actorId = req.user!.sub || req.user!.id;
      const actorRole = req.user!.role;
      const ipAddress = req.ip || '127.0.0.1';

      await routeService.deleteRoute(id, organizationId, actorId, actorRole, ipAddress);

      res.status(200).json({
        status: 'success',
        message: 'Route deactivated successfully',
      });
    } catch (error) {
      next(error);
    }
  };
}

export const routeController = new RouteController();
export default routeController;
