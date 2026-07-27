import { Router } from 'express';
import { userController } from './user.controller';
import { authenticateUser, requireRoles } from '../../middlewares/auth.middleware';
import { requireOwnership } from '../../middlewares/authorization';
import { validateRequest } from '../../middlewares/validate.middleware';
import { createUserSchema, getUsersQuery, updateUserSchema, userIdParams } from './user.validation';
import { UserRole } from '@prisma/client';

const router = Router();

// All user routes require authentication
router.use(authenticateUser);

// Explicit /me endpoints bypassing standard ABAC logic, purely relying on JWT sub
router.get('/me', userController.getById);
router.patch('/me', validateRequest(updateUserSchema), userController.update);

// Admin / CRUD Endpoints
router.post('/',
  requireRoles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN),
  validateRequest(createUserSchema),
  userController.create
);

router.get('/',
  requireRoles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.OPERATOR),
  validateRequest(getUsersQuery),
  userController.getAll
);

router.get('/:id',
  requireRoles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.OPERATOR),
  validateRequest(userIdParams),
  userController.getById
);

router.patch('/:id',
  requireRoles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN),
  validateRequest(updateUserSchema),
  userController.update
);

router.delete('/:id',
  requireRoles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN),
  validateRequest(userIdParams),
  userController.delete
);

export default router;
