import { z } from 'zod';
import { StudentStatus } from '@prisma/client';

export const studentIdParams = z.object({
  params: z.object({
    id: z.string().uuid('Invalid Student ID format'),
  }),
});

export const getStudentsQuerySchema = z.object({
  query: z.object({
    page: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 1)),
    limit: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 10)),
    status: z.nativeEnum(StudentStatus).optional(),
    search: z.string().optional(),
  }),
});

export const createStudentSchema = z.object({
  body: z.object({
    studentNumber: z.string().min(1, 'Admission number is required'),
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    grade: z.string().optional(),
    status: z.nativeEnum(StudentStatus).optional(),
    parentId: z.string().uuid('Invalid Parent ID format').optional(),
    relationshipType: z.string().optional(),
    stopId: z.string().uuid('Invalid Stop ID format').optional(),
  }),
});

export const updateStudentSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid Student ID format'),
  }),
  body: z.object({
    studentNumber: z.string().min(1).optional(),
    firstName: z.string().min(1).optional(),
    lastName: z.string().min(1).optional(),
    grade: z.string().optional(),
    status: z.nativeEnum(StudentStatus).optional(),
    parentId: z.string().uuid('Invalid Parent ID format').optional(),
    relationshipType: z.string().optional(),
    stopId: z.string().uuid('Invalid Stop ID format').optional(),
  }),
});
