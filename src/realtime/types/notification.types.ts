import { z } from 'zod';

export const NotificationCategorySchema = z.enum([
  'ATTENDANCE',
  'ETA',
  'BUS_APPROACHING',
  'ROUTE_DEVIATION',
  'DELAY',
  'EMERGENCY',
  'SYSTEM'
]);

export type NotificationCategory = z.infer<typeof NotificationCategorySchema>;

export const NotificationPrioritySchema = z.enum(['LOW', 'NORMAL', 'HIGH', 'CRITICAL']);
export type NotificationPriority = z.infer<typeof NotificationPrioritySchema>;

export const NotificationPayloadSchema = z.object({
  notificationId: z.string().uuid(),
  tripId: z.string().uuid().optional(),
  category: NotificationCategorySchema,
  priority: NotificationPrioritySchema,
  title: z.string(),
  body: z.string(),
  timestamp: z.number().int().positive(),
  expiresAt: z.number().int().positive(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type NotificationPayload = z.infer<typeof NotificationPayloadSchema>;

export const NotificationAckPayloadSchema = z.object({
  notificationId: z.string().uuid(),
  timestamp: z.number().int().positive()
});

export type NotificationAckPayload = z.infer<typeof NotificationAckPayloadSchema>;
