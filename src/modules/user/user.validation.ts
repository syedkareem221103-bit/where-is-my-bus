import { z } from 'zod';
import { UserRole, UserStatus } from '@prisma/client';

export const createUserSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(8, 'Password must be at least 8 characters long'),
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    role: z.nativeEnum(UserRole),
  }),
});

export const updateUserSchema = z.object({
  params: z.object({
    id: z.string().optional(), // uuid or 'me' (optional for /me route)
  }),
  body: z.object({
    firstName: z.string().min(1).optional(),
    lastName: z.string().min(1).optional(),
    status: z.nativeEnum(UserStatus).optional(),
    role: z.nativeEnum(UserRole).optional(),
  }),
});

export const userIdParams = z.object({
  params: z.object({
    id: z.string().optional(), // uuid or 'me' (optional for /me route)
  }),
});

export const getUsersQuery = z.object({
  query: z.object({
    page: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 1)),
    limit: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 10)),
    role: z.nativeEnum(UserRole).optional(),
  }),
});
