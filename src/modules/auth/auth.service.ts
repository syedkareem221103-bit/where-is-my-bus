import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { UserRole } from '@prisma/client';
import env from '../../config/env';
import { AuthRepository } from './auth.repository';
import { initializeKeys } from '../../utils/crypto';
import { ConflictError, UnauthorizedError, ForbiddenError, NotFoundError } from '../../errors';

export interface RegisterDTO {
  orgName: string;
  subdomain: string;
  contactEmail: string;
  adminEmail: string;
  adminPasswordHash: string;
  firstName: string;
  lastName: string;
}

export class AuthService {
  private authRepository = new AuthRepository();

  async register(dto: RegisterDTO) {
    // 1. Validate domain uniqueness
    const existingOrgBySubdomain = await this.authRepository.findOrganizationBySubdomain(dto.subdomain);
    if (existingOrgBySubdomain) {
      throw new ConflictError('An organization with this subdomain already exists');
    }

    const existingOrgByEmail = await this.authRepository.findOrganizationByEmail(dto.contactEmail);
    if (existingOrgByEmail) {
      throw new ConflictError('An organization with this contact email already exists');
    }

    // 2. Validate administrator uniqueness
    const existingUser = await this.authRepository.findUserByEmail(dto.adminEmail);
    if (existingUser) {
      throw new ConflictError('A user with this email address already exists');
    }

    // 3. Hash administrator password securely
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(dto.adminPasswordHash, salt);

    // 4. Create in Transaction
    const { organization, admin } = await this.authRepository.createOrganizationWithAdmin(
      {
        organizationId: dto.subdomain,
        name: dto.orgName,
        type: 'SCHOOL',
        routeSettings: {},
        notifySettings: {},
        operatingSchedule: {},
      },
      {
        email: dto.adminEmail,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        role: UserRole.ORG_ADMIN,
        status: 'ACTIVE',
      }
    );

    // 5. Generate credentials (adapted for Step 3B signature)
    const sid = crypto.randomUUID();
    const jti = crypto.randomBytes(32).toString('hex');
    const tokens = this.generateTokens({
      id: admin.id,
      email: admin.email,
      role: admin.role,
      organizationId: admin.organizationId,
      sid,
      jti,
    });

    // We don't persist DeviceSession here because Step 3A didn't require it and we shouldn't modify it excessively, 
    // but the user will need to log in to get a valid refresh session.
    await this.authRepository.updateUserRefreshToken(admin.id, tokens.refreshToken);

    return {
      organization,
      user: {
        id: admin.id,
        email: admin.email,
        firstName: admin.firstName,
        lastName: admin.lastName,
        role: admin.role,
        status: admin.status,
      },
      ...tokens,
    };
  }

  async login(email: string, passwordHash: string, deviceType: string, ipAddress: string) {
    const user = await this.authRepository.findUserByEmail(email);
    if (!user) {
      // Dummy check to prevent email enumeration timing side-channels
      const dummyHash = await bcrypt.hash('dummy', 10);
      await bcrypt.compare(passwordHash, dummyHash);
      throw new UnauthorizedError('Invalid email or password');
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedError('Invalid email or password');
    }

    // Validate password match
    const isPasswordValid = await bcrypt.compare(passwordHash, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // Verify Organization is active (applicable only to non-SUPER_ADMIN users)
    if (user.organizationId) {
      const org = await prisma.organization.findUnique({
        where: { id: user.organizationId },
      });
      if (!org || org.status !== 'ACTIVE') {
        throw new ForbiddenError('Your organization has been suspended. Please contact customer support');
      }
    }

    const sid = crypto.randomUUID();
    const jti = crypto.randomBytes(32).toString('hex');

    const tokens = this.generateTokens({
      id: user.id,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId,
      sid,
      jti,
    });

    const tokenHash = crypto.createHash('sha256').update(tokens.refreshToken).digest('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await this.authRepository.createDeviceSession({
      id: sid,
      organizationId: user.organizationId,
      userId: user.id,
      tokenHash,
      deviceType,
      expiresAt,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        status: user.status,
        organizationId: user.organizationId,
      },
      ...tokens,
    };
  }

