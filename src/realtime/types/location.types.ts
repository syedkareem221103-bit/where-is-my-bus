import { z } from 'zod';

export const LocationUpdateSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  speed: z.number().nullable(),
  heading: z.number().nullable(),
  accuracy: z.number().positive(),
  timestamp: z.number().positive(),
  sequenceNumber: z.number().int().nonnegative(),
});

export type LocationUpdatePayload = z.infer<typeof LocationUpdateSchema>;

export const LocationStopSchema = z.object({
  reason: z.enum(['trip_ended', 'error', 'user_paused']),
});

export type LocationStopPayload = z.infer<typeof LocationStopSchema>;

export const LocationErrorSchema = z.object({
  code: z.number(),
  message: z.string(),
});

export type LocationErrorPayload = z.infer<typeof LocationErrorSchema>;

export const TripStartSchema = z.object({
  tripId: z.string().uuid(),
  vehicleId: z.string().uuid(),
  initialLocation: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
  }),
});

export type TripStartPayload = z.infer<typeof TripStartSchema>;

export const TripEndSchema = z.object({
  tripId: z.string().uuid(),
});

export type TripEndPayload = z.infer<typeof TripEndSchema>;
