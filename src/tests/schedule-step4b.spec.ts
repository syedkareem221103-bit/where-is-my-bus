import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import { UserRole, RouteStatus } from '@prisma/client';
import prisma from '../config/database';
import scheduleRouter from '../modules/schedule/schedule.routes';
import { errorHandler } from '../errors/error-handler';
import { initializeKeys } from '../utils/crypto';

const testApp = express();
testApp.use(express.json());
testApp.use('/api/v1/schedules', scheduleRouter);
testApp.use(errorHandler);

const { privateKey } = initializeKeys();

function signToken(payload: any) {
  return jwt.sign(
    { ...payload, type: 'access' },
    privateKey,
    { algorithm: 'ES256', expiresIn: '15m' }
  );
}

describe('Schedule Management Module (Milestone 2 - Step 4b)', () => {
  jest.setTimeout(30000);

  let orgId1: string;
  let orgId2: string;
  let superAdminToken: string;
  let orgAdminToken1: string;
  let operatorToken1: string;
  let driverToken1: string;
  let d1: any;
  let route1Id: string;
  let route2Id: string;
  let schedule1Id: string;

  beforeAll(async () => {
    // Teardown any conflicting records specific to our test data to prevent hook timeouts
    const testOrgs = ['99999999-9999-9999-9999-999999999991', '99999999-9999-9999-9999-999999999992'];
    await prisma.trip.deleteMany({ where: { organizationId: { in: testOrgs } } });
    await prisma.dailyAttendance.deleteMany({ where: { organizationId: { in: testOrgs } } });
    await prisma.schedule.deleteMany({ where: { organizationId: { in: testOrgs } } });
    await prisma.route.deleteMany({ where: { organizationId: { in: testOrgs } } });
    await prisma.user.deleteMany({ where: { organizationId: { in: testOrgs } } });
    await prisma.organization.deleteMany({ where: { id: { in: testOrgs } } });

    orgId1 = '99999999-9999-9999-9999-999999999991';
    await prisma.organization.create({
      data: {
        id: orgId1,
        name: 'Org 1',
        type: 'SCHOOL',
        organizationId: orgId1,
        routeSettings: {},
        notifySettings: {},
        operatingSchedule: {},
      },
    });

    orgId2 = '99999999-9999-9999-9999-999999999992';
    await prisma.organization.create({
      data: {
        id: orgId2,
        name: 'Org 2',
        type: 'SCHOOL',
        organizationId: orgId2,
        routeSettings: {},
        notifySettings: {},
        operatingSchedule: {},
      },
    });

    const sa = await prisma.user.create({
      data: {
        email: 'sa-sched@test.com',
        firstName: 'Super',
        lastName: 'Admin',
        passwordHash: 'hashed',
        role: UserRole.SUPER_ADMIN,
        organization: { connect: { organizationId: orgId2 } },
      },
    });
    superAdminToken = signToken({ sub: sa.id, org: orgId2, role: sa.role });

    const oa1 = await prisma.user.create({
      data: {
        email: 'oa1-sched@test.com',
        firstName: 'Org',
        lastName: 'Admin 1',
        passwordHash: 'hashed',
        role: UserRole.ORG_ADMIN,
        organization: { connect: { organizationId: orgId1 } },
      },
    });
    orgAdminToken1 = signToken({ id: oa1.id, organizationId: orgId1, role: oa1.role }); // Legacy JWT format test

    const op1 = await prisma.user.create({
      data: {
        email: 'op1-sched@test.com',
        firstName: 'Operator',
        lastName: '1',
        passwordHash: 'hashed',
        role: UserRole.OPERATOR,
        organization: { connect: { organizationId: orgId1 } },
      },
    });
    operatorToken1 = signToken({ sub: op1.id, org: orgId1, role: op1.role });

    d1 = await prisma.user.create({
      data: {
        email: 'd1-sched@test.com',
        firstName: 'Driver',
        lastName: '1',
        passwordHash: 'hashed',
        role: UserRole.DRIVER,
        organization: { connect: { organizationId: orgId1 } },
      },
    });
    driverToken1 = signToken({ sub: d1.id, org: orgId1, role: d1.role });

    const route1 = await prisma.route.create({
      data: {
        name: 'Route 1',
        organizationId: orgId1,
        status: RouteStatus.ACTIVE,
      },
    });
    route1Id = route1.id;

    const route2 = await prisma.route.create({
      data: {
        name: 'Route Inactive',
        organizationId: orgId1,
        status: RouteStatus.INACTIVE,
      },
    });
    route2Id = route2.id;
    
    await prisma.vehicle.create({
      data: {
        id: '99999999-9999-9999-9999-999999999999',
        organizationId: orgId1,
        registrationNo: 'TEST-12345',
        capacity: 50,
        status: 'ACTIVE',
      }
    });
  });

  afterAll(async () => {
    const testOrgs = [orgId1, orgId2];
    await prisma.trip.deleteMany({ where: { organizationId: { in: testOrgs } } });
    await prisma.dailyAttendance.deleteMany({ where: { organizationId: { in: testOrgs } } });
    await prisma.auditLog.deleteMany({ where: { organizationId: { in: testOrgs } } });
    await prisma.schedule.deleteMany({ where: { organizationId: { in: testOrgs } } });
    await prisma.route.deleteMany({ where: { organizationId: { in: testOrgs } } });
    await prisma.vehicle.deleteMany({ where: { organizationId: { in: testOrgs } } });
    await prisma.user.deleteMany({ where: { organizationId: { in: testOrgs } } });
    await prisma.organization.deleteMany({ where: { id: { in: testOrgs } } });
    await prisma.$disconnect();
  });

  describe('POST /api/v1/schedules', () => {
    it('SUPER_ADMIN can create a schedule via X-Target-Tenant', async () => {
      const res = await request(testApp)
        .post('/api/v1/schedules')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .set('X-Target-Tenant', orgId1)
        .send({
          routeId: route1Id,
          name: 'Morning Schedule',
          cutoffTime: '08:30',
          operatingDays: [1, 2, 3, 4, 5],
        });

      expect(res.status).toBe(201);
      expect(res.body.data.schedule.name).toBe('Morning Schedule');
      expect(res.body.data.schedule.isActive).toBe(true);
      schedule1Id = res.body.data.schedule.id;
    });

    it('Validation blocks invalid cutoffTime format', async () => {
      const res = await request(testApp)
        .post('/api/v1/schedules')
        .set('Authorization', `Bearer ${orgAdminToken1}`)
        .send({
          routeId: route1Id,
          name: 'Invalid Schedule',
          cutoffTime: '8:30 AM', // Should fail
          operatingDays: [1, 2, 3],
        });

      expect(res.status).toBe(400);
    });

    it('Validation blocks creating schedule for inactive route', async () => {
      const res = await request(testApp)
        .post('/api/v1/schedules')
        .set('Authorization', `Bearer ${orgAdminToken1}`)
        .send({
          routeId: route2Id,
          name: 'Inactive Route Schedule',
          cutoffTime: '14:00',
          operatingDays: [1, 2, 3],
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/Route not found or is inactive/);
    });

    it('DRIVER cannot create a schedule (RBAC block)', async () => {
      const res = await request(testApp)
        .post('/api/v1/schedules')
        .set('Authorization', `Bearer ${driverToken1}`)
        .send({
          routeId: route1Id,
          name: 'Driver Schedule',
          cutoffTime: '08:00',
          operatingDays: [1],
        });

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/v1/schedules', () => {
    it('OPERATOR can list schedules in their tenant', async () => {
      const res = await request(testApp)
        .get('/api/v1/schedules')
        .set('Authorization', `Bearer ${operatorToken1}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data.schedules)).toBe(true);
      expect(res.body.data.schedules.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('PATCH /api/v1/schedules/:id', () => {
    it('OPERATOR can update a schedule', async () => {
      const res = await request(testApp)
        .patch(`/api/v1/schedules/${schedule1Id}`)
        .set('Authorization', `Bearer ${operatorToken1}`)
        .send({
          name: 'Updated Morning Schedule',
          operatingDays: [1, 2, 3],
        });

      expect(res.status).toBe(200);
      expect(res.body.data.schedule.name).toBe('Updated Morning Schedule');
    });
  });

  describe('DELETE /api/v1/schedules/:id', () => {
    let trip1Id: string;

    beforeAll(async () => {
      // Create an active trip to block deletion
      const trip = await prisma.trip.create({
        data: {
          organizationId: orgId1,
          scheduleId: schedule1Id,
          routeId: route1Id,
          serviceDate: '2026-08-16',
          vehicleId: '99999999-9999-9999-9999-999999999999',
          driverId: d1.id,
          status: 'SCHEDULED', // NOT COMPLETED
        },
      });
      trip1Id = trip.id;
    });

    it('OPERATOR cannot deactivate a schedule (RBAC block)', async () => {
      const res = await request(testApp)
        .delete(`/api/v1/schedules/${schedule1Id}`)
        .set('Authorization', `Bearer ${operatorToken1}`);

      expect(res.status).toBe(403);
    });

    it('ORG_ADMIN gets 409 Conflict when deactivating a schedule with active trips', async () => {
      const res = await request(testApp)
        .delete(`/api/v1/schedules/${schedule1Id}`)
        .set('Authorization', `Bearer ${orgAdminToken1}`);

      expect(res.status).toBe(409);
      expect(res.body.message).toMatch(/active trips/i);
    });

    it('ORG_ADMIN can deactivate a schedule once active trips are completed', async () => {
      // Mark trip as COMPLETED
      await prisma.trip.update({
        where: { id: trip1Id },
        data: { status: 'COMPLETED' },
      });

      const res = await request(testApp)
        .delete(`/api/v1/schedules/${schedule1Id}`)
        .set('Authorization', `Bearer ${orgAdminToken1}`);

      expect(res.status).toBe(200);
      
      const check = await prisma.schedule.findUnique({ where: { id: schedule1Id } });
      expect(check?.isActive).toBe(false);
    });
  });
});
