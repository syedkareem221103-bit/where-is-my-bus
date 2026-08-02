import { z } from 'zod';
import { AlertCategory, AlertPriority, AlertStatus } from '@prisma/client';

export const AlertFilterSchema = z.object({
  status: z.nativeEnum(AlertStatus).optional(),
  priority: z.nativeEnum(AlertPriority).optional(),
  category: z.nativeEnum(AlertCategory).optional(),
  tripId: z.string().uuid().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export type AlertFilterDTO = z.infer<typeof AlertFilterSchema>;

export const UpdateAlertStatusSchema = z.object({
  status: z.nativeEnum(AlertStatus),
  resolutionNotes: z.string().optional(),
});

export type UpdateAlertStatusDTO = z.infer<typeof UpdateAlertStatusSchema>;
