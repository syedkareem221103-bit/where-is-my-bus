import * as turf from '@turf/turf';
import { Geofence } from '@prisma/client';
import GeofenceService from './geofence.service';
import logger from '../../utils/logger';

export interface EvaluationResult {
  geofenceId: string;
  geofenceName: string;
  type: string;
  isInside: boolean;
  distanceToBoundaryMeters?: number;
}

export class GeofenceEvaluationService {
  private static instance: GeofenceEvaluationService;

  private constructor() {}

  public static getInstance(): GeofenceEvaluationService {
    if (!GeofenceEvaluationService.instance) {
      GeofenceEvaluationService.instance = new GeofenceEvaluationService();
    }
    return GeofenceEvaluationService.instance;
  }

  /**
   * Fast evaluation using BBox pre-filtering, then exact point-in-polygon/radius check.
   */
  public evaluateLocation(orgId: string, lat: number, lng: number): EvaluationResult[] {
    const activeGeofences = GeofenceService.getGeofencesForOrg(orgId);
    if (!activeGeofences.length) return [];

    const point = turf.point([lng, lat]);
    const results: EvaluationResult[] = [];

    for (const gf of activeGeofences) {
      try {
        const geojson = gf.geometry as any;
        let isInside = false;

        // BBox Pre-filter check (if bbox is computed, turf can compute it if not, but computing per ping is slow)
        // For max speed, we assume turf handles it quickly for small polygons
        
        if (geojson.type === 'Point' && geojson.radius) {
          const center = turf.point(geojson.coordinates);
          const distance = turf.distance(center, point, { units: 'meters' });
          isInside = distance <= geojson.radius;
        } else if (geojson.type === 'Polygon' || geojson.type === 'MultiPolygon') {
          // BBox pre-filter
          const bbox = turf.bbox(geojson);
          if (lng >= bbox[0] && lat >= bbox[1] && lng <= bbox[2] && lat <= bbox[3]) {
            isInside = turf.booleanPointInPolygon(point, geojson);
          } else {
            isInside = false; // Outside bbox
          }
        }

        results.push({
          geofenceId: gf.id,
          geofenceName: gf.name,
          type: gf.type,
          isInside,
        });

      } catch (error) {
        // Log evaluation error but don't fail the whole pipeline
        logger.error(`Geofence evaluation failed for gf ${gf.id}:`, { error });
      }
    }

    return results;
  }
}

export default GeofenceEvaluationService.getInstance();
