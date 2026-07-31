import { z } from 'zod';

export const AttendanceStatusSchema = z.enum(['PENDING', 'BOARDED', 'ALIGHTED', 'ABSENT']);
export type AttendanceStatus = z.infer<typeof AttendanceStatusSchema>;

export const MarkAttendancePayloadSchema = z.object({
  tripId: z.string().uuid(),
  studentId: z.string().uuid(),
  status: AttendanceStatusSchema,
  timestamp: z.number().int().positive(),
  eventId: z.string().uuid(),
  deviceId: z.string().optional(),
  driverId: z.string().optional(),
  attendanceSource: z.string().optional(),
  editedBy: z.string().optional(),
  editedAt: z.string().optional()
});

export type MarkAttendancePayload = z.infer<typeof MarkAttendancePayloadSchema>;

export const AttendanceUpdatedPayloadSchema = z.object({
  tripId: z.string().uuid(),
  studentId: z.string().uuid(),
  status: AttendanceStatusSchema,
  timestamp: z.number().int().positive(),
});

export type AttendanceUpdatedPayload = z.infer<typeof AttendanceUpdatedPayloadSchema>;

export const AttendanceAckSchema = z.object({
  success: z.boolean(),
  eventId: z.string(),
  duplicate: z.boolean(),
  message: z.string().optional()
});

export type AttendanceAck = z.infer<typeof AttendanceAckSchema>;

export interface StudentAttendanceSnapshot {
  studentId: string;
  status: AttendanceStatus;
  lastUpdated: number;
}
