import { prisma } from '../../config/database';
import { DailyAttendance, AttendanceStatus } from '@prisma/client';

export class AttendanceRepository {
  async upsert(studentId: string, date: string, status: AttendanceStatus, updatedBy: string): Promise<any> {
    return {};
  }

  async findByStudentAndDate(studentId: string, date: string): Promise<any> {
    return null;
  }

  async findByOrgAndDate(organizationId: string, date: string): Promise<any[]> {
    return [];
  }
}

export default AttendanceRepository;
