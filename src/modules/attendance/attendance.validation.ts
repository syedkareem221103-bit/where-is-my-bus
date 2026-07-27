import { z } from 'zod';
import { AttendanceStatus } from '@prisma/client';

export const submitAttendanceSchema = z.object({
  body: z.object({
    studentId: z.string().uuid('Invalid Student ID format').optional(),
    date: z.string({
      required_error: 'Date is required',
    }).regex(
      /^\d{4}-\d{2}-\d{2}$/,
      'Date must follow the format "YYYY-MM-DD"'
    ),
    status: z.nativeEnum(AttendanceStatus, {
      required_error: 'Status is required and must be either PRESENT or ABSENT',
    }),
  }),
});

export const getAttendanceQuerySchema = z.object({
  query: z.object({
    date: z.string({
      required_error: 'Date query parameter is required',
    }).regex(
      /^\d{4}-\d{2}-\d{2}$/,
      'Date query must follow the format "YYYY-MM-DD"'
    ),
  }),
});
