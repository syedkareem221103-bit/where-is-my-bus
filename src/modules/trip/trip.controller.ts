import { Request, Response, NextFunction } from 'express';
import { TripService } from './trip.service';
import { GpsTrackingService } from './gps.tracking.service';
import { BadRequestError } from '../../errors';

export class TripController {
  private tripService = new TripService();
  private gpsTrackingService = new GpsTrackingService();

  assign = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const organizationId = req.user!.organizationId;
      const { vehicleId, driverId, routeId, scheduleId, serviceDate } = req.body;

      if (!organizationId) {
        throw new BadRequestError('Only organization members can assign trips');
      }

      const trip = await this.tripService.assignTrip(organizationId, {
        vehicleId,
        driverId,
        routeId,
        scheduleId,
        serviceDate,
      });

      res.status(201).json({
        status: 'success',
        message: 'Trip assigned successfully',
        data: { trip },
      });
    } catch (error) {
      next(error);
    }
  };

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
      }, req.user!.id, req.ip);

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

      const trip = await this.tripService.endTrip(organizationId, id, req.user!.id, req.ip);

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
      const { latitude, longitude, speed, heading, accuracy, recordedAt } = req.body;

      if (!organizationId) {
        throw new BadRequestError('Only organization members can send telemetry');
      }

      const { ping, discarded } = await this.gpsTrackingService.recordPing(organizationId, id, {
        latitude,
        longitude,
        speed,
        heading,
        accuracy,
        recordedAt,
      });

      res.status(200).json({
        status: 'success',
        message: discarded ? 'Telemetry discarded (stale/duplicate)' : 'Telemetry recorded successfully',
        data: { 
          ping: ping ? { id: ping.id, timestamp: ping.timestamp } : null 
        },
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

  updateStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const organizationId = req.user!.organizationId;
      const { id } = req.params;
      const { status } = req.body;

      if (!organizationId) {
        throw new BadRequestError('Only organization members can update trip status');
      }

      const trip = await this.tripService.updateTripStatus(organizationId, id, status, req.user!.id, req.ip);

      res.status(200).json({
        status: 'success',
        message: 'Trip status updated successfully',
        data: { trip },
      });
    } catch (error) {
      next(error);
    }
  };

  getEta = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const organizationId = req.user!.organizationId;
      const { id } = req.params;

      if (!organizationId) {
        throw new BadRequestError('Only organization members can get ETAs');
      }

      const etaData = await this.tripService.getEta(organizationId, id);

      res.status(200).json({
        status: 'success',
        data: etaData,
      });
    } catch (error) {
      next(error);
    }
  };
}

export default TripController;
