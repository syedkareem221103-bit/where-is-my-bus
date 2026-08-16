import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import { UserRole, AttendanceStatus } from '@prisma/client';
import prisma from '../config/database';
import attendanceRouter from '../modules/attendance/attendance.routes';
import { errorHandler } from '../errors/error-handler';
import { initializeKeys } from '../utils/crypto';

const testApp = express();
// Trust proxy to mock req.ip
testApp.set('trust proxy', true);
testApp.use(express.json());
testApp.use('/api/v1/attendance', attendanceRouter);
testApp.use(errorHandler);

const { privateKey } = initializeKeys();

function signToken(payload: any) {
  return jwt.sign(
    { ...payload, type: 'access' },
    privateKey,
    { algorithm: 'ES256', expiresIn: '15m' }
  );
}

describe('Attendance Management Module (Step 8)', () => {
  jest.setTimeout(30000);
  let orgId1: string;
  let orgId2: string;
  let orgAdminToken1: string;
  let parent1Id: string;
  let parentToken1: string;
  let student1Id: string;
  let studentToken1: string;
  let student2Id: string; // another org
  let schedule1Id: string;
  let schedule2Id: string;

  beforeAll(async () => {
    await prisma.auditLog.deleteMany();
    await prisma.dailyAttendance.deleteMany();
    await prisma.parentChild.deleteMany();
    await prisma.studentStop.deleteMany();
    await prisma.student.deleteMany();
    await prisma.schedule.deleteMany();
    await prisma.stop.deleteMany();
    await prisma.route.deleteMany();
    await prisma.user.deleteMany();
    await prisma.organization.deleteMany();

    const org1 = await prisma.organization.create({
      data: {
        name: 'Org 1', type: 'SCHOOL', organizationId: 'ORG-1', routeSettings: {}, notifySettings: {}, operatingSchedule: {},
      },
    });
    orgId1 = org1.organizationId;

    const org2 = await prisma.organization.create({
      data: {
        name: 'Org 2', type: 'SCHOOL', organizationId: 'ORG-2', routeSettings: {}, notifySettings: {}, operatingSchedule: {},
      },
    });
    orgId2 = org2.organizationId;

    const route1 = await prisma.route.create({
      data: { name: 'Route 1', organization: { connect: { organizationId: orgId1 } } },
    });

    const stop1 = await prisma.stop.create({
      data: { organizationId: orgId1, routeId: route1.id, name: 'Stop 1', latitude: 0, longitude: 0, sequenceOrder: 1 },
    });

    const sched1 = await prisma.schedule.create({
      data: { organizationId: orgId1, routeId: route1.id, name: 'Morning', cutoffTime: '07:00', operatingDays: [1,2,3,4,5], isActive: true },
    });
    schedule1Id = sched1.id;

    const sched2 = await prisma.schedule.create({
      data: { organizationId: orgId1, routeId: route1.id, name: 'Afternoon', cutoffTime: '15:00', operatingDays: [1,2,3,4,5], isActive: true },
    });
    schedule2Id = sched2.id;

    const oa1 = await prisma.user.create({
      data: { email: 'oa1@test.com', firstName: 'Org', lastName: 'Admin 1', passwordHash: 'hashed', role: UserRole.ORG_ADMIN, organization: { connect: { organizationId: orgId1 } } },
    });

    const p1 = await prisma.user.create({
      data: { email: 'p1@test.com', firstName: 'Parent', lastName: '1', passwordHash: 'hashed', role: UserRole.PARENT, organization: { connect: { organizationId: orgId1 } } },
    });
    parent1Id = p1.id;

    const studentUser = await prisma.user.create({
      data: { email: 's1@test.com', firstName: 'Student', lastName: '1', passwordHash: 'hashed', role: UserRole.STUDENT, organization: { connect: { organizationId: orgId1 } } },
    });

    const st1 = await prisma.student.create({
      data: { studentNumber: 'STU-01', firstName: 'Student', lastName: '1', user: { connect: { id: studentUser.id } }, organization: { connect: { organizationId: orgId1 } } },
    });
    student1Id = st1.id;

    await prisma.studentStop.create({
      data: { organizationId: orgId1, studentId: student1Id, stopId: stop1.id }
    });

    await prisma.parentChild.create({
      data: { organization: { connect: { organizationId: orgId1 } }, parent: { connect: { id_organizationId: { id: parent1Id, organizationId: orgId1 } } }, student: { connect: { id_organizationId: { id: student1Id, organizationId: orgId1 } } }, relationshipType: 'FATHER' },
    });

    const st2 = await prisma.student.create({
      data: { studentNumber: 'STU-02', firstName: 'Student', lastName: '2', organization: { connect: { organizationId: orgId2 } } },
    });
    student2Id = st2.id;

    orgAdminToken1 = signToken({ sub: oa1.id, email: oa1.email, role: oa1.role, org: orgId1 });
    parentToken1 = signToken({ sub: p1.id, email: p1.email, role: p1.role, org: orgId1 });
    studentToken1 = signToken({ sub: studentUser.id, email: studentUser.email, role: studentUser.role, org: orgId1 });
  });

  afterAll(async () => {
    await prisma.auditLog.deleteMany();
    await prisma.dailyAttendance.deleteMany();
    await prisma.parentChild.deleteMany();
    await prisma.studentStop.deleteMany();
    await prisma.student.deleteMany();
    await prisma.schedule.deleteMany();
    await prisma.stop.deleteMany();
    await prisma.route.deleteMany();
    await prisma.user.deleteMany();
    await prisma.organization.deleteMany();
    await prisma.$disconnect();
  });

  const today = new Date().toISOString().split('T')[0];

  describe('POST /api/v1/attendance', () => {
    it('a. Valid Student.id submission (Student logs themselves)', async () => {
      const res = await request(testApp)
        .post('/api/v1/attendance')
        .set('Authorization', `Bearer ${studentToken1}`)
        .set('x-forwarded-for', '192.168.1.100')
        .send({ date: today, status: AttendanceStatus.PRESENT, scheduleId: schedule1Id });
      
      expect(res.status).toBe(200);
      expect(res.body.data.record[0].studentId).toBe(student1Id);
    });

    it('b. Invalid/nonexistent Student.id', async () => {
      const res = await request(testApp)
        .post('/api/v1/attendance')
        .set('Authorization', `Bearer ${parentToken1}`)
        .send({ studentId: '00000000-0000-0000-0000-000000000000', date: today, status: AttendanceStatus.ABSENT });
      
      expect(res.status).toBe(404);
    });

    it('c. Attendance with scheduleId', async () => {
      const res = await request(testApp)
        .post('/api/v1/attendance')
        .set('Authorization', `Bearer ${parentToken1}`)
        .send({ studentId: student1Id, date: today, status: AttendanceStatus.ABSENT, scheduleId: schedule2Id });
      
      expect(res.status).toBe(200);
      expect(res.body.data.record[0].scheduleId).toBe(schedule2Id);
    });

    it('d. Attendance without scheduleId and schedule fan-out', async () => {
      const tomorrowDate = new Date();
      tomorrowDate.setDate(tomorrowDate.getDate() + 1);
      const tomorrow = tomorrowDate.toISOString().split('T')[0];

      const res = await request(testApp)
        .post('/api/v1/attendance')
        .set('Authorization', `Bearer ${parentToken1}`)
        .send({ studentId: student1Id, date: tomorrow, status: AttendanceStatus.ABSENT });
      
      expect(res.status).toBe(200);
      expect(res.body.data.record.length).toBe(2);
      expect(res.body.data.record.some((r: any) => r.scheduleId === schedule1Id)).toBeTruthy();
      expect(res.body.data.record.some((r: any) => r.scheduleId === schedule2Id)).toBeTruthy();
    });

    it('e. Duplicate attendance prevention (upsert updates status)', async () => {
      const res = await request(testApp)
        .post('/api/v1/attendance')
        .set('Authorization', `Bearer ${parentToken1}`)
        .send({ studentId: student1Id, date: today, status: AttendanceStatus.PRESENT, scheduleId: schedule2Id });
      
      expect(res.status).toBe(200);
      expect(res.body.data.record[0].status).toBe(AttendanceStatus.PRESENT);

      const dbRecords = await prisma.dailyAttendance.findMany({
        where: { studentId: student1Id, date: today, scheduleId: schedule2Id }
      });
      expect(dbRecords.length).toBe(1);
    });

    it('f. Locked attendance returns 403', async () => {
      await prisma.dailyAttendance.update({
        where: { scheduleId_studentId_date: { scheduleId: schedule2Id, studentId: student1Id, date: today } },
        data: { isLocked: true }
      });

      const res = await request(testApp)
        .post('/api/v1/attendance')
        .set('Authorization', `Bearer ${parentToken1}`)
        .send({ studentId: student1Id, date: today, status: AttendanceStatus.ABSENT, scheduleId: schedule2Id });
      
      expect(res.status).toBe(403);
    });

    it('g. Tenant isolation', async () => {
      const res = await request(testApp)
        .post('/api/v1/attendance')
        .set('Authorization', `Bearer ${orgAdminToken1}`)
        .send({ studentId: student2Id, date: today, status: AttendanceStatus.PRESENT, scheduleId: schedule1Id });
      
      expect(res.status).toBe(404);
    });

    it('j. Invalid date is rejected', async () => {
      const res = await request(testApp)
        .post('/api/v1/attendance')
        .set('Authorization', `Bearer ${parentToken1}`)
        .send({ studentId: student1Id, date: '2010-01-01', status: AttendanceStatus.PRESENT });
      
      expect(res.status).toBe(400); // Because of zod refine
    });
  });

  describe('GET /api/v1/attendance/today', () => {
    it('h. ORG_ADMIN getDaily returns actual records', async () => {
      const res = await request(testApp)
        .get(`/api/v1/attendance/today?date=${today}`)
        .set('Authorization', `Bearer ${orgAdminToken1}`);
      
      expect(res.status).toBe(200);
      expect(res.body.data.records.length).toBeGreaterThan(0);
      expect(res.body.data.records[0].student).toBeDefined();
    });
  });

  describe('Audit Logging verification', () => {
    it('i. Audit log contains the actual request IP', async () => {
      const logs = await prisma.auditLog.findMany({
        where: { action: 'ATTENDANCE_LOG' }
      });
      expect(logs.length).toBeGreaterThan(0);
      const studentSelfLog = logs.find(l => (l.metadata as any)?.schedules?.includes(schedule1Id));
      expect(studentSelfLog?.ipAddress).toBe('192.168.1.100');
    });
  });
});
