import { z } from 'zod';
import { VehicleStatus } from '@prisma/client';

export const vehicleIdParams = z.object({
  params: z.object({
    id: z.string().uuid('Invalid Vehicle ID format'),
  }),
});

export const getVehiclesQuerySchema = z.object({
  query: z.object({
    page: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 1)),
    limit: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 10)),
    status: z.nativeEnum(VehicleStatus).optional(),
    search: z.string().optional(),
  }),
});

export const createVehicleSchema = z.object({
  body: z.object({
    registrationNo: z.string().min(2, 'Registration number must be at least 2 characters'),
    capacity: z.number().int().min(1, 'Capacity must be at least 1').max(150),
    status: z.nativeEnum(VehicleStatus).optional(),
  }),
});

export const updateVehicleSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid Vehicle ID format'),
  }),
  body: z.object({
    registrationNo: z.string().min(2).optional(),
    capacity: z.number().int().min(1).max(150).optional(),
    status: z.nativeEnum(VehicleStatus).optional(),
  }),
});

// Alias exports for legacy compatibility
export const busIdParams = vehicleIdParams;
export const getBusesQuerySchema = getVehiclesQuerySchema;
export const createBusSchema = createVehicleSchema;
export const updateBusSchema = updateVehicleSchema;
