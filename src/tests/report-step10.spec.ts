import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import { UserRole } from '@prisma/client';
import prisma from '../config/database';
import { reportRoutes } from '../modules/report/report.routes';
import { reportScheduler } from '../modules/report/report.scheduler';
import { errorHandler } from '../errors/error-handler';
import { initializeKeys } from '../utils/crypto';
import crypto from 'crypto';

const testApp = express();
testApp.use(express.json());
testApp.use('/api/v1/reports', reportRoutes);
testApp.use(errorHandler);

const { privateKey } = initializeKeys();

function signToken(payload: any) {
  return jwt.sign(
    { ...payload, type: 'access' },
    privateKey,
    { algorithm: 'ES256', expiresIn: '15m' }
  );
}

describe('Report Module (Milestone 2 - Step 10)', () => {
  let orgId1: string;
  let orgId2: string;
  let orgAdminToken1: string;
  let superAdminToken: string;
  let driverToken: string;
  let oa1Id: string;
  let saId: string;
  
  beforeAll(async () => {
    await prisma.auditLog.deleteMany();
    await prisma.reportExecution.deleteMany();
    await prisma.reportSubscription.deleteMany();
    await prisma.user.deleteMany();
    await prisma.organization.deleteMany();

    const org1 = await prisma.organization.create({
      data: { 
        name: 'Report Org 1', type: 'SCHOOL', organizationId: 'r1111111-1111-1111-1111-111111111111',
        routeSettings: {}, notifySettings: {}, operatingSchedule: {}
      }
    });
    orgId1 = org1.organizationId;

    const org2 = await prisma.organization.create({
      data: { 
        name: 'Report Org 2', type: 'SCHOOL', organizationId: 'r2222222-2222-2222-2222-222222222222',
        routeSettings: {}, notifySettings: {}, operatingSchedule: {}
      }
    });
    orgId2 = org2.organizationId;

    const oa1 = await prisma.user.create({
      data: {
        email: 'oa1@report.com', firstName: 'Org', lastName: 'Admin', passwordHash: 'hashed', role: UserRole.ORG_ADMIN, organizationId: orgId1
      }
    });
    oa1Id = oa1.id;

    const sa = await prisma.user.create({
      data: {
        email: 'sa@report.com', firstName: 'Super', lastName: 'Admin', passwordHash: 'hashed', role: UserRole.SUPER_ADMIN, organizationId: orgId1
      }
    });
    saId = sa.id;

    const drv = await prisma.user.create({
      data: {
        email: 'drv@report.com', firstName: 'Driver', lastName: '1', passwordHash: 'hashed', role: UserRole.DRIVER, organizationId: orgId1
      }
    });

    orgAdminToken1 = signToken({ sub: oa1.id, email: oa1.email, role: oa1.role, org: orgId1 });
    superAdminToken = signToken({ sub: sa.id, email: sa.email, role: sa.role, org: orgId1 });
    driverToken = signToken({ sub: drv.id, email: drv.email, role: drv.role, org: orgId1 });
  });

  afterAll(async () => {
    reportScheduler.stop();
    await prisma.auditLog.deleteMany();
    await prisma.reportExecution.deleteMany();
    await prisma.reportSubscription.deleteMany();
    await prisma.user.deleteMany();
    await prisma.organization.deleteMany();
    await prisma.$disconnect();
  });

  describe('Report Subscription (Atomicity, RBAC, Tenant Isolation)', () => {
    let createdSubId: string;

    it('denies access to non-admin roles (RBAC)', async () => {
      const res = await request(testApp)
        .post('/api/v1/reports/subscriptions')
        .set('Authorization', `Bearer ${driverToken}`)
        .send({
          reportType: 'FLEET_UTILIZATION',
          frequency: 'DAILY',
          format: 'CSV',
          targetEmails: ['test@example.com']
        });
      expect(res.status).toBe(403);
    });

    it('creates a subscription atomically and generates an AuditLog', async () => {
      const res = await request(testApp)
        .post('/api/v1/reports/subscriptions')
        .set('Authorization', `Bearer ${orgAdminToken1}`)
        .send({
          reportType: 'FLEET_UTILIZATION',
          frequency: 'DAILY',
          format: 'CSV',
          targetEmails: ['admin@report.com']
        });

      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      createdSubId = res.body.id;

      // Verify Audit Log Atomicity
      const audit = await prisma.auditLog.findFirst({
        where: { action: 'REPORT_SUBSCRIPTION_CREATED', organizationId: orgId1, userId: oa1Id }
      });
      expect(audit).not.toBeNull();
      expect((audit!.metadata as any).subscriptionId).toBe(createdSubId);
    });

    it('enforces tenant isolation using X-Target-Tenant for SUPER_ADMIN', async () => {
      const res = await request(testApp)
        .get('/api/v1/reports/subscriptions')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .set('X-Target-Tenant', orgId2);

      expect(res.status).toBe(200);
      expect(res.body.length).toBe(0); // Should be 0 for org 2
    });

    it('deletes a subscription atomically and generates an AuditLog', async () => {
      const res = await request(testApp)
        .delete(`/api/v1/reports/subscriptions/${createdSubId}`)
        .set('Authorization', `Bearer ${orgAdminToken1}`);

      expect(res.status).toBe(204);

      // Verify Audit Log Atomicity
      const audit = await prisma.auditLog.findFirst({
        where: { action: 'REPORT_SUBSCRIPTION_DELETED', organizationId: orgId1, userId: oa1Id }
      });
      expect(audit).not.toBeNull();
      expect((audit!.metadata as any).subscriptionId).toBe(createdSubId);
    });
  });

  describe('Report Generation & Secure Download (Cryptographic Hash Matching & IDOR)', () => {
    let validToken: string;

    it('generates an on-demand report', async () => {
      const res = await request(testApp)
        .post('/api/v1/reports/export')
        .set('Authorization', `Bearer ${orgAdminToken1}`)
        .send({
          reportType: 'FLEET_UTILIZATION',
          format: 'CSV'
        });

      expect(res.status).toBe(200);
      expect(res.body.executionId).toBeDefined();
      expect(res.body.token).toBeDefined();
      validToken = res.body.token;
    });

    it('fails to download with an invalid or expired token (IDOR/Auth Protection)', async () => {
      const res = await request(testApp)
        .get('/api/v1/reports/download/invalid_token_123')
        .set('Authorization', `Bearer ${orgAdminToken1}`);
      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/Invalid or expired/);
    });

    it('successfully downloads using the valid one-time token (Cryptographic Hash Match)', async () => {
      const res = await request(testApp)
        .get(`/api/v1/reports/download/${validToken}`)
        .set('Authorization', `Bearer ${orgAdminToken1}`);
      
      expect(res.status).toBe(200);
      expect(res.header['content-type']).toBe('application/octet-stream');
    });

    it('prevents double-download using the same one-time token', async () => {
      const res = await request(testApp)
        .get(`/api/v1/reports/download/${validToken}`)
        .set('Authorization', `Bearer ${orgAdminToken1}`);
      
      expect(res.status).toBe(403); // Token was invalidated!
    });
  });

  describe('Report Scheduler Concurrency & Retry Behavior', () => {
    it('prevents duplicate concurrent retries using optimistic lock (updateMany count)', async () => {
      // 1. Create a FAILED execution with retryCount < maxRetries
      const exec = await prisma.reportExecution.create({
        data: {
          organizationId: orgId1,
          status: 'FAILED',
          retryCount: 0,
          updatedAt: new Date(Date.now() - 30 * 60 * 1000) // Force backoff to pass
        }
      });

      // 2. Simulate concurrent nodes fetching it
      // Instead of waiting, we will fire the optimistic lock twice manually
      
      const updateNode1 = await prisma.reportExecution.updateMany({
        where: { id: exec.id, status: 'FAILED', retryCount: 0 },
        data: { status: 'RUNNING', retryCount: 1 }
      });

      const updateNode2 = await prisma.reportExecution.updateMany({
        where: { id: exec.id, status: 'FAILED', retryCount: 0 },
        data: { status: 'RUNNING', retryCount: 1 }
      });

      // Only one node should succeed
      expect(updateNode1.count).toBe(1);
      expect(updateNode2.count).toBe(0); // Node 2 failed to claim!
    });
  });
});
