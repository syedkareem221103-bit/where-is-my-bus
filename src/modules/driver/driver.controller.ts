import { Request, Response, NextFunction } from 'express';
import { driverService } from './driver.service';
import { UserStatus, UserRole } from '@prisma/client';
import { ForbiddenError } from '../../errors';

const sanitizeDriver = (driver: any) => {
  if (!driver) return driver;
  const { passwordHash, ...safeDriver } = driver;
  return safeDriver;
};

export class DriverController {
  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = req.body;
      const actorId = req.user!.sub;
      const actorRole = req.user!.role;
      const organizationId = req.user!.org;

      const driver = await driverService.createDriver(data, actorId, actorRole, organizationId);

      res.status(201).json({
        status: 'success',
        data: { driver: sanitizeDriver(driver) },
      });
    } catch (error) {
      next(error);
    }
  };

  getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 10;
      const status = req.query.status as UserStatus | undefined;
      const search = req.query.search as string | undefined;
      const organizationId = req.user!.org;

      const result = await driverService.getDrivers(organizationId, page, limit, status, search);

      res.status(200).json({
        status: 'success',
        data: {
          ...result,
          drivers: result.drivers.map(sanitizeDriver),
        },
      });
    } catch (error) {
      next(error);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const organizationId = req.user!.org;
      const { id } = req.params;
      const actorId = req.user!.sub;
      const actorRole = req.user!.role;

      // DRIVER role can only fetch their own profile
      if (actorRole === UserRole.DRIVER && id !== actorId) {
        throw new ForbiddenError('You can only access your own driver profile');
      }

      const driver = await driverService.getDriver(id, organizationId);

      res.status(200).json({
        status: 'success',
        data: { driver: sanitizeDriver(driver) },
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

      const driver = await driverService.updateDriver(id, organizationId, data, actorId, actorRole);

      res.status(200).json({
        status: 'success',
        data: { driver: sanitizeDriver(driver) },
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

      await driverService.deleteDriver(id, organizationId, actorId, actorRole);

      res.status(200).json({
        status: 'success',
        message: 'Driver deactivated successfully',
      });
    } catch (error) {
      next(error);
    }
  };
}

export const driverController = new DriverController();
export default driverController;
