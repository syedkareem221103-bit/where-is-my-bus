import request from 'supertest';
import app from '../app';
import { PrismaClient, UserRole } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { initializeKeys } from '../utils/crypto';
import AlertProcessingService from '../modules/alert/alert.processing.service';
import AlertRetentionService from '../modules/alert/alert.retention.service';
import { shutdown as notificationShutdown } from '../modules/notification/notification.module';

const prisma = new PrismaClient();
const ORG_ID = 'a1111111-1111-1111-1111-111111111111';
const SUPER_ADMIN_ID = 'sa-alert-1234';
const ORG_ADMIN_ID = 'oa-alert-1234';
const DRIVER_ID = 'dr-alert-1234';
const TRIP_ID = 'trip-alert-1234';

const { privateKey } = initializeKeys();

function signToken(payload: any) {
  return jwt.sign(
    { ...payload, type: 'access' },
    privateKey,
    { algorithm: 'ES256', expiresIn: '15m' }
  );
}

const superAdminToken = signToken({ id: SUPER_ADMIN_ID, role: 'SUPER_ADMIN', org: ORG_ID });
const orgAdminToken = signToken({ id: ORG_ADMIN_ID, role: 'ORG_ADMIN', org: ORG_ID });
const driverToken = signToken({ id: DRIVER_ID, role: 'DRIVER', org: ORG_ID });

