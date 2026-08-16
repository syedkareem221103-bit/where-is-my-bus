import { prisma } from '../../config/database';
import { DailyAttendance, AttendanceStatus } from '@prisma/client';

export class AttendanceRepository {
  async upsert(
    organizationId: string,
    scheduleId: string,
    studentId: string,
    date: string,
    status: AttendanceStatus,
    updatedBy: string,
    tx?: any
  ): Promise<DailyAttendance> {
    const client = tx || prisma;
    return client.dailyAttendance.upsert({
      where: {
        scheduleId_studentId_date: { scheduleId, studentId, date },
      },
      update: { status, updatedBy, organizationId },
      create: {
        organizationId,
        scheduleId,
        studentId,
        date,
        status,
        updatedBy,
      },
    });
  }

  async findByStudentAndDate(
    organizationId: string,
    studentId: string,
    date: string,
    scheduleId?: string
  ): Promise<DailyAttendance[]> {
    const whereClause: any = { organizationId, studentId, date };
    if (scheduleId) {
      whereClause.scheduleId = scheduleId;
    }
    return prisma.dailyAttendance.findMany({ where: whereClause });
  }

  async findByOrgAndDate(organizationId: string, date: string): Promise<DailyAttendance[]> {
    return prisma.dailyAttendance.findMany({
      where: { organizationId, date },
      include: { student: true, schedule: true },
    });
  }

  async findSchedulesForStudent(organizationId: string, studentId: string): Promise<string[]> {
    const studentStops = await prisma.studentStop.findMany({
      where: { organizationId, studentId },
      include: {
        stop: {
          include: {
            route: {
              include: { schedules: { where: { isActive: true } } },
            },
          },
        },
      },
    });

    const schedules = new Set<string>();
    for (const ss of studentStops) {
      for (const schedule of ss.stop.route.schedules) {
        schedules.add(schedule.id);
      }
    }
    return Array.from(schedules);
  }
}

export default AttendanceRepository;
