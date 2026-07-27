import { z } from 'zod';
import { UserStatus } from '@prisma/client';

export const driverIdParams = z.object({
  params: z.object({
    id: z.string().uuid('Invalid Driver ID format'),
  }),
});

export const getDriversQuerySchema = z.object({
  query: z.object({
    page: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 1)),
    limit: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 10)),
    status: z.nativeEnum(UserStatus).optional(),
    search: z.string().optional(),
  }),
});

export const createDriverSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters long'),
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    licenseNumber: z.string().min(3, 'License number must be at least 3 characters'),
    expiryDate: z.string().refine((val) => !isNaN(Date.parse(val)), 'Invalid expiry date format'),
    licenseClass: z.string().min(1, 'License class is required'),
  }),
});

export const updateDriverSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid Driver ID format'),
  }),
  body: z.object({
    firstName: z.string().min(1).optional(),
    lastName: z.string().min(1).optional(),
    status: z.nativeEnum(UserStatus).optional(),
    licenseNumber: z.string().min(3).optional(),
    expiryDate: z.string().refine((val) => !isNaN(Date.parse(val)), 'Invalid expiry date format').optional(),
    licenseClass: z.string().min(1).optional(),
  }),
});
