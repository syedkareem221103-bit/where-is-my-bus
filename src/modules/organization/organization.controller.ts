import { Request, Response, NextFunction } from 'express';
import { organizationService } from './organization.service';

export class OrganizationController {
  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = req.body;
      const adminId = req.user!.sub;

      const organization = await organizationService.createOrganization(data, adminId);

      res.status(201).json({
        status: 'success',
        data: { organization },
      });
    } catch (error) {
      next(error);
    }
  };

  getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 10;

      const result = await organizationService.getOrganizations(page, limit);

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
      const { id } = req.params;
      const organization = await organizationService.getOrganization(id);

      res.status(200).json({
        status: 'success',
        data: { organization },
      });
    } catch (error) {
      next(error);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const data = req.body;
      const userId = req.user!.sub;

      const organization = await organizationService.updateOrganization(id, data, userId);

      res.status(200).json({
        status: 'success',
        data: { organization },
      });
    } catch (error) {
      next(error);
    }
  };

  delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.user!.sub;

      await organizationService.deleteOrganization(id, userId);

      res.status(200).json({
        status: 'success',
        message: 'Organization deactivated successfully',
      });
    } catch (error) {
      next(error);
    }
  };
}

export const organizationController = new OrganizationController();