describe('Alert Module (Milestone 2 - Step 12)', () => {
  beforeAll(async () => {
    await prisma.organization.upsert({
      where: { id: ORG_ID },
      update: {},
      create: { 
        id: ORG_ID, 
        organizationId: ORG_ID,
        name: 'Alert Org 1',
        type: 'SCHOOL',
        routeSettings: {}, 
        notifySettings: {}, 
        operatingSchedule: {} 
      },
    });

    await prisma.user.upsert({
      where: { id: SUPER_ADMIN_ID },
      update: {},
      create: { id: SUPER_ADMIN_ID, email: 'sa_alert@example.com', passwordHash: 'hash', role: 'SUPER_ADMIN', firstName: 'S', lastName: 'A', organizationId: ORG_ID },
    });
    await prisma.user.upsert({
      where: { id: ORG_ADMIN_ID },
      update: {},
      create: { id: ORG_ADMIN_ID, email: 'oa_alert@example.com', passwordHash: 'hash', role: 'ORG_ADMIN', firstName: 'O', lastName: 'A', organizationId: ORG_ID },
    });
    await prisma.user.upsert({
      where: { id: DRIVER_ID },
      update: {},
      create: { id: DRIVER_ID, email: 'dr_alert@example.com', passwordHash: 'hash', role: 'DRIVER', firstName: 'D', lastName: 'R', organizationId: ORG_ID },
    });
  });

  afterAll(async () => {
    await prisma.auditLog.deleteMany({ where: { organizationId: ORG_ID } });
    await prisma.dataPurgeLog.deleteMany({ where: { organizationId: ORG_ID } });
    await prisma.smartAlert.deleteMany({ where: { organizationId: ORG_ID } });
    await prisma.notificationRecipient.deleteMany({ where: { organizationId: ORG_ID } });
    await prisma.notification.deleteMany({ where: { organizationId: ORG_ID } });
    await prisma.user.deleteMany({ where: { organizationId: ORG_ID } });
    await prisma.organization.delete({ where: { id: ORG_ID } });
    
    // Shutdown open handles and wait for them before disconnecting prisma
    AlertProcessingService.shutdown();
    AlertRetentionService.shutdown();
    await notificationShutdown();

    await prisma.$disconnect();
  });

  describe('Alert Processing Concurrency and Deduplication', () => {
    it('should deduplicate multiple simultaneous alert creations using Redis SET NX', async () => {
      const payload = {
        organizationId: ORG_ID,
        category: 'SPEEDING' as const,
        priority: 'HIGH' as const,
        message: 'Speeding test',
      };

      // Simulate 5 concurrent hits that would normally cause a race condition
      const results = await Promise.all([
        AlertProcessingService.processAlert(payload),
        AlertProcessingService.processAlert(payload),
        AlertProcessingService.processAlert(payload),
        AlertProcessingService.processAlert(payload),
        AlertProcessingService.processAlert(payload),
      ]);

      const successfulCreates = results.filter(r => r !== null);
      
      // Due to SET NX atomic lock, exactly 1 should succeed
      expect(successfulCreates.length).toBe(1);
      
      const alert = successfulCreates[0]!;
      expect(alert.status).toBe('ACTIVE');
    });
  });

  describe('RBAC and Tenant Isolation', () => {
    let alertId: string;

    beforeAll(async () => {
      const alert = await prisma.smartAlert.create({
        data: {
          organizationId: ORG_ID,
          category: 'ROUTE_DEVIATION',
          priority: 'MEDIUM',
          message: 'Test route deviation',
          status: 'ACTIVE'
        }
      });
      alertId = alert.id;
    });

    it('should deny a DRIVER from fetching alerts and persist AuditLog', async () => {
      const res = await request(app)
        .get('/api/v1/alerts')
        .set('Authorization', `Bearer ${driverToken}`);
      
      expect(res.status).toBe(403);

      // Verify the authorization failure AuditLog fix
      const audit = await prisma.auditLog.findFirst({
        where: {
          organizationId: ORG_ID,
          userId: DRIVER_ID,
          action: 'AUTHORIZATION_FAILURE'
        },
        orderBy: { timestamp: 'desc' }
      });

      expect(audit).not.toBeNull();
      expect(audit!.organizationId).toBe(ORG_ID);
      expect(audit!.userId).toBe(DRIVER_ID);
    });

    it('should allow ORG_ADMIN to fetch alerts', async () => {
      const res = await request(app)
        .get('/api/v1/alerts')
        .set('Authorization', `Bearer ${orgAdminToken}`);
      
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
    });
    
    it('should deny a DRIVER from acknowledging an alert', async () => {
      const res = await request(app)
        .post(`/api/v1/alerts/${alertId}/acknowledge`)
        .set('Authorization', `Bearer ${driverToken}`);
      
      expect(res.status).toBe(403);
    });
  });

  describe('Alert Resolution and Atomicity', () => {
    let alertId: string;

    beforeAll(async () => {
      const alert = await prisma.smartAlert.create({
        data: {
          organizationId: ORG_ID,
          category: 'SPEEDING',
          priority: 'CRITICAL',
          message: 'Bus broken down',
          status: 'ACTIVE'
        }
      });
      alertId = alert.id;
    });

    it('should atomically resolve an alert and generate an AuditLog', async () => {
      const res = await request(app)
        .post(`/api/v1/alerts/${alertId}/resolve`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ status: 'RESOLVED', resolutionNotes: 'Fixed engine' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('RESOLVED');
      expect(res.body.metadata.resolutionNotes).toBe('Fixed engine');

      // Verify Audit Log atomicity
      const audit = await prisma.auditLog.findFirst({
        where: {
          organizationId: ORG_ID,
          action: 'ALERT_RESOLVED',
          userId: SUPER_ADMIN_ID
        }
      });
      
      expect(audit).not.toBeNull();
      expect((audit!.metadata as any).alertId).toBe(alertId);
      expect((audit!.metadata as any).resolutionNotes).toBe('Fixed engine');
    });
  });

  describe('node-cron Retention Atomicity', () => {
    it('should atomically delete old alerts and generate a DataPurgeLog', async () => {
      // Create an old alert
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 95); // 95 days ago
      
      await prisma.smartAlert.create({
        data: {
          organizationId: ORG_ID,
          category: 'SPEEDING',
          priority: 'LOW',
          message: 'Old alert',
          status: 'RESOLVED',
          createdAt: oldDate,
        }
      });

      // Execute cron logic
      await AlertRetentionService.cleanupExpiredAlerts();

      // Ensure it was deleted
      const found = await prisma.smartAlert.findMany({
        where: { organizationId: ORG_ID, createdAt: { lt: oldDate } }
      });
      expect(found.length).toBe(0);

      // Verify atomic DataPurgeLog
      const purgeLog = await prisma.dataPurgeLog.findFirst({
        where: { organizationId: ORG_ID, purgedEntity: 'SmartAlert' }
      });
      expect(purgeLog).not.toBeNull();
    });
  });
});
