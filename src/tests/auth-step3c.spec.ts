import request from 'supertest';
import app from '../app';
import jwt from 'jsonwebtoken';
import { initializeKeys } from '../utils/crypto';
import prisma from '../config/database';
import { UserRole } from '@prisma/client';
import { env } from '../config/env';

// Mock DB
jest.mock('../config/database', () => {
  const mPrisma: any = {
    organization: { findUnique: jest.fn() },
    auditLog: { create: jest.fn() },
    parentChild: { findFirst: jest.fn() },
    trip: { findFirst: jest.fn() }
  };
  return { __esModule: true, default: mPrisma, prisma: mPrisma };
});

describe('Milestone 1 - Step 3C: Authorization, RBAC, ABAC (Integration)', () => {
  const { privateKey } = initializeKeys();

  const generateToken = (payload: any) => {
    return jwt.sign(payload, privateKey, { algorithm: 'ES256' });
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('RBAC & JWT Parsing', () => {
    it('1. Rejects missing token with 401 Unauthorized', async () => {
      const res = await request(app).get('/api/v1/auth/profile');
      expect(res.status).toBe(401);
    });

    it('2. Rejects token with type != access', async () => {
      const token = generateToken({ type: 'refresh', sub: 'user1', role: 'STUDENT' });
      const res = await request(app).get('/api/v1/auth/profile').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(401);
    });
  });

  describe('SUPER_ADMIN & Tenant Context', () => {
    let testAppOrg: any;
    beforeAll(async () => {
      const express = require('express');
      testAppOrg = express();
      const { authenticateUser } = await import('../middlewares/auth.middleware');
      const { requireOrganization } = await import('../middlewares/authorization');
      testAppOrg.get('/api/v1/test-org', authenticateUser, requireOrganization, (req: any, res: any) => res.json({ ok: true }));
      testAppOrg.use((err: any, req: any, res: any, next: any) => res.status(err.statusCode || 500).json({ error: err.message }));
    });

    it('3. SUPER_ADMIN is rejected if accessing tenant route without X-Target-Tenant', async () => {
      const token = generateToken({ type: 'access', sub: 'admin1', role: 'SUPER_ADMIN', org: null });
      const res = await request(testAppOrg).get('/api/v1/test-org').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(403);
    });

    it('4. SUPER_ADMIN with invalid X-Target-Tenant gets 401', async () => {
      (prisma.organization.findUnique as jest.Mock).mockResolvedValueOnce(null);
      const token = generateToken({ type: 'access', sub: 'admin1', role: 'SUPER_ADMIN', org: null });
      const res = await request(testAppOrg).get('/api/v1/test-org')
        .set('Authorization', `Bearer ${token}`)
        .set('x-target-tenant', 'fake-org');
      expect(res.status).toBe(401);
    });

    it('5. SUPER_ADMIN with valid X-Target-Tenant succeeds', async () => {
      (prisma.organization.findUnique as jest.Mock).mockResolvedValueOnce({ id: 'org1', status: 'ACTIVE' });
      const token = generateToken({ type: 'access', sub: 'admin1', role: 'SUPER_ADMIN', org: null });
      const res = await request(testAppOrg).get('/api/v1/test-org')
        .set('Authorization', `Bearer ${token}`)
        .set('x-target-tenant', 'org1');
      expect(res.status).toBe(200);
    });

    it('6. Non-SUPER_ADMIN providing X-Target-Tenant is ignored', async () => {
      const token = generateToken({ type: 'access', sub: 'user1', role: 'STUDENT', org: 'real-org' });
      const res = await request(testAppOrg).get('/api/v1/test-org')
        .set('Authorization', `Bearer ${token}`)
        .set('x-target-tenant', 'hacked-org'); // Should be ignored
      expect(res.status).toBe(200); // Because real-org is in the token
      expect(prisma.organization.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('ABAC Ownership & Audit Logging', () => {
    let testApp: any;

    beforeAll(async () => {
      const express = require('express');
      testApp = express();
      const { authenticateUser, requireRoles } = await import('../middlewares/auth.middleware');
      const { requireOwnership } = await import('../middlewares/authorization');
      
      testApp.get('/api/v1/test-user/:id', authenticateUser, requireOwnership('user', 'id'), (req: any, res: any) => res.json({ ok: true }));
      testApp.get('/api/v1/test-student/:id', authenticateUser, requireRoles('PARENT'), requireOwnership('student', 'id'), (req: any, res: any) => res.json({ ok: true }));
      testApp.get('/api/v1/test-trip/:id', authenticateUser, requireRoles('DRIVER'), requireOwnership('trip', 'id'), (req: any, res: any) => res.json({ ok: true }));

      testApp.use((err: any, req: any, res: any, next: any) => {
        res.status(err.statusCode || 500).json({ error: err.message });
      });
    });

    it('7. User can access own profile', async () => {
      const token = generateToken({ type: 'access', sub: 'u1', role: 'STUDENT', org: 'o1' });
      const res = await request(testApp).get('/api/v1/test-user/u1').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
    });

    it('8. User gets 403 accessing another profile and logs audit', async () => {
      const token = generateToken({ type: 'access', sub: 'u1', role: 'STUDENT', org: 'o1' });
      const res = await request(testApp).get('/api/v1/test-user/u2').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(403);
      expect(prisma.auditLog.create).toHaveBeenCalled();
    });

    it('9. Parent accessing linked student gets 200', async () => {
      (prisma.parentChild.findFirst as jest.Mock).mockResolvedValueOnce({ id: 'pc1' });
      const token = generateToken({ type: 'access', sub: 'p1', role: 'PARENT', org: 'o1' });
      const res = await request(testApp).get('/api/v1/test-student/s1').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
    });

    it('10. Parent accessing unlinked student gets 404 (obscuring existence) and logs audit', async () => {
      (prisma.parentChild.findFirst as jest.Mock).mockResolvedValueOnce(null);
      const token = generateToken({ type: 'access', sub: 'p1', role: 'PARENT', org: 'o1' });
      const res = await request(testApp).get('/api/v1/test-student/s1').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(404);
      expect(prisma.auditLog.create).toHaveBeenCalled();
    });

    it('11. Driver accessing assigned trip gets 200', async () => {
      (prisma.trip.findFirst as jest.Mock).mockResolvedValueOnce({ id: 't1' });
      const token = generateToken({ type: 'access', sub: 'd1', role: 'DRIVER', org: 'o1' });
      const res = await request(testApp).get('/api/v1/test-trip/t1').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
    });

    it('12. Driver accessing unassigned trip gets 404 and logs audit', async () => {
      (prisma.trip.findFirst as jest.Mock).mockResolvedValueOnce(null);
      const token = generateToken({ type: 'access', sub: 'd1', role: 'DRIVER', org: 'o1' });
      const res = await request(testApp).get('/api/v1/test-trip/t1').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(404);
      expect(prisma.auditLog.create).toHaveBeenCalled();
    });
  });
});
