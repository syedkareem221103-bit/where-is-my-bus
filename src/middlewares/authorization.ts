import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database';
import { ForbiddenError, UnauthorizedError } from '../errors';

// ABAC: Ensure the request has a valid organization context
export const requireOrganization = (req: Request, _res: Response, next: NextFunction): void => {
  if (!req.user) {
    return next(new UnauthorizedError('User authentication required'));
  }
  
  // If SUPER_ADMIN didn't supply X-Target-Tenant (which sets org in authenticateUser), block them on org-scoped routes.
  if (!req.user.org) {
    return next(new ForbiddenError('Tenant context required. SUPER_ADMIN must supply X-Target-Tenant header for this route.'));
  }

  next();
};

export const auditAuthorizationFailure = async (req: Request, reason: string): Promise<void> => {
  try {
    if (req.user) {
      const orgId = req.user.organizationId || (req.user as any).org;
      const userId = req.user.id || (req.user as any).userId || (req.user as any).sub;
      
      if (orgId && userId) {
        await prisma.auditLog?.create({
          data: {
            action: 'AUTHORIZATION_FAILURE',
            organizationId: orgId,
            userId: userId,
            ipAddress: req.ip || req.headers['x-forwarded-for'] as string || '0.0.0.0',
            metadata: { reason, path: req.path, method: req.method }
          }
        });
      }
    }
  } catch (err) {
    console.error('Failed to write authorization failure audit log', err);
  }
};

export class NotFoundError extends Error {
  statusCode = 404;
  constructor(message: string = 'Resource not found') {
    super(message);
    this.name = 'NotFoundError';
  }
}

export const requireOwnership = (resourceType: 'user' | 'student' | 'trip' | 'organization', paramKey: string = 'id') => {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user || !req.user.org) {
        return next(new UnauthorizedError('User authentication and organization context required'));
      }

      const resourceId = req.params[paramKey];
      if (!resourceId) {
        return next(new ForbiddenError('Resource ID is missing'));
      }

      if (resourceType === 'user') {
        // User ownership: payload.sub === targetId
        if (req.user.sub !== resourceId) {
          await auditAuthorizationFailure(req, `User ${req.user.sub} attempted to access profile ${resourceId}`);
          return next(new ForbiddenError('You do not have permission to access this user resource'));
        }
      } else if (resourceType === 'student') {
        // Parent ownership over student
        if (req.user.role === 'PARENT') {
          const link = await prisma.parentChild.findFirst({
            where: {
              parentId: req.user.sub,
              studentId: resourceId,
              organizationId: req.user.org
            }
          });
          if (!link) {
            await auditAuthorizationFailure(req, `Parent ${req.user.sub} attempted to access unlinked student ${resourceId}`);
            // Return 404 to obscure existence
            return next(new NotFoundError('Resource not found'));
          }
        }
      } else if (resourceType === 'trip') {
        // Driver ownership over trip
        if (req.user.role === 'DRIVER') {
          const trip = await prisma.trip.findFirst({
            where: {
              id: resourceId,
              driverId: req.user.sub,
              organizationId: req.user.org
            }
          });
          if (!trip) {
            await auditAuthorizationFailure(req, `Driver ${req.user.sub} attempted to access unassigned trip ${resourceId}`);
            return next(new NotFoundError('Resource not found'));
          }
        }
      } else if (resourceType === 'organization') {
        // Organization ownership: req.user.org === targetId
        const org = await prisma.organization.findUnique({ where: { id: resourceId } });
        if (!org || org.organizationId !== req.user.org) {
          await auditAuthorizationFailure(req, `User ${req.user.sub} attempted to access cross-tenant organization ${resourceId}`);
          return next(new ForbiddenError('You do not have permission to access this organization resource'));
        }
      }

      next();
    } catch (err) {
      next(err);
    }
  };
};
