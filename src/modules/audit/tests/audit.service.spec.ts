import { AuditService } from '../audit.service';
import LegacyAuditService from '../../../services/audit.service';
import { prisma } from '../../../config/database';
import { randomUUID } from 'crypto';

describe('AuditService', () => {
  const auditService = AuditService.getInstance();
  const legacyAuditService = LegacyAuditService.getInstance();

  const ORG_ID = randomUUID();
  const USER_ID = randomUUID();

  beforeAll(async () => {
    // Setup test organization and user
    await prisma.organization.create({
      data: {
        organizationId: ORG_ID,
        name: 'Audit Test Org',
        type: 'SCHOOL',
        routeSettings: {},
        notifySettings: {},
        operatingSchedule: {}
      }
    });

    await prisma.user.create({
      data: {
        id: USER_ID,
        email: 'audit.test@example.com',
        firstName: 'Audit',
        lastName: 'Test',
        passwordHash: 'hash',
        role: 'SUPER_ADMIN',
        organization: { connect: { organizationId: ORG_ID } }
      }
    });
  });

  afterAll(async () => {
    // Cleanup
    await prisma.auditLog.deleteMany({ where: { organizationId: ORG_ID } });
    await prisma.user.deleteMany({ where: { id: USER_ID } });
    await prisma.organization.deleteMany({ where: { organizationId: ORG_ID } });
    await prisma.$disconnect();
  });

  describe('Recursive Sensitive-Data Masking', () => {
    it('masks flat sensitive fields', () => {
      const input = { password: 'mySecretPassword', publicField: 'hello' };
      const output = auditService.sanitizePayload(input);
      expect(output.password).toBe('***');
      expect(output.publicField).toBe('hello');
    });

    it('masks nested sensitive fields', () => {
      const input = {
        user: {
          token: '12345',
          profile: {
            accessToken: 'abcde',
            name: 'John'
          }
        }
      };
      const output = auditService.sanitizePayload(input);
      expect(output.user.token).toBe('***');
      expect(output.user.profile.accessToken).toBe('***');
      expect(output.user.profile.name).toBe('John');
    });

    it('masks fields inside arrays', () => {
      const input = {
        users: [
          { passwordHash: 'hash1' },
          { passwordHash: 'hash2', public: true }
        ]
      };
      const output = auditService.sanitizePayload(input);
      expect(output.users[0].passwordHash).toBe('***');
      expect(output.users[1].passwordHash).toBe('***');
      expect(output.users[1].public).toBe(true);
    });
  });

  describe('Audit Creation & Transaction Client Usage', () => {
    it('creates an audit log successfully', async () => {
      const action = 'test.action.1';
      await auditService.logEvent({
        organizationId: ORG_ID,
        userId: USER_ID,
        action,
        metadata: { info: 'test' }
      });

      const log = await prisma.auditLog.findFirst({ where: { organizationId: ORG_ID, action } });
      expect(log).toBeDefined();
      expect(log?.userId).toBe(USER_ID);
      expect((log?.metadata as any).info).toBe('test');
    });

    it('creates an audit log using a Prisma TransactionClient', async () => {
      const action = 'test.action.tx';
      await prisma.$transaction(async (tx) => {
        await auditService.logEvent({
          organizationId: ORG_ID,
          userId: USER_ID,
          action,
          metadata: { tx: true }
        }, tx);
      });

      const log = await prisma.auditLog.findFirst({ where: { organizationId: ORG_ID, action } });
      expect(log).toBeDefined();
      expect(log?.action).toBe(action);
    });

    it('rolls back the parent transaction if audit creation fails', async () => {
      const action = 'test.action.fail';
      let txError;
      
      try {
        await prisma.$transaction(async (tx) => {
          // Attempt to log with invalid data to force a DB error
          // Organization ID must match foreign key constraints
          await auditService.logEvent({
            organizationId: 'invalid-org-id', // Will fail constraint
            userId: USER_ID,
            action,
            metadata: {}
          }, tx);
        });
      } catch (err) {
        txError = err;
      }

      expect(txError).toBeDefined();

      // Ensure NO log was created (transaction rolled back)
      const log = await prisma.auditLog.findFirst({ where: { action } });
      expect(log).toBeNull();
    });
  });

  describe('Legacy Caller Compatibility', () => {
    it('swallows errors without failing the parent flow', async () => {
      const action = 'test.action.legacy.fail';
      // Pass invalid org ID so creation fails. Should NOT throw an error.
      await legacyAuditService.log({
        organizationId: 'invalid-org-id',
        userId: USER_ID,
        action,
        details: {}
      });

      // No error thrown!
      // Verify nothing was written
      const log = await prisma.auditLog.findFirst({ where: { action } });
      expect(log).toBeNull();
    });

    it('successfully logs events via legacy interface', async () => {
      const action = 'test.action.legacy.success';
      await legacyAuditService.log({
        organizationId: ORG_ID,
        userId: USER_ID,
        action,
        details: { legacy: true }
      });

      const log = await prisma.auditLog.findFirst({ where: { organizationId: ORG_ID, action } });
      expect(log).toBeDefined();
      expect((log?.metadata as any).legacy).toBe(true);
    });
  });
});
