import { z } from 'zod';
import { UserStatus } from '@prisma/client';

export const parentIdParams = z.object({
  params: z.object({
    id: z.string().uuid('Invalid Parent ID format'),
  }),
});

export const getParentsQuerySchema = z.object({
  query: z.object({
    page: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 1)),
    limit: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 10)),
    status: z.nativeEnum(UserStatus).optional(),
    search: z.string().optional(),
  }),
});

export const createParentSchema = z.object({
  body: z.object({
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    email: z.string().email('Invalid email format'),
    password: z.string().min(8, 'Password must be at least 8 characters').optional(),
    status: z.nativeEnum(UserStatus).optional(),
    // Optional contact info to support validation without schema change
    phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number').optional(),
    emergencyContact: z.string().optional(),
  }),
});

export const updateParentSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid Parent ID format'),
  }),
  body: z.object({
    firstName: z.string().min(1).optional(),
    lastName: z.string().min(1).optional(),
    email: z.string().email().optional(),
    password: z.string().min(8).optional(),
    status: z.nativeEnum(UserStatus).optional(),
    phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number').optional(),
    emergencyContact: z.string().optional(),
  }),
});

export const linkStudentSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid Parent ID format'),
  }),
  body: z.object({
    studentId: z.string().uuid('Invalid Student ID format'),
    relationshipType: z.string().min(1, 'Relationship type is required'),
  }),
});

export const unlinkStudentSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid Parent ID format'),
    studentId: z.string().uuid('Invalid Student ID format'),
  }),
});
