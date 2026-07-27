import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import { UserRole, StudentStatus } from '@prisma/client';
import prisma from '../config/database';
import studentRouter from '../modules/student/student.routes';
import { errorHandler } from '../errors/error-handler';
import { initializeKeys } from '../utils/crypto';

const testApp = express();
testApp.use(express.json());
testApp.use('/api/v1/students', studentRouter);
testApp.use(errorHandler);

const { privateKey } = initializeKeys();

function signToken(payload: any) {
  return jwt.sign(
    { ...payload, type: 'access' },
    privateKey,
    { algorithm: 'ES256', expiresIn: '15m' }
  );
}

describe('Student Management Module (Milestone 2 - Step 6)', () => {
  let orgId1: string;
  let orgId2: string;
  let superAdminToken: string;
  let orgAdminToken1: string;
  let operatorToken1: string;
  let driverToken1: string;
  let parent1Id: string;
  let parentToken1: string;
  let student1Id: string;
  let studentToken1: string;
  let student2Id: string;
  let stop1Id: string;

  beforeAll(async () => {
    await prisma.auditLog.deleteMany();
    await prisma.parentChild.deleteMany();
    await prisma.studentStop.deleteMany();
    await prisma.student.deleteMany();
    await prisma.stop.deleteMany();
    await prisma.route.deleteMany();
    await prisma.user.deleteMany();
    await prisma.organization.deleteMany();

    const org1Id = '11111111-1111-1111-1111-111111111111';
    const org1 = await prisma.organization.create({
      data: {
        id: org1Id,
        name: 'Org 1',
        type: 'SCHOOL',
        organizationId: org1Id,
        routeSettings: {},
        notifySettings: {},
        operatingSchedule: {},
      },
    });
    orgId1 = org1.organizationId;

    const org2Id = '22222222-2222-2222-2222-222222222222';
    const org2 = await prisma.organization.create({
      data: {
        id: org2Id,
        name: 'Org 2',
        type: 'SCHOOL',
        organizationId: org2Id,
        routeSettings: {},
        notifySettings: {},
        operatingSchedule: {},
      },
    });
    orgId2 = org2.organizationId;

    const route1 = await prisma.route.create({
      data: {
        name: 'Route 1',
        organization: { connect: { organizationId: orgId1 } },
      },
    });

    const stop1 = await prisma.stop.create({
      data: {
        organizationId: orgId1,
        routeId: route1.id,
        name: 'Stop 1',
        latitude: 12.9716,
        longitude: 77.5946,
        sequenceOrder: 1,
      },
    });
    stop1Id = stop1.id;

    const sa = await prisma.user.create({
      data: {
        email: 'sa-stu@test.com',
        firstName: 'Super',
        lastName: 'Admin',
        passwordHash: 'hashed',
        role: UserRole.SUPER_ADMIN,
        organization: { connect: { organizationId: orgId1 } },
      },
    });

    const oa1 = await prisma.user.create({
      data: {
        email: 'oa1-stu@test.com',
        firstName: 'Org',
        lastName: 'Admin 1',
        passwordHash: 'hashed',
        role: UserRole.ORG_ADMIN,
        organization: { connect: { organizationId: orgId1 } },
      },
    });

    const op1 = await prisma.user.create({
      data: {
        email: 'op1-stu@test.com',
        firstName: 'Operator',
        lastName: '1',
        passwordHash: 'hashed',
        role: UserRole.OPERATOR,
        organization: { connect: { organizationId: orgId1 } },
      },
    });

    const d1 = await prisma.user.create({
      data: {
        email: 'd1-stu@test.com',
        firstName: 'Driver',
        lastName: '1',
        passwordHash: 'hashed',
        role: UserRole.DRIVER,
        organization: { connect: { organizationId: orgId1 } },
      },
    });

    const p1 = await prisma.user.create({
      data: {
        email: 'p1-stu@test.com',
        firstName: 'Parent',
        lastName: '1',
        passwordHash: 'hashed',
        role: UserRole.PARENT,
        organization: { connect: { organizationId: orgId1 } },
      },
    });
    parent1Id = p1.id;

    const st1 = await prisma.student.create({
      data: {
        id: '33333333-3333-3333-3333-333333333333',
        studentNumber: 'STU-001',
        firstName: 'Alice',
        lastName: 'Smith',
        grade: 'Grade 5',
        organization: { connect: { organizationId: orgId1 } },
      },
    });
    student1Id = st1.id;

    await prisma.parentChild.create({
      data: {
        organization: { connect: { organizationId: orgId1 } },
        parent: { connect: { id_organizationId: { id: parent1Id, organizationId: orgId1 } } },
        student: { connect: { id_organizationId: { id: student1Id, organizationId: orgId1 } } },
        relationshipType: 'MOTHER',
      },
    });

    const st2 = await prisma.student.create({
      data: {
        id: '44444444-4444-4444-4444-444444444444',
        studentNumber: 'STU-002',
        firstName: 'Bob',
        lastName: 'Jones',
        grade: 'Grade 6',
        organization: { connect: { organizationId: orgId1 } },
      },
    });
    student2Id = st2.id;

    superAdminToken = signToken({ sub: sa.id, email: sa.email, role: sa.role, org: orgId1 });
    orgAdminToken1 = signToken({ sub: oa1.id, email: oa1.email, role: oa1.role, org: orgId1 });
    operatorToken1 = signToken({ sub: op1.id, email: op1.email, role: op1.role, org: orgId1 });
    driverToken1 = signToken({ sub: d1.id, email: d1.email, role: d1.role, org: orgId1 });
    parentToken1 = signToken({ sub: p1.id, email: p1.email, role: p1.role, org: orgId1 });
    studentToken1 = signToken({ sub: student1Id, email: 'student1@test.com', role: UserRole.STUDENT, org: orgId1 });
  });

  afterAll(async () => {
    await prisma.auditLog.deleteMany();
    await prisma.parentChild.deleteMany();
    await prisma.studentStop.deleteMany();
    await prisma.student.deleteMany();
    await prisma.stop.deleteMany();
    await prisma.route.deleteMany();
    await prisma.user.deleteMany();
    await prisma.organization.deleteMany();
    await prisma.$disconnect();
  });

  describe('POST /api/v1/students', () => {
    it('SUPER_ADMIN can create a student in another tenant via X-Target-Tenant', async () => {
      const res = await request(testApp)
        .post('/api/v1/students')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .set('X-Target-Tenant', orgId2)
        .send({
          studentNumber: 'STU-TARGET-001',
          firstName: 'Target',
          lastName: 'Student',
          grade: 'Grade 8',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.student.studentNumber).toBe('STU-TARGET-001');
      expect(res.body.data.student.organizationId).toBe(orgId2);
    });

    it('ORG_ADMIN can create a student in their tenant', async () => {
      const res = await request(testApp)
        .post('/api/v1/students')
        .set('Authorization', `Bearer ${orgAdminToken1}`)
        .send({
          studentNumber: 'STU-ORG1-003',
          firstName: 'Charlie',
          lastName: 'Brown',
          grade: 'Grade 4',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.student.organizationId).toBe(orgId1);
    });

    it('Duplicate studentNumber within organization returns 409 Conflict', async () => {
      const res = await request(testApp)
        .post('/api/v1/students')
        .set('Authorization', `Bearer ${orgAdminToken1}`)
        .send({
          studentNumber: 'STU-001',
          firstName: 'Duplicate',
          lastName: 'Number',
        });

      expect(res.status).toBe(409);
    });

    it('OPERATOR cannot create a student (RBAC block)', async () => {
      const res = await request(testApp)
        .post('/api/v1/students')
        .set('Authorization', `Bearer ${operatorToken1}`)
        .send({
          studentNumber: 'STU-OP-FAIL',
          firstName: 'Fail',
          lastName: 'Student',
        });

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/v1/students', () => {
    it('OPERATOR can list students in their tenant', async () => {
      const res = await request(testApp)
        .get('/api/v1/students')
        .set('Authorization', `Bearer ${operatorToken1}`);

      expect(res.status).toBe(200);
      expect(res.body.data.students.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('GET /api/v1/students/:id', () => {
    it('PARENT can fetch their linked child', async () => {
      const res = await request(testApp)
        .get(`/api/v1/students/${student1Id}`)
        .set('Authorization', `Bearer ${parentToken1}`);

      expect(res.status).toBe(200);
      expect(res.body.data.student.id).toBe(student1Id);
    });

    it('PARENT cannot fetch an unlinked student (Forbidden)', async () => {
      const res = await request(testApp)
        .get(`/api/v1/students/${student2Id}`)
        .set('Authorization', `Bearer ${parentToken1}`);

      expect(res.status).toBe(403);
    });

    it('STUDENT can fetch their own profile', async () => {
      const res = await request(testApp)
        .get(`/api/v1/students/${student1Id}`)
        .set('Authorization', `Bearer ${studentToken1}`);

      expect(res.status).toBe(200);
      expect(res.body.data.student.id).toBe(student1Id);
    });

    it('STUDENT cannot fetch another student profile (Forbidden)', async () => {
      const res = await request(testApp)
        .get(`/api/v1/students/${student2Id}`)
        .set('Authorization', `Bearer ${studentToken1}`);

      expect(res.status).toBe(403);
    });

    it('ORG_ADMIN gets 404 when querying a student in another tenant (IDOR protection)', async () => {
      const targetStudent = await prisma.student.findFirst({ where: { studentNumber: 'STU-TARGET-001' } });

      const res = await request(testApp)
        .get(`/api/v1/students/${targetStudent!.id}`)
        .set('Authorization', `Bearer ${orgAdminToken1}`);

      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /api/v1/students/:id', () => {
    it('OPERATOR can update stopId assignment and status', async () => {
      const res = await request(testApp)
        .patch(`/api/v1/students/${student1Id}`)
        .set('Authorization', `Bearer ${operatorToken1}`)
        .send({
          stopId: stop1Id,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.student.stopAssignments.length).toBeGreaterThanOrEqual(1);
    });

    it('OPERATOR cannot update student firstName or studentNumber (Forbidden)', async () => {
      const res = await request(testApp)
        .patch(`/api/v1/students/${student1Id}`)
        .set('Authorization', `Bearer ${operatorToken1}`)
        .send({
          firstName: 'HackedName',
        });

      expect(res.status).toBe(403);
    });
  });

  describe('DELETE /api/v1/students/:id', () => {
    it('ORG_ADMIN can deactivate a student in their tenant', async () => {
      const res = await request(testApp)
        .delete(`/api/v1/students/${student1Id}`)
        .set('Authorization', `Bearer ${orgAdminToken1}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Student deactivated successfully');

      const deactivated = await prisma.student.findUnique({ where: { id: student1Id } });
      expect(deactivated!.status).toBe(StudentStatus.INACTIVE);
    });
  });
});
