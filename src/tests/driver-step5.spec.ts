import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import { UserRole, UserStatus } from '@prisma/client';
import prisma from '../config/database';
import driverRouter from '../modules/driver/driver.routes';
import { errorHandler } from '../errors/error-handler';
import { initializeKeys } from '../utils/crypto';

const testApp = express();
testApp.use(express.json());
testApp.use('/api/v1/drivers', driverRouter);
testApp.use(errorHandler);

const { privateKey } = initializeKeys();

function signToken(payload: any) {
  return jwt.sign(
    { ...payload, type: 'access' },
    privateKey,
    { algorithm: 'ES256', expiresIn: '15m' }
  );
}

describe('Driver Management Module (Milestone 2 - Step 5)', () => {
  let orgId1: string;
  let orgId2: string;
  let superAdminToken: string;
  let orgAdminToken1: string;
  let operatorToken1: string;
  let driver1Id: string;
  let driverToken1: string;
  let driver2Id: string;
  let driverToken2: string;
  let parentToken1: string;

  beforeAll(async () => {
    await prisma.auditLog.deleteMany();
    await prisma.driverLicense.deleteMany();
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

    const sa = await prisma.user.create({
      data: {
        email: 'sa-drv@test.com',
        firstName: 'Super',
        lastName: 'Admin',
        passwordHash: 'hashed',
        role: UserRole.SUPER_ADMIN,
        organization: { connect: { organizationId: orgId1 } },
      },
    });

    const oa1 = await prisma.user.create({
      data: {
        email: 'oa1-drv@test.com',
        firstName: 'Org',
        lastName: 'Admin 1',
        passwordHash: 'hashed',
        role: UserRole.ORG_ADMIN,
        organization: { connect: { organizationId: orgId1 } },
      },
    });

    const op1 = await prisma.user.create({
      data: {
        email: 'op1-drv@test.com',
        firstName: 'Operator',
        lastName: '1',
        passwordHash: 'hashed',
        role: UserRole.OPERATOR,
        organization: { connect: { organizationId: orgId1 } },
      },
    });

    const d1 = await prisma.user.create({
      data: {
        email: 'd1-drv@test.com',
        firstName: 'Driver',
        lastName: 'One',
        passwordHash: 'hashed',
        role: UserRole.DRIVER,
        organization: { connect: { organizationId: orgId1 } },
      },
    });
    driver1Id = d1.id;

    await prisma.driverLicense.create({
      data: {
        licenseNumber: 'LIC-001',
        expiryDate: new Date('2030-01-01'),
        licenseClass: 'CLASS-A',
        user: { connect: { id: d1.id } },
        organization: { connect: { organizationId: orgId1 } },
      },
    });

    const d2 = await prisma.user.create({
      data: {
        email: 'd2-drv@test.com',
        firstName: 'Driver',
        lastName: 'Two',
        passwordHash: 'hashed',
        role: UserRole.DRIVER,
        organization: { connect: { organizationId: orgId1 } },
      },
    });
    driver2Id = d2.id;

    await prisma.driverLicense.create({
      data: {
        licenseNumber: 'LIC-002',
        expiryDate: new Date('2030-01-01'),
        licenseClass: 'CLASS-A',
        user: { connect: { id: d2.id } },
        organization: { connect: { organizationId: orgId1 } },
      },
    });

    const p1 = await prisma.user.create({
      data: {
        email: 'p1-drv@test.com',
        firstName: 'Parent',
        lastName: '1',
        passwordHash: 'hashed',
        role: UserRole.PARENT,
        organization: { connect: { organizationId: orgId1 } },
      },
    });

    superAdminToken = signToken({ sub: sa.id, email: sa.email, role: sa.role, org: orgId1 });
    orgAdminToken1 = signToken({ sub: oa1.id, email: oa1.email, role: oa1.role, org: orgId1 });
    operatorToken1 = signToken({ sub: op1.id, email: op1.email, role: op1.role, org: orgId1 });
    driverToken1 = signToken({ sub: d1.id, email: d1.email, role: d1.role, org: orgId1 });
    driverToken2 = signToken({ sub: d2.id, email: d2.email, role: d2.role, org: orgId1 });
    parentToken1 = signToken({ sub: p1.id, email: p1.email, role: p1.role, org: orgId1 });
  });

  afterAll(async () => {
    await prisma.auditLog.deleteMany();
    await prisma.driverLicense.deleteMany();
    await prisma.user.deleteMany();
    await prisma.organization.deleteMany();
    await prisma.$disconnect();
  });

  describe('POST /api/v1/drivers', () => {
    it('SUPER_ADMIN can create a driver in another tenant via X-Target-Tenant', async () => {
      const res = await request(testApp)
        .post('/api/v1/drivers')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .set('X-Target-Tenant', orgId2)
        .send({
          email: 'target-driver@test.com',
          password: 'password123',
          firstName: 'Target',
          lastName: 'Driver',
          licenseNumber: 'LIC-TARGET-001',
          expiryDate: '2030-01-01',
          licenseClass: 'CLASS-CDL',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.driver.email).toBe('target-driver@test.com');
      expect(res.body.data.driver.organizationId).toBe(orgId2);
      expect(res.body.data.driver.driverLicense.licenseNumber).toBe('LIC-TARGET-001');
    });

    it('ORG_ADMIN can create a driver in their tenant', async () => {
      const res = await request(testApp)
        .post('/api/v1/drivers')
        .set('Authorization', `Bearer ${orgAdminToken1}`)
        .send({
          email: 'new-driver-org1@test.com',
          password: 'password123',
          firstName: 'New',
          lastName: 'Driver',
          licenseNumber: 'LIC-ORG1-100',
          expiryDate: '2030-01-01',
          licenseClass: 'CLASS-B',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.driver.organizationId).toBe(orgId1);
    });

    it('Duplicate email returns 409 Conflict', async () => {
      const res = await request(testApp)
        .post('/api/v1/drivers')
        .set('Authorization', `Bearer ${orgAdminToken1}`)
        .send({
          email: 'd1-drv@test.com',
          password: 'password123',
          firstName: 'Dup',
          lastName: 'Email',
          licenseNumber: 'LIC-UNIQUE-99',
          expiryDate: '2030-01-01',
          licenseClass: 'CLASS-A',
        });

      expect(res.status).toBe(409);
    });

    it('Duplicate licenseNumber returns 409 Conflict', async () => {
      const res = await request(testApp)
        .post('/api/v1/drivers')
        .set('Authorization', `Bearer ${orgAdminToken1}`)
        .send({
          email: 'unique-email@test.com',
          password: 'password123',
          firstName: 'Dup',
          lastName: 'License',
          licenseNumber: 'LIC-001',
          expiryDate: '2030-01-01',
          licenseClass: 'CLASS-A',
        });

      expect(res.status).toBe(409);
    });

    it('OPERATOR cannot create a driver (RBAC block)', async () => {
      const res = await request(testApp)
        .post('/api/v1/drivers')
        .set('Authorization', `Bearer ${operatorToken1}`)
        .send({
          email: 'op-drv-fail@test.com',
          password: 'password123',
          firstName: 'Fail',
          lastName: 'Create',
          licenseNumber: 'LIC-OP-FAIL',
          expiryDate: '2030-01-01',
          licenseClass: 'CLASS-A',
        });

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/v1/drivers', () => {
    it('OPERATOR can list drivers in their tenant', async () => {
      const res = await request(testApp)
        .get('/api/v1/drivers')
        .set('Authorization', `Bearer ${operatorToken1}`);

      expect(res.status).toBe(200);
      expect(res.body.data.drivers.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('GET /api/v1/drivers/:id', () => {
    it('DRIVER can fetch their own profile', async () => {
      const res = await request(testApp)
        .get(`/api/v1/drivers/${driver1Id}`)
        .set('Authorization', `Bearer ${driverToken1}`);

      expect(res.status).toBe(200);
      expect(res.body.data.driver.id).toBe(driver1Id);
    });

    it('DRIVER cannot fetch another driver profile (Forbidden)', async () => {
      const res = await request(testApp)
        .get(`/api/v1/drivers/${driver2Id}`)
        .set('Authorization', `Bearer ${driverToken1}`);

      expect(res.status).toBe(403);
    });

    it('ORG_ADMIN gets 404 when querying a driver in another tenant (IDOR protection)', async () => {
      const targetDriver = await prisma.user.findFirst({ where: { email: 'target-driver@test.com' } });

      const res = await request(testApp)
        .get(`/api/v1/drivers/${targetDriver!.id}`)
        .set('Authorization', `Bearer ${orgAdminToken1}`);

      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /api/v1/drivers/:id', () => {
    it('OPERATOR can update driver status to SUSPENDED', async () => {
      const res = await request(testApp)
        .patch(`/api/v1/drivers/${driver1Id}`)
        .set('Authorization', `Bearer ${operatorToken1}`)
        .send({
          status: UserStatus.SUSPENDED,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.driver.status).toBe(UserStatus.SUSPENDED);
    });

    it('OPERATOR cannot update driver name or license (Forbidden)', async () => {
      const res = await request(testApp)
        .patch(`/api/v1/drivers/${driver1Id}`)
        .set('Authorization', `Bearer ${operatorToken1}`)
        .send({
          firstName: 'HackedName',
        });

      expect(res.status).toBe(403);
    });
  });

  describe('DELETE /api/v1/drivers/:id', () => {
    it('ORG_ADMIN can deactivate a driver in their tenant', async () => {
      const res = await request(testApp)
        .delete(`/api/v1/drivers/${driver1Id}`)
        .set('Authorization', `Bearer ${orgAdminToken1}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Driver deactivated successfully');

      const deactivated = await prisma.user.findUnique({ where: { id: driver1Id } });
      expect(deactivated!.status).toBe(UserStatus.DEACTIVATED);
    });
  });
});
