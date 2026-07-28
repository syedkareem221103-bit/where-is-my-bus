import { z } from 'zod';

export const tripIdParams = z.object({
  params: z.object({
    id: z.string().uuid('Invalid Trip ID format'),
  }),
});

export const startTripSchema = z.object({
  body: z.object({
    scheduleId: z.string({
      required_error: 'Schedule ID is required',
    }).uuid('Invalid Schedule ID format'),
  }),
});

export const recordPingSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid Trip ID format'),
  }),
  body: z.object({
    latitude: z.coerce.number({
      required_error: 'Latitude is required',
    }).min(-90, 'Latitude must be between -90 and 90').max(90, 'Latitude must be between -90 and 90'),
    
    longitude: z.coerce.number({
      required_error: 'Longitude is required',
    }).min(-180, 'Longitude must be between -180 and 180').max(180, 'Longitude must be between -180 and 180'),
    
    speedKmh: z.coerce.number().min(0, 'Speed cannot be negative').nullable().optional(),
  }),
});

export const updateTripStatusSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid Trip ID format'),
  }),
  body: z.object({
    status: z.enum([
      'SCHEDULED',
      'STARTED',
      'EN_ROUTE',
      'AT_STOP',
      'COMPLETED',
      'CANCELLED',
      'EMERGENCY',
    ]),
  }),
});
