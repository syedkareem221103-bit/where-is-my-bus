import { Request, Response, NextFunction } from 'express';
import { TripService } from './trip.service';
import { BadRequestError } from '../../errors';

export class TripController {
  private tripService = new TripService();

  start = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const organizationId = req.user!.organizationId;
      const driverId = req.user!.id;
      const { scheduleId, vehicleId } = req.body;

      if (!organizationId) {
        throw new BadRequestError('Only organization members can start trips');
      }

      const trip = await this.tripService.startTrip(organizationId, {
        scheduleId,
        vehicleId,
        driverId,
      });

      res.status(201).json({
        status: 'success',
        message: 'Trip started successfully',
        data: { trip },
      });
    } catch (error) {
      next(error);
    }
  };

  end = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const organizationId = req.user!.organizationId;
      const { id } = req.params;

      if (!organizationId) {
        throw new BadRequestError('Only organization members can end trips');
      }

      const trip = await this.tripService.endTrip(organizationId, id);

      res.status(200).json({
        status: 'success',
        message: 'Trip ended successfully',
        data: { trip },
      });
    } catch (error) {
      next(error);
    }
  };

  ping = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const organizationId = req.user!.organizationId;
      const { id } = req.params;
      const { latitude, longitude, speed, accuracy, sequence } = req.body;

      if (!organizationId) {
        throw new BadRequestError('Only organization members can send telemetry');
      }

      const ping = await this.tripService.recordPing(organizationId, id, {
        latitude,
        longitude,
        speed,
        accuracy,
        sequence,
      });

      res.status(200).json({
        status: 'success',
        message: 'Telemetry recorded successfully',
        data: { ping },
      });
    } catch (error) {
      next(error);
    }
  };

  getActive = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      res.status(200).json({
        status: 'success',
        data: { trips: [] },
      });
    } catch (error) {
      next(error);
    }
  };

  getLocation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const organizationId = req.user!.organizationId;
      const { id } = req.params;

      if (!organizationId) {
        throw new BadRequestError('Only organization members can get locations');
      }

      const location = await this.tripService.getLatestLocation(organizationId, id);

      res.status(200).json({
        status: 'success',
        data: { location },
      });
    } catch (error) {
      next(error);
    }
  };
}

export default TripController;
