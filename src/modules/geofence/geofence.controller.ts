import { Request, Response, NextFunction } from 'express';
import GeofenceService from './geofence.service';
import { CreateGeofenceSchema, UpdateGeofenceSchema } from './geofence.types';
import { requireRoles } from '../../middlewares/auth.middleware';

export class GeofenceController {
  
  public static async getGeofences(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = (req.user as any).org || (req.user as any).organizationId;
      const geofences = await GeofenceService.getGeofences(orgId);
      res.json(geofences);
    } catch (error) {
      next(error);
    }
  }

  public static async createGeofence(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = (req.user as any).org || (req.user as any).organizationId;
      const userId = (req.user as any).id || (req.user as any).userId || (req.user as any).sub;
      const validatedData = CreateGeofenceSchema.parse(req.body);
      const geofence = await GeofenceService.createGeofence(orgId, userId, validatedData);
      res.status(201).json(geofence);
    } catch (error) {
      next(error);
    }
  }

  public static async updateGeofence(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = (req.user as any).org || (req.user as any).organizationId;
      const userId = (req.user as any).id || (req.user as any).userId || (req.user as any).sub;
      const id = req.params.id;
      const validatedData = UpdateGeofenceSchema.parse(req.body);
      const geofence = await GeofenceService.updateGeofence(orgId, id, userId, validatedData);
      res.json(geofence);
    } catch (error) {
      next(error);
    }
  }

  public static async deleteGeofence(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = (req.user as any).org || (req.user as any).organizationId;
      const userId = (req.user as any).id || (req.user as any).userId || (req.user as any).sub;
      const id = req.params.id;
      await GeofenceService.deleteGeofence(orgId, id, userId);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
}
