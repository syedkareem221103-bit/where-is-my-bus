import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import { UserRole, UserStatus } from '@prisma/client';
import prisma from '../config/database';
import parentRouter from '../modules/parent/parent.routes';
import { errorHandler } from '../errors/error-handler';
import { initializeKeys } from '../utils/crypto';

const testApp = express();
testApp.use(express.json());
testApp.use('/api/v1/parents', parentRouter);
testApp.use(errorHandler);

const { privateKey } = initializeKeys();

function signToken(payload: any) {
  return jwt.sign(
    { ...payload, type: 'access' },
    privateKey,
    { algorithm: 'ES256', expiresIn: '15m' }
  );
}

describe('Parent Management Module (Milestone 2 - Step 7)', () => {
  jest.setTimeout(30000);
  let orgId1: string;
  let superAdminToken: string;
  let orgAdminToken: string;
  let operatorToken: string;
  let parentToken: string;
  let parentId: string;
  let student1Id: string;

  beforeAll(async () => {
    await prisma.auditLog.deleteMany();
    await prisma.parentChild.deleteMany();
    await prisma.student.deleteMany();
    await prisma.user.deleteMany();
    await prisma.organization.deleteMany();

    const org1 = await prisma.organization.create({
      data: {
        id: '11111111-1111-1111-1111-111111111111',
        name: 'Org 1',
        type: 'SCHOOL',
        organizationId: '11111111-1111-1111-1111-111111111111',
        routeSettings: {},
        notifySettings: {},
        operatingSchedule: {},
      },
    });
    orgId1 = org1.organizationId;

    const sa = await prisma.user.create({
      data: {
        email: 'sa-parent@test.com',
        firstName: 'Super',
        lastName: 'Admin',
        passwordHash: 'hashed',
        role: UserRole.SUPER_ADMIN,
        organization: { connect: { organizationId: orgId1 } },
      },
    });

    const oa = await prisma.user.create({
      data: {
        email: 'oa-parent@test.com',
        firstName: 'Org',
        lastName: 'Admin',
        passwordHash: 'hashed',
        role: UserRole.ORG_ADMIN,
        organization: { connect: { organizationId: orgId1 } },
      },
    });

    const op = await prisma.user.create({
      data: {
        email: 'op-parent@test.com',
        firstName: 'Operator',
        lastName: '1',
        passwordHash: 'hashed',
        role: UserRole.OPERATOR,
        organization: { connect: { organizationId: orgId1 } },
      },
    });

    const p = await prisma.user.create({
      data: {
        email: 'parent1-parent@test.com',
        firstName: 'Parent',
        lastName: 'One',
        passwordHash: 'hashed',
        role: UserRole.PARENT,
        organization: { connect: { organizationId: orgId1 } },
      },
    });
    parentId = p.id;

    const st1 = await prisma.student.create({
      data: {
        studentNumber: 'STU-P1-001',
        firstName: 'Alice',
        lastName: 'Smith',
        organization: { connect: { organizationId: orgId1 } },
      },
    });
    student1Id = st1.id;

    superAdminToken = signToken({ sub: sa.id, email: sa.email, role: sa.role, org: orgId1 });
    orgAdminToken = signToken({ sub: oa.id, email: oa.email, role: oa.role, org: orgId1 });
    operatorToken = signToken({ sub: op.id, email: op.email, role: op.role, org: orgId1 });
    parentToken = signToken({ sub: p.id, email: p.email, role: p.role, org: orgId1 });
  });

  afterAll(async () => {
    await prisma.auditLog.deleteMany();
    await prisma.parentChild.deleteMany();
    await prisma.student.deleteMany();
    await prisma.user.deleteMany();
    await prisma.organization.deleteMany();
    await prisma.$disconnect();
  });

  describe('POST /api/v1/parents', () => {
    it('SUPER_ADMIN can create a parent', async () => {
      const res = await request(testApp)
        .post('/api/v1/parents')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          email: 'new-parent@test.com',
          firstName: 'New',
          lastName: 'Parent',
          password: 'Password123!',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.parent.email).toBe('new-parent@test.com');
      expect(res.body.data.parent.passwordHash).toBeUndefined(); // Should omit passwordHash
    });

    it('OPERATOR cannot create a parent (RBAC block)', async () => {
      const res = await request(testApp)
        .post('/api/v1/parents')
        .set('Authorization', `Bearer ${operatorToken}`)
        .send({
          email: 'op-new-parent@test.com',
          firstName: 'Fail',
          lastName: 'Parent',
        });

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/v1/parents/:id', () => {
    it('PARENT can fetch their own profile', async () => {
      const res = await request(testApp)
        .get(`/api/v1/parents/${parentId}`)
        .set('Authorization', `Bearer ${parentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.parent.id).toBe(parentId);
    });

    it('PARENT cannot fetch another parent profile (Forbidden)', async () => {
      const otherId = '00000000-0000-0000-0000-000000000000';
      const res = await request(testApp)
        .get(`/api/v1/parents/${otherId}`)
        .set('Authorization', `Bearer ${parentToken}`);

      expect(res.status).toBe(403);
    });
  });

  describe('PATCH /api/v1/parents/:id', () => {
    it('PARENT can update their own profile', async () => {
      const res = await request(testApp)
        .patch(`/api/v1/parents/${parentId}`)
        .set('Authorization', `Bearer ${parentToken}`)
        .send({
          firstName: 'UpdatedName',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.parent.firstName).toBe('UpdatedName');
    });

    it('OPERATOR can update parent status', async () => {
      const res = await request(testApp)
        .patch(`/api/v1/parents/${parentId}`)
        .set('Authorization', `Bearer ${operatorToken}`)
        .send({
          status: 'SUSPENDED',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.parent.status).toBe('SUSPENDED');
    });

    it('OPERATOR cannot update parent email (Forbidden)', async () => {
      const res = await request(testApp)
        .patch(`/api/v1/parents/${parentId}`)
        .set('Authorization', `Bearer ${operatorToken}`)
        .send({
          email: 'hack@test.com',
        });

      expect(res.status).toBe(403);
    });
  });

  describe('POST /api/v1/parents/:id/students', () => {
    it('ORG_ADMIN can link a student to a parent', async () => {
      const res = await request(testApp)
        .post(`/api/v1/parents/${parentId}/students`)
        .set('Authorization', `Bearer ${orgAdminToken}`)
        .send({
          studentId: student1Id,
          relationshipType: 'FATHER',
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Student linked successfully');
    });
  });

  describe('DELETE /api/v1/parents/:id/students/:studentId', () => {
    it('ORG_ADMIN can unlink a student from a parent', async () => {
      const res = await request(testApp)
        .delete(`/api/v1/parents/${parentId}/students/${student1Id}`)
        .set('Authorization', `Bearer ${orgAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Student unlinked successfully');
    });
  });
});
