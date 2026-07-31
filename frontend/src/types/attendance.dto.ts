import type { StudentResponse } from './parent.dto';
import type { ScheduleResponse } from './route.dto';

export type AttendanceStatus = 'PENDING' | 'PRESENT' | 'ABSENT';

export interface DailyAttendanceResponse {
  id: string;
  organizationId: string;
  scheduleId: string;
  studentId: string;
  date: string;
  status: AttendanceStatus;
  isLocked: boolean;
  updatedBy: string | null;
  updatedAt: string;
  student?: StudentResponse;
  schedule?: ScheduleResponse;
}

export interface LogAttendanceRequest {
  studentId: string;
  scheduleId: string;
  date: string;
  status: AttendanceStatus;
}

export interface BulkLogAttendanceRequest {
  records: LogAttendanceRequest[];
}
