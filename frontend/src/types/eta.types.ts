import { z } from 'zod';

export const ETAConfidenceSchema = z.enum(['HIGH', 'MEDIUM', 'LOW']);
export type ETAConfidence = z.infer<typeof ETAConfidenceSchema>;

export const ETAPayloadSchema = z.object({
  tripId: z.string().uuid(),
  nextStopId: z.string().uuid(),
  estimatedArrivalAt: z.number().int().positive(), // Epoch
  remainingDistanceMeters: z.number().nonnegative(),
  remainingTimeSeconds: z.number().nonnegative(),
  confidence: ETAConfidenceSchema,
  isDelayed: z.boolean(),
  snapshotVersion: z.number().int().nonnegative(),
  sequenceNumber: z.number().int().nonnegative(),
  timestamp: z.number().int().positive(),
});

export type ETAPayload = z.infer<typeof ETAPayloadSchema>;

export const StopArrivalStatusSchema = z.enum(['APPROACHING', 'ARRIVED', 'DEPARTED']);
export type StopArrivalStatus = z.infer<typeof StopArrivalStatusSchema>;

export const StopArrivalPayloadSchema = z.object({
  tripId: z.string().uuid(),
  stopId: z.string().uuid(),
  status: StopArrivalStatusSchema,
  sequenceNumber: z.number().int().nonnegative(),
  timestamp: z.number().int().positive(),
});

export type StopArrivalPayload = z.infer<typeof StopArrivalPayloadSchema>;

export const ClientETAStateRequestSchema = z.object({
  tripId: z.string().uuid()
});

export type ClientETAStateRequest = z.infer<typeof ClientETAStateRequestSchema>;
