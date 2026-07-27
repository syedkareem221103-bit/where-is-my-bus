import { Request, Response, NextFunction } from 'express';
import { ScheduleService } from './schedule.service';
import { BadRequestError } from '../../errors';

export class ScheduleController {
  private scheduleService = new ScheduleService();

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const organizationId = req.user!.organizationId;
      if (!organizationId) {
        throw new BadRequestError('Only organization members can create schedules');
      }

      const { routeId, name, cutoffTime, operatingDays } = req.body;
      const schedule = await this.scheduleService.createSchedule(organizationId, {
        routeId,
        name,
        cutoffTime,
        operatingDays,
      });

      res.status(201).json({
        status: 'success',
        message: 'Schedule created successfully',
        data: { schedule },
      });
    } catch (error) {
      next(error);
    }
  };

  getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const organizationId = req.user!.organizationId;
      if (!organizationId) {
        throw new BadRequestError('Only organization members can view schedules');
      }

      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 10;

      const result = await this.scheduleService.getSchedules(organizationId, page, limit);

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
      const organizationId = req.user!.organizationId;
      const { id } = req.params;

      if (!organizationId) {
        throw new BadRequestError('Only organization members can view schedule details');
      }

      const schedule = await this.scheduleService.getScheduleById(organizationId, id);

      res.status(200).json({
        status: 'success',
        data: { schedule },
      });
    } catch (error) {
      next(error);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const organizationId = req.user!.organizationId;
      const { id } = req.params;

      if (!organizationId) {
        throw new BadRequestError('Only organization members can update schedules');
      }

      const { name, cutoffTime, operatingDays, isActive } = req.body;
      const schedule = await this.scheduleService.updateSchedule(organizationId, id, {
        name,
        cutoffTime,
        operatingDays,
        isActive,
      });

      res.status(200).json({
        status: 'success',
        message: 'Schedule updated successfully',
        data: { schedule },
      });
    } catch (error) {
      next(error);
    }
  };

  delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const organizationId = req.user!.organizationId;
      const { id } = req.params;

      if (!organizationId) {
        throw new BadRequestError('Only organization members can delete schedules');
      }

      await this.scheduleService.deleteSchedule(organizationId, id);

      res.status(200).json({
        status: 'success',
        message: 'Schedule deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  };
}

export default ScheduleController;
