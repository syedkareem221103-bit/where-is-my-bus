import { z } from 'zod';
import { OrgType, OrgStatus, AttendPolicy } from '@prisma/client';

export const createOrgSchema = z.object({
  body: z.object({
    organizationId: z.string().min(3).max(50).regex(/^[a-zA-Z0-9-]+$/, 'Organization ID must be alphanumeric and can contain hyphens'),
    name: z.string().min(2, 'Organization name must be at least 2 characters').max(100),
    type: z.nativeEnum(OrgType),
    timezone: z.string().default('UTC'),
    attendancePolicy: z.nativeEnum(AttendPolicy).default(AttendPolicy.AUTO_ABSENT),
    routeSettings: z.record(z.any()).default({}),
    notifySettings: z.record(z.any()).default({}),
    operatingSchedule: z.record(z.any()).default({}),
  }),
});

export const updateOrgSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid Organization ID format'),
  }),
  body: z.object({
    name: z.string().min(2).max(100).optional(),
    type: z.nativeEnum(OrgType).optional(),
    timezone: z.string().optional(),
    attendancePolicy: z.nativeEnum(AttendPolicy).optional(),
    routeSettings: z.record(z.any()).optional(),
    notifySettings: z.record(z.any()).optional(),
    operatingSchedule: z.record(z.any()).optional(),
    status: z.nativeEnum(OrgStatus).optional(),
  }).refine(data => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
  }),
});

export const getOrganizationsQuery = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
  }),
});

export const orgIdParams = z.object({
  params: z.object({
    id: z.string().uuid('Invalid Organization ID format'),
  }),
});
