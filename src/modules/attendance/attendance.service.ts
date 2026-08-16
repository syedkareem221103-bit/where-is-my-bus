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
      scheduleId?: string;
      date: string; // YYYY-MM-DD
      status: AttendanceStatus;
      ipAddress: string;
    }
  ) {
    let targetStudentId = data.studentId || '';

    // 1. Determine and authorize the student target
    if (callerRole === UserRole.STUDENT) {
      // Find the student record associated with this user
      const studentProfile = await prisma.student.findUnique({
        where: { userId: callerId },
      });
      if (!studentProfile) {
        throw new NotFoundError('Student profile not found for your account');
      }
      targetStudentId = studentProfile.id;
    }

    if (!targetStudentId) {
      throw new BadRequestError('Student ID is required');
    }

    // Fetch the target student
    const student = await prisma.student.findUnique({
      where: { id: targetStudentId },
    });

    if (!student || student.organizationId !== organizationId) {
      throw new NotFoundError('Student not found in your organization');
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

    // 2. Determine schedules
    let schedulesToUpdate: string[] = [];
    if (data.scheduleId) {
      schedulesToUpdate.push(data.scheduleId);
    } else {
      schedulesToUpdate = await this.attendanceRepository.findSchedulesForStudent(organizationId, targetStudentId);
      if (schedulesToUpdate.length === 0) {
        throw new BadRequestError('Student has no active schedules assigned');
      }
    }

    // 3. Verify locks and perform upserts
    const updatedRecords: any[] = [];
    try {
      await prisma.$transaction(async (tx) => {
        for (const scheduleId of schedulesToUpdate) {
          // Check if existing record is locked
          const existing = await tx.dailyAttendance.findUnique({
            where: {
              scheduleId_studentId_date: { scheduleId, studentId: targetStudentId, date: data.date }
            }
          });
          
          if (existing && existing.isLocked) {
            throw new ForbiddenError(`Attendance for schedule ${scheduleId} is locked and cannot be modified`);
          }

          const record = await this.attendanceRepository.upsert(
            organizationId,
            scheduleId,
            targetStudentId,
            data.date,
            data.status,
            callerId,
            tx
          );
          updatedRecords.push(record);
        }
      });
    } catch (error: any) {
      if (error instanceof ForbiddenError) throw error;
      throw new Error('Failed to save attendance records: ' + error.message);
    }

    // 4. Log Audit Activity
    await this.auditService.log({
      organizationId,
      userId: callerId,
      action: 'ATTENDANCE_LOG',
      details: { studentId: targetStudentId, schedules: schedulesToUpdate, date: data.date, status: data.status },
      ipAddress: data.ipAddress
    });

    return updatedRecords;
  }

  async getDailyAttendance(organizationId: string, date: string) {
    return this.attendanceRepository.findByOrgAndDate(organizationId, date);
  }
}
export default AttendanceService;
