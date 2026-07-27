import { z } from 'zod';
import { RouteStatus } from '@prisma/client';

export const routeIdParams = z.object({
  params: z.object({
    id: z.string().uuid('Invalid Route ID format'),
  }),
});

export const getRoutesQuerySchema = z.object({
  query: z.object({
    page: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 1)),
    limit: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 10)),
    status: z.nativeEnum(RouteStatus).optional(),
    search: z.string().optional(),
  }),
});

export const createRouteSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Route name must be at least 2 characters').max(100),
    version: z.number().int().min(1).optional(),
    status: z.nativeEnum(RouteStatus).optional(),
  }),
});

export const updateRouteSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid Route ID format'),
  }),
  body: z.object({
    name: z.string().min(2).max(100).optional(),
    version: z.number().int().min(1).optional(),
    status: z.nativeEnum(RouteStatus).optional(),
  }),
});
