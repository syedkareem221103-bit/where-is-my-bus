import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import { UserRole } from '@prisma/client';
import prisma from '../config/database';
import organizationRouter from '../modules/organization/organization.routes';
import { errorHandler } from '../errors/error-handler';

// Test Setup
const testApp = express();
testApp.use(express.json());
testApp.use('/api/v1/organizations', organizationRouter);
testApp.use(errorHandler);

import { initializeKeys } from '../utils/crypto';
const { privateKey } = initializeKeys();

function signToken(payload: any) {
  return jwt.sign(
    { ...payload, type: 'access' },
    privateKey,
    { algorithm: 'ES256', expiresIn: '15m' }
  );
}

const mockSuperAdminToken = signToken({
  sub: 'sa-id',
  email: 'sa@test.com',
  role: UserRole.SUPER_ADMIN,
  org: 'sa-org',
  sid: 'sa-session'
});

const mockOrgAdminToken = signToken({
  sub: 'oa-id',
  email: 'oa@test.com',
  role: UserRole.ORG_ADMIN,
  org: '123e4567-e89b-12d3-a456-426614174000', // matches target org ID
  sid: 'oa-session'
});

const mockOtherOrgAdminToken = signToken({
  sub: 'oa2-id',
  email: 'oa2@test.com',
  role: UserRole.ORG_ADMIN,
  org: '987e6543-e21b-12d3-a456-426614174000',
  sid: 'oa2-session'
});

// Mock Prisma
jest.mock('../config/database', () => ({
  organization: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
  },
  auditLog: {
    create: jest.fn(),
  },
  $transaction: jest.fn((promises) => Promise.all(promises)),
}));

