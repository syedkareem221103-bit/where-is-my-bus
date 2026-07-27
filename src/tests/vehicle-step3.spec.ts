import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import { UserRole, VehicleStatus } from '@prisma/client';
import prisma from '../config/database';
import busRouter from '../modules/bus/bus.routes';
import { errorHandler } from '../errors/error-handler';
import { initializeKeys } from '../utils/crypto';

const testApp = express();
testApp.use(express.json());
testApp.use('/api/v1/buses', busRouter);
testApp.use(errorHandler);

const { privateKey } = initializeKeys();

function signToken(payload: any) {
  return jwt.sign(
    { ...payload, type: 'access' },
    privateKey,
    { algorithm: 'ES256', expiresIn: '15m' }
  );
}

describe('Vehicle / Bus Management Module (Milestone 2 - Step 3)', () => {
  let orgId1: string;
  let orgId2: string;
  let superAdminToken: string;
  let orgAdminToken1: string;
  let operatorToken1: string;
  let driverToken1: string;
  let parentToken1: string;

  beforeAll(async () => {
    await prisma.auditLog.deleteMany();
    await prisma.vehicle.deleteMany();
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
        email: 'sa-veh@test.com',
        firstName: 'Super',
        lastName: 'Admin',
        passwordHash: 'hashed',
        role: UserRole.SUPER_ADMIN,
        organization: { connect: { organizationId: orgId1 } },
      },
    });

    const oa1 = await prisma.user.create({
      data: {
        email: 'oa1-veh@test.com',
        firstName: 'Org',
        lastName: 'Admin 1',
        passwordHash: 'hashed',
        role: UserRole.ORG_ADMIN,
        organization: { connect: { organizationId: orgId1 } },
      },
    });

    const op1 = await prisma.user.create({
      data: {
        email: 'op1-veh@test.com',
        firstName: 'Operator',
        lastName: '1',
        passwordHash: 'hashed',
        role: UserRole.OPERATOR,
        organization: { connect: { organizationId: orgId1 } },
      },
    });

    const d1 = await prisma.user.create({
      data: {
        email: 'd1-veh@test.com',
        firstName: 'Driver',
        lastName: '1',
        passwordHash: 'hashed',
        role: UserRole.DRIVER,
        organization: { connect: { organizationId: orgId1 } },
      },
    });

    const p1 = await prisma.user.create({
      data: {
        email: 'p1-veh@test.com',
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
    parentToken1 = signToken({ sub: p1.id, email: p1.email, role: p1.role, org: orgId1 });
  });

  afterAll(async () => {
    await prisma.auditLog.deleteMany();
    await prisma.vehicle.deleteMany();
    await prisma.user.deleteMany();
    await prisma.organization.deleteMany();
    await prisma.$disconnect();
  });

  describe('POST /api/v1/buses', () => {
    it('SUPER_ADMIN can create a vehicle in another tenant via X-Target-Tenant', async () => {
      const res = await request(testApp)
        .post('/api/v1/buses')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .set('X-Target-Tenant', orgId2)
        .send({
          registrationNo: 'BUS-TARGET-001',
          capacity: 40,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.vehicle.registrationNo).toBe('BUS-TARGET-001');
      expect(res.body.data.vehicle.organizationId).toBe(orgId2);
    });

    it('ORG_ADMIN can create a vehicle in their own tenant', async () => {
      const res = await request(testApp)
        .post('/api/v1/buses')
        .set('Authorization', `Bearer ${orgAdminToken1}`)
        .send({
          registrationNo: 'BUS-ORG1-001',
          capacity: 32,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.vehicle.organizationId).toBe(orgId1);
    });

    it('Duplicate registrationNo returns 409 Conflict', async () => {
      const res = await request(testApp)
        .post('/api/v1/buses')
        .set('Authorization', `Bearer ${orgAdminToken1}`)
        .send({
          registrationNo: 'BUS-ORG1-001',
          capacity: 32,
        });

      expect(res.status).toBe(409);
    });

    it('OPERATOR cannot create a vehicle (RBAC block)', async () => {
      const res = await request(testApp)
        .post('/api/v1/buses')
        .set('Authorization', `Bearer ${operatorToken1}`)
        .send({
          registrationNo: 'BUS-OP-FAIL',
          capacity: 25,
        });

      expect(res.status).toBe(403);
    });

    it('PARENT cannot create a vehicle (RBAC block)', async () => {
      const res = await request(testApp)
        .post('/api/v1/buses')
        .set('Authorization', `Bearer ${parentToken1}`)
        .send({
          registrationNo: 'BUS-P-FAIL',
          capacity: 25,
        });

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/v1/buses', () => {
    it('OPERATOR can list vehicles in their tenant', async () => {
      const res = await request(testApp)
        .get('/api/v1/buses')
        .set('Authorization', `Bearer ${operatorToken1}`);

      expect(res.status).toBe(200);
      expect(res.body.data.vehicles.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('GET /api/v1/buses/:id', () => {
    it('DRIVER can view a vehicle in their tenant', async () => {
      const created = await prisma.vehicle.findFirst({ where: { registrationNo: 'BUS-ORG1-001' } });

      const res = await request(testApp)
        .get(`/api/v1/buses/${created!.id}`)
        .set('Authorization', `Bearer ${driverToken1}`);

      expect(res.status).toBe(200);
      expect(res.body.data.vehicle.id).toBe(created!.id);
    });

    it('ORG_ADMIN gets 404 when querying a vehicle from another tenant (IDOR protection)', async () => {
      const targetVehicle = await prisma.vehicle.findFirst({ where: { registrationNo: 'BUS-TARGET-001' } });

      const res = await request(testApp)
        .get(`/api/v1/buses/${targetVehicle!.id}`)
        .set('Authorization', `Bearer ${orgAdminToken1}`);

      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /api/v1/buses/:id', () => {
    it('OPERATOR can update vehicle status to MAINTENANCE', async () => {
      const vehicle = await prisma.vehicle.findFirst({ where: { registrationNo: 'BUS-ORG1-001' } });

      const res = await request(testApp)
        .patch(`/api/v1/buses/${vehicle!.id}`)
        .set('Authorization', `Bearer ${operatorToken1}`)
        .send({
          status: VehicleStatus.MAINTENANCE,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.vehicle.status).toBe(VehicleStatus.MAINTENANCE);
    });

    it('OPERATOR cannot update capacity or registrationNo (Forbidden)', async () => {
      const vehicle = await prisma.vehicle.findFirst({ where: { registrationNo: 'BUS-ORG1-001' } });

      const res = await request(testApp)
        .patch(`/api/v1/buses/${vehicle!.id}`)
        .set('Authorization', `Bearer ${operatorToken1}`)
        .send({
          capacity: 50,
        });

      expect(res.status).toBe(403);
    });
  });

  describe('DELETE /api/v1/buses/:id', () => {
    it('ORG_ADMIN can deactivate a vehicle in their tenant', async () => {
      const vehicle = await prisma.vehicle.findFirst({ where: { registrationNo: 'BUS-ORG1-001' } });

      const res = await request(testApp)
        .delete(`/api/v1/buses/${vehicle!.id}`)
        .set('Authorization', `Bearer ${orgAdminToken1}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Vehicle deactivated successfully');

      const deactivated = await prisma.vehicle.findUnique({ where: { id: vehicle!.id } });
      expect(deactivated!.status).toBe(VehicleStatus.INACTIVE);
    });
  });
});
