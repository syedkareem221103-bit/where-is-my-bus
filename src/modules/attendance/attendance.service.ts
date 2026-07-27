import { AttendanceRepository } from './attendance.repository';
import { AttendanceStatus, UserRole } from '@prisma/client';
import { NotFoundError, BadRequestError, ForbiddenError } from '../../errors';
import { prisma } from '../../config/database';
import { AuditService } from '../../services/audit.service';

export class AttendanceService {
  private attendanceRepository = new AttendanceRepository();
  private auditService = AuditService.getInstance();

  async submitAttendance(
    organizationId: string,
    callerId: string,
    callerRole: UserRole,
    data: {
      studentId?: string;
      date: string; // YYYY-MM-DD
      status: AttendanceStatus;
    }
  ) {
    let targetStudentId = data.studentId || '';

    // 1. Determine and authorize the student target
    if (callerRole === UserRole.STUDENT) {
      targetStudentId = callerId; // Students can only submit for themselves
    }

    if (!targetStudentId) {
      throw new BadRequestError('Student ID is required');
    }

    // Fetch the target student user
    const student = await prisma.user.findUnique({
      where: { id: targetStudentId },
    });

    if (!student || student.organizationId !== organizationId) {
      throw new NotFoundError('Student not found in your organization');
    }

    if (student.role !== UserRole.STUDENT) {
      throw new BadRequestError('Attendance can only be logged for student accounts');
    }

    // If caller is a Parent, verify they are parent of the student
    if (callerRole === UserRole.PARENT) {
      const parentChild = await prisma.parentChild.findUnique({
        where: {
          parentId_studentId: {
            parentId: callerId,
            studentId: targetStudentId,
          },
        },
      });
      if (!parentChild) {
        throw new ForbiddenError('You are not authorized to submit attendance for this student');
      }
    }

    // 2. Perform stub/upsert
    const record = await this.attendanceRepository.upsert(
      targetStudentId,
      data.date,
      data.status,
      callerId
    );

    // 3. Log Audit Activity
    await this.auditService.log({
      organizationId,
      userId: callerId,
      action: 'ATTENDANCE_LOG',
      details: { studentId: targetStudentId, date: data.date, status: data.status },
    });

    return record;
  }
}
export default AttendanceService;
