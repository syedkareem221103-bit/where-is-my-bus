import { Request, Response, NextFunction } from 'express';
import { vehicleService } from './vehicle.service';
import { VehicleStatus } from '@prisma/client';

export class VehicleController {
  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = req.body;
      const actorId = req.user!.sub;
      const actorRole = req.user!.role;
      const organizationId = req.user!.org;

      const vehicle = await vehicleService.createVehicle(data, actorId, actorRole, organizationId);

      res.status(201).json({
        status: 'success',
        data: { vehicle },
      });
    } catch (error) {
      next(error);
    }
  };

  getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 10;
      const status = req.query.status as VehicleStatus | undefined;
      const search = req.query.search as string | undefined;
      const organizationId = req.user!.org;

      const result = await vehicleService.getVehicles(organizationId, page, limit, status, search);

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
      const organizationId = req.user!.org;
      const { id } = req.params;

      const vehicle = await vehicleService.getVehicle(id, organizationId);

      res.status(200).json({
        status: 'success',
        data: { vehicle },
      });
    } catch (error) {
      next(error);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const organizationId = req.user!.org;
      const { id } = req.params;
      const actorId = req.user!.sub;
      const actorRole = req.user!.role;
      const data = req.body;

      const vehicle = await vehicleService.updateVehicle(id, organizationId, data, actorId, actorRole);

      res.status(200).json({
        status: 'success',
        data: { vehicle },
      });
    } catch (error) {
      next(error);
    }
  };

  delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const organizationId = req.user!.org;
      const actorId = req.user!.sub;
      const actorRole = req.user!.role;

      await vehicleService.deleteVehicle(id, organizationId, actorId, actorRole);

      res.status(200).json({
        status: 'success',
        message: 'Vehicle deactivated successfully',
      });
    } catch (error) {
      next(error);
    }
  };
}

export const vehicleController = new VehicleController();
export const busController = vehicleController;
export default vehicleController;
