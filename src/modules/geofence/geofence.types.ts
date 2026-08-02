import { z } from 'zod';
import { GeofenceType } from '@prisma/client';

export const PointSchema = z.object({
  type: z.literal('Point'),
  coordinates: z.tuple([z.number(), z.number()]),
  radius: z.number().positive().optional(),
});

export const PolygonSchema = z.object({
  type: z.literal('Polygon'),
  coordinates: z.array(z.array(z.tuple([z.number(), z.number()]))),
});

export const MultiPolygonSchema = z.object({
  type: z.literal('MultiPolygon'),
  coordinates: z.array(z.array(z.array(z.tuple([z.number(), z.number()])))),
});

export const GeoJSONSchema = z.union([PointSchema, PolygonSchema, MultiPolygonSchema]);

export const CreateGeofenceSchema = z.object({
  name: z.string().min(1),
  type: z.nativeEnum(GeofenceType),
  geometry: GeoJSONSchema,
  isActive: z.boolean().optional(),
});

export const UpdateGeofenceSchema = CreateGeofenceSchema.partial();

export type CreateGeofenceDTO = z.infer<typeof CreateGeofenceSchema>;
export type UpdateGeofenceDTO = z.infer<typeof UpdateGeofenceSchema>;
export type GeoJSONGeometry = z.infer<typeof GeoJSONSchema>;
