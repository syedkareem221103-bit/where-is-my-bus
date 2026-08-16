import { z } from 'zod';

export const scheduleIdParams = z.object({
  params: z.object({
    id: z.string().uuid('Invalid Schedule ID format'),
  }),
});

export const getSchedulesQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
  }),
});

export const createScheduleSchema = z.object({
  body: z.object({
    routeId: z.string({
      required_error: 'Route ID is required',
    }).uuid('Invalid Route ID format'),
    
    name: z.string({
      required_error: 'Schedule name is required',
    }).min(3, 'Name must be at least 3 characters'),
    
    cutoffTime: z.string({
      required_error: 'Cutoff time is required',
    }).regex(
      /^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/,
      'Cutoff time must follow the 24-hour format "HH:MM" (e.g. "08:30")'
    ),
    
    operatingDays: z.array(z.number().int().min(0).max(6), {
      required_error: 'Operating days list is required',
    }).min(1, 'Select at least one operating day (0=Sunday, 6=Saturday)'),
  }),
});

export const updateScheduleSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid Schedule ID format'),
  }),
  body: z.object({
    name: z.string().min(3, 'Name must be at least 3 characters').optional(),
    cutoffTime: z.string().regex(
      /^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/,
      'Cutoff time must follow the 24-hour format "HH:MM" (e.g. "08:30")'
    ).optional(),
    operatingDays: z.array(z.number().int().min(0).max(6)).min(1).optional(),
    isActive: z.boolean().optional(),
  }).refine(data => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
  }),
});
