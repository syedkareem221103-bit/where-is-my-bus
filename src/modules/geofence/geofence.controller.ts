import { Request, Response, NextFunction } from 'express';
import GeofenceService from './geofence.service';
import { CreateGeofenceSchema, UpdateGeofenceSchema } from './geofence.types';
import { requireRoles } from '../../middlewares/auth.middleware';

export class GeofenceController {
  
  public static async getGeofences(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = req.user!.organizationId;
      const geofences = await GeofenceService.getGeofences(orgId);
      res.json(geofences);
    } catch (error) {
      next(error);
    }
  }

  public static async createGeofence(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = req.user!.organizationId;
      const validatedData = CreateGeofenceSchema.parse(req.body);
      const geofence = await GeofenceService.createGeofence(orgId, validatedData);
      res.status(201).json(geofence);
    } catch (error) {
      next(error);
    }
  }

  public static async updateGeofence(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = req.user!.organizationId;
      const id = req.params.id;
      const validatedData = UpdateGeofenceSchema.parse(req.body);
      const geofence = await GeofenceService.updateGeofence(orgId, id, validatedData);
      res.json(geofence);
    } catch (error) {
      next(error);
    }
  }

  public static async deleteGeofence(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = req.user!.organizationId;
      const id = req.params.id;
      await GeofenceService.deleteGeofence(orgId, id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
}
