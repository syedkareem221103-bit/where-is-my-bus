import { z } from 'zod';

export const LocationUpdatePayloadSchema = z.object({
  tripId: z.string().uuid(),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  speed: z.number().nullable(),
  heading: z.number().nullable(),
  timestamp: z.number().positive(),
  sequenceNumber: z.number().int().nonnegative(),
  accuracy: z.number().positive().optional(),
});

export type LocationUpdatePayload = z.infer<typeof LocationUpdatePayloadSchema>;

export const TripStatusPayloadSchema = z.object({
  tripId: z.string().uuid(),
  status: z.string(),
  reason: z.string().optional(),
});

export type TripStatusPayload = z.infer<typeof TripStatusPayloadSchema>;

export const TripCompletedPayloadSchema = z.object({
  tripId: z.string().uuid(),
  completionTime: z.string(),
});

export type TripCompletedPayload = z.infer<typeof TripCompletedPayloadSchema>;

export const DriverOfflinePayloadSchema = z.object({
  tripId: z.string().uuid(),
  lastSeen: z.string(),
});

export type DriverOfflinePayload = z.infer<typeof DriverOfflinePayloadSchema>;

export const EmergencyPayloadSchema = z.object({
  tripId: z.string().uuid(),
  type: z.string(),
  message: z.string(),
});

export type EmergencyPayload = z.infer<typeof EmergencyPayloadSchema>;
