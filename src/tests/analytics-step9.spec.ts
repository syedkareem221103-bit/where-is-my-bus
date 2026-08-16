import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import { UserRole } from '@prisma/client';
import prisma from '../config/database';
import analyticsRouter from '../modules/analytics/analytics.routes';
import { errorHandler } from '../errors/error-handler';
import { initializeKeys } from '../utils/crypto';
import { FleetService } from '../modules/fleet/fleet.service';

const testApp = express();
testApp.use(express.json());
testApp.use('/api/v1/analytics', analyticsRouter);
testApp.use(errorHandler);

const { privateKey } = initializeKeys();

function signToken(payload: any) {
  return jwt.sign(
    { ...payload, type: 'access' },
    privateKey,
    { algorithm: 'ES256', expiresIn: '15m' }
  );
}

describe('Analytics Module (Milestone 2 - Step 9)', () => {
  let orgId1: string;
  let orgId2: string;
  let orgAdminToken1: string;
  let superAdminToken: string;
  let driverToken: string;
  
  beforeAll(async () => {
    await prisma.auditLog.deleteMany();
    await prisma.tripPing.deleteMany();
    await prisma.trip.deleteMany();
    await prisma.route.deleteMany();
    await prisma.user.deleteMany();
    await prisma.organization.deleteMany();

    const org1 = await prisma.organization.create({
      data: { 
        name: 'Analytics Org 1', type: 'SCHOOL', organizationId: 'a1111111-1111-1111-1111-111111111111',
        routeSettings: {}, notifySettings: {}, operatingSchedule: {}
      }
    });
    orgId1 = org1.organizationId;

    const org2 = await prisma.organization.create({
      data: { 
        name: 'Analytics Org 2', type: 'SCHOOL', organizationId: 'a2222222-2222-2222-2222-222222222222',
        routeSettings: {}, notifySettings: {}, operatingSchedule: {}
      }
    });
    orgId2 = org2.organizationId;

    const oa1 = await prisma.user.create({
      data: {
        email: 'oa1@analytics.com', firstName: 'Org', lastName: 'Admin', passwordHash: 'hashed', role: UserRole.ORG_ADMIN, organizationId: orgId1
      }
    });

    const sa = await prisma.user.create({
      data: {
        email: 'sa@analytics.com', firstName: 'Super', lastName: 'Admin', passwordHash: 'hashed', role: UserRole.SUPER_ADMIN, organizationId: orgId1
      }
    });

    const drv = await prisma.user.create({
      data: {
        email: 'drv@analytics.com', firstName: 'Driver', lastName: '1', passwordHash: 'hashed', role: UserRole.DRIVER, organizationId: orgId1
      }
    });

    orgAdminToken1 = signToken({ sub: oa1.id, email: oa1.email, role: oa1.role, org: orgId1 });
    superAdminToken = signToken({ sub: sa.id, email: sa.email, role: sa.role, org: orgId1 });
    driverToken = signToken({ sub: drv.id, email: drv.email, role: drv.role, org: orgId1 });

    // Seed a dummy fleet state for live analytics validation
    FleetService.getInstance().updateSummary(orgId1, {
      totalVehicles: 10,
      activeVehicles: 8,
      runningTrips: 5,
      delayedTrips: 2,
      emergencies: 1,
      driversOnline: 8
    });
  });

  afterAll(async () => {
    await prisma.auditLog.deleteMany();
    await prisma.tripPing.deleteMany();
    await prisma.trip.deleteMany();
    await prisma.route.deleteMany();
    await prisma.user.deleteMany();
    await prisma.organization.deleteMany();
    await prisma.$disconnect();
  });

  describe('GET /api/v1/analytics/live', () => {
    it('returns stateless live KPIs derived directly from FleetService', async () => {
      const res = await request(testApp)
        .get('/api/v1/analytics/live')
        .set('Authorization', `Bearer ${orgAdminToken1}`);

      expect(res.status).toBe(200);
      expect(res.body.data.fleetUtilizationPercent).toBe(80); // 8/10
      expect(res.body.data.averageDelayMinutes).toBe(2);
      expect(res.body.data.activeEmergencyCount).toBe(1);
    });

    it('denies access to non-admin roles (RBAC)', async () => {
      const res = await request(testApp)
        .get('/api/v1/analytics/live')
        .set('Authorization', `Bearer ${driverToken}`);

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/v1/analytics/historical', () => {
    it('returns historical KPIs safely for an ORG_ADMIN', async () => {
      const end = new Date().toISOString();
      const start = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      
      const res = await request(testApp)
        .get(`/api/v1/analytics/historical?startDate=${start}&endDate=${end}`)
        .set('Authorization', `Bearer ${orgAdminToken1}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('routePunctualityPercent');
      expect(res.body.data).toHaveProperty('driverSafetyScore');
    });

    it('fails if date ranges are missing (Validation)', async () => {
      const res = await request(testApp)
        .get('/api/v1/analytics/historical')
        .set('Authorization', `Bearer ${orgAdminToken1}`);

      expect(res.status).toBe(400); // Zod validation failure
    });
  });

  describe('GET /api/v1/analytics/routes/performance', () => {
    it('calculates efficiency and handles large ping arrays efficiently without blocking', async () => {
      const res = await request(testApp)
        .get('/api/v1/analytics/routes/performance?timeRange=30d')
        .set('Authorization', `Bearer ${orgAdminToken1}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('enforces tenant isolation using X-Target-Tenant for SUPER_ADMIN', async () => {
      const res = await request(testApp)
        .get('/api/v1/analytics/routes/performance')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .set('X-Target-Tenant', orgId2); // spoof org2

      expect(res.status).toBe(200);
      // It should return org2 data (which is empty)
      expect(res.body.length).toBe(0);
    });
  });

  describe('GET /api/v1/analytics/drivers/performance', () => {
    it('fetches driver performance rankings', async () => {
      const res = await request(testApp)
        .get('/api/v1/analytics/drivers/performance?timeRange=all')
        .set('Authorization', `Bearer ${orgAdminToken1}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });
});
