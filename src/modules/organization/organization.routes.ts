import { Router } from 'express';
import { organizationController } from './organization.controller';
import { authenticateUser, requireRoles } from '../../middlewares/auth.middleware';
import { requireOwnership } from '../../middlewares/authorization';
import { validateRequest } from '../../middlewares/validate.middleware';
import { createOrgSchema, getOrganizationsQuery, updateOrgSchema, orgIdParams } from './organization.validation';
import { UserRole } from '@prisma/client';

const router = Router();

// All organization routes require at least authentication
router.use(authenticateUser);

// Platform-level routes (No requireOrganization, no requireOwnership, ONLY SUPER_ADMIN)
router.post('/',
  requireRoles(UserRole.SUPER_ADMIN),
  validateRequest(createOrgSchema),
  organizationController.create
);

router.get('/',
  requireRoles(UserRole.SUPER_ADMIN),
  validateRequest(getOrganizationsQuery),
  organizationController.getAll
);

// Tenant-scoped routes (SUPER_ADMIN or ORG_ADMIN)
router.get('/:id',
  requireRoles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN),
  requireOwnership('organization', 'id'),
  validateRequest(orgIdParams),
  organizationController.getById
);

router.patch('/:id',
  requireRoles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN),
  requireOwnership('organization', 'id'),
  validateRequest(updateOrgSchema),
  organizationController.update
);

router.delete('/:id',
  requireRoles(UserRole.SUPER_ADMIN),
  requireOwnership('organization', 'id'),
  validateRequest(orgIdParams),
  organizationController.delete
);

export default router;
