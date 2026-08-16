import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import { UserRole } from '@prisma/client';
import prisma from '../config/database';
import userRouter from '../modules/user/user.routes';
import { errorHandler } from '../errors/error-handler';
import { initializeKeys } from '../utils/crypto';

// Test Setup
const testApp = express();
testApp.use(express.json());
testApp.use('/api/v1/users', userRouter);
testApp.use(errorHandler);

const { privateKey } = initializeKeys();

function signToken(payload: any) {
  return jwt.sign(
    { ...payload, type: 'access' },
    privateKey,
    { algorithm: 'ES256', expiresIn: '15m' }
  );
}

describe('User Management Module (Milestone 2 - Step 2)', () => {
  let orgId1: string;
  let orgId2: string;
  let superAdminId: string;
  let orgAdminId1: string;

  let superAdminToken: string;
  let orgAdminToken1: string;
  let operatorToken1: string;
  let driverToken1: string;

  beforeAll(async () => {
    await prisma.auditLog.deleteMany();
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
        operatingSchedule: {}
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
        operatingSchedule: {}
      },
    });
    orgId2 = org2.organizationId;

    const sa = await prisma.user.create({
      data: {
        email: 'sa@test.com',
        firstName: 'Super',
        lastName: 'Admin',
        passwordHash: 'hashed',
        role: UserRole.SUPER_ADMIN,
        organization: { connect: { organizationId: orgId1 } },
      },
    });
    superAdminId = sa.id;

    const oa1 = await prisma.user.create({
      data: {
        email: 'oa1@test.com',
        firstName: 'Org',
        lastName: 'Admin 1',
        passwordHash: 'hashed',
        role: UserRole.ORG_ADMIN,
        organization: { connect: { organizationId: orgId1 } },
      },
    });
    orgAdminId1 = oa1.id;

    const op1 = await prisma.user.create({
      data: {
        email: 'op1@test.com',
        firstName: 'Operator',
        lastName: '1',
        passwordHash: 'hashed',
        role: UserRole.OPERATOR,
        organization: { connect: { organizationId: orgId1 } },
      },
    });

    const d1 = await prisma.user.create({
      data: {
        email: 'd1@test.com',
        firstName: 'Driver',
        lastName: '1',
        passwordHash: 'hashed',
        role: UserRole.DRIVER,
        organization: { connect: { organizationId: orgId1 } },
      },
    });

    superAdminToken = signToken({ sub: sa.id, email: sa.email, role: sa.role, org: orgId1 });
    orgAdminToken1 = signToken({ sub: oa1.id, email: oa1.email, role: oa1.role, org: orgId1 });
    operatorToken1 = signToken({ sub: op1.id, email: op1.email, role: op1.role, org: orgId1 });
    driverToken1 = signToken({ sub: d1.id, email: d1.email, role: d1.role, org: orgId1 });
  });

  afterAll(async () => {
    await prisma.auditLog.deleteMany();
    await prisma.user.deleteMany();
    await prisma.organization.deleteMany();
    await prisma.$disconnect();
  });

  describe('POST /api/v1/users', () => {
    it('SUPER_ADMIN can create an ORG_ADMIN in another tenant via X-Target-Tenant', async () => {
      const res = await request(testApp)
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .set('X-Target-Tenant', orgId2)
        .send({
          email: 'target-oa@test.com',
          password: 'password123',
          firstName: 'Target',
          lastName: 'OA',
          role: UserRole.ORG_ADMIN,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.user.email).toBe('target-oa@test.com');
      expect(res.body.data.user.organizationId).toBe(orgId2);
      expect(res.body.data.user.passwordHash).toBeUndefined();
    });

    it('ORG_ADMIN can create a DRIVER in their own tenant', async () => {
      const res = await request(testApp)
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${orgAdminToken1}`)
        .send({
          email: 'driver-new@test.com',
          password: 'password123',
          firstName: 'New',
          lastName: 'Driver',
          role: UserRole.DRIVER,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.user.organizationId).toBe(orgId1);
    });

    it('ORG_ADMIN cannot create a SUPER_ADMIN (privilege escalation)', async () => {
      const res = await request(testApp)
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${orgAdminToken1}`)
        .send({
          email: 'fake-sa@test.com',
          password: 'password123',
          firstName: 'Fake',
          lastName: 'SA',
          role: UserRole.SUPER_ADMIN,
        });

      expect(res.status).toBe(403);
    });

    it('OPERATOR cannot create users (RBAC)', async () => {
      const res = await request(testApp)
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${operatorToken1}`)
        .send({
          email: 'op-create@test.com',
          password: 'password123',
          firstName: 'Fail',
          lastName: 'Create',
          role: UserRole.DRIVER,
        });

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/v1/users/me', () => {
    it('Any user can fetch their own profile', async () => {
      const res = await request(testApp)
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${driverToken1}`);

      expect(res.status).toBe(200);
      expect(res.body.data.user.role).toBe(UserRole.DRIVER);
    });
  });

  describe('GET /api/v1/users/:id', () => {
    it('ORG_ADMIN can fetch a user in their tenant', async () => {
      const decoded: any = jwt.decode(driverToken1);
      const targetId = decoded.sub;

      const res = await request(testApp)
        .get(`/api/v1/users/${targetId}`)
        .set('Authorization', `Bearer ${orgAdminToken1}`);

      expect(res.status).toBe(200);
      expect(res.body.data.user.id).toBe(targetId);
    });

    it('ORG_ADMIN gets 404 when fetching user in another tenant (IDOR prevention)', async () => {
      const decoded: any = jwt.decode(superAdminToken);
      const targetId = decoded.sub; // SA is in orgId1, wait, let's fetch the target-oa from orgId2

      const targetOa = await prisma.user.findFirst({ where: { email: 'target-oa@test.com' } });
      const targetId2 = targetOa!.id;

      const res = await request(testApp)
        .get(`/api/v1/users/${targetId2}`)
        .set('Authorization', `Bearer ${orgAdminToken1}`);

      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /api/v1/users/:id', () => {
    it('User can update their own first and last name', async () => {
      const res = await request(testApp)
        .patch('/api/v1/users/me')
        .set('Authorization', `Bearer ${driverToken1}`)
        .send({
          firstName: 'UpdatedName',
          role: UserRole.ORG_ADMIN // Attempt privilege escalation on self
        });

      expect(res.status).toBe(200);
      expect(res.body.data.user.firstName).toBe('UpdatedName');
      expect(res.body.data.user.role).toBe(UserRole.DRIVER); // Unchanged
    });

    it('ORG_ADMIN cannot deactivate or modify a SUPER_ADMIN', async () => {
      const res = await request(testApp)
        .patch(`/api/v1/users/${superAdminId}`)
        .set('Authorization', `Bearer ${orgAdminToken1}`)
        .send({
          status: 'DEACTIVATED'
        });

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/v1/users', () => {
    it('ORG_ADMIN can list users in their tenant', async () => {
      const res = await request(testApp)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${orgAdminToken1}`);

      expect(res.status).toBe(200);
      expect(res.body.data.users).toBeInstanceOf(Array);
      expect(res.body.data.total).toBeGreaterThan(0);
      expect(res.body.data.users.every((u: any) => u.organizationId === orgId1)).toBe(true);
    });
  });

  describe('DELETE /api/v1/users/:id', () => {
    it('ORG_ADMIN can deactivate a DRIVER in their tenant', async () => {
      const decoded: any = jwt.decode(driverToken1);
      const targetId = decoded.sub;

      const res = await request(testApp)
        .delete(`/api/v1/users/${targetId}`)
        .set('Authorization', `Bearer ${orgAdminToken1}`);

      expect(res.status).toBe(200);
      
      const check = await request(testApp)
        .get(`/api/v1/users/${targetId}`)
        .set('Authorization', `Bearer ${orgAdminToken1}`);
      
      expect(check.body.data.user.status).toBe('DEACTIVATED');
    });

    it('ORG_ADMIN cannot delete a SUPER_ADMIN', async () => {
      const res = await request(testApp)
        .delete(`/api/v1/users/${superAdminId}`)
        .set('Authorization', `Bearer ${orgAdminToken1}`);

      expect(res.status).toBe(403);
    });
  });
});
