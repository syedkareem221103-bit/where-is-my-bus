import request from 'supertest';
import app from '../app';
import { prisma } from '../config/database';
import jwt from 'jsonwebtoken';
import { UserRole } from '@prisma/client';
import { initializeKeys, getJWKS, timingSafeCompare, resetCachedKeys } from '../utils/crypto';
import env from '../config/env';

// Mock the Prisma client globally to isolate endpoints from actual DB networking
jest.mock('../config/database', () => {
  const mockPrisma = {
    organization: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  };
  return {
    __esModule: true,
    default: mockPrisma,
    prisma: mockPrisma,
  };
});

describe('Authentication & Security Gate Integration Tests', () => {
  let privateKey: string;
  let publicKey: string;

  beforeAll(() => {
    // Force key initialization for testing
    const keys = initializeKeys();
    privateKey = keys.privateKey;
    publicKey = keys.publicKey;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Cryptographic Infrastructure (Step 3A)', () => {
    it('should generate valid ES256 key pairs dynamically in test environment', () => {
      expect(privateKey).toContain('BEGIN PRIVATE KEY');
      expect(publicKey).toContain('BEGIN PUBLIC KEY');
    });

    it('should export public-key-only JWKS formats', () => {
      const jwks = getJWKS();
      expect(jwks.keys.length).toBe(1);
      expect(jwks.keys[0].kty).toBe('EC');
      expect(jwks.keys[0].crv).toBe('P-256');
      expect(jwks.keys[0].alg).toBe('ES256');
      expect(jwks.keys[0].use).toBe('sig');
      expect(jwks.keys[0]).toHaveProperty('x');
      expect(jwks.keys[0]).toHaveProperty('y');
      // Ensure private keys are not exposed
      expect(JSON.stringify(jwks)).not.toContain('PRIVATE KEY');
    });

    it('should perform timing-safe comparison correctly', () => {
      const match = timingSafeCompare('secret-token-hash-123', 'secret-token-hash-123');
      const mismatch = timingSafeCompare('secret-token-hash-123', 'secret-token-hash-456');
      const lenMismatch = timingSafeCompare('secret-token-hash-123', 'short');

      expect(match).toBe(true);
      expect(mismatch).toBe(false);
      expect(lenMismatch).toBe(false);
    });

    it('should expose public JWKS endpoint via HTTP GET', async () => {
      const response = await request(app)
        .get('/api/v1/auth/.well-known/jwks.json')
        .send();

      expect(response.status).toBe(200);
      expect(response.body.keys).toBeDefined();
      expect(response.body.keys.length).toBe(1);
      expect(response.body.keys[0].kty).toBe('EC');
      expect(response.body.keys[0].alg).toBe('ES256');
      expect(response.body.keys[0].crv).toBe('P-256');
      expect(response.headers['cache-control']).toContain('public');
    });
  });

  describe('POST /api/v1/auth/register', () => {
    it('should validate registration payloads and reject invalid emails', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          orgName: 'A',
          subdomain: 'invalid_subdomain_caps_and_symbols',
          contactEmail: 'invalid-email',
          adminEmail: 'invalid-admin-email',
          password: '123',
          firstName: '',
          lastName: '',
        });

      expect(response.status).toBe(400);
      expect(response.body.status).toBe('error');
      expect(response.body.message).toBe('Validation Error');
      expect(response.body.errors.length).toBeGreaterThan(0);
    });
  });

  describe('RBAC & JWT Security Guard Middleware', () => {
    it('should reject requests with missing authorization headers on protected routes', async () => {
      const response = await request(app)
        .get('/api/v1/organizations') // Protected super-admin route
        .send();

      expect(response.status).toBe(401);
      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('token missing');
    });

    it('should reject requests with invalid signature JWT tokens', async () => {
      const response = await request(app)
        .get('/api/v1/organizations')
        .set('Authorization', 'Bearer invalid-token-string')
        .send();

      expect(response.status).toBe(401);
      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('Invalid or expired');
    });

    it('should return 403 Forbidden if user role is insufficient for endpoint access', async () => {
      // Create a valid signed token using the ES256 algorithm
      const mockStudentToken = jwt.sign(
        {
          sub: 'test-student-id',
          email: 'student@school.com',
          role: UserRole.STUDENT,
          org: 'test-org-id',
          sid: 'session-id',
          type: 'access',
        },
        privateKey,
        { algorithm: 'ES256', expiresIn: '1m' }
      );

      const response = await request(app)
        .get('/api/v1/organizations') // Requires Role.SUPER_ADMIN
        .set('Authorization', `Bearer ${mockStudentToken}`)
        .send();

      expect(response.status).toBe(403);
      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('do not have permission');
    });

    it('should permit access for authorized roles', async () => {
      // Mock db returns for organization fetch
      const mockOrgs = [{ id: 'org-1', name: 'School One', subdomain: 'school1', contactEmail: 'admin@school1.com', status: 'ACTIVE' }];
      (prisma.organization.findMany as jest.Mock).mockResolvedValue(mockOrgs);
      (prisma.organization.count as jest.Mock).mockResolvedValue(1);

      const mockSuperAdminToken = jwt.sign(
        {
          sub: 'test-super-admin-id',
          email: 'super@saas.com',
          role: UserRole.SUPER_ADMIN,
          org: 'platform-org',
          sid: 'session-id',
          type: 'access',
        },
        privateKey,
        { algorithm: 'ES256', expiresIn: '1m' }
      );

      const response = await request(app)
        .get('/api/v1/organizations')
        .set('Authorization', `Bearer ${mockSuperAdminToken}`)
        .send();

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data.organizations).toBeDefined();
    });
  });

  describe('Key Lifecycle and Environment Startup Guards (Step 3A)', () => {
    const originalEnv = { ...process.env };
    let mockExit: jest.SpyInstance;

    beforeEach(() => {
      mockExit = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);
      resetCachedKeys();
      jest.resetModules();
    });

    afterEach(() => {
      process.env = { ...originalEnv };
      mockExit.mockRestore();
    });

    it('should fail securely on startup in production when keys are missing', () => {
      process.env.NODE_ENV = 'production';
      delete process.env.JWT_PRIVATE_KEY;
      delete process.env.JWT_PUBLIC_KEY;

      try {
        const { initializeKeys } = require('../utils/crypto');
        initializeKeys();
      } catch (err) {}

      expect(mockExit).toHaveBeenCalledWith(1);
    });

    it('should fail securely on startup in production when keys are malformed', () => {
      process.env.NODE_ENV = 'production';
      process.env.JWT_PRIVATE_KEY = 'invalid-private-key-pem';
      process.env.JWT_PUBLIC_KEY = 'invalid-public-key-pem';

      try {
        const { initializeKeys } = require('../utils/crypto');
        initializeKeys();
      } catch (err) {}

      expect(mockExit).toHaveBeenCalledWith(1);
    });

    it('should fail securely on startup in production when keys are mismatched', () => {
      process.env.NODE_ENV = 'production';
      const cryptoLib = require('crypto');
      const pair1 = cryptoLib.generateKeyPairSync('ec', { namedCurve: 'P-256', publicKeyEncoding: { type: 'spki', format: 'pem' }, privateKeyEncoding: { type: 'pkcs8', format: 'pem' } });
      const pair2 = cryptoLib.generateKeyPairSync('ec', { namedCurve: 'P-256', publicKeyEncoding: { type: 'spki', format: 'pem' }, privateKeyEncoding: { type: 'pkcs8', format: 'pem' } });

      process.env.JWT_PRIVATE_KEY = pair1.privateKey;
      process.env.JWT_PUBLIC_KEY = pair2.publicKey;

      try {
        const { initializeKeys } = require('../utils/crypto');
        initializeKeys();
      } catch (err) {}

      expect(mockExit).toHaveBeenCalledWith(1);
    });

    it('should support ephemeral developer key pair opt-in in development mode', () => {
      process.env.NODE_ENV = 'development';
      process.env.ALLOW_DEV_EPHEMERAL_KEYS = 'true';
      delete process.env.JWT_PRIVATE_KEY;
      delete process.env.JWT_PUBLIC_KEY;

      const { initializeKeys } = require('../utils/crypto');
      const keys = initializeKeys();
      expect(keys.privateKey).toBeDefined();
      expect(keys.publicKey).toBeDefined();
      expect(mockExit).not.toHaveBeenCalled();
    });
  });
});