  async refresh(refreshToken: string, ipAddress: string) {
    let payload: any;
    try {
      const { publicKey } = initializeKeys();
      // Enforce ES256 allowlist, plus issuer/audience checks
      payload = jwt.verify(refreshToken, publicKey, { 
        algorithms: ['ES256'],
        issuer: 'wimb-auth',
        audience: 'wimb-clients'
      });
    } catch (error) {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }

    if (payload.type !== 'refresh' || !payload.sub || !payload.org || !payload.sid || !payload.jti) {
      throw new UnauthorizedError('Invalid refresh token');
    }

    const user = await this.authRepository.findUserById(payload.sub);
    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedError('Invalid refresh token');
    }

    if (user.organizationId) {
      const org = await prisma.organization.findUnique({
        where: { id: user.organizationId },
      });
      if (!org || org.status !== 'ACTIVE') {
        throw new ForbiddenError('Your organization has been suspended');
      }
    }

    const deviceSession = await this.authRepository.findDeviceSession(payload.sid, payload.org);
    if (!deviceSession) {
      // Class 3
      throw new UnauthorizedError('Session not found or revoked');
    }

    if (deviceSession.userId !== user.id) {
      throw new UnauthorizedError('Session mismatch');
    }

    if (deviceSession.expiresAt < new Date()) {
      throw new UnauthorizedError('Session expired');
    }

    const calculatedHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const expectedHashBuffer = Buffer.from(deviceSession.tokenHash, 'hex');
    const actualHashBuffer = Buffer.from(calculatedHash, 'hex');

    if (expectedHashBuffer.length !== actualHashBuffer.length || !crypto.timingSafeEqual(expectedHashBuffer, actualHashBuffer)) {
      // Class 2: Suspected replay, stale rotated token, or session mismatch
      await this.authRepository.deleteDeviceSessionAndAudit(deviceSession.id, payload.org, user.id, 'REFRESH_TOKEN_REPLAY_DETECTED', ipAddress);
      throw new UnauthorizedError('Suspected replay, stale rotated token, or session mismatch');
    }

    // Class 1: Valid current refresh token, proceed to rotate
    const newJti = crypto.randomBytes(32).toString('hex');
    const tokens = this.generateTokens({
      id: user.id,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId,
      sid: deviceSession.id,
      jti: newJti,
    });

    const newTokenHash = crypto.createHash('sha256').update(tokens.refreshToken).digest('hex');
    const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const updatedCount = await this.authRepository.rotateDeviceSession(
      deviceSession.id,
      payload.org,
      user.id,
      calculatedHash,
      newTokenHash,
      newExpiresAt
    );

    if (updatedCount === 0) {
      // Concurrent CAS race failure
      throw new UnauthorizedError('Concurrent refresh detected');
    }

    return tokens;
  }

  async logout(userId: string, sid: string, orgId: string, ipAddress: string) {
    if (!sid || !orgId) {
      return;
    }
    await this.authRepository.deleteDeviceSession(sid, orgId, userId);
    await this.authRepository.createAuditLog({
      organization: { connect: { organizationId: orgId } },
      user: { connect: { id: userId } },
      action: 'LOGOUT',
      metadata: { sid },
      ipAddress
    });
  }

  async getProfile(userId: string) {
    const user = await this.authRepository.findUserById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      status: user.status,
      organizationId: user.organizationId,
    };
  }

  private generateTokens(payload: { id: string; email: string; role: UserRole; organizationId: string | null; sid: string; jti: string }) {
    const { privateKey } = initializeKeys();

    const accessPayload = {
      id: payload.id, // For backward compatibility with Step 3A middleware
      email: payload.email,
      role: payload.role,
      organizationId: payload.organizationId,
      sub: payload.id,
      org: payload.organizationId,
      sid: payload.sid,
      type: 'access'
    };

    const accessToken = jwt.sign(accessPayload, privateKey, {
      algorithm: 'ES256',
      expiresIn: '15m',
      issuer: 'wimb-auth',
      audience: 'wimb-clients',
    });

    const refreshPayload = {
      id: payload.id, // For backward compatibility
      sub: payload.id,
      org: payload.organizationId,
      sid: payload.sid,
      jti: payload.jti,
      type: 'refresh'
    };

    const refreshToken = jwt.sign(refreshPayload, privateKey, {
      algorithm: 'ES256',
      expiresIn: '7d',
      issuer: 'wimb-auth',
      audience: 'wimb-clients',
    });

    return { accessToken, refreshToken };
  }
}

import { prisma } from '../../config/database';
export default AuthService;
