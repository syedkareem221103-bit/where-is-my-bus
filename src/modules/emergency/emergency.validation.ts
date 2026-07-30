import { z } from 'zod';
import { EmergencyCategory, EmergencySeverity, EmergencyStatus } from '@prisma/client';

export const createEmergencySchema = z.object({
  body: z.object({
    tripId: z.string().uuid(),
    tripPingId: z.string().uuid().optional(),
    category: z.nativeEnum(EmergencyCategory),
    severity: z.nativeEnum(EmergencySeverity).optional(),
    description: z.string().max(1000).optional(),
    priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'EMERGENCY']).optional()
  })
});

export const transitionStateSchema = z.object({
  body: z.object({
    version: z.number().int().positive(),
    reason: z.string().max(500).optional()
  })
});
