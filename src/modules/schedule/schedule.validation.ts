import { z } from 'zod';

const DayEnum = z.enum([
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY',
]);

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
    
    busId: z.string({
      required_error: 'Bus ID is required',
    }).uuid('Invalid Bus ID format'),
    
    driverId: z.string({
      required_error: 'Driver ID is required',
    }).uuid('Invalid Driver ID format'),
    
    departureTime: z.string({
      required_error: 'Departure time is required',
    }).regex(
      /^(0[1-9]|1[0-2]):[0-5][0-9] (AM|PM)$/,
      'Departure time must follow the format "HH:MM AM/PM" (e.g. "08:30 AM")'
    ),
    
    daysOfWeek: z.array(DayEnum, {
      required_error: 'Days of week list is required',
    }).min(1, 'Select at least one day of the week'),
  }),
});

export const updateScheduleSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid Schedule ID format'),
  }),
  body: z.object({
    routeId: z.string().uuid('Invalid Route ID format').optional(),
    busId: z.string().uuid('Invalid Bus ID format').optional(),
    driverId: z.string().uuid('Invalid Driver ID format').optional(),
    departureTime: z.string().regex(
      /^(0[1-9]|1[0-2]):[0-5][0-9] (AM|PM)$/,
      'Departure time must follow the format "HH:MM AM/PM" (e.g. "08:30 AM")'
    ).optional(),
    daysOfWeek: z.array(DayEnum).min(1).optional(),
  }).refine(data => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
  }),
});
