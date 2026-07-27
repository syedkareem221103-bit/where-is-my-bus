import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import { UserRole, RouteStatus } from '@prisma/client';
import prisma from '../config/database';
import routeRouter from '../modules/route/route.routes';
import { errorHandler } from '../errors/error-handler';
import { initializeKeys } from '../utils/crypto';

const testApp = express();
testApp.use(express.json());
testApp.use('/api/v1/routes', routeRouter);
testApp.use(errorHandler);

const { privateKey } = initializeKeys();

function signToken(payload: any) {
  return jwt.sign(
    { ...payload, type: 'access' },
    privateKey,
    { algorithm: 'ES256', expiresIn: '15m' }
  );
}

describe('Route Management Module (Milestone 2 - Step 4)', () => {
  let orgId1: string;
  let orgId2: string;
  let superAdminToken: string;
  let orgAdminToken1: string;
  let operatorToken1: string;
  let driverToken1: string;
  let parentToken1: string;
  let studentToken1: string;

  beforeAll(async () => {
    await prisma.auditLog.deleteMany();
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

    const sa = await prisma.user.create({
      data: {
        email: 'sa-rt@test.com',
        firstName: 'Super',
        lastName: 'Admin',
        passwordHash: 'hashed',
        role: UserRole.SUPER_ADMIN,
        organization: { connect: { organizationId: orgId1 } },
      },
    });

    const oa1 = await prisma.user.create({
      data: {
        email: 'oa1-rt@test.com',
        firstName: 'Org',
        lastName: 'Admin 1',
        passwordHash: 'hashed',
        role: UserRole.ORG_ADMIN,
        organization: { connect: { organizationId: orgId1 } },
      },
    });

    const op1 = await prisma.user.create({
      data: {
        email: 'op1-rt@test.com',
        firstName: 'Operator',
        lastName: '1',
        passwordHash: 'hashed',
        role: UserRole.OPERATOR,
        organization: { connect: { organizationId: orgId1 } },
      },
    });

    const d1 = await prisma.user.create({
      data: {
        email: 'd1-rt@test.com',
        firstName: 'Driver',
        lastName: '1',
        passwordHash: 'hashed',
        role: UserRole.DRIVER,
        organization: { connect: { organizationId: orgId1 } },
      },
    });

    const p1 = await prisma.user.create({
      data: {
        email: 'p1-rt@test.com',
        firstName: 'Parent',
        lastName: '1',
        passwordHash: 'hashed',
        role: UserRole.PARENT,
        organization: { connect: { organizationId: orgId1 } },
      },
    });

    const st1 = await prisma.user.create({
      data: {
        email: 'st1-rt@test.com',
        firstName: 'Student',
        lastName: '1',
        passwordHash: 'hashed',
        role: UserRole.STUDENT,
        organization: { connect: { organizationId: orgId1 } },
      },
    });

    superAdminToken = signToken({ sub: sa.id, email: sa.email, role: sa.role, org: orgId1 });
    orgAdminToken1 = signToken({ sub: oa1.id, email: oa1.email, role: oa1.role, org: orgId1 });
    operatorToken1 = signToken({ sub: op1.id, email: op1.email, role: op1.role, org: orgId1 });
    driverToken1 = signToken({ sub: d1.id, email: d1.email, role: d1.role, org: orgId1 });
    parentToken1 = signToken({ sub: p1.id, email: p1.email, role: p1.role, org: orgId1 });
    studentToken1 = signToken({ sub: st1.id, email: st1.email, role: st1.role, org: orgId1 });
  });

  afterAll(async () => {
    await prisma.auditLog.deleteMany();
    await prisma.route.deleteMany();
    await prisma.user.deleteMany();
    await prisma.organization.deleteMany();
    await prisma.$disconnect();
  });

  describe('POST /api/v1/routes', () => {
    it('SUPER_ADMIN can create a route in another tenant via X-Target-Tenant', async () => {
      const res = await request(testApp)
        .post('/api/v1/routes')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .set('X-Target-Tenant', orgId2)
        .send({
          name: 'Route Target North',
          version: 1,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.route.name).toBe('Route Target North');
      expect(res.body.data.route.organizationId).toBe(orgId2);
    });

    it('ORG_ADMIN can create a route in their tenant', async () => {
      const res = await request(testApp)
        .post('/api/v1/routes')
        .set('Authorization', `Bearer ${orgAdminToken1}`)
        .send({
          name: 'Route Org1 South',
          version: 1,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.route.organizationId).toBe(orgId1);
    });

    it('Duplicate route name within tenant returns 409 Conflict', async () => {
      const res = await request(testApp)
        .post('/api/v1/routes')
        .set('Authorization', `Bearer ${orgAdminToken1}`)
        .send({
          name: 'Route Org1 South',
        });

      expect(res.status).toBe(409);
    });

    it('OPERATOR cannot create a route (RBAC block)', async () => {
      const res = await request(testApp)
        .post('/api/v1/routes')
        .set('Authorization', `Bearer ${operatorToken1}`)
        .send({
          name: 'Route OP Fail',
        });

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/v1/routes', () => {
    it('OPERATOR can list routes in their tenant', async () => {
      const res = await request(testApp)
        .get('/api/v1/routes')
        .set('Authorization', `Bearer ${operatorToken1}`);

      expect(res.status).toBe(200);
      expect(res.body.data.routes.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('GET /api/v1/routes/:id', () => {
    it('STUDENT / PARENT can view a route in their tenant', async () => {
      const route = await prisma.route.findFirst({ where: { name: 'Route Org1 South' } });

      const res = await request(testApp)
        .get(`/api/v1/routes/${route!.id}`)
        .set('Authorization', `Bearer ${studentToken1}`);

      expect(res.status).toBe(200);
      expect(res.body.data.route.id).toBe(route!.id);
    });

    it('ORG_ADMIN gets 404 when fetching a route from another tenant (IDOR protection)', async () => {
      const targetRoute = await prisma.route.findFirst({ where: { name: 'Route Target North' } });

      const res = await request(testApp)
        .get(`/api/v1/routes/${targetRoute!.id}`)
        .set('Authorization', `Bearer ${orgAdminToken1}`);

      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /api/v1/routes/:id', () => {
    it('OPERATOR can toggle route status to INACTIVE', async () => {
      const route = await prisma.route.findFirst({ where: { name: 'Route Org1 South' } });

      const res = await request(testApp)
        .patch(`/api/v1/routes/${route!.id}`)
        .set('Authorization', `Bearer ${operatorToken1}`)
        .send({
          status: RouteStatus.INACTIVE,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.route.status).toBe(RouteStatus.INACTIVE);
    });

    it('OPERATOR cannot change route name or version (Forbidden)', async () => {
      const route = await prisma.route.findFirst({ where: { name: 'Route Org1 South' } });

      const res = await request(testApp)
        .patch(`/api/v1/routes/${route!.id}`)
        .set('Authorization', `Bearer ${operatorToken1}`)
        .send({
          name: 'Route Hacked Name',
        });

      expect(res.status).toBe(403);
    });
  });

  describe('DELETE /api/v1/routes/:id', () => {
    it('ORG_ADMIN can deactivate a route in their tenant', async () => {
      const route = await prisma.route.findFirst({ where: { name: 'Route Org1 South' } });

      const res = await request(testApp)
        .delete(`/api/v1/routes/${route!.id}`)
        .set('Authorization', `Bearer ${orgAdminToken1}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Route deactivated successfully');

      const deactivated = await prisma.route.findUnique({ where: { id: route!.id } });
      expect(deactivated!.status).toBe(RouteStatus.INACTIVE);
    });
  });
});