describe('Milestone 2 - Step 1: Organization Management Module', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/v1/organizations (Create)', () => {
    it('creates an organization successfully as SUPER_ADMIN', async () => {
      (prisma.organization.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.organization.create as jest.Mock).mockResolvedValue({ id: 'new-org-id', name: 'Test Org', type: 'SCHOOL' });
      (prisma.auditLog.create as jest.Mock).mockResolvedValue({});

      const response = await request(testApp)
        .post('/api/v1/organizations')
        .set('Authorization', `Bearer ${mockSuperAdminToken}`)
        .send({
          organizationId: 'test-org-alias',
          name: 'Test Org',
          type: 'SCHOOL'
        });

      expect(response.status).toBe(201);
      expect(response.body.status).toBe('success');
      expect(prisma.$transaction).toHaveBeenCalled();
      expect(prisma.organization.create).toHaveBeenCalled();
      expect(prisma.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ action: 'ORGANIZATION_CREATED' })
      }));
    });

    it('rejects duplicate organization ID', async () => {
      (prisma.organization.findUnique as jest.Mock).mockResolvedValue({ id: 'existing' });

      const response = await request(testApp)
        .post('/api/v1/organizations')
        .set('Authorization', `Bearer ${mockSuperAdminToken}`)
        .send({
          organizationId: 'test-org-alias',
          name: 'Test Org',
          type: 'SCHOOL'
        });

      expect(response.status).toBe(409);
    });

    it('returns 400 on validation failure (missing name)', async () => {
      const response = await request(testApp)
        .post('/api/v1/organizations')
        .set('Authorization', `Bearer ${mockSuperAdminToken}`)
        .send({
          organizationId: 'test-org-alias',
          type: 'SCHOOL'
        });

      expect(response.status).toBe(400);
    });

    it('rejects creation attempt by ORG_ADMIN', async () => {
      const response = await request(testApp)
        .post('/api/v1/organizations')
        .set('Authorization', `Bearer ${mockOrgAdminToken}`)
        .send({
          organizationId: 'test-org-alias',
          name: 'Test Org',
          type: 'SCHOOL'
        });

      expect(response.status).toBe(403);
    });
  });

  describe('GET /api/v1/organizations (List)', () => {
    it('returns list of organizations for SUPER_ADMIN', async () => {
      (prisma.organization.findMany as jest.Mock).mockResolvedValue([{ id: 'org1' }]);
      (prisma.organization.count as jest.Mock).mockResolvedValue(1);

      const response = await request(testApp)
        .get('/api/v1/organizations')
        .set('Authorization', `Bearer ${mockSuperAdminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.organizations).toHaveLength(1);
    });

    it('rejects list attempt by ORG_ADMIN', async () => {
      const response = await request(testApp)
        .get('/api/v1/organizations')
        .set('Authorization', `Bearer ${mockOrgAdminToken}`);

      expect(response.status).toBe(403);
    });
  });

  describe('GET /api/v1/organizations/:id (Single Fetch & Tenant Isolation)', () => {
    it('allows SUPER_ADMIN to fetch any organization', async () => {
      (prisma.organization.findUnique as jest.Mock).mockResolvedValue({ id: '123e4567-e89b-12d3-a456-426614174000', organizationId: '123e4567-e89b-12d3-a456-426614174000', name: 'Target', status: 'ACTIVE' });

      const response = await request(testApp)
        .get('/api/v1/organizations/123e4567-e89b-12d3-a456-426614174000')
        .set('Authorization', `Bearer ${mockSuperAdminToken}`)
        .set('X-Target-Tenant', '123e4567-e89b-12d3-a456-426614174000');

      expect(response.status).toBe(200);
    });

    it('allows ORG_ADMIN to fetch their OWN organization', async () => {
      (prisma.organization.findUnique as jest.Mock).mockResolvedValue({ id: '123e4567-e89b-12d3-a456-426614174000', organizationId: '123e4567-e89b-12d3-a456-426614174000', name: 'Target', status: 'ACTIVE' });

      const response = await request(testApp)
        .get('/api/v1/organizations/123e4567-e89b-12d3-a456-426614174000')
        .set('Authorization', `Bearer ${mockOrgAdminToken}`);

      expect(response.status).toBe(200);
    });

    it('rejects ORG_ADMIN accessing a cross-tenant organization', async () => {
      const response = await request(testApp)
        .get('/api/v1/organizations/123e4567-e89b-12d3-a456-426614174000')
        .set('Authorization', `Bearer ${mockOtherOrgAdminToken}`);

      expect(response.status).toBe(403); // Forbidden
      expect(prisma.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ action: 'AUTHORIZATION_FAILURE' })
      }));
    });
  });

  describe('PATCH /api/v1/organizations/:id (Update)', () => {
    it('allows ORG_ADMIN to update their own organization', async () => {
      (prisma.organization.findUnique as jest.Mock).mockResolvedValue({ id: '123e4567-e89b-12d3-a456-426614174000', organizationId: '123e4567-e89b-12d3-a456-426614174000', name: 'Target', status: 'ACTIVE' });
      (prisma.organization.update as jest.Mock).mockResolvedValue({ id: '123e4567-e89b-12d3-a456-426614174000', name: 'Updated' });

      const response = await request(testApp)
        .patch('/api/v1/organizations/123e4567-e89b-12d3-a456-426614174000')
        .set('Authorization', `Bearer ${mockOrgAdminToken}`)
        .send({ name: 'Updated' });

      expect(response.status).toBe(200);
      expect(prisma.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ action: 'ORGANIZATION_UPDATED' })
      }));
    });
  });

  describe('DELETE /api/v1/organizations/:id (Soft Delete)', () => {
    it('allows SUPER_ADMIN to soft delete organization', async () => {
      (prisma.organization.findUnique as jest.Mock).mockResolvedValue({ id: '123e4567-e89b-12d3-a456-426614174000', organizationId: '123e4567-e89b-12d3-a456-426614174000', status: 'ACTIVE' });
      (prisma.organization.update as jest.Mock).mockResolvedValue({ id: '123e4567-e89b-12d3-a456-426614174000', status: 'DEACTIVATED' });

      const response = await request(testApp)
        .delete('/api/v1/organizations/123e4567-e89b-12d3-a456-426614174000')
        .set('Authorization', `Bearer ${mockSuperAdminToken}`)
        .set('X-Target-Tenant', '123e4567-e89b-12d3-a456-426614174000');

      expect(response.status).toBe(200);
      expect(prisma.organization.update).toHaveBeenCalledWith(expect.objectContaining({
        data: { status: 'DEACTIVATED' }
      }));
      expect(prisma.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ action: 'ORGANIZATION_DEACTIVATED' })
      }));
    });

    it('rejects deletion attempt by ORG_ADMIN', async () => {
      const response = await request(testApp)
        .delete('/api/v1/organizations/123e4567-e89b-12d3-a456-426614174000')
        .set('Authorization', `Bearer ${mockOrgAdminToken}`);

      expect(response.status).toBe(403);
    });
  });
});
