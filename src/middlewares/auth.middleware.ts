import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserRole } from '@prisma/client';
import { initializeKeys } from '../utils/crypto';
import { UnauthorizedError, ForbiddenError } from '../errors';

import prisma from '../config/database';

export interface UserPayload {
  id: string; // Backward compatibility
  organizationId: string; // Backward compatibility
  sub: string;
  email: string;
  role: UserRole;
  org: string;
  sid: string;
  type: string;
}

// Extend global Express namespace to attach the user object
declare global {
  namespace Express {
    interface Request {
      user?: UserPayload;
    }
  }
}

export const authenticateUser = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new UnauthorizedError('Authentication token missing or malformed'));
  }

  const token = authHeader.split(' ')[1];

  try {
    const { publicKey } = initializeKeys();
    // Enforce algorithm allowlisting (must be exactly ES256 asymmetric signature)
    const payload = jwt.verify(token, publicKey, { algorithms: ['ES256'] }) as UserPayload;
    
    if (payload.type !== 'access') {
      return next(new UnauthorizedError('Invalid token type'));
    }

    // Handle X-Target-Tenant logic for SUPER_ADMIN
    const targetTenant = req.headers['x-target-tenant'] as string | undefined;
    if (payload.role === 'SUPER_ADMIN' && targetTenant) {
      // Validate target organization
      const org = await prisma.organization.findUnique({ where: { id: targetTenant } });
      if (!org || org.status !== 'ACTIVE') {
        return next(new UnauthorizedError('Invalid target tenant'));
      }
      payload.org = targetTenant;
    } else if (payload.role !== 'SUPER_ADMIN' && targetTenant) {
      // Actively ignore X-Target-Tenant for non-SUPER_ADMIN to prevent leakage/escalation
      // Just rely on the org from the verified JWT
    }

    req.user = payload;
    next();
  } catch (error: any) {
    if (error instanceof UnauthorizedError) {
      return next(error);
    }
    return next(new UnauthorizedError('Invalid or expired authentication token'));
  }
};

import { auditAuthorizationFailure } from './authorization';

export const requireRoles = (...allowedRoles: UserRole[]) => {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      return next(new UnauthorizedError('User authentication required'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      await auditAuthorizationFailure(req, `Role ${req.user.role} attempted to access route requiring ${allowedRoles.join(',')}`);
      return next(new ForbiddenError('You do not have permission to access this resource'));
    }

    next();
  };
};
